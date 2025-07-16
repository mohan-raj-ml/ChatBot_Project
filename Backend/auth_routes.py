from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional
import sqlite3
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class User(BaseModel):
    username: str
    email: Optional[str] = None
    password: str

class LoginRequest(BaseModel):
    identifier: str
    password: str

def get_db():
    conn = sqlite3.connect("users.db", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

@router.post("/signup")
def signup(user: User):
    db = get_db()
    email = user.email.strip()
    username = user.username.strip()
    password = user.password.strip()

    allowed_domain = "@xoriant.com"
    if not email.endswith(allowed_domain):
        raise HTTPException(status_code=400, detail=f"Email must be from the {allowed_domain} domain.")

    try:
        db.execute("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", (username, email, password))
        db.commit()
        return {"success": True, "message": "Signup successful."}
    except sqlite3.IntegrityError as e:
        if "username" in str(e):
            raise HTTPException(status_code=409, detail="Username already exists.")
        elif "email" in str(e):
            raise HTTPException(status_code=409, detail="Email already exists.")
        raise HTTPException(status_code=500, detail="Internal error during signup.")

@router.post("/login")
async def login(login_req: LoginRequest, request: Request):
    db = get_db()
    identifier = login_req.identifier.strip()
    password = login_req.password.strip()

    user = db.execute("SELECT * FROM users WHERE (username = ? OR email = ?) AND password = ?", (identifier, identifier, password)).fetchone()

    if user:
        request.session["user"] = user["username"]
        return {"success": True, "message": "Login successful."}
    raise HTTPException(status_code=401, detail="Invalid credentials.")

@router.post("/logout")
async def logout(request: Request):
    user = request.session.get("user", "unknown")
    request.session.clear()
    return {"success": True, "message": "Logged out successfully."}

@router.get("/")
def index(request: Request):
    user = request.session.get("user")
    if not user:
        return {"authenticated": False, "message": "User not logged in"}
    return {"authenticated": True, "user": user}
