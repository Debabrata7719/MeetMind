from langchain_text_splitters import RecursiveCharacterTextSplitter

def chunk_text(text: str) -> list[str]:
    """
    Takes a full transcript string and chunks it into smaller overlapping pieces.
    """
    # chunking
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,  # Increased chunk size for better semantic context with 1024-dim Voyage embeddings
        chunk_overlap=50
    )

    chunks = splitter.split_text(text)
    
    print(f"Total chunks created: {len(chunks)}")

    return chunks
