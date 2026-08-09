"""
model/content_based.py
----------------------
Content-Based Movie Recommendation Component for CineSense.

Uses scikit-learn's TfidfVectorizer to vectorize genres, titles, and aggregated tags
into sparse matrices, computing cosine similarities on-the-fly using scipy.sparse
for maximum memory efficiency and speed without allocating full dense similarity matrices.
"""

import logging
from typing import List, Tuple, Optional, Dict
import numpy as np
import pandas as pd
import scipy.sparse as sp
from sklearn.feature_extraction.text import TfidfVectorizer

logger = logging.getLogger("CineSense.ContentBased")


class ContentBasedRecommender:
    """
    Content-Based Recommendation Engine using sparse TF-IDF and Cosine Similarity.
    """

    def __init__(self, max_features: int = 10000, ngram_range: Tuple[int, int] = (1, 2)):
        self.vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=max_features,
            ngram_range=ngram_range,
            sublinear_tf=True,
            norm="l2"
        )
        self.tfidf_matrix: Optional[sp.csr_matrix] = None
        self.movie_ids: List[int] = []
        self.movie_id_to_idx: Dict[int, int] = {}
        self.idx_to_movie_id: Dict[int, int] = {}
        self.is_fitted: bool = False

    def fit(self, df_movies: pd.DataFrame) -> "ContentBasedRecommender":
        """
        Fits the TF-IDF vectorizer on movie content (genres + tags + title keywords).

        Parameters
        ----------
        df_movies : pd.DataFrame
            DataFrame containing 'movieId', 'title', 'genres', and optional 'tags' or 'combined_features'.
        """
        logger.info("Fitting Content-Based model on %d movies...", len(df_movies))

        # Build feature text
        if "combined_features" in df_movies.columns:
            feature_text = df_movies["combined_features"].fillna("")
        else:
            genres = df_movies["genres"].str.replace("|", " ", regex=False).fillna("")
            tags = df_movies["tags"].fillna("") if "tags" in df_movies.columns else ""
            titles = df_movies["title"].fillna("")
            feature_text = (genres + " " + tags + " " + titles).str.strip()

        # Transform to sparse CSR matrix (L2-normalized rows)
        self.tfidf_matrix = self.vectorizer.fit_transform(feature_text).tocsr()

        # Build fast index mappings
        self.movie_ids = df_movies["movieId"].tolist()
        self.movie_id_to_idx = {mid: idx for idx, mid in enumerate(self.movie_ids)}
        self.idx_to_movie_id = {idx: mid for idx, mid in enumerate(self.movie_ids)}

        self.is_fitted = True
        logger.info(
            "TF-IDF Matrix built: shape=%s, non-zero entries=%d, memory=%.2f MB",
            self.tfidf_matrix.shape,
            self.tfidf_matrix.nnz,
            (self.tfidf_matrix.data.nbytes + self.tfidf_matrix.indices.nbytes + self.tfidf_matrix.indptr.nbytes) / (1024 * 1024)
        )
        return self

    def get_similarity_scores(self, movie_idx: int) -> np.ndarray:
        """
        Computes cosine similarity between target movie and ALL movies in the dataset
        via sparse dot product: sim = TFIDF_matrix * movie_vector^T.

        Since rows are L2-normalized, cosine similarity equals the dot product.
        Time complexity: O(nnz_query * avg_doc_len), memory: O(N) instead of O(N^2).

        Returns
        -------
        scores : np.ndarray
            1D array of cosine similarity scores in range [0, 1] for each movie index.
        """
        if not self.is_fitted or self.tfidf_matrix is None:
            raise RuntimeError("ContentBasedRecommender must be fitted before computing similarities.")

        movie_vector = self.tfidf_matrix[movie_idx]  # 1 x Vocab sparse vector
        # Compute dot product against all rows
        scores = self.tfidf_matrix.dot(movie_vector.T).toarray().ravel()
        return scores

    def get_top_n_similar_by_index(
        self,
        movie_idx: int,
        n: int = 10,
        exclude_self: bool = True
    ) -> List[Tuple[int, float]]:
        """
        Returns top-N most similar movie indices and their similarity scores.
        """
        scores = self.get_similarity_scores(movie_idx)
        if exclude_self:
            scores[movie_idx] = -1.0  # Exclude target movie itself

        top_indices = np.argpartition(scores, -n)[-n:]
        top_indices = top_indices[np.argsort(-scores[top_indices])]

        return [(int(idx), float(scores[idx])) for idx in top_indices if scores[idx] > 0]
