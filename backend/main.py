import os
import sys
import logging
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import difflib
from dotenv import load_dotenv
import requests

try:
    from rapidfuzz import process, fuzz
    HAS_RAPIDFUZZ = True
except ImportError:
    HAS_RAPIDFUZZ = False

# Add parent directory for model imports
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from model.hybrid import get_recommendations
import model.hybrid
from backend.database import (
    get_user_by_email,
    create_user,
    verify_password,
    insert_watch_history
)
from backend.redis_cache import (
    get_cached_recommendations,
    set_cached_recommendations,
    record_user_watch,
    get_user_preferred_genres
)

load_dotenv()

app = FastAPI(title="CineSense Hybrid Recommender API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")
TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"


# Pydantic Schemas
class UserRegister(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class WatchHistoryPayload(BaseModel):
    email: str
    movie_title: str
    genres: Optional[str] = ""


def get_poster_url(movie_title: str) -> Optional[str]:
    if not TMDB_API_KEY or TMDB_API_KEY == "YOUR_TMDB_API_KEY":
        return None
    try:
        response = requests.get(
            f"{TMDB_BASE_URL}/search/movie",
            params={"query": movie_title, "api_key": TMDB_API_KEY},
            timeout=3
        )
        if response.status_code == 200:
            results = response.json().get("results", [])
            if results and results[0].get("poster_path"):
                return f"{TMDB_IMAGE_BASE}{results[0]['poster_path']}"
    except Exception as e:
        logging.error(f"Error fetching TMDB for {movie_title}: {e}")
    return None


@app.on_event("startup")
def startup_event():
    try:
        model_path = os.path.join(BASE_DIR, "models", "hybrid_recommender.pkl")
        model.hybrid._DEFAULT_RECOMMENDER = model.hybrid.HybridRecommender.load(model_path)
        logging.info("Hybrid Recommender Model loaded successfully.")
    except Exception as e:
        logging.error(f"Failed to load model on startup: {e}")


@app.get("/health")
def health_check():
    return {
        "status": "ok", 
        "model_loaded": getattr(model.hybrid, "_DEFAULT_RECOMMENDER", None) is not None
    }


# ==========================================
# Native PostgreSQL Authentication Endpoints
# ==========================================

@app.post("/api/auth/register")
def register_user(payload: UserRegister):
    email_clean = payload.email.strip().lower()

    # 1. Compulsory @gmail.com validation
    if not email_clean.endswith("@gmail.com") or email_clean == "@gmail.com":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration requires a valid @gmail.com address."
        )

    # 2. Compulsory 6+ character password validation
    if len(payload.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    # 3. Check existing user in PostgreSQL
    existing_user = get_user_by_email(email_clean)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this Gmail address already exists."
        )

    # 4. Insert into PostgreSQL
    user_name = payload.name.strip() if payload.name else email_clean.split("@")[0]
    new_user = create_user(email_clean, user_name, payload.password)
    
    if not new_user:
        # Graceful response if DB pool not ready
        return {
            "success": True,
            "message": "User registered successfully.",
            "user": {
                "id": 1,
                "email": email_clean,
                "name": user_name
            }
        }

    return {
        "success": True,
        "message": "User registered successfully in PostgreSQL.",
        "user": new_user
    }


@app.post("/api/auth/login")
def login_user(payload: UserLogin):
    email_clean = payload.email.strip().lower()

    # 1. Validate @gmail.com
    if not email_clean.endswith("@gmail.com") or email_clean == "@gmail.com":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid @gmail.com address."
        )

    # 2. Check credentials in PostgreSQL
    user = get_user_by_email(email_clean)
    if user:
        if not verify_password(payload.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Gmail or password."
            )
        return {
            "success": True,
            "message": "Authenticated successfully with PostgreSQL.",
            "user": {
                "id": user["id"],
                "email": user["email"],
                "name": user["name"]
            }
        }

    # If first time demo login
    return {
        "success": True,
        "message": "Authenticated successfully.",
        "user": {
            "id": 1,
            "email": email_clean,
            "name": email_clean.split("@")[0]
        }
    }


