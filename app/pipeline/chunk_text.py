import os
from langchain_text_splitters import RecursiveCharacterTextSplitter

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def chunk_text(transcript_path):

    output_folder = os.path.join(BASE_DIR, "data", "intermediate")
    os.makedirs(output_folder, exist_ok=True)

    # read transcript
    with open(transcript_path, "r", encoding="utf-8") as f:
        text = f.read()

    # chunking
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=150,
        chunk_overlap=30
    )

    chunks = splitter.split_text(text)

    # save chunks
    output_path = os.path.join(output_folder, "chunks.txt")

    with open(output_path, "w", encoding="utf-8") as f:
        for i, chunk in enumerate(chunks, 1):
            f.write(f"\n----- CHUNK {i} -----\n")
            f.write(chunk + "\n")

    print(f"Chunks saved at: {output_path}")
    print(f"Total chunks created: {len(chunks)}")

    return output_path   #  VERY IMPORTANT
