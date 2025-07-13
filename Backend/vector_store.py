import os
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import OllamaEmbeddings
from langchain.docstore.document import Document
import logging

logger = logging.getLogger(__name__)

# Initialize embedding model globally
try:
    embedding_model = OllamaEmbeddings(model="nomic-embed-text")
    logger.info(f"Ollama embedding model '{embedding_model.model}' initialized successfully.")
except Exception as e:
    logger.critical(f"CRITICAL ERROR: Could not initialize OllamaEmbeddings: {e}. FAISS will not work.")
    embedding_model = None

def get_faiss_index(chat_id):
    if embedding_model is None:
        logger.error("Embedding model is not initialized. Cannot create/load FAISS index.")
        raise RuntimeError("Embedding model not initialized.")

    base_dir = "faiss_indexes"
    path = os.path.join(base_dir, f"chat_{chat_id}")

    if not os.path.exists(base_dir):
        os.makedirs(base_dir)
        logger.info(f"Created FAISS base directory: {base_dir}")

    # Load if index exists
    if os.path.exists(path):
        try:
            logger.info(f"Loading FAISS index from {path}")
            index = FAISS.load_local(path, embedding_model, allow_dangerous_deserialization=True)
            # Defensive check: ensure index isn't corrupted or empty
            if index is None or not hasattr(index, "index") or index.index.ntotal == 0:
                logger.warning(f"Loaded FAISS index is empty or corrupted for chat {chat_id}. Initializing new.")
                return FAISS.from_documents([Document(page_content="")], embedding_model)
            return index
        except Exception as e:
            logger.error(f"Failed to load FAISS index for chat {chat_id}: {e}")
            logger.warning("Creating new empty FAISS index.")
            return FAISS.from_documents([Document(page_content="")], embedding_model)

    # If no index exists
    logger.info(f"No FAISS index found for chat {chat_id}. Creating new.")
    return FAISS.from_documents([Document(page_content="")], embedding_model)  # add dummy doc to avoid empty index error

def save_faiss_index(index, chat_id):
    if embedding_model is None:
        logger.warning("Embedding model not initialized. Cannot save FAISS index.")
        return

    base_dir = "faiss_indexes"
    path = os.path.join(base_dir, f"chat_{chat_id}")

    if not os.path.exists(base_dir):
        os.makedirs(base_dir)
        logger.info(f"Created FAISS directory for saving: {base_dir}")

    try:
        index.save_local(path)
        logger.info(f"Saved FAISS index for chat {chat_id} to {path}.")
    except Exception as e:
        logger.error(f"Error saving FAISS index for chat {chat_id}: {e}")
