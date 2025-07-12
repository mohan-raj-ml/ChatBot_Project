from fastapi import FastAPI, Request, HTTPException, UploadFile, Form, File
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from pydantic import BaseModel
from typing import Optional
import sqlite3
import requests
import shutil
import os
import io
from pptx import Presentation
import asyncio

from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain.llms.base import LLM
from langchain_core.runnables import RunnableSequence # Keep this if you use it elsewhere, otherwise LLMChain is fine

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend.vercel.app","http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware,
    secret_key="supersecretkey",
    max_age=60 * 60 * 24 * 4,
    same_site="lax",
    session_cookie="session"
)

DB_NAME = 'users.db'

def get_db():
    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    with sqlite3.connect(DB_NAME) as db:
        db.execute("PRAGMA foreign_keys = ON")
        with open('schema.sql', 'r') as f:
            db.executescript(f.read())

class OllamaLLM(LLM):
    model: str = "mistral"

    def _call(self, prompt: str, stop=None):
        res = requests.post("http://localhost:11434/api/generate", json={
            "model": self.model,
            "prompt": prompt,
            "stream": False
        })
        return res.json().get("response", "")

    @property
    def _identifying_params(self):
        return {"model": self.model}

    @property
    def _llm_type(self):
        return "ollama_custom"

class User(BaseModel):
    username: str
    password: str

class PromptRequest(BaseModel):
    prompt: str
    model: str
    chat_id: int

class ChatRequest(BaseModel):
    title: Optional[str] = "New Chat"

class RenameChatRequest(BaseModel):
    chat_id: int
    new_title: str



@app.post("/signup")
def signup(user: User):
    db = get_db()
    try:
        db.execute("INSERT INTO users (username, password) VALUES (?, ?)",
                   (user.username.strip(), user.password.strip()))
        db.commit()
        return {"success": True, "message": "Signup successful."}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="Username already exists.")

@app.post("/login")
async def login(user: User, request: Request):
    db = get_db()
    result = db.execute("SELECT * FROM users WHERE username = ? AND password = ?",
                        (user.username, user.password)).fetchone()
    if result:
        request.session['user'] = user.username
        return {"success": True, "message": "Login successful."}
    raise HTTPException(status_code=401, detail="Invalid credentials.")

@app.post("/logout")
async def logout(request: Request):
    request.session.clear()
    return {"success": True, "message": "Logged out successfully."}

@app.get("/")
def index(request: Request):
    user = request.session.get("user")
    if not user:
        return JSONResponse(status_code=401, content={"authenticated": False, "message": "User not logged in"})
    return {"authenticated": True, "user": user}

@app.get("/api/get_models")
def get_models():
    try:
        res = requests.get("http://localhost:11434/api/tags")
        models = [m['name'] for m in res.json().get("models", [])]
        return {"response": [models]}
    except:
        return {"response": [[]]}

@app.get("/api/list_chats")
def list_chats(request: Request):
    username = request.session.get("user")
    if not username:
        raise HTTPException(status_code=401, detail="Unauthorized")
    db = get_db()
    user = db.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
    chats = db.execute("SELECT id, title, created_at FROM chats WHERE user_id = ? ORDER BY created_at DESC", (user["id"],)).fetchall()
    return {"chats": [dict(row) for row in chats]}

@app.get("/api/chat_history")
def chat_history(chat_id: int, request: Request):
    username = request.session.get("user")
    if not username:
        raise HTTPException(status_code=401, detail="Unauthorized")
    db = get_db()
    messages = db.execute("SELECT role, content FROM messages WHERE chat_id = ? ORDER BY timestamp ASC", (chat_id,)).fetchall()
    return [dict(row) for row in messages]

@app.post("/api/create_chat")
def create_chat(req: ChatRequest, request: Request):
    username = request.session.get("user")
    if not username:
        raise HTTPException(status_code=401, detail="Unauthorized")
    db = get_db()
    user = db.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
    db.execute("INSERT INTO chats (user_id, title) VALUES (?, ?)", (user["id"], req.title))
    db.commit()
    chat_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]
    db.execute("INSERT INTO chat_memory (chat_id, memory) VALUES (?, ?)", (chat_id, ""))
    db.commit()
    return {"success": True, "chat_id": chat_id, "title": req.title}

@app.post("/api/rename_chat")
def rename_chat(req: RenameChatRequest, request: Request):
    username = request.session.get("user")
    if not username:
        raise HTTPException(status_code=401, detail="Unauthorized")
    db = get_db()
    db.execute("UPDATE chats SET title = ? WHERE id = ?", (req.new_title, req.chat_id))
    db.commit()
    return {"success": True}

