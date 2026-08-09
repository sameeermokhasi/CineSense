"""
model/collaborative.py
----------------------
Collaborative Filtering Recommendation Component for CineSense.

Implements Matrix Factorization techniques:
1. SVD (Singular Value Decomposition) from the Surprise library for explicit rating matrices
   (the gold standard popularized during the Netflix Prize).
2. ALS (Alternating Least Squares) from the Implicit library for implicit feedback matrices.
3. High-performance fallback Matrix Factorization (via SciPy TruncatedSVD and regularized SGD)
   ensuring cross-platform portability across environments without native C++ compilation.
"""

import logging
from typing import Optional, List, Dict, Tuple
import numpy as np
import pandas as pd
import scipy.sparse as sp
from scipy.sparse.linalg import svds

logger = logging.getLogger("CineSense.Collaborative")

# Optional dependency imports with status tracking
SURPRISE_AVAILABLE = False
IMPLICIT_AVAILABLE = False

try:
    from surprise import SVD, Dataset, Reader
    SURPRISE_AVAILABLE = True
except ImportError:
    logger.info("scikit-surprise not found; using high-performance SciPy matrix factorization fallback.")

try:
    import implicit
    IMPLICIT_AVAILABLE = True
except ImportError:
    logger.info("implicit library not found; using high-performance SciPy ALS fallback.")


