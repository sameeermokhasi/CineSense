import os
import sys
import logging
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import requests
from rapidfuzz import process, fuzz

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
        # Title not found in database, use rapidfuzz to suggest titles
        all_titles = list(recommender.title_to_id.keys())
        # Find closest matches
        matches = process.extract(title, all_titles, scorer=fuzz.ratio, limit=5)
        suggestions = [match[0] for match in matches if match[1] > 50]
            
        raise HTTPException(
            status_code=404, 
            detail={
                "error": str(e),
                "suggestions": suggestions
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
