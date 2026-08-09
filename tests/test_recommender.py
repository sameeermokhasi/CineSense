"""
tests/test_recommender.py
-------------------------
Unit and integration tests for CineSense hybrid recommender system.
"""

import os
import sys
import unittest
import numpy as np
import pandas as pd

# Add project root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from model.content_based import ContentBasedRecommender
from model.collaborative import CollaborativeRecommender
from model.hybrid import HybridRecommender, get_recommendations
from load_data import standardize_columns


class TestCineSense(unittest.TestCase):

    def setUp(self):
        # Synthetic mock dataset for fast deterministic unit tests
        self.movies_data = pd.DataFrame({
            "movieId": [1, 2, 3, 4, 5],
            "title": [
                "Toy Story (1995)",
                "Jumanji (1995)",
                "Grumpier Old Men (1995)",
                "Heat (1995)",
                "Toy Story 2 (1999)"
            ],
            "genres": [
                "Adventure|Animation|Children|Comedy|Fantasy",
                "Adventure|Children|Fantasy",
                "Comedy|Romance",
                "Action|Crime|Thriller",
                "Adventure|Animation|Children|Comedy|Fantasy"
            ],
            "tags": ["pixar animation buddy", "board game jungle magic", "old men comedy", "heist al pacino deniro", "pixar toys sequel"],
            "avg_rating": [4.2, 3.8, 3.2, 4.1, 4.0],
            "rating_count": [50000, 25000, 12000, 35000, 42000],
            "combined_features": [
                "Adventure Animation Children Comedy Fantasy pixar animation buddy",
                "Adventure Children Fantasy board game jungle magic",
                "Comedy Romance old men comedy",
                "Action Crime Thriller heist al pacino deniro",
                "Adventure Animation Children Comedy Fantasy pixar toys sequel"
            ]
        })

        self.ratings_data = pd.DataFrame({
            "userId": [1, 1, 1, 2, 2, 3, 3, 3, 4, 4, 5, 5],
            "movieId": [1, 5, 2, 1, 5, 4, 3, 1, 2, 5, 1, 4],
            "rating": [5.0, 4.5, 3.0, 4.5, 5.0, 4.5, 3.5, 4.0, 3.5, 4.0, 5.0, 4.0]
        })

    def test_column_standardization(self):
        messy_df = pd.DataFrame({
            "Movie_Id": [1],
            "Movie_Title": ["Test"],
            "Genre": ["Action"],
            "User_Id": [10],
            "Ratings": [4.5]
        })
        std_df = standardize_columns(messy_df)
        self.assertIn("movieId", std_df.columns)
        self.assertIn("title", std_df.columns)
        self.assertIn("genres", std_df.columns)
        self.assertIn("userId", std_df.columns)
        self.assertIn("rating", std_df.columns)

    def test_content_based_recommender(self):
        cb = ContentBasedRecommender()
        cb.fit(self.movies_data)
        self.assertTrue(cb.is_fitted)
        self.assertIsNotNone(cb.tfidf_matrix)

        # Toy Story (idx 0) and Toy Story 2 (idx 4) should have highest content similarity
        scores = cb.get_similarity_scores(movie_idx=0)
        self.assertEqual(len(scores), len(self.movies_data))
        # Self similarity should be 1.0
        self.assertAlmostEqual(scores[0], 1.0, places=4)
        # Toy Story 2 similarity should be high
        self.assertGreater(scores[4], scores[3])  # Toy Story 2 vs Heat

    def test_collaborative_recommender(self):
        collab = CollaborativeRecommender(model_type="svd", n_factors=4, n_epochs=5)
        collab.fit(self.ratings_data, movie_universe_ids=self.movies_data["movieId"].tolist())
        self.assertTrue(collab.is_fitted)

        scores = collab.get_similarity_scores(movie_idx=0)
        self.assertEqual(len(scores), len(self.movies_data))
        # All scores should be within [0, 1]
        self.assertTrue(np.all(scores >= 0.0))
        self.assertTrue(np.all(scores <= 1.0))

    def test_hybrid_engine_and_heap_top_n(self):
        hybrid = HybridRecommender()
        hybrid.fit(self.movies_data, self.ratings_data)
        self.assertTrue(hybrid.is_fitted)

        # Test O(1) title lookups
        m_id = hybrid.find_movie_id("Toy Story")
        self.assertEqual(m_id, 1)

        # Test Top-N recommendations
        recs = hybrid.get_recommendations("Toy Story", n=3, alpha=0.5)
        self.assertEqual(len(recs), 3)

        # Verify sorted descending order from Min-Heap extraction
        final_scores = [r["final_score"] for r in recs]
        self.assertEqual(final_scores, sorted(final_scores, reverse=True))

        # Verify no self-recommendation
        rec_ids = [r["movieId"] for r in recs]
        self.assertNotIn(1, rec_ids)

    def test_alpha_extremes(self):
        hybrid = HybridRecommender()
        hybrid.fit(self.movies_data, self.ratings_data)

        # Alpha = 1.0 (pure content)
        recs_content = hybrid.get_recommendations("Toy Story", n=2, alpha=1.0)
        for r in recs_content:
            self.assertAlmostEqual(r["final_score"], r["content_similarity"], places=3)

        # Alpha = 0.0 (pure collab)
        recs_collab = hybrid.get_recommendations("Toy Story", n=2, alpha=0.0)
        for r in recs_collab:
            self.assertAlmostEqual(r["final_score"], r["collaborative_score"], places=3)


if __name__ == "__main__":
    unittest.main()
