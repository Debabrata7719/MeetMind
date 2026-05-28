"""
app/intelligence/embeddings.py

Singleton to load the HuggingFace embedding model exactly ONCE into RAM.
This prevents multiple redundant 500MB copies from crashing the server.
"""

from langchain_huggingface import HuggingFaceEmbeddings

# Load the model into RAM exactly once
shared_embedding_model = HuggingFaceEmbeddings(
    model_name="paraphrase-multilingual-MiniLM-L12-v2"
)
