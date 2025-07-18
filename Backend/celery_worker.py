# celery_worker.py
from celery import Celery
import os

# Load from environment or default values
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = os.getenv("REDIS_PORT", "6379")
BROKER_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"
BACKEND_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}/1"

celery_app = Celery(
    "chatbot_worker",
    broker=BROKER_URL,
    backend=BACKEND_URL,
    include=["tasks"]  # Make sure tasks module is auto-discovered
)

# --- Celery Config ---
celery_app.conf.update(
    task_track_started=True,
    result_expires=3600,  # 1 hour
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    worker_prefetch_multiplier=1,  # Prevent Celery from grabbing too many tasks at once
    task_acks_late=True,  # Retry task if worker crashes mid-execution
)
