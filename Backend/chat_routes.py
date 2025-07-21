from fastapi import APIRouter, Request, HTTPException, Form, UploadFile, File
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import logging, os, io, shutil, asyncio
from pptx import Presentation
from langchain.docstore.document import Document
from langchain.prompts import PromptTemplate
from celery.result import AsyncResult
from utils import response_time_logger
import time
from tasks import generate_response_task
from utils import (
    get_llm, remove_think_tags, count_tokens, trim_context,get_relevant_context,
    calculate_response_token_budget, summarize_chat, generate_title,
    global_embedding_model, get_faiss_index, save_faiss_index, database
)
from tasks import generate_title_task, summarize_chat_task

router = APIRouter()
logger = logging.getLogger(__name__)
faiss_cache = {}

MODEL_TOKEN_LIMITS = {
    "gemma:2b": 8192, "gemma:1.1b": 8192, "mistral:7b": 8192, "llama3:8b": 8192,
    "llama3:70b": 8192, "llama2:7b": 4096, "deepseek:1.3b": 8192, "phi3:3b": 8192,
    "mixtral": 32768, "dolphin-mixtral": 32768
}

class ChatRequest(BaseModel):
    title: Optional[str] = "New Chat"

class RenameChatRequest(BaseModel):
    chat_id: int
    new_title: str

@router.on_event("startup")
async def connect_db():
    await database.connect()

@router.on_event("shutdown")
async def disconnect_db():
    await database.disconnect()

@router.get("/api/get_models")
async def get_models():
    import requests
    try:
        res = requests.get("http://localhost:11434/api/tags", timeout=10)
        res.raise_for_status()
        models = [m['name'] for m in res.json().get("models", [])]
        return {"response": [models]}
    except Exception as e:
        return {"response": [[]], "error": str(e)}

def get_user_session(request: Request):
    username = request.session.get("user")
    if not username:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return username

