from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from pydantic import BaseModel
from typing import Optional
import sqlite3
import requests

from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain.llms.base import LLM

app = FastAPI()

app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.add_middleware(SessionMiddleware,
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
        db.execute("INSERT INTO users (username, password) VALUES (?, ?)", (user.username.strip(), user.password.strip()))
        db.commit()
        return {"success": True, "message": "Signup successful."}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="Username already exists.")

@app.post("/login")
async def login(user: User, request: Request):
    db = get_db()
    result = db.execute("SELECT * FROM users WHERE username = ? AND password = ?", (user.username, user.password)).fetchone()
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
def respond(req: PromptRequest, request: Request):
    username = request.session.get("user")
    if not username:
        raise HTTPException(status_code=401, detail="Unauthorized")

    db = get_db()
    messages = db.execute("SELECT role, content FROM messages WHERE chat_id = ? ORDER BY timestamp ASC", (req.chat_id,)).fetchall()
    memory_row = db.execute("SELECT memory FROM chat_memory WHERE chat_id = ?", (req.chat_id,)).fetchone()
    memory_summary = memory_row["memory"] if memory_row else ""

    db.execute("INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)", (req.chat_id, "user", req.prompt))
    db.commit()

    context = memory_summary.strip() + "\n\n" if memory_summary else ""

    if len(messages) == 0:
        context += f"User: {req.prompt}\nAssistant:"
    elif len(messages) == 1:
        last = messages[-1]
        context += f"{last['role'].capitalize()}: {last['content']}\nUser: {req.prompt}\nAssistant:"
    else:
        for m in messages:
            context += f"{m['role'].capitalize()}: {m['content']}\n"
        context += f"User: {req.prompt}\nAssistant:"

    llm = OllamaLLM(model=req.model)
    prompt = PromptTemplate.from_template("{context}")
    chain = LLMChain(llm=llm, prompt=prompt)
    response = chain.run(context=context)

    db.execute("INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)", (req.chat_id, "assistant", response))
    db.commit()

    if len(messages) % 20 == 0:
        full = ""
        for m in messages:
            full += f"{m['role'].capitalize()}: {m['content']}\n"
        full += f"User: {req.prompt}\nAssistant: {response}"
        summary_prompt = PromptTemplate.from_template("Summarize this conversation for memory:\n\n{context}")
        summary_chain = LLMChain(llm=llm, prompt=summary_prompt)
        summary = summary_chain.run(context=full)
        db.execute("UPDATE chat_memory SET memory = ? WHERE chat_id = ?", (summary.strip(), req.chat_id))
        db.commit()

    return {"response": response}

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

@app.on_event("startup")
def startup():
    init_db()
