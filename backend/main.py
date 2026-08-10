import os
import sys
import logging
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import difflib
from dotenv import load_dotenv
import requests

try:
    from rapidfuzz import process, fuzz
    HAS_RAPIDFUZZ = True
except ImportError:
    HAS_RAPIDFUZZ = False


# Add the parent directory to sys.path so pickle can find the 'model' module
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from model.hybrid import get_recommendations
import model.hybrid

load_dotenv()

app = FastAPI(title="CineSense API")

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
    # Load the model on startup so the first request isn't slow
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


@app.get("/recommend")
def recommend(title: str = Query(..., description="Movie title to search for"), n: int = Query(10, ge=1, le=50)):
    recommender = getattr(model.hybrid, "_DEFAULT_RECOMMENDER", None)
    if not recommender:
        raise HTTPException(status_code=500, detail="Recommendation model is not loaded.")

    try:
        recommendations = get_recommendations(movie_title=title, n=n)
        
        # Enrich with poster URLs
        for rec in recommendations:
            rec["poster_url"] = get_poster_url(rec["title"])
            
        return {"query": title, "recommendations": recommendations}
        
    except ValueError as e:
        # Title not found in database, suggest closest titles
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

