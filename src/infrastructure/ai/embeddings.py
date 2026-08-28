from langchain_huggingface import HuggingFaceEmbeddings

shared_embedding_model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)
