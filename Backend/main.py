# main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from auth_routes import router as auth_router
from chat_routes import router as chat_router
from utils import database  # Updated to use PostgreSQL with asyncpg

import logging

logging.basicConfig(level=logging.INFO)

app = FastAPI()

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # You can restrict this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware,
    secret_key="supersecretkey",  # 🔒 Replace with env var in production
    max_age=60 * 60 * 24 * 4,  # 4 days
    same_site="lax",
    session_cookie="session"
)

# --- Routes ---
app.include_router(auth_router)
app.include_router(chat_router)

# --- Startup / Shutdown ---
@app.on_event("startup")
async def startup():
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()
