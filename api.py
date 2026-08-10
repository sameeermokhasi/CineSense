"""
api.py
------
FastAPI Backend Server for CineSense Hybrid Movie Recommender System.

Endpoints:
- GET  /health          : Health check
- GET  /stats           : Engine and dataset metrics
- GET  /search          : Instant autocomplete title search
- GET  /autocomplete    : Alias for /search
- POST /recommend       : Get hybrid recommendations for movie_title with n and alpha
- GET  /recommend       : Query parameter alternative for GET requests
"""

import os
import sys
import re
import time
import logging
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import urllib.parse
import urllib.request
import json

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Add project root to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from model.hybrid import HybridRecommender, get_recommendations
from model.train import train_and_save_models

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("CineSense.API")

app = FastAPI(
    title="CineSense API",
    description="Hybrid Movie Recommendation Engine combining Content-Based and Collaborative Filtering",
    version="1.0.0"
)

# Enable CORS for frontend Vite development server and production builds
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Recommender Instance
MODEL_PATH = os.path.join(BASE_DIR, "models", "hybrid_recommender.pkl")
_recommender: Optional[HybridRecommender] = None


# Curated poster fallback mapping for iconic movies
CURATED_POSTERS = {
    "toy story": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    "heat": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    "goldeneye": "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80",
    "jumanji": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    "casino": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80",
    "star wars": "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop&q=80",
    "matrix": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80",
    "godfather": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80",
    "pulp fiction": "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=600&auto=format&fit=crop&q=80",
    "jurassic park": "https://images.unsplash.com/photo-1568832359672-e36cf5d74f54?w=600&auto=format&fit=crop&q=80",
    "interstellar": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
    "inception": "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=600&auto=format&fit=crop&q=80",
    "lion king": "https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=600&auto=format&fit=crop&q=80",
    "batman": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80"
}


def get_poster_url(title: str, genres: str = "") -> str:
    """Generates an aesthetic poster URL based on title match or genre-based theme."""
    title_lower = title.lower()
    for key, url in CURATED_POSTERS.items():
        if key in title_lower:
            return url

    # Genre themed fallbacks
    genres_lower = genres.lower()
    if "animation" in genres_lower or "children" in genres_lower:
        return "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80"
    elif "sci-fi" in genres_lower or "fantasy" in genres_lower:
        return "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80"
    elif "action" in genres_lower or "thriller" in genres_lower:
        return "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80"
    elif "horror" in genres_lower:
        return "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=600&auto=format&fit=crop&q=80"
    elif "romance" in genres_lower or "drama" in genres_lower:
        return "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80"
    elif "comedy" in genres_lower:
        return "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80"

    return "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80"


def get_engine() -> HybridRecommender:
    """Returns the loaded HybridRecommender instance, loading or training if necessary."""
    global _recommender
    if _recommender is None:
        if os.path.exists(MODEL_PATH):
            logger.info("Loading serialized HybridRecommender from %s ...", MODEL_PATH)
            _recommender = HybridRecommender.load(MODEL_PATH)
        else:
            logger.info("Model not found. Initializing engine from data...")
            _recommender = train_and_save_models(collab_algo="svd", n_factors=50, max_ratings=1000000, alpha=0.5)
    return _recommender


# Request & Response Schemas
class RecommendRequest(BaseModel):
    movie_title: str = Field(..., example="Toy Story (1995)", description="Target movie title")
    n: int = Field(10, ge=1, le=50, description="Number of recommendations")
    alpha: float = Field(0.5, ge=0.0, le=1.0, description="Hybrid blend alpha weight (0=Collab, 1=Content)")


class MovieSearchResult(BaseModel):
    movieId: int
    title: str
    genres: str
    year: Optional[str] = None
    avg_rating: float
    rating_count: int


class RecommendationItem(BaseModel):
    rank: int
    movieId: int
    title: str
    genres: str
    final_score: float
    content_similarity: float
    collaborative_score: float
    avg_rating: float
    rating_count: int
    poster_url: str
    year: Optional[str] = None


class RecommendResponse(BaseModel):
    query_movie: str
    query_movieId: int
    query_genres: str
    query_poster_url: str
    alpha: float
    count: int
    latency_ms: float
    recommendations: List[RecommendationItem]


@app.on_event("startup")
async def startup_event():
    """Warm up the recommender engine on startup."""
    try:
        get_engine()
        logger.info("CineSense engine successfully warmed up.")
    except Exception as e:
        logger.warning("Engine warm-up deferred: %s", e)


@app.get("/")
def root():
    return {
        "service": "CineSense Hybrid Movie Recommender API",
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs"
    }


@app.get("/health")
def health():
    return {"status": "healthy", "timestamp": time.time()}


