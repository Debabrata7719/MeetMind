"""
app/intelligence/embeddings.py

Singleton to load the Voyage AI embedding model.
"""

from langchain_voyageai import VoyageAIEmbeddings
import os
from dotenv import load_dotenv

load_dotenv()

# Load the model configuration
shared_embedding_model = VoyageAIEmbeddings(
    voyage_api_key=os.getenv("VOYAGE_API_KEY"),
    model="voyage-3.5-lite"
)
