"""
CineSense Model Package
-----------------------
Hybrid Movie Recommendation System combining Content-Based and Collaborative Filtering.
"""

from .content_based import ContentBasedRecommender
from .collaborative import CollaborativeRecommender
from .hybrid import HybridRecommender, get_recommendations

__all__ = [
    "ContentBasedRecommender",
    "CollaborativeRecommender",
    "HybridRecommender",
    "get_recommendations"
]
