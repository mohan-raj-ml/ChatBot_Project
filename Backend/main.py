from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import timedelta
import sqlite3
import re
import requests

app = FastAPI()

# ------------------ MIDDLEWARE ------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.add_middleware(
    SessionMiddleware,
    secret_key="supersecretkey",
    max_age=60 * 60 * 24 * 4,
    same_site="lax",
    session_cookie="session"
)

DB_NAME = 'users.db'

# ------------------ DATABASE ------------------
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

# ------------------ SCHEMAS ------------------
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

# ------------------ AUTH ------------------
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

# ------------------ CHAT ROUTES ------------------
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
    return {"success": True, "chat_id": chat_id, "title": req.title}

@app.post("/api/rename_chat")
def rename_chat(req: RenameChatRequest, request: Request):
    username = request.session.get("user")
    if not username:
        raise HTTPException(status_code=401, detail="Unauthorized")
    db = get_db()
    user = db.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
    chat = db.execute("SELECT id FROM chats WHERE id = ? AND user_id = ?", (req.chat_id, user["id"])).fetchone()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found or unauthorized")
    db.execute("UPDATE chats SET title = ? WHERE id = ?", (req.new_title, req.chat_id))
    db.commit()
    return {"success": True, "message": "Chat renamed."}

@app.post("/api/respond")
def respond(req: PromptRequest, request: Request):
    username = request.session.get("user")
    if not username:
        raise HTTPException(status_code=401, detail="Unauthorized")
    db = get_db()

    messages = db.execute("SELECT role, content FROM messages WHERE chat_id = ? ORDER BY timestamp ASC", (req.chat_id,)).fetchall()
    memory_row = db.execute("SELECT memory FROM chats WHERE id = ?", (req.chat_id,)).fetchone()
    memory = memory_row["memory"] if memory_row and memory_row["memory"] else ""

    # Build contextual prompt without explicitly saying “I remember”
    context = ""
    if memory:
        context += memory.strip() + "\n"
    for row in messages:
        context += f"{row['role'].capitalize()}: {row['content']}\n"
    context += f"User: {req.prompt}\nAssistant:"

    # First message: suggest a title
    if len(messages) == 0:
        title_response = post_prompt_to_api(f"Give a short title (2-3 words) for this: {req.prompt}", req.model)
        db.execute("UPDATE chats SET title = ? WHERE id = ?", (title_response.strip()[:50], req.chat_id))

    db.execute("INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)", (req.chat_id, "user", req.prompt))
    db.commit()

    response_text = post_prompt_to_api(context, req.model)
    db.execute("INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)", (req.chat_id, "assistant", response_text))
    db.commit()

    # Update memory after every 5 messages
    if len(messages) >= 4 and len(messages) % 2 == 0:
        extended = messages + [{"role": "user", "content": req.prompt}, {"role": "assistant", "content": response_text}]
        summary = summarize_history(extended, req.model)
        db.execute("UPDATE chats SET memory = ? WHERE id = ?", (summary, req.chat_id))
        db.commit()

    return {"response": response_text}

@app.post("/api/delete_chat")
def delete_chat(chat_id: int, request: Request):
    username = request.session.get("user")
    if not username:
        raise HTTPException(status_code=401, detail="Unauthorized")
    db = get_db()
    db.execute("DELETE FROM chats WHERE id = ?", (chat_id,))
    db.commit()
    return {"success": True}

# ------------------ HELPERS ------------------
def post_prompt_to_api(prompt, model):
    try:
        res = requests.post("http://localhost:11434/api/generate", json={
            "model": model,
            "prompt": prompt,
            "stream": False
        })
        return re.sub(r"<think>.*?</think>\s*", "", res.json().get("response", ""), flags=re.DOTALL)
    except Exception as e:
        return f"Error contacting model: {e}"

def summarize_history(messages, model="mistral:7b-instruct"):
    text = ""
    for m in messages:
        role = m["role"].capitalize() if isinstance(m, dict) else m['role'].capitalize()
        content = m["content"] if isinstance(m, dict) else m['content']
        text += f"{role}: {content}\n"
    return post_prompt_to_api(f"Summarize this for memory:\n{text}", model)

# ------------------ STARTUP ------------------
@app.on_event("startup")
def startup():
    init_db()
