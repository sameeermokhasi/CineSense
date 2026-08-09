"""
model/train.py
--------------
Training and serialization pipeline for CineSense.

Responsibilities:
1. Load cleaned datasets from data/movies_clean.csv and data/ratings_clean.csv.
2. Train Content-Based model (TF-IDF on genres + tags with sparse cosine similarity).
3. Train Collaborative Filtering model (SVD / ALS Matrix Factorization).
4. Construct and calibrate HybridRecommender with O(1) hashmaps and min-heap retrieval.
5. Save serialized models to /models directory using pickle.
6. Run test inference and display sample recommendations.
"""

import os
import sys
import time
import pickle
import logging
import argparse
import pandas as pd

# Add parent directory to path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from model.content_based import ContentBasedRecommender
from model.collaborative import CollaborativeRecommender
from model.hybrid import HybridRecommender
from load_data import process_and_merge_data, DATA_DIR

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("CineSense.Train")

MODELS_DIR = os.path.join(BASE_DIR, "models")


def train_and_save_models(
    collab_algo: str = "svd",
    n_factors: int = 50,
    max_ratings: int = 1000000,
    alpha: float = 0.5,
    save_individual_models: bool = True
) -> HybridRecommender:
    """
    Executes end-to-end training and saves artifacts to /models.

    Parameters
    ----------
    collab_algo : str
        'svd' (Surprise / Matrix Factorization) or 'als' (Implicit feedback).
    n_factors : int
        Number of latent dimensions for collaborative filtering.
    max_ratings : int
        Maximum number of rating rows to train collaborative filter on (for fast convergence and memory safety).
    alpha : float
        Default blending coefficient for hybrid score.
    save_individual_models : bool
        Whether to save individual sub-model pickles in addition to the hybrid bundle.
    """
    os.makedirs(MODELS_DIR, exist_ok=True)
    start_time = time.time()

    # 1. Ensure clean data exists
    movies_clean_path = os.path.join(DATA_DIR, "movies_clean.csv")
    ratings_clean_path = os.path.join(DATA_DIR, "ratings_clean.csv")

    if not os.path.exists(movies_clean_path) or not os.path.exists(ratings_clean_path):
        logger.info("Clean data not found in %s. Running data ingestion pipeline...", DATA_DIR)
        df_movies, df_ratings = process_and_merge_data(max_ratings_rows=max_ratings)
    else:
        logger.info("Loading cleaned movies from %s ...", movies_clean_path)
        df_movies = pd.read_csv(movies_clean_path)
        logger.info("Loading cleaned ratings from %s (up to %d rows) ...", ratings_clean_path, max_ratings)
        df_ratings = pd.read_csv(ratings_clean_path, nrows=max_ratings)

    logger.info("Dataset loaded: %d movies, %d ratings.", len(df_movies), len(df_ratings))

    # 2. Instantiate Models
    content_model = ContentBasedRecommender(max_features=15000, ngram_range=(1, 2))
    collab_model = CollaborativeRecommender(
        model_type=collab_algo,
        n_factors=n_factors,
        n_epochs=20,
        reg=0.05
    )

    hybrid_engine = HybridRecommender(
        content_model=content_model,
        collab_model=collab_model,
        default_alpha=alpha
    )

    # 3. Train Hybrid Recommender
    logger.info("Training CineSense Recommender System...")
    hybrid_engine.fit(df_movies=df_movies, df_ratings=df_ratings)

    # 4. Save Artifacts using pickle
    hybrid_path = os.path.join(MODELS_DIR, "hybrid_recommender.pkl")
    hybrid_engine.save(hybrid_path)

    if save_individual_models:
        content_path = os.path.join(MODELS_DIR, "content_model.pkl")
        collab_path = os.path.join(MODELS_DIR, "collab_model.pkl")
        meta_path = os.path.join(MODELS_DIR, "metadata.pkl")

        logger.info("Saving individual sub-model artifacts...")
        with open(content_path, "wb") as f:
            pickle.dump(content_model, f, protocol=pickle.HIGHEST_PROTOCOL)
        with open(collab_path, "wb") as f:
            pickle.dump(collab_model, f, protocol=pickle.HIGHEST_PROTOCOL)
        with open(meta_path, "wb") as f:
            pickle.dump({
                "movie_id_to_idx": hybrid_engine.movie_id_to_idx,
                "idx_to_movie_id": hybrid_engine.idx_to_movie_id,
                "title_to_id": hybrid_engine.title_to_id,
                "id_to_metadata": hybrid_engine.id_to_metadata,
                "default_alpha": alpha
            }, f, protocol=pickle.HIGHEST_PROTOCOL)

    elapsed = time.time() - start_time
    logger.info("Training and serialization completed in %.2f seconds.", elapsed)

    # 5. Sanity test recommendation
    test_titles = ["Toy Story (1995)", "Heat (1995)", "GoldenEye (1995)"]
    print("\n" + "=" * 80)
    print("                    CineSense Verification & Demo Run")
    print("=" * 80)

    for test_title in test_titles:
        try:
            print(f"\n Recommendations for: '{test_title}' (alpha={alpha}):")
            print("-" * 80)
            recs = hybrid_engine.get_recommendations(test_title, n=5, alpha=alpha)
            for r in recs:
                print(
                    f" #{r['rank']} {r['title'][:32]:<32} | "
                    f"Score: {r['final_score']:.4f} [Content: {r['content_similarity']:.4f}, "
                    f"Collab: {r['collaborative_score']:.4f}] | "
                    f"Rating: {r['avg_rating']}* ({r['rating_count']} reviews) | "
                    f"Genres: {r['genres'][:22]}"
                )
        except Exception as e:
            logger.error("Error during test recommendation for '%s': %s", test_title, e)

    print("=" * 80 + "\n")
    return hybrid_engine


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train CineSense Hybrid Movie Recommender")
    parser.add_argument("--collab", choices=["svd", "als"], default="svd", help="Collaborative algorithm (svd or als)")
    parser.add_argument("--factors", type=int, default=50, help="Number of latent factors (default: 50)")
    parser.add_argument("--ratings-limit", type=int, default=1000000, help="Ratings sample limit for training (default: 1M)")
    parser.add_argument("--alpha", type=float, default=0.5, help="Default alpha weight (default: 0.5)")

    args = parser.parse_args()
    train_and_save_models(
        collab_algo=args.collab,
        n_factors=args.factors,
        max_ratings=args.ratings_limit,
        alpha=args.alpha
    )