@app.get("/stats")
def get_stats():
    """Returns dataset and engine metrics."""
    engine = get_engine()
    total_movies = len(engine.df_movies) if engine.df_movies is not None else 0
    return {
        "total_movies": total_movies,
        "is_fitted": engine.is_fitted,
        "default_alpha": engine.default_alpha,
        "collaborative_model": engine.collab_model.model_type.upper(),
        "content_vocabulary_size": engine.content_model.tfidf_matrix.shape[1] if engine.content_model.tfidf_matrix is not None else 0
    }


@app.get("/search", response_model=List[MovieSearchResult])
@app.get("/autocomplete", response_model=List[MovieSearchResult])
def autocomplete_movies(q: str = Query(..., min_length=1, description="Search query string"), limit: int = 10):
    """
    High-speed autocomplete search endpoint for movie titles using O(1) hashmaps and prefix index.
    """
    engine = get_engine()
    if not engine.is_fitted:
        raise HTTPException(status_code=503, detail="Recommender engine is not ready.")

    query_norm = HybridRecommender._normalize_title(q)
    matched_ids = []

    # 1. Exact or prefix matches in normalized index
    for norm_title, m_id in engine.normalized_title_to_id.items():
        if norm_title.startswith(query_norm) or query_norm in norm_title:
            matched_ids.append(m_id)
            if len(matched_ids) >= limit:
                break

    # 2. Token overlap fallback if fewer than limit found
    if len(matched_ids) < limit:
        query_tokens = set(query_norm.split())
        for norm_title, m_id in engine.normalized_title_to_id.items():
            if m_id in matched_ids:
                continue
            title_tokens = set(norm_title.split())
            if query_tokens.intersection(title_tokens):
                matched_ids.append(m_id)
                if len(matched_ids) >= limit:
                    break

    results = []
    for m_id in matched_ids:
        meta = engine.id_to_metadata.get(m_id, {})
        title = meta.get("title", "")
        # Extract year if present, e.g. "Toy Story (1995)"
        year_match = re.search(r"\((\d{4})\)", title)
        year = year_match.group(1) if year_match else None

        results.append(MovieSearchResult(
            movieId=m_id,
            title=title,
            genres=meta.get("genres", ""),
            year=year,
            avg_rating=meta.get("avg_rating", 0.0),
            rating_count=meta.get("rating_count", 0)
        ))

    return results


@app.post("/recommend", response_model=RecommendResponse)
def post_recommendations(req: RecommendRequest):
    """Generates hybrid recommendations for a given movie title via POST payload."""
    return handle_recommendation(req.movie_title, req.n, req.alpha)


@app.get("/recommend", response_model=RecommendResponse)
def get_recommend_endpoint(
    movie_title: str = Query(..., description="Movie title"),
    n: int = Query(10, ge=1, le=50),
    alpha: float = Query(0.5, ge=0.0, le=1.0)
):
    """Generates hybrid recommendations for a given movie title via GET query params."""
    return handle_recommendation(movie_title, n, alpha)


def handle_recommendation(movie_title: str, n: int, alpha: float) -> RecommendResponse:
    t0 = time.time()
    engine = get_engine()

    try:
        recs = engine.get_recommendations(movie_title=movie_title, n=n, alpha=alpha)
    except ValueError as e:
        # Search for closest suggestions
        suggestions = autocomplete_movies(q=movie_title[:4] if len(movie_title) >= 4 else movie_title, limit=5)
        raise HTTPException(
            status_code=404,
            detail={
                "message": str(e),
                "query": movie_title,
                "suggestions": [s.title for s in suggestions]
            }
        )

    latency_ms = (time.time() - t0) * 1000.0

    # Query movie metadata
    target_id = engine.find_movie_id(movie_title)
    target_meta = engine.id_to_metadata.get(target_id, {})
    query_title = target_meta.get("title", movie_title)
    query_genres = target_meta.get("genres", "")
    query_poster = get_poster_url(query_title, query_genres)

    items = []
    for r in recs:
        year_match = re.search(r"\((\d{4})\)", r["title"])
        year = year_match.group(1) if year_match else None
        poster = get_poster_url(r["title"], r["genres"])

        items.append(RecommendationItem(
            rank=r["rank"],
            movieId=r["movieId"],
            title=r["title"],
            genres=r["genres"],
            final_score=r["final_score"],
            content_similarity=r["content_similarity"],
            collaborative_score=r["collaborative_score"],
            avg_rating=r["avg_rating"],
            rating_count=r["rating_count"],
            poster_url=poster,
            year=year
        ))

    return RecommendResponse(
        query_movie=query_title,
        query_movieId=target_id or 0,
        query_genres=query_genres,
        query_poster_url=query_poster,
        alpha=alpha,
        count=len(items),
        latency_ms=round(latency_ms, 2),
        recommendations=items
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