@router.get("/api/list_chats")
async def list_chats(request: Request):
    username = get_user_session(request)
    user = await database.fetch_one("SELECT id FROM users WHERE username = :username", {"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    rows = await database.fetch_all(
        "SELECT id, title, created_at FROM chats WHERE user_id = :uid ORDER BY created_at DESC",
        {"uid": user["id"]}
    )
    return {"chats": [dict(r) for r in rows]}

@router.get("/api/chat_history")
async def chat_history(chat_id: int, request: Request):
    username = get_user_session(request)
    user_id = await database.fetch_val("SELECT id FROM users WHERE username = :u", {"u": username})
    chat_owner = await database.fetch_val("SELECT user_id FROM chats WHERE id = :cid", {"cid": chat_id})
    if chat_owner != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    rows = await database.fetch_all(
        "SELECT role, content FROM messages WHERE chat_id = :cid ORDER BY timestamp ASC",
        {"cid": chat_id}
    )
    return [dict(r) for r in rows]

@router.post("/api/create_chat")
async def create_chat(req: ChatRequest, request: Request):
    username = get_user_session(request)
    user = await database.fetch_one("SELECT id FROM users WHERE username = :username", {"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    query = "INSERT INTO chats (user_id, title) VALUES (:uid, :title) RETURNING id"
    chat_id = await database.fetch_val(query, {"uid": user["id"], "title": req.title})
    await database.execute("INSERT INTO chat_memory (chat_id, memory) VALUES (:cid, '')", {"cid": chat_id})
    await database.execute("INSERT INTO chat_summaries (chat_id, summary) VALUES (:cid, '')", {"cid": chat_id})
    return {"success": True, "chat_id": chat_id, "title": req.title}

@router.post("/api/delete_chat")
async def delete_chat(chat_id: int, request: Request):
    username = get_user_session(request)
    user_id = await database.fetch_val("SELECT id FROM users WHERE username = :u", {"u": username})
    await database.execute("DELETE FROM messages WHERE chat_id = :cid", {"cid": chat_id})
    await database.execute("DELETE FROM chat_memory WHERE chat_id = :cid", {"cid": chat_id})
    await database.execute("DELETE FROM chat_summaries WHERE chat_id = :cid", {"cid": chat_id})
    await database.execute("DELETE FROM chats WHERE id = :cid", {"cid": chat_id})

    faiss_dir = f"faiss_indexes/chat_{chat_id}"
    if os.path.exists(faiss_dir):
        shutil.rmtree(faiss_dir)
    return {"success": True}

from os import getenv
from tasks import generate_response_task
from celery.result import AsyncResult

USE_CELERY = getenv("USE_CELERY", "false").lower() == "true"

@router.post("/api/respond")
async def respond(
    request: Request,
    prompt: str = Form(...),
    model: str = Form(...),
    chat_id: int = Form(...),
    file: UploadFile = File(None)
):
    start_time = time.time()
    username = get_user_session(request)
    user_id = await database.fetch_val("SELECT id FROM users WHERE username = :u", {"u": username})
    chat_owner = await database.fetch_val("SELECT user_id FROM chats WHERE id = :cid", {"cid": chat_id})
    if chat_owner != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Save user message
    await database.execute(
        "INSERT INTO messages (chat_id, role, content) VALUES (:cid, 'user', :msg)",
        {"cid": chat_id, "msg": prompt}
    )

    # Build context
    rows = await database.fetch_all("SELECT role, content FROM messages WHERE chat_id = :cid ORDER BY timestamp ASC", {"cid": chat_id})
    messages = [dict(r) for r in rows]
    summary = await database.fetch_val("SELECT summary FROM chat_summaries WHERE chat_id = :cid", {"cid": chat_id}) or ""
    file_text = ""
    if file and file.filename.endswith(".pptx"):
        file_bytes = await file.read()
        file_text = extract_text_from_pptx(file_bytes, file.filename)

    retrieved = get_relevant_context(prompt, chat_id)
    recent = "\n".join([
        f"{m['role'].capitalize()}: {m['content']}"
        for m in messages[-6:] if m['role'] == "assistant" or m['content'] != prompt
    ])
    file_section = f"File content:\n{file_text.strip()}" if file_text.strip() else ""

    context_template = PromptTemplate.from_template("""
        You are a helpful assistant. Respond naturally, without offering multiple options or conversational instructions.

        Existing Chat Summary:
        {summary}

        Relevant Information:
        {retrieved}

        Recent Chat History:
        {recent}

        {file_section}

        User: {prompt}
        Assistant:""")
    
    trimmed = trim_context(summary, retrieved, recent, file_section, prompt, max_tokens=MODEL_TOKEN_LIMITS.get(model, 4096))
    full_context = context_template.format_prompt(**trimmed).to_string()
    logger.info(f"\n--- Prompt Context for Chat {chat_id} ---\n{full_context}\n----------------------------\n")


    # Use Celery if enabled
    if USE_CELERY:
        task = generate_response_task.delay(model, full_context)
        return {"task_id": task.id, "chat_id": chat_id, "title": await database.fetch_val("SELECT title FROM chats WHERE id = :cid", {"cid": chat_id})}

    # Else do direct call (local dev mode)
    llm = get_llm(model)
    response = await llm.ainvoke(full_context)
    response = remove_think_tags(response)

    await database.execute(
        "INSERT INTO messages (chat_id, role, content) VALUES (:cid, 'assistant', :msg)",
        {"cid": chat_id, "msg": response}
    )

    # Background title & summary
    msg_count = await database.fetch_val("SELECT COUNT(*) FROM messages WHERE chat_id = :cid", {"cid": chat_id})
    if msg_count == 2:
        first_msg = messages[0]["content"]
        generate_title_task.delay(chat_id, first_msg, model)
    if msg_count >= 6 and msg_count % 6 == 0:
        summarize_chat_task.delay(chat_id, model, messages)

    elapsed_time = time.time() - start_time
    response_time_logger.info(f"Chat {chat_id} | Model: {model} | Time: {elapsed_time:.2f}s")

    return {
        "response": response,
        "chat_id": chat_id,
        "title": await database.fetch_val("SELECT title FROM chats WHERE id = :cid", {"cid": chat_id})
    }



@router.get("/api/chat_title")
async def get_chat_title(chat_id: int, request: Request):
    username = get_user_session(request)
    user_id = await database.fetch_val("SELECT id FROM users WHERE username = :u", {"u": username})

    chat_owner = await database.fetch_val("SELECT user_id FROM chats WHERE id = :cid", {"cid": chat_id})
    if chat_owner != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    title = await database.fetch_val("SELECT title FROM chats WHERE id = :cid", {"cid": chat_id})
    if not title:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    return {"title": title}

@router.get("/api/shared_chat_history")
async def shared_chat_history(chat_id: int):
    rows = await database.fetch_all(
        "SELECT role, content FROM messages WHERE chat_id = :chat_id ORDER BY timestamp ASC",
        {"chat_id": chat_id}
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Chat not found")
    return [dict(row) for row in rows]

@router.post("/api/rename_chat")
async def rename_chat(req: RenameChatRequest, request: Request):
    username = get_user_session(request)

    user_id = await database.fetch_val(
        "SELECT id FROM users WHERE username = :username",
        {"username": username}
    )
    if not user_id:
        raise HTTPException(status_code=404, detail="User not found")

    result = await database.execute(
        "UPDATE chats SET title = :title WHERE id = :chat_id AND user_id = :user_id",
        {"title": req.new_title, "chat_id": req.chat_id, "user_id": user_id}
    )
    return {"success": True}


@router.get("/api/task_status")
async def task_status(task_id: str):
    result = AsyncResult(task_id)
    if result.state == "SUCCESS":
        return {"status": "done", "response": result.result}
    elif result.state == "FAILURE":
        return {"status": "error", "message": str(result.result)}
    return {"status": result.state.lower()}


