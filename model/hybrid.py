"""
model/hybrid.py
---------------
Hybrid Recommendation Engine for CineSense.

Combines Content-Based Filtering (TF-IDF + Cosine Similarity) and
Collaborative Filtering (Matrix Factorization SVD/ALS) into a unified weighted score:
    final_score = alpha * content_similarity + (1 - alpha) * collaborative_score

Features:
- O(1) Hashmap lookups for movie titles, IDs, indices, and metadata.
- O(n log k) fast Top-N retrieval using a Min-Heap (heapq) avoiding O(n log n) sorting.
- Fuzzy/flexible title matching for seamless user query resolution.
- Model serialization via pickle into /models.
"""

import os
import re
import heapq
import pickle
import logging
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import pandas as pd

from .content_based import ContentBasedRecommender
from .collaborative import CollaborativeRecommender

logger = logging.getLogger("CineSense.Hybrid")


class HybridRecommender:
    """
    Weighted Hybrid Movie Recommender combining Content-Based and Collaborative models.
    """

    def __init__(
        self,
        content_model: Optional[ContentBasedRecommender] = None,
        collab_model: Optional[CollaborativeRecommender] = None,
        default_alpha: float = 0.5
    ):
        self.content_model = content_model or ContentBasedRecommender()
        self.collab_model = collab_model or CollaborativeRecommender(model_type="svd")
        self.default_alpha = default_alpha

        # Metadata table
        self.df_movies: Optional[pd.DataFrame] = None

        # O(1) Hashmaps
        self.movie_id_to_idx: Dict[int, int] = {}
        self.idx_to_movie_id: Dict[int, int] = {}
        self.title_to_id: Dict[str, int] = {}
        self.normalized_title_to_id: Dict[str, int] = {}
        self.id_to_metadata: Dict[int, Dict[str, Any]] = {}

        self.is_fitted: bool = False

    @staticmethod
    def _normalize_title(title: str) -> str:
        """Normalizes movie title for case-insensitive and punctuation-tolerant hashmap lookup."""
        title = title.lower().strip()
        # Remove parentheses year if present for flexible match, e.g. "toy story (1995)" -> "toy story"
        clean = re.sub(r"[^\w\s]", "", title)
        return clean.strip()

    def fit(
        self,
        df_movies: pd.DataFrame,
        df_ratings: pd.DataFrame
    ) -> "HybridRecommender":
        """
        Fits both Content-Based and Collaborative Filtering models on dataset.

        Parameters
        ----------
        df_movies : pd.DataFrame
            Cleaned movie records with movieId, title, genres, and metadata.
        df_ratings : pd.DataFrame
            Cleaned ratings with userId, movieId, rating.
        """
        logger.info("Initializing and training CineSense Hybrid Engine...")
        self.df_movies = df_movies.copy()

        # 1. Build O(1) Hashmaps
        logger.info("Building O(1) lookup hashmaps...")
        self.movie_id_to_idx.clear()
        self.idx_to_movie_id.clear()
        self.title_to_id.clear()
        self.normalized_title_to_id.clear()
        self.id_to_metadata.clear()

        for idx, row in self.df_movies.reset_index(drop=True).iterrows():
            m_id = int(row["movieId"])
            title = str(row["title"])

            self.movie_id_to_idx[m_id] = idx
            self.idx_to_movie_id[idx] = m_id
            self.title_to_id[title] = m_id
            self.normalized_title_to_id[self._normalize_title(title)] = m_id

            self.id_to_metadata[m_id] = {
                "movieId": m_id,
                "title": title,
                "genres": str(row.get("genres", "")),
                "avg_rating": float(row.get("avg_rating", 0.0)),
                "rating_count": int(row.get("rating_count", 0)),
                "tags": str(row.get("tags", ""))
            }

        # 2. Fit Content-Based Model
        self.content_model.fit(self.df_movies)

        # 3. Fit Collaborative Model with aligned movie IDs universe
        all_movie_ids = self.df_movies["movieId"].tolist()
        self.collab_model.fit(df_ratings, movie_universe_ids=all_movie_ids)

        self.is_fitted = True
        logger.info("Hybrid Recommender successfully trained on %d movies.", len(self.df_movies))
        return self

    def find_movie_id(self, movie_title: str) -> Optional[int]:
        """
        O(1) lookup with fuzzy fallback to find movieId given a search title string.
        """
        # Exact match
        if movie_title in self.title_to_id:
            return self.title_to_id[movie_title]

        # Normalized exact match
        norm_query = self._normalize_title(movie_title)
        if norm_query in self.normalized_title_to_id:
            return self.normalized_title_to_id[norm_query]

        # Prefix/Substring match
        for norm_title, m_id in self.normalized_title_to_id.items():
            if norm_query in norm_title or norm_title.startswith(norm_query):
                return m_id

        # Word token overlap match
        query_tokens = set(norm_query.split())
        best_match_id = None
        max_overlap = 0

        for norm_title, m_id in self.normalized_title_to_id.items():
            title_tokens = set(norm_title.split())
            overlap = len(query_tokens.intersection(title_tokens))
            if overlap > max_overlap:
                max_overlap = overlap
                best_match_id = m_id

        if max_overlap >= max(1, len(query_tokens) // 2):
            return best_match_id

        return None

    def get_recommendations(
        self,
        movie_title: str,
        n: int = 10,
        alpha: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Calculates hybrid recommendation scores and extracts top-N movies using Min-Heap.

        Algorithm:
        1. Resolve movie_title -> movieId -> index in O(1).
        2. Compute Content Cosine Similarities vector: S_content in O(M).
        3. Compute Collaborative Latent Factor Similarities vector: S_collab in O(M).
        4. Fuse scores: S_hybrid = alpha * S_content + (1 - alpha) * S_collab.
        5. Extract top-N elements using a Min-Heap of capacity N: O(M log N) operations.

        Parameters
        ----------
        movie_title : str
            Title of the query movie.
        n : int, default 10
            Number of recommendations to return.
        alpha : float, optional
            Weight factor in [0, 1]. 1.0 = purely content-based, 0.0 = purely collaborative.
            Defaults to default_alpha (0.5).

        Returns
        -------
        recommendations : List[Dict[str, Any]]
            List of top-N recommendation records.
        """
        if not self.is_fitted:
            raise RuntimeError("HybridRecommender is not trained. Call fit() or load() first.")

        if alpha is None:
            alpha = self.default_alpha
        alpha = float(np.clip(alpha, 0.0, 1.0))

        # 1. Resolve query movie in O(1)
        movie_id = self.find_movie_id(movie_title)
        if movie_id is None or movie_id not in self.movie_id_to_idx:
            available_samples = list(self.title_to_id.keys())[:5]
            raise ValueError(
                f"Movie '{movie_title}' not found in database. Sample titles: {available_samples}"
            )

        target_idx = self.movie_id_to_idx[movie_id]
        target_meta = self.id_to_metadata[movie_id]

        # 2. Target genre set
        target_genres = set(g.strip().lower() for g in target_meta.get("genres", "").split("|") if g.strip())

        # 3. Get content similarity scores
        content_scores = self.content_model.get_similarity_scores(target_idx)

        # 4. Get collaborative similarity scores
        collab_scores = self.collab_model.get_similarity_scores(target_idx)

        # 5. Weighted hybrid fusion with Genre Affinity Filter
        raw_hybrid_scores = (alpha * content_scores) + ((1.0 - alpha) * collab_scores)

        # 6. Top-N retrieval via Min-Heap (heapq) of size k: O(M log k)
        min_heap: List[Tuple[float, int]] = []
        num_candidates = len(raw_hybrid_scores)

        for idx in range(num_candidates):
            if idx == target_idx:
                continue  # Skip query movie itself

            cand_id = self.idx_to_movie_id[idx]
            cand_meta = self.id_to_metadata[cand_id]
            cand_genres = set(g.strip().lower() for g in cand_meta.get("genres", "").split("|") if g.strip())

            # Genre Consistency Match
            overlap_count = len(target_genres.intersection(cand_genres))
            union_count = len(target_genres.union(cand_genres)) or 1
            jaccard = overlap_count / union_count

            # Apply genre consistency factor
            if len(target_genres) > 0:
                if overlap_count == 0:
                    genre_multiplier = 0.25  # Heavily penalize unrelated genres (e.g. Action for Comedy-Drama)
                else:
                    genre_multiplier = 0.70 + 0.30 * jaccard
            else:
                genre_multiplier = 1.0

            final_score = float(raw_hybrid_scores[idx]) * genre_multiplier

            if len(min_heap) < n:
                heapq.heappush(min_heap, (final_score, idx))
            elif final_score > min_heap[0][0]:
                heapq.heapreplace(min_heap, (final_score, idx))

        # Extract items sorted descending
        top_items = sorted(min_heap, key=lambda x: x[0], reverse=True)


        # 6. Format results with full metadata and score breakdown
        results: List[Dict[str, Any]] = []
        for rank, (score, idx) in enumerate(top_items, start=1):
            m_id = self.idx_to_movie_id[idx]
            meta = self.id_to_metadata[m_id]

            results.append({
                "rank": rank,
                "movieId": m_id,
                "title": meta["title"],
                "genres": meta["genres"],
                "final_score": round(score, 4),
                "content_similarity": round(float(content_scores[idx]), 4),
                "collaborative_score": round(float(collab_scores[idx]), 4),
                "avg_rating": meta["avg_rating"],
                "rating_count": meta["rating_count"],
                "alpha_used": alpha,
                "query_movie": target_meta["title"]
            })

        return results

    def save(self, filepath: str) -> None:
        """Serializes trained model to disk using pickle."""
        os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
        logger.info("Saving hybrid recommender model to %s ...", filepath)
        with open(filepath, "wb") as f:
            pickle.dump(self, f, protocol=pickle.HIGHEST_PROTOCOL)
        logger.info("Model saved successfully (%.2f MB).", os.path.getsize(filepath) / (1024 * 1024))

    @classmethod
    def load(cls, filepath: str) -> "HybridRecommender":
        """Deserializes hybrid recommender model from disk."""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Model file not found at: {filepath}")
        logger.info("Loading hybrid recommender model from %s ...", filepath)
        with open(filepath, "rb") as f:
            model = pickle.load(f)
        logger.info("Model loaded successfully.")
        return model


# Global singleton instance for convenient functional API
_DEFAULT_RECOMMENDER: Optional[HybridRecommender] = None


def get_recommendations(
    movie_title: str,
    n: int = 10,
    alpha: float = 0.5,
    model_path: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Convenience function to get top-N movie recommendations.

    Parameters
    ----------
    movie_title : str
        The query movie title (e.g., "Toy Story", "Heat (1995)", "GoldenEye").
    n : int, default 10
        Number of recommended movies to retrieve.
    alpha : float, default 0.5
        Hybrid blending weight (0.0 = Pure Collaborative, 1.0 = Pure Content-Based).
    model_path : str, optional
        Path to serialized model artifact. If None, looks in standard /models location.

    Returns
    -------
    List of recommended movie dictionaries with scores and metadata.
    """
    global _DEFAULT_RECOMMENDER

    if _DEFAULT_RECOMMENDER is None:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        default_path = os.path.join(base_dir, "models", "hybrid_recommender.pkl")
        path_to_use = model_path or default_path

        if not os.path.exists(path_to_use):
            raise FileNotFoundError(
                f"Trained model artifact not found at {path_to_use}. Please run model/train.py first."
            )
        _DEFAULT_RECOMMENDER = HybridRecommender.load(path_to_use)

    return _DEFAULT_RECOMMENDER.get_recommendations(movie_title=movie_title, n=n, alpha=alpha)