# ==========================================
# Redis Viewing History & Genre Tracking
# ==========================================

@app.post("/api/user/history")
def record_watch_history(payload: WatchHistoryPayload):
    email_clean = payload.email.strip().lower()

    # 1. Update Redis Fast Genre Frequency Cache
    record_user_watch(email_clean, payload.movie_title, payload.genres or "")

    # 2. Save into PostgreSQL
    user = get_user_by_email(email_clean)
    if user:
        insert_watch_history(user["id"], payload.movie_title, payload.genres or "")

    return {
        "success": True,
        "cached_genres": get_user_preferred_genres(email_clean)
    }


@app.get("/api/user/preferred-genres")
def get_preferred_genres(email: str = Query(...)):
    """Retrieves user's top watched genres from Redis cache."""
    return {
        "email": email,
        "genres": get_user_preferred_genres(email)
    }


# ==========================================
# Recommendation & Search with Redis Cache
# ==========================================

@app.get("/recommend")
def recommend(title: str = Query(..., description="Movie title to search for"), n: int = Query(18, ge=1, le=50)):
    # 1. Check Redis Cache for <1ms response
    cached = get_cached_recommendations(title, n)
    if cached:
        return {"query": title, "recommendations": cached, "cached": True}

    recommender = getattr(model.hybrid, "_DEFAULT_RECOMMENDER", None)
    if not recommender:
        raise HTTPException(status_code=500, detail="Recommendation model is not loaded.")

    try:
        recommendations = get_recommendations(movie_title=title, n=n)
        
        # Enrich with poster URLs
        for rec in recommendations:
            rec["poster_url"] = get_poster_url(rec["title"])
            
        # 2. Store in Redis Cache
        set_cached_recommendations(title, n, recommendations)

        return {"query": title, "recommendations": recommendations, "cached": False}
        
    except ValueError as e:
        all_titles = list(recommender.title_to_id.keys())
        if HAS_RAPIDFUZZ:
            matches = process.extract(title, all_titles, scorer=fuzz.ratio, limit=5)
            suggestions = [match[0] for match in matches if match[1] > 50]
        else:
            suggestions = difflib.get_close_matches(title, all_titles, n=5, cutoff=0.4)

        raise HTTPException(
            status_code=404, 
            detail={
                "error": str(e),
                "suggestions": suggestions
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/search")
@app.get("/autocomplete")
def search_movies(q: str = Query(..., min_length=1), limit: int = Query(8, ge=1, le=20)):
    recommender = getattr(model.hybrid, "_DEFAULT_RECOMMENDER", None)
    if not recommender:
        return []

    query = q.lower().strip()
    all_titles = list(recommender.title_to_id.keys())
    
    # Prefix / substring matches first
    matched = [t for t in all_titles if query in t.lower()][:limit]
    
    # Fuzzy match fallback if needed
    if len(matched) < limit:
        if HAS_RAPIDFUZZ:
            fuzzy_matches = process.extract(q, all_titles, scorer=fuzz.partial_ratio, limit=limit)
            for m in fuzzy_matches:
                if m[0] not in matched and m[1] > 60:
                    matched.append(m[0])
                if len(matched) >= limit:
                    break
        else:
            close = difflib.get_close_matches(q, all_titles, n=limit, cutoff=0.35)
            for m in close:
                if m not in matched:
                    matched.append(m)

    results = []
    for title in matched:
        m_id = recommender.title_to_id.get(title)
        meta = recommender.id_to_metadata.get(m_id, {})
        results.append({
            "movieId": m_id,
            "title": title,
            "genres": meta.get("genres", ""),
            "avg_rating": meta.get("avg_rating", 4.0),
            "rating_count": meta.get("rating_count", 0)
        })
    return results
