from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging
from utils import database  # <- import async PostgreSQL db

router = APIRouter()
logger = logging.getLogger(__name__)

class User(BaseModel):
    username: str
    email: Optional[str] = None
    password: str

class LoginRequest(BaseModel):
    identifier: str
    password: str

@router.post("/signup")
async def signup(user: User):
    email = user.email.strip()
    username = user.username.strip()
    password = user.password.strip()

    allowed_domain = "@xoriant.com"
    if not email.endswith(allowed_domain):
        raise HTTPException(status_code=400, detail=f"Email must be from the {allowed_domain} domain.")

    try:
        query = """
        INSERT INTO users (username, email, password)
        VALUES (:username, :email, :password)
        """
        await database.execute(query, {
            "username": username,
            "email": email,
            "password": password
        })
        return {"success": True, "message": "Signup successful."}
    except Exception as e:
        logger.error(f"Signup error: {e}")
        error_msg = str(e).lower()
        if "username" in error_msg:
            raise HTTPException(status_code=409, detail="Username already exists.")
        elif "email" in error_msg:
            raise HTTPException(status_code=409, detail="Email already exists.")
        raise HTTPException(status_code=500, detail="Internal error during signup.")

@router.post("/login")
async def login(login_req: LoginRequest, request: Request):
    identifier = login_req.identifier.strip()
    password = login_req.password.strip()

    query = """
    SELECT * FROM users
    WHERE (username = :identifier OR email = :identifier)
    AND password = :password
    """
    user = await database.fetch_one(query, {
        "identifier": identifier,
        "password": password
    })

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
async def index(request: Request):
    user = request.session.get("user")
    if not user:
        return {"authenticated": False, "message": "User not logged in"}
    return {"authenticated": True, "user": user}
