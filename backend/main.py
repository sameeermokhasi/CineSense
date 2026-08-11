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

import subprocess
from apscheduler.schedulers.background import BackgroundScheduler

from model.hybrid import get_recommendations, get_user_recommendations_from_history
import model.hybrid
from backend.database import (
    get_user_by_email,
    create_user,
    verify_password,
    insert_watch_history,
    get_user_watch_history
)
from backend.redis_cache import (
    get_cached_recommendations,
    set_cached_recommendations,
    record_user_watch,
    get_user_preferred_genres,
    flush_recommendation_cache
)
from backend.chat_engine import CineBotEngine

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


class ChatMessagePayload(BaseModel):
    message: str
    history: Optional[List[Dict[str, Any]]] = []



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

def get_tmdb_movie_details(movie_title: str) -> Optional[Dict[str, Any]]:
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
            if results:
                top_match = results[0]
                return {
                    "title": top_match.get("title", movie_title),
                    "overview": top_match.get("overview", ""),
                    "poster_path": top_match.get("poster_path")
                }
    except Exception as e:
        logging.error(f"Error fetching TMDB details for {movie_title}: {e}")
    return None


@app.on_event("startup")
def startup_event():
    try:
        # Flush any stale cache entries from previous sessions
        flush_recommendation_cache()

        model_path = os.path.join(BASE_DIR, "models", "hybrid_recommender.pkl")
        model.hybrid._DEFAULT_RECOMMENDER = model.hybrid.HybridRecommender.load(model_path)
        logging.info("Hybrid Recommender Model loaded successfully.")
        
        # Initialize APScheduler for weekly retraining
        scheduler = BackgroundScheduler()
        def retrain_job():
            logging.info("Starting scheduled model retraining...")
            subprocess.run([sys.executable, os.path.join(BASE_DIR, "model", "train.py")])
            # Reload model
            model.hybrid._DEFAULT_RECOMMENDER = model.hybrid.HybridRecommender.load(model_path)
            logging.info("Model retrained and reloaded.")
            
        scheduler.add_job(retrain_job, 'cron', day_of_week='sun', hour=3, minute=0)
        scheduler.start()
        logging.info("APScheduler started: Retraining job scheduled for Sundays at 3:00 AM.")

        
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

