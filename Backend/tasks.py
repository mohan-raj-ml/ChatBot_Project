from celery_worker import celery_app
from utils import get_llm, remove_think_tags, database
import asyncio

@celery_app.task
def generate_response_task(model: str, full_context: str) -> str:
    llm = get_llm(model)
    chain = llm | (lambda ctx: ctx["context"])
    raw = chain.invoke({"context": full_context})
    return remove_think_tags(raw)


@celery_app.task
def generate_title_task(chat_id: int, first_msg: str, model: str):
    from utils import generate_title
    async def run():
        await database.connect()
        try:
            await generate_title(database, chat_id, first_msg, model)
        finally:
            await database.disconnect()
    asyncio.run(run())


@celery_app.task
def summarize_chat_task(chat_id: int, model: str, messages: list):
    from utils import summarize_chat
    async def run():
        await database.connect()
        try:
            await summarize_chat(database, chat_id, model, messages)
        finally:
            await database.disconnect()
    asyncio.run(run())
