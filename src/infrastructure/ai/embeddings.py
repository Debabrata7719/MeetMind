"""
app/intelligence/embeddings.py

Singleton to load the Google GenAI embedding model.
"""

from langchain_google_genai import GoogleGenerativeAIEmbeddings
import os
from dotenv import load_dotenv

load_dotenv()

# Load the model configuration
api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if not api_key:
    api_key = "placeholder_key"

shared_embedding_model = GoogleGenerativeAIEmbeddings(
    model=os.getenv("GEMINI_EMBEDDING_MODEL", "models/gemini-embedding-001"),
    google_api_key=api_key
)
