# main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from auth_routes import router as auth_router
from chat_routes import router as chat_router
from utils import init_db  # DB initialization
import logging

logging.basicConfig(level=logging.INFO)

app = FastAPI()

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware,
    secret_key="supersecretkey",  # 🔒 Replace in production!
    max_age=60 * 60 * 24 * 4,  # 4 days
    same_site="lax",
    session_cookie="session"
)

# --- Routes ---
app.include_router(auth_router)
app.include_router(chat_router)

# --- Startup ---
@app.on_event("startup")
def on_startup():
    init_db()
