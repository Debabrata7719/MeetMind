"""
auth/db.py

SQLAlchemy connection and database dependency.
"""

import os
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Build connection string for pymysql
db_user = os.getenv("DB_USER", "root")
db_password = os.getenv("DB_PASSWORD", "")
db_password_encoded = urllib.parse.quote_plus(db_password)
db_host = os.getenv("DB_HOST", "localhost")
db_name = os.getenv("DB_NAME", "Meeting_analizer_user")

DATABASE_URL = f"mysql+pymysql://{db_user}:{db_password_encoded}@{db_host}/{db_name}"

engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