@app.post("/api/respond")
async def respond(
    request: Request,
    prompt: str = Form(...),
    model: str = Form(...),
    chat_id: int = Form(...),
    file: UploadFile = File(None)
):
    username = request.session.get("user")
    if not username:
        raise HTTPException(status_code=401, detail="Unauthorized")

    db = get_db()
    assistant_message_id = None # Initialize to None

    try:
        # Save user's new message immediately
        db.execute("INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)", (chat_id, "user", prompt))
        db.commit()

        # Rebuild full context for this chat
        messages = db.execute("SELECT role, content FROM messages WHERE chat_id = ? ORDER BY timestamp ASC", (chat_id,)).fetchall()
        context = "\n".join([f"{m['role'].capitalize()}: {m['content']}" for m in messages])

        # Add file text if present
        file_text = ""
        if file and file.filename.endswith(".pptx"):
            file_bytes = await file.read()
            prs = Presentation(io.BytesIO(file_bytes))
            for slide in prs.slides:
                for shape in slide.shapes:
                    if hasattr(shape, "text"):
                        file_text += shape.text + "\n"
            context += f"\n[File Content from '{file.filename}']:\n{file_text.strip()}"

        # 🧠 DEBUG PRINT CONTEXT
        print("------ PROMPT CONTEXT BEGIN ------")
        print(context)
        print("------ PROMPT CONTEXT END --------")

        # Use LLM to generate a reply
        llm = OllamaLLM(model=model)
        prompt_template = PromptTemplate.from_template("{context}\nAssistant:")
        chain = prompt_template | llm # Using RunnableSequence syntax

        assistant_response = "" # Initialize empty string for response

        try:
            assistant_response = chain.invoke({"context": context})

            # Introduce a tiny delay to allow the event loop to process client disconnection.
            await asyncio.sleep(0.01) # A very small non-blocking sleep

            # Check if the client is still connected BEFORE saving.
            if await request.is_disconnected():
                print(f"Client disconnected after LLM generation for chat {chat_id}. Not saving assistant response.")
                return JSONResponse(status_code=200, content={"response": ""})

            # If client is still connected and response is not empty, save it.
            if assistant_response.strip():
                db.execute("INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)", (chat_id, "assistant", assistant_response))
                db.commit()
                assistant_message_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]

            # Auto-generate title if this is the first exchange (1 user + 1 assistant)
            msg_count = db.execute("SELECT COUNT(*) FROM messages WHERE chat_id = ?", (chat_id,)).fetchone()[0]
            if msg_count == 2: # This means 1 user message + 1 assistant message
                # Use a more specific prompt for title generation
                title_prompt_template = PromptTemplate.from_template(
                    "Generate only one short and clear title (maximum 5 words) for this conversation based on the user's first message below.\n"
                    "Respond with only the title and nothing else, without quotes.\n\n"
                    "User Message:\n\"{prompt}\"\n\nTitle:"
                )
                title_llm = OllamaLLM(model=model)
                title_chain = title_prompt_template | title_llm
                try:
                    title_raw = title_chain.invoke({"prompt": prompt}).strip()
                    # Further refine title processing
                    title = title_raw.split("\n")[0].strip().replace('"', '')[:50]
                    if title: # Only update if a valid title was generated
                        db.execute("UPDATE chats SET title = ? WHERE id = ?", (title, chat_id))
                        db.commit()
                except Exception as e:
                    print(f"Title generation failed: {e}")

        except Exception as e:
            # This 'except' block catches errors directly from LLM generation itself
            print(f"LLM generation failed for chat {chat_id}: {e}")
            return JSONResponse(status_code=200, content={"response": ""})

        finally:
            # THIS IS THE KEY ADDITION FOR YOUR "NEW" CODE
            # If a response was generated AND potentially saved, AND the client is now disconnected,
            # we consider it a 'stopped' response that wasn't fully delivered.
            if assistant_message_id and await request.is_disconnected():
                print(f"Client disconnected AFTER potential save of assistant message ID {assistant_message_id} for chat {chat_id}. Attempting to delete.")
                try:
                    db.execute("DELETE FROM messages WHERE id = ?", (assistant_message_id,))
                    db.commit()
                    print(f"Successfully deleted assistant message ID {assistant_message_id}.")
                    # If we deleted it, ensure the frontend gets an empty response
                    return JSONResponse(status_code=200, content={"response": ""})
                except Exception as delete_e:
                    print(f"Error deleting message ID {assistant_message_id}: {delete_e}")
                    # Even if delete fails, still try to return empty response
                    return JSONResponse(status_code=200, content={"response": ""})

        # Return the response to the frontend only if it was successfully generated and not aborted
        return JSONResponse(content={"response": assistant_response})

    except Exception as e:
        # This catches broader errors outside the LLM generation block (e.g., DB issues, file processing)
        print(f"General error in /api/respond endpoint for user {username}: {e}")
        db.rollback() # Rollback any pending transactions for this request
        return JSONResponse(status_code=500, content={"response": "\u26a0\ufe0f Internal server error."})


@app.post("/api/delete_chat")
def delete_chat(chat_id: int, request: Request):
    username = request.session.get("user")
    if not username:
        raise HTTPException(status_code=401, detail="Unauthorized")
    db = get_db()
    db.execute("DELETE FROM chats WHERE id = ?", (chat_id,))
    db.execute("DELETE FROM chat_memory WHERE chat_id = ?", (chat_id,))
    db.commit()
    return {"success": True}

@app.options("/{rest_of_path:path}")
async def preflight(rest_of_path: str):
    return Response(status_code=204)

@app.on_event("startup")
def startup():
    init_db()