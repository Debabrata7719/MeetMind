import os
from langchain_text_splitters import RecursiveCharacterTextSplitter

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def chunk_text(transcript_path: str, meeting_id: str, chunk_index: int):

    output_folder = os.path.join(BASE_DIR, "data", "intermediate", meeting_id)

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
    output_path = os.path.join(output_folder, f"chunks_chunk_{chunk_index}.txt")


    with open(output_path, "w", encoding="utf-8") as f:
        for i, chunk in enumerate(chunks, 1):
            f.write(f"\n----- CHUNK {i} -----\n")
            f.write(chunk + "\n")

    print(f"Chunks saved at: {output_path}")
    print(f"Total chunks created: {len(chunks)}")

    return output_path   #  VERY IMPORTANT
