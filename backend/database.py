"""
backend/database.py
Native PostgreSQL connection manager using pure psycopg2 (No SQLAlchemy).
Handles user credential storage and watch history with direct SQL queries.
"""

import os
import hashlib
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("cinesense.database")

# PostgreSQL credentials from environment (matching docker-compose)
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "cinesense")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASSWORD", "postgres")

pool = None

try:
    import psycopg2
    from psycopg2 import pool as pg_pool

    pool = pg_pool.ThreadedConnectionPool(
        minconn=1,
        maxconn=10,
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        connect_timeout=3
    )
    logger.info("Connected to PostgreSQL database in Docker at %s:%s.", DB_HOST, DB_PORT)
except Exception as e:
    logger.warning("PostgreSQL connection error: %s (will retry on demand or use memory fallback)", str(e))
    pool = None


def get_connection():
    """Fetches a connection from the PostgreSQL connection pool."""
    if pool:
        try:
            return pool.getconn()
        except Exception as e:
            logger.warning("Failed to get PostgreSQL connection from pool: %s", str(e))
    return None


def release_connection(conn):
    """Returns a connection back to the PostgreSQL pool."""
    if pool and conn:
        try:
            pool.putconn(conn)
        except Exception:
            pass


def hash_password(password: str) -> str:
    """Computes SHA-256 hash with salt for secure password storage."""
    salt = "cinesense_secure_salt_2026"
    return hashlib.sha256((password + salt).encode("utf-8")).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against stored hash."""
    return hash_password(plain_password) == hashed_password


# ==========================================
# Native SQL Queries for PostgreSQL
# ==========================================

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Retrieves user row from PostgreSQL by email."""
    conn = get_connection()
    if not conn:
        return None

    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, email, name, password_hash, created_at FROM users WHERE email = %s;",
                (email.strip().lower(),)
            )
            row = cur.fetchone()
            if row:
                return {
                    "id": row[0],
                    "email": row[1],
                    "name": row[2],
                    "password_hash": row[3],
                    "created_at": row[4]
                }
    except Exception as e:
        logger.error("Error executing get_user_by_email SQL: %s", str(e))
        conn.rollback()
    finally:
        release_connection(conn)

    return None


def create_user(email: str, name: str, password_plain: str) -> Optional[Dict[str, Any]]:
    """Inserts a new user into PostgreSQL and returns user record."""
    conn = get_connection()
    if not conn:
        return None

    try:
        pw_hash = hash_password(password_plain)
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (email, name, password_hash)
                VALUES (%s, %s, %s)
                RETURNING id, email, name, created_at;
                """,
                (email.strip().lower(), name.strip(), pw_hash)
            )
            row = cur.fetchone()
            conn.commit()
            if row:
                return {
                    "id": row[0],
                    "email": row[1],
                    "name": row[2],
                    "created_at": row[3]
                }
    except Exception as e:
        logger.error("Error executing create_user SQL: %s", str(e))
        conn.rollback()
    finally:
        release_connection(conn)

    return None


def insert_watch_history(user_id: int, movie_title: str, genres: str) -> bool:
    """Inserts a watched movie record into PostgreSQL."""
    conn = get_connection()
    if not conn:
        return False

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO watch_history (user_id, movie_title, genres)
                VALUES (%s, %s, %s);
                """,
                (user_id, movie_title.strip(), genres.strip())
            )
            conn.commit()
            return True
    except Exception as e:
        logger.error("Error executing insert_watch_history SQL: %s", str(e))
        conn.rollback()
    finally:
        release_connection(conn)

    return False