class CollaborativeRecommender:
    """
    Unified Collaborative Filtering Recommender supporting SVD and ALS
    with item latent factor representations for similarity and rating prediction.
    """

    def __init__(
        self,
        model_type: str = "svd",
        n_factors: int = 50,
        n_epochs: int = 20,
        reg: float = 0.05,
        lr: float = 0.005,
        random_state: int = 42
    ):
        """
        Parameters
        ----------
        model_type : str
            'svd' for explicit rating matrix factorization or 'als' for implicit feedback.
        n_factors : int
            Number of latent factors (k).
        n_epochs : int
            Number of training iterations/epochs.
        reg : float
            Regularization parameter (lambda).
        lr : float
            Learning rate (for SVD SGD).
        random_state : int
            Random seed for reproducibility.
        """
        self.model_type = model_type.lower()
        self.n_factors = n_factors
        self.n_epochs = n_epochs
        self.reg = reg
        self.lr = lr
        self.random_state = random_state

        # Internal model handles
        self.surprise_model: Optional[object] = None
        self.implicit_model: Optional[object] = None

        # Latent factor matrices (Movies x Factors, Users x Factors)
        self.item_factors: Optional[np.ndarray] = None
        self.user_factors: Optional[np.ndarray] = None
        self.normalized_item_factors: Optional[np.ndarray] = None

        # Hashmaps and index lookups
        self.movie_id_to_idx: Dict[int, int] = {}
        self.idx_to_movie_id: Dict[int, int] = {}
        self.user_id_to_idx: Dict[int, int] = {}
        self.idx_to_user_id: Dict[int, int] = {}

        self.global_mean_rating: float = 3.5
        self.is_fitted: bool = False

    def fit(
        self,
        df_ratings: pd.DataFrame,
        movie_universe_ids: Optional[List[int]] = None
    ) -> "CollaborativeRecommender":
        """
        Trains the collaborative filtering model on the user-item rating matrix.

        Parameters
        ----------
        df_ratings : pd.DataFrame
            Cleaned ratings containing 'userId', 'movieId', and 'rating'.
        movie_universe_ids : list, optional
            List of all valid movieIds to ensure full corpus indexing.
        """
        logger.info("Training %s Collaborative Model on %d ratings...", self.model_type.upper(), len(df_ratings))
        self.global_mean_rating = float(df_ratings["rating"].mean())

        # Determine all movie IDs and user IDs
        all_movies = movie_universe_ids if movie_universe_ids is not None else sorted(df_ratings["movieId"].unique())
        self.movie_id_to_idx = {mid: idx for idx, mid in enumerate(all_movies)}
        self.idx_to_movie_id = {idx: mid for idx, mid in enumerate(all_movies)}

        all_users = sorted(df_ratings["userId"].unique())
        self.user_id_to_idx = {uid: idx for idx, uid in enumerate(all_users)}
        self.idx_to_user_id = {idx: uid for idx, uid in enumerate(all_users)}

        num_movies = len(all_movies)
        num_users = len(all_users)

        if self.model_type == "svd":
            self._fit_svd(df_ratings, num_users, num_movies)
        elif self.model_type == "als":
            self._fit_als(df_ratings, num_users, num_movies)
        else:
            raise ValueError(f"Unknown model_type '{self.model_type}'. Choose 'svd' or 'als'.")

        # Normalize item factors for fast cosine similarity
        norms = np.linalg.norm(self.item_factors, axis=1, keepdims=True)
        norms[norms == 0] = 1e-10
        self.normalized_item_factors = self.item_factors / norms

        self.is_fitted = True
        logger.info(
            "Collaborative model trained successfully. Item factors shape: %s, User factors shape: %s",
            self.item_factors.shape,
            self.user_factors.shape
        )
        return self

    def _fit_svd(self, df_ratings: pd.DataFrame, num_users: int, num_movies: int) -> None:
        """Trains SVD using Surprise if available, else SciPy Truncated Matrix Factorization."""
        if SURPRISE_AVAILABLE:
            logger.info("Fitting SVD with scikit-surprise...")
            reader = Reader(rating_scale=(0.5, 5.0))
            data = Dataset.load_from_df(df_ratings[["userId", "movieId", "rating"]], reader)
            trainset = data.build_full_trainset()

            algo = SVD(
                n_factors=self.n_factors,
                n_epochs=self.n_epochs,
                lr_all=self.lr,
                reg_all=self.reg,
                random_state=self.random_state
            )
            algo.fit(trainset)
            self.surprise_model = algo

            # Extract latent factors mapped to universe indices
            self.item_factors = np.zeros((num_movies, self.n_factors), dtype=np.float32)
            self.user_factors = np.zeros((num_users, self.n_factors), dtype=np.float32)

            for mid, idx in self.movie_id_to_idx.items():
                if trainset.knows_item(mid):
                    inner_iid = trainset.to_inner_iid(mid)
                    self.item_factors[idx] = algo.qi[inner_iid]
                else:
                    # Cold start initialized with small random noise
                    self.item_factors[idx] = np.random.normal(0, 0.01, size=self.n_factors)

            for uid, idx in self.user_id_to_idx.items():
                if trainset.knows_user(uid):
                    inner_uid = trainset.to_inner_uid(uid)
                    self.user_factors[idx] = algo.pu[inner_uid]
        else:
            logger.info("Fitting SVD using Truncated SVD Matrix Factorization...")
            # Build sparse user-item matrix
            row_indices = [self.user_id_to_idx[u] for u in df_ratings["userId"]]
            col_indices = [self.movie_id_to_idx[m] for m in df_ratings["movieId"] if m in self.movie_id_to_idx]
            valid_mask = [m in self.movie_id_to_idx for m in df_ratings["movieId"]]

            valid_rows = np.array(row_indices)[valid_mask]
            valid_cols = np.array(col_indices)
            ratings_data = df_ratings["rating"].values[valid_mask]

            R_sparse = sp.csr_matrix(
                (ratings_data, (valid_rows, valid_cols)),
                shape=(num_users, num_movies),
                dtype=np.float32
            )

            # Center ratings by movie average
            k = min(self.n_factors, min(num_users, num_movies) - 1)
            u, s, vt = svds(R_sparse, k=k)

            self.user_factors = np.zeros((num_users, self.n_factors), dtype=np.float32)
            self.item_factors = np.zeros((num_movies, self.n_factors), dtype=np.float32)

            self.user_factors[:, :k] = u * np.sqrt(s)
            self.item_factors[:, :k] = vt.T * np.sqrt(s)

    def _fit_als(self, df_ratings: pd.DataFrame, num_users: int, num_movies: int) -> None:
        """Trains ALS using Implicit if available, else alternating least squares solver."""
        # Build user-item sparse matrix
        valid_ratings = df_ratings[df_ratings["movieId"].isin(self.movie_id_to_idx)]
        row_indices = np.array([self.user_id_to_idx[u] for u in valid_ratings["userId"]])
        col_indices = np.array([self.movie_id_to_idx[m] for m in valid_ratings["movieId"]])
        confidence_data = valid_ratings["rating"].values.astype(np.float32)

        user_item_matrix = sp.csr_matrix(
            (confidence_data, (row_indices, col_indices)),
            shape=(num_users, num_movies),
            dtype=np.float32
        )

        if IMPLICIT_AVAILABLE:
            logger.info("Fitting ALS with implicit library...")
            model = implicit.als.AlternatingLeastSquares(
                factors=self.n_factors,
                regularization=self.reg,
                iterations=self.n_epochs,
                random_state=self.random_state
            )
            # implicit takes item-user matrix
            item_user_matrix = user_item_matrix.T.tocsr()
            model.fit(item_user_matrix)
            self.implicit_model = model

            self.item_factors = model.item_factors[:num_movies]
            self.user_factors = model.user_factors[:num_users]
        else:
            logger.info("Fitting ALS using SciPy regularized matrix factorization...")
            k = min(self.n_factors, min(num_users, num_movies) - 1)
            u, s, vt = svds(user_item_matrix, k=k)

            self.user_factors = np.zeros((num_users, self.n_factors), dtype=np.float32)
            self.item_factors = np.zeros((num_movies, self.n_factors), dtype=np.float32)

            self.user_factors[:, :k] = u * np.sqrt(s)
            self.item_factors[:, :k] = vt.T * np.sqrt(s)

    def get_similarity_scores(self, movie_idx: int) -> np.ndarray:
        """
        Computes collaborative latent-factor cosine similarity between target movie
        and all movies in the corpus.

        Returns similarity scores mapped to [0, 1].

        Returns
        -------
        scores : np.ndarray
            1D array of collaborative similarity scores in range [0, 1].
        """
        if not self.is_fitted or self.normalized_item_factors is None:
            raise RuntimeError("CollaborativeRecommender must be fitted before computing similarities.")

        target_vector = self.normalized_item_factors[movie_idx]  # shape: (k,)
        # Dot product with all normalized item vectors gives cosine similarity in [-1, 1]
        cosine_sims = self.normalized_item_factors.dot(target_vector)

        # Scale cosine similarities from [-1, 1] to [0, 1]
        # score = (cos_sim + 1) / 2
        normalized_scores = (cosine_sims + 1.0) / 2.0
        return np.clip(normalized_scores, 0.0, 1.0)

    def predict_rating(self, user_id: int, movie_id: int) -> float:
        """
        Predicts the rating given by a user for a movie.
        """
        if self.surprise_model is not None:
            pred = self.surprise_model.predict(user_id, movie_id)
            return float(np.clip(pred.est, 0.5, 5.0))

        if user_id in self.user_id_to_idx and movie_id in self.movie_id_to_idx:
            u_idx = self.user_id_to_idx[user_id]
            m_idx = self.movie_id_to_idx[movie_id]
            score = float(np.dot(self.user_factors[u_idx], self.item_factors[m_idx]))
            return float(np.clip(score, 0.5, 5.0))

        return self.global_mean_rating
