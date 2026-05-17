"""
auth/db.py

MySQL connection helper for the auth module.
Credentials are read from .env via python-dotenv.
"""

import mysql.connector
from mysql.connector import connection as MySQLConnection
import os
from dotenv import load_dotenv

load_dotenv()


def get_connection() -> MySQLConnection.MySQLConnection:
    """Return a fresh MySQL connection. Caller must close it."""
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "Meeting_analizer_user"),
        autocommit=True,
    )


def save_meeting(meeting_id: str, user_id: int, name: str = "Untitled Meeting") -> None:
    """Insert or update a meeting row owned by user_id."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO meetings (meeting_id, user_id, name)
           VALUES (%s, %s, %s)
           ON DUPLICATE KEY UPDATE name = VALUES(name)""",
        (meeting_id, user_id, name),
    )
    cursor.close()
    conn.close()


def update_meeting_name(meeting_id: str, user_id: int, name: str) -> bool:
    """Update the name for a meeting that belongs to user_id. Returns True if updated."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE meetings SET name=%s WHERE meeting_id=%s AND user_id=%s",
        (name, meeting_id, user_id),
    )
    updated = cursor.rowcount > 0
    cursor.close()
    conn.close()
    return updated


def get_user_meetings(user_id: int) -> list[dict]:
    """Return all meetings for user_id ordered newest first."""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT meeting_id AS id, name FROM meetings WHERE user_id=%s ORDER BY created_at DESC",
        (user_id,),
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows


def meeting_belongs_to_user(meeting_id: str, user_id: int) -> bool:
    """Return True if the meeting exists and belongs to user_id."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT 1 FROM meetings WHERE meeting_id=%s AND user_id=%s",
        (meeting_id, user_id),
    )
    found = cursor.fetchone() is not None
    cursor.close()
    conn.close()
    return found