@app.get("/api/recommend/user")
def recommend_for_user(email: str = Query(...)):
    """Personalized recommendations based on user's entire watch history."""
    email_clean = email.strip().lower()
    user = get_user_by_email(email_clean)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    history = get_user_watch_history(user["id"])
    
    if not history:
        history = ["Inception"]  # Fallback if no history
        
    recommender = getattr(model.hybrid, "_DEFAULT_RECOMMENDER", None)
    if not recommender:
        raise HTTPException(status_code=500, detail="Recommendation model is not loaded.")
        
    try:
        recommendations = get_user_recommendations_from_history(user_history_titles=history, n=18)
        
        for rec in recommendations:
            rec["poster_url"] = get_poster_url(rec["title"])
            
        return {"query": f"Personalized for {email_clean}", "recommendations": recommendations, "cached": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# World Cinema & Multi-Parameter Catalog
# ==========================================

WORLD_CINEMA_CATALOG = [
    # Hindi Cinema
    {"movieId": 1001, "title": "3 Idiots (2009)", "language": "Hindi", "genres": "Comedy|Drama|Romance", "year": "2009", "avg_rating": 4.5, "imdb_rating": 8.4, "rating_count": 45000},
    {"movieId": 1002, "title": "Like Stars on Earth (Taare Zameen Par) (2007)", "language": "Hindi", "genres": "Drama", "year": "2007", "avg_rating": 4.5, "imdb_rating": 8.3, "rating_count": 38000},
    {"movieId": 1003, "title": "PK (2014)", "language": "Hindi", "genres": "Comedy|Drama|Fantasy|Sci-Fi", "year": "2014", "avg_rating": 4.3, "imdb_rating": 8.1, "rating_count": 39000},
    {"movieId": 1004, "title": "Chhichhore (2019)", "language": "Hindi", "genres": "Comedy|Drama", "year": "2019", "avg_rating": 4.4, "imdb_rating": 8.3, "rating_count": 32000},
    {"movieId": 1005, "title": "Lagaan: Once Upon a Time in India (2001)", "language": "Hindi", "genres": "Drama|Musical|Sport", "year": "2001", "avg_rating": 4.4, "imdb_rating": 8.1, "rating_count": 35000},
    {"movieId": 1006, "title": "Swades: We, the People (2004)", "language": "Hindi", "genres": "Drama", "year": "2004", "avg_rating": 4.3, "imdb_rating": 8.2, "rating_count": 28000},
    {"movieId": 1007, "title": "Dangal (2016)", "language": "Hindi", "genres": "Action|Biography|Drama", "year": "2016", "avg_rating": 4.6, "imdb_rating": 8.4, "rating_count": 48000},
    {"movieId": 1008, "title": "Munna Bhai M.B.B.S. (2003)", "language": "Hindi", "genres": "Comedy|Drama", "year": "2003", "avg_rating": 4.4, "imdb_rating": 8.2, "rating_count": 34000},
    {"movieId": 1009, "title": "Panchayat (2020)", "language": "Hindi", "genres": "Comedy|Drama", "year": "2020", "avg_rating": 4.7, "imdb_rating": 8.9, "rating_count": 52000},
    {"movieId": 1010, "title": "Rang De Basanti (2006)", "language": "Hindi", "genres": "Comedy|Crime|Drama", "year": "2006", "avg_rating": 4.5, "imdb_rating": 8.1, "rating_count": 41000},
    {"movieId": 1011, "title": "Chak De! India (2007)", "language": "Hindi", "genres": "Drama|Sport", "year": "2007", "avg_rating": 4.3, "imdb_rating": 8.1, "rating_count": 31000},
    {"movieId": 1012, "title": "Dilwale Dulhania Le Jayenge (1995)", "language": "Hindi", "genres": "Comedy|Musical|Romance", "year": "1995", "avg_rating": 4.5, "imdb_rating": 8.0, "rating_count": 36000},
    {"movieId": 1013, "title": "Zindagi Na Milegi Dobara (2011)", "language": "Hindi", "genres": "Comedy|Drama|Romance", "year": "2011", "avg_rating": 4.4, "imdb_rating": 8.2, "rating_count": 37000},
    {"movieId": 1014, "title": "Queen (2013)", "language": "Hindi", "genres": "Comedy|Drama", "year": "2013", "avg_rating": 4.3, "imdb_rating": 8.1, "rating_count": 29000},
    {"movieId": 1015, "title": "Barfi! (2012)", "language": "Hindi", "genres": "Comedy|Drama|Romance", "year": "2012", "avg_rating": 4.3, "imdb_rating": 8.1, "rating_count": 33000},
    {"movieId": 1016, "title": "Andhadhun (2018)", "language": "Hindi", "genres": "Crime|Mystery|Thriller", "year": "2018", "avg_rating": 4.5, "imdb_rating": 8.2, "rating_count": 42000},
    {"movieId": 1017, "title": "Gangs of Wasseypur (2012)", "language": "Hindi", "genres": "Action|Crime|Drama|Thriller", "year": "2012", "avg_rating": 4.4, "imdb_rating": 8.2, "rating_count": 39000},
    {"movieId": 1018, "title": "Mirzapur (2018)", "language": "Hindi", "genres": "Action|Crime|Drama|Thriller", "year": "2018", "avg_rating": 4.5, "imdb_rating": 8.5, "rating_count": 46000},
    {"movieId": 1019, "title": "Sholay (1975)", "language": "Hindi", "genres": "Action|Adventure|Comedy|Drama", "year": "1975", "avg_rating": 4.4, "imdb_rating": 8.1, "rating_count": 28000},
    {"movieId": 1020, "title": "Sacred Games (2018)", "language": "Hindi", "genres": "Action|Crime|Drama|Mystery", "year": "2018", "avg_rating": 4.4, "imdb_rating": 8.5, "rating_count": 41000},

    # English / Hollywood Cinema
    {"movieId": 5001, "title": "Dead Poets Society (1989)", "language": "English", "genres": "Comedy|Drama", "year": "1989", "avg_rating": 4.5, "imdb_rating": 8.1, "rating_count": 48000},
    {"movieId": 5002, "title": "Good Will Hunting (1997)", "language": "English", "genres": "Drama|Romance", "year": "1997", "avg_rating": 4.5, "imdb_rating": 8.3, "rating_count": 54000},
    {"movieId": 5003, "title": "Forrest Gump (1994)", "language": "English", "genres": "Comedy|Drama|Romance", "year": "1994", "avg_rating": 4.6, "imdb_rating": 8.8, "rating_count": 68000},
    {"movieId": 5004, "title": "The Truman Show (1998)", "language": "English", "genres": "Comedy|Drama|Sci-Fi", "year": "1998", "avg_rating": 4.4, "imdb_rating": 8.2, "rating_count": 43000},
    {"movieId": 5005, "title": "Inception (2010)", "language": "English", "genres": "Action|Adventure|Sci-Fi", "year": "2010", "avg_rating": 4.6, "imdb_rating": 8.8, "rating_count": 62000},
    {"movieId": 5006, "title": "Interstellar (2014)", "language": "English", "genres": "Adventure|Drama|Sci-Fi", "year": "2014", "avg_rating": 4.5, "imdb_rating": 8.7, "rating_count": 58000},
    {"movieId": 5007, "title": "The Dark Knight (2008)", "language": "English", "genres": "Action|Crime|Drama", "year": "2008", "avg_rating": 4.7, "imdb_rating": 9.0, "rating_count": 72000},
    {"movieId": 5008, "title": "Fight Club (1999)", "language": "English", "genres": "Action|Crime|Drama|Thriller", "year": "1999", "avg_rating": 4.5, "imdb_rating": 8.8, "rating_count": 58000},
    {"movieId": 5009, "title": "Goodfellas (1990)", "language": "English", "genres": "Biography|Crime|Drama", "year": "1990", "avg_rating": 4.4, "imdb_rating": 8.7, "rating_count": 51000},

    # Korean Cinema
    {"movieId": 2001, "title": "Parasite (2019)", "language": "Korean", "genres": "Comedy|Drama|Thriller", "year": "2019", "avg_rating": 4.6, "imdb_rating": 8.5, "rating_count": 55000},
    {"movieId": 2002, "title": "Miracle in Cell No. 7 (2013)", "language": "Korean", "genres": "Comedy|Drama", "year": "2013", "avg_rating": 4.4, "imdb_rating": 8.1, "rating_count": 31000},
    {"movieId": 2003, "title": "Memories of Murder (2003)", "language": "Korean", "genres": "Crime|Drama|Mystery|Thriller", "year": "2003", "avg_rating": 4.5, "imdb_rating": 8.1, "rating_count": 34000},
    {"movieId": 2004, "title": "Oldboy (2003)", "language": "Korean", "genres": "Action|Drama|Mystery|Thriller", "year": "2003", "avg_rating": 4.5, "imdb_rating": 8.4, "rating_count": 46000},
    {"movieId": 2005, "title": "Train to Busan (2016)", "language": "Korean", "genres": "Action|Horror|Thriller", "year": "2016", "avg_rating": 4.3, "imdb_rating": 7.6, "rating_count": 38000},
    {"movieId": 2006, "title": "Squid Game (2021)", "language": "Korean", "genres": "Action|Drama|Mystery|Thriller", "year": "2021", "avg_rating": 4.4, "imdb_rating": 8.0, "rating_count": 62000},

    # Japanese / Anime Cinema
    {"movieId": 3001, "title": "Spirited Away (2001)", "language": "Japanese", "genres": "Adventure|Animation|Fantasy", "year": "2001", "avg_rating": 4.5, "imdb_rating": 8.6, "rating_count": 48000},
    {"movieId": 3002, "title": "Your Name (2016)", "language": "Japanese", "genres": "Animation|Drama|Fantasy|Romance", "year": "2016", "avg_rating": 4.6, "imdb_rating": 8.4, "rating_count": 42000},
    {"movieId": 3003, "title": "Princess Mononoke (1997)", "language": "Japanese", "genres": "Action|Adventure|Animation|Fantasy", "year": "1997", "avg_rating": 4.5, "imdb_rating": 8.4, "rating_count": 39000},
    {"movieId": 3004, "title": "Howl's Moving Castle (2004)", "language": "Japanese", "genres": "Adventure|Animation|Fantasy", "year": "2004", "avg_rating": 4.4, "imdb_rating": 8.2, "rating_count": 36000},

    # French, Italian & European Cinema
    {"movieId": 4001, "title": "The Intouchables (2011)", "language": "French", "genres": "Biography|Comedy|Drama", "year": "2011", "avg_rating": 4.6, "imdb_rating": 8.5, "rating_count": 47000},
    {"movieId": 4002, "title": "Life Is Beautiful (1997)", "language": "Italian", "genres": "Comedy|Drama|Romance", "year": "1997", "avg_rating": 4.6, "imdb_rating": 8.6, "rating_count": 39000},
    {"movieId": 4003, "title": "Dark (2017)", "language": "German", "genres": "Crime|Drama|Mystery|Sci-Fi|Thriller", "year": "2017", "avg_rating": 4.6, "imdb_rating": 8.7, "rating_count": 49000},
    {"movieId": 4004, "title": "Money Heist (2017)", "language": "Spanish", "genres": "Action|Crime|Drama|Mystery|Thriller", "year": "2017", "avg_rating": 4.4, "imdb_rating": 8.2, "rating_count": 51000}
]

def find_world_cinema_match(title: str):
    clean_q = title.lower().strip()
    clean_q_no_year = re.sub(r"\s*\(\d{4}\)", "", clean_q).strip()

    # Exact or substring match
    for item in WORLD_CINEMA_CATALOG:
        t_clean = item["title"].lower()
        t_clean_no_year = re.sub(r"\s*\(\d{4}\)", "", t_clean).strip()
        if clean_q == t_clean or clean_q_no_year == t_clean_no_year or clean_q in t_clean or t_clean in clean_q:
            return item

    # Fuzzy match
    all_titles = [m["title"] for m in WORLD_CINEMA_CATALOG]
    close = difflib.get_close_matches(clean_q, all_titles, n=1, cutoff=0.45)
    if close:
        for item in WORLD_CINEMA_CATALOG:
            if item["title"] == close[0]:
                return item
    return None

def get_world_cinema_recommendations(target_movie: dict, n: int = 18):
    target_genres = set(target_movie.get("genres", "").split("|"))
    target_lang = target_movie.get("language", "English")

    all_candidates = [m for m in WORLD_CINEMA_CATALOG if m["title"].lower() != target_movie["title"].lower()]
    
    # Score candidates across all languages by genre overlap + rating + language diversity
    scored = []
    for item in all_candidates:
        item_genres = set(item.get("genres", "").split("|"))
        overlap = len(target_genres.intersection(item_genres))
        
        # High genre match bonus
        genre_score = overlap * 0.10
        rating_score = (item.get("imdb_rating", 8.0) - 7.0) * 0.05
        
        base_score = 0.72 + genre_score + rating_score
        
        # Give a slight boost if genre strongly aligns
        if "Comedy" in target_genres and "Comedy" in item_genres:
            base_score += 0.05
        if "Drama" in target_genres and "Drama" in item_genres:
            base_score += 0.05
            
        scored.append((base_score, item))

    scored.sort(key=lambda x: x[0], reverse=True)
    
    recommendations = []
    for rank, (score, m) in enumerate(scored[:n], 1):
        recommendations.append({
            "rank": rank,
            "movieId": m["movieId"],
            "title": m["title"],
            "language": m["language"],
            "genres": m["genres"],
            "final_score": round(min(0.95, score), 2),
            "avg_rating": m["avg_rating"],
            "imdb_rating": m["imdb_rating"],
            "rating_count": m["rating_count"],
            "year": m["year"],
            "poster_url": get_poster_url(m["title"])
        })
    return recommendations



# ==========================================
# Recommendation & Search with Redis Cache
# ==========================================

@app.get("/recommend")
def recommend(title: str = Query(..., description="Movie title to search for"), n: int = Query(18, ge=1, le=50)):
    # 1. Check if this is a World Cinema / Hindi / Regional movie first
    world_match = find_world_cinema_match(title)
    if world_match:
        recs = get_world_cinema_recommendations(world_match, n=n)
        clean_matched_no_year = re.sub(r"\s*\(\d{4}\)", "", world_match["title"]).strip().lower()
        is_corrected = title.strip().lower() != clean_matched_no_year and title.strip().lower() != world_match["title"].lower()
        did_you_mean = None
        if is_corrected:
            sim = difflib.SequenceMatcher(None, title.strip().lower(), clean_matched_no_year).ratio()
            did_you_mean = {
                "original_query": title,
                "corrected_title": world_match["title"],
                "confidence": round(sim, 2),
                "is_corrected": True
            }

        searched_info = {
            "title": world_match["title"],
            "movieId": world_match["movieId"],
            "language": world_match["language"],
            "genres": world_match["genres"],
            "avg_rating": world_match["avg_rating"],
            "imdb_rating": world_match["imdb_rating"],
            "rating_count": world_match["rating_count"],
            "year": world_match["year"],
            "poster_url": get_poster_url(world_match["title"])
        }
        return {
            "query": title,
            "searched_movie": searched_info,
            "did_you_mean": did_you_mean,
            "recommendations": recs,
            "cached": False
        }

    # 2. Check Redis Cache for standard movies
    cached = get_cached_recommendations(title, n)
    if cached:
        return {"query": title, "recommendations": cached, "cached": True}


    recommender = getattr(model.hybrid, "_DEFAULT_RECOMMENDER", None)
    if not recommender:
        raise HTTPException(status_code=500, detail="Recommendation model is not loaded.")

    try:
        recommendations = get_recommendations(movie_title=title, n=n)
        
        # Enrich recommendations with poster URLs & default language
        for rec in recommendations:
            rec["poster_url"] = get_poster_url(rec["title"])
            rec["language"] = rec.get("language", "English")
            
        # 2. Store in Redis Cache
        set_cached_recommendations(title, n, recommendations)

        # Retrieve metadata for the searched movie
        matched_title = recommender._find_closest_title(title)
        m_id = recommender.title_to_id.get(matched_title)
        meta = recommender.id_to_metadata.get(m_id, {}) if m_id is not None else {}
        
        # Check if search correction / spellcheck applied
        did_you_mean = None
        if matched_title:
            clean_matched_no_year = re.sub(r"\s*\(\d{4}\)", "", matched_title).strip().lower()
            if title.strip().lower() != clean_matched_no_year and title.strip().lower() != matched_title.lower():
                sim = difflib.SequenceMatcher(None, title.strip().lower(), clean_matched_no_year).ratio()
                did_you_mean = {
                    "original_query": title,
                    "corrected_title": matched_title,
                    "confidence": round(sim, 2),
                    "is_corrected": True
                }

        searched_info = {
            "title": matched_title or title,
            "movieId": m_id,
            "language": "English",
            "genres": meta.get("genres", ""),
            "avg_rating": meta.get("avg_rating", 4.2),
            "rating_count": meta.get("rating_count", 0),
            "year": meta.get("year", ""),
            "poster_url": get_poster_url(matched_title or title)
        }

        return {
            "query": title,
            "searched_movie": searched_info,
            "did_you_mean": did_you_mean,
            "recommendations": recommendations,
            "cached": False
        }



        
    except ValueError as e:
        # TMDB Cold Start Fallback
        tmdb_details = get_tmdb_movie_details(title)
        if tmdb_details and tmdb_details.get("overview"):
            feature_text = tmdb_details["title"] + " " + tmdb_details["overview"]
            try:
                # Transform text using ContentBasedRecommender
                sparse_vector = recommender.content_model.vectorizer.transform([feature_text])
                scores = recommender.content_model.tfidf_matrix.dot(sparse_vector.T).toarray().ravel()
                
                import numpy as np
                top_indices = np.argsort(-scores)[:n]
                
                fallback_recommendations = []
                for rank, idx in enumerate(top_indices, 1):
                    m_id = recommender.content_model.idx_to_movie_id[idx]
                    meta = recommender.id_to_metadata[m_id]
                    fallback_recommendations.append({
                        "rank": rank,
                        "movieId": m_id,
                        "title": meta["title"],
                        "genres": meta["genres"],
                        "final_score": round(float(scores[idx]), 4),
                        "avg_rating": meta["avg_rating"],
                        "rating_count": meta["rating_count"],
                        "query_movie": tmdb_details["title"] + " (TMDB Fallback)",
                        "poster_url": get_poster_url(meta["title"])
                    })
                return {"query": title, "recommendations": fallback_recommendations, "cached": False, "fallback": True}
            except Exception as inner_e:
                logging.error(f"Fallback generation failed: {inner_e}")

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


def resolve_spellcheck(query: str, recommender) -> Dict[str, Any]:
    """
    Detects typos and fuzzy resolves movie titles for smart search suggestions.
    e.g. "Interstelar" -> "Interstellar (2014)"
    """
    if not query or not query.strip():
        return {"query": query, "has_typo": False, "suggested_title": "", "confidence": 1.0}
    
    clean_q = query.strip()
    
    if recommender and recommender.title_to_id:
        all_titles = list(recommender.title_to_id.keys())
        
        # 1. Exact or startswith check
        for t in all_titles:
            clean_t = t.lower()
            if clean_t == clean_q.lower() or clean_t.startswith(clean_q.lower() + " ("):
                return {
                    "query": query,
                    "has_typo": False,
                    "suggested_title": t,
                    "confidence": 1.0
                }
        
        # 2. Fuzzy match
        close_matches = difflib.get_close_matches(clean_q, all_titles, n=1, cutoff=0.50)
        if close_matches:
            best_match = close_matches[0]
            clean_best = re.sub(r"\s*\(\d{4}\)", "", best_match).strip().lower()
            sim = difflib.SequenceMatcher(None, clean_q.lower(), clean_best).ratio()
            
            is_typo = clean_q.lower() != clean_best and sim >= 0.55
            return {
                "query": query,
                "has_typo": is_typo,
                "suggested_title": best_match,
                "confidence": round(sim, 2)
            }
            
    return {"query": query, "has_typo": False, "suggested_title": query, "confidence": 1.0}


@app.get("/api/search/spellcheck")
def search_spellcheck(query: str = Query(..., description="Query to spellcheck")):
    recommender = getattr(model.hybrid, "_DEFAULT_RECOMMENDER", None)
    return resolve_spellcheck(query, recommender)


@app.post("/api/chat/recommend")
def chat_recommend(payload: ChatMessagePayload):
    """
    Conversational AI Recommender that parses natural language prompts,
    runtime constraints, mood/tone, and retrieves curated/hybrid movie matches.
    """
    response = CineBotEngine.generate_recommendation_response(payload.message)
    for rec in response.get("recommendations", []):
        rec["poster_url"] = get_poster_url(rec["title"])
    return response

