"""
load_data.py
------------
Data ingestion, cleaning, and preprocessing pipeline for CineSense.

Responsibilities:
1. Ensure /data directory exists and populate with raw CSVs from /archive or existing sources.
2. Clean data:
   - Handle missing values
   - Remove duplicate rows
   - Standardize column names (movieId, title, genres, userId, rating, timestamp)
   - Merge user tags into movie metadata
3. Compute rating statistics and merge movies with ratings data.
4. Save cleaned dataset to data/movies_clean.csv and data/ratings_clean.csv.
5. Output summary statistics (movies, users, ratings, genres, rating density).
"""

import os
import shutil
import logging
from typing import Tuple, Optional
import pandas as pd
import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("CineSense.DataLoader")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ARCHIVE_DIR = os.path.join(BASE_DIR, "archive")
DATA_DIR = os.path.join(BASE_DIR, "data")


def ensure_data_directory() -> None:
    """Creates the data directory if it does not already exist."""
    os.makedirs(DATA_DIR, exist_ok=True)
    logger.info("Ensured directory exists: %s", DATA_DIR)


def locate_and_copy_raw_files() -> dict:
    """
    Locates raw CSV files from either archive/ or data/ and copies them
    to data/ with standardized names (movies.csv, ratings.csv, tags.csv, links.csv).
    """
    ensure_data_directory()
    file_mapping = {
        "movies": ["movies.csv", "movie.csv"],
        "ratings": ["ratings.csv", "rating.csv"],
        "tags": ["tags.csv", "tag.csv"],
        "links": ["links.csv", "link.csv"]
    }

    found_paths = {}

    for standard_name, possible_names in file_mapping.items():
        dest_filename = f"{standard_name}.csv"
        dest_path = os.path.join(DATA_DIR, dest_filename)

        # Check if already in data/
        if os.path.exists(dest_path):
            found_paths[standard_name] = dest_path
            continue

        # Look in archive/ or current directory
        source_found = None
        search_dirs = [ARCHIVE_DIR, BASE_DIR]
        for s_dir in search_dirs:
            if not os.path.exists(s_dir):
                continue
            for name in possible_names:
                candidate = os.path.join(s_dir, name)
                if os.path.exists(candidate):
                    source_found = candidate
                    break
            if source_found:
                break

        if source_found:
            logger.info("Copying %s -> %s", source_found, dest_path)
            shutil.copyfile(source_found, dest_path)
            found_paths[standard_name] = dest_path
        else:
            logger.warning("Could not find file candidate for '%s'", standard_name)

    return found_paths


def standardize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Standardizes column names across various MovieLens naming formats."""
    rename_map = {
        "movie_id": "movieId",
        "movieid": "movieId",
        "movie_title": "title",
        "movie_genres": "genres",
        "genre": "genres",
        "user_id": "userId",
        "userid": "userId",
        "user_rating": "rating",
        "ratings": "rating",
        "time_stamp": "timestamp",
        "timestamps": "timestamp",
        "imdb_id": "imdbId",
        "tmdb_id": "tmdbId"
    }
    df = df.rename(columns={c: rename_map.get(c.lower().strip(), c.strip()) for c in df.columns})
    return df


def clean_movies(movies_path: str) -> pd.DataFrame:
    """Loads and cleans movies dataset."""
    logger.info("Loading movies from %s ...", movies_path)
    df_movies = pd.read_csv(movies_path)
    df_movies = standardize_columns(df_movies)

    # Validate essential columns
    required_cols = ["movieId", "title"]
    for col in required_cols:
        if col not in df_movies.columns:
            raise ValueError(f"Missing required column '{col}' in movies dataset.")

    initial_count = len(df_movies)

    # 1. Remove duplicate movies by movieId and by (title, genres)
    df_movies = df_movies.drop_duplicates(subset=["movieId"])
    df_movies = df_movies.drop_duplicates(subset=["title", "genres"]) if "genres" in df_movies.columns else df_movies

    # 2. Handle missing titles or movieIds
    df_movies = df_movies.dropna(subset=["movieId", "title"])
    df_movies["movieId"] = df_movies["movieId"].astype(int)
    df_movies["title"] = df_movies["title"].astype(str).str.strip()

    # 3. Clean genres
    if "genres" in df_movies.columns:
        df_movies["genres"] = df_movies["genres"].fillna("(no genres listed)").astype(str).str.strip()
        df_movies["genres"] = df_movies["genres"].replace({"": "(no genres listed)", "None": "(no genres listed)"})
    else:
        df_movies["genres"] = "(no genres listed)"

    logger.info("Movies cleaned: %d rows retained (dropped %d duplicates/invalid).",
                len(df_movies), initial_count - len(df_movies))
    return df_movies


def clean_tags(tags_path: Optional[str]) -> Optional[pd.DataFrame]:
    """Loads, cleans, and aggregates user tags per movieId."""
    if not tags_path or not os.path.exists(tags_path):
        logger.info("No tags file provided or found.")
        return None

    logger.info("Loading tags from %s ...", tags_path)
    df_tags = pd.read_csv(tags_path)
    df_tags = standardize_columns(df_tags)

    if "movieId" not in df_tags.columns or "tag" not in df_tags.columns:
        logger.warning("Tags file lacks required 'movieId' or 'tag' columns.")
        return None

    df_tags = df_tags.dropna(subset=["movieId", "tag"])
    df_tags["movieId"] = df_tags["movieId"].astype(int)
    df_tags["tag"] = df_tags["tag"].astype(str).str.strip().str.lower()
    df_tags = df_tags[df_tags["tag"] != ""]
    df_tags = df_tags.drop_duplicates(subset=["movieId", "tag"])

    # Aggregate tags into a single space-separated string per movie
    agg_tags = df_tags.groupby("movieId")["tag"].apply(lambda tags: " ".join(tags)).reset_index()
    agg_tags.rename(columns={"tag": "tags"}, inplace=True)
    logger.info("Aggregated tags for %d movies.", len(agg_tags))
    return agg_tags


def clean_ratings(ratings_path: str, max_rows: Optional[int] = None) -> pd.DataFrame:
    """Loads and cleans ratings dataset."""
    logger.info("Loading ratings from %s (max_rows=%s) ...", ratings_path, max_rows)
    df_ratings = pd.read_csv(ratings_path, nrows=max_rows)
    df_ratings = standardize_columns(df_ratings)

    required_cols = ["userId", "movieId", "rating"]
    for col in required_cols:
        if col not in df_ratings.columns:
            raise ValueError(f"Missing required column '{col}' in ratings dataset.")

    initial_count = len(df_ratings)

    # 1. Drop rows with nulls in critical identifiers or ratings
    df_ratings = df_ratings.dropna(subset=["userId", "movieId", "rating"])

    # 2. Convert types
    df_ratings["userId"] = df_ratings["userId"].astype(int)
    df_ratings["movieId"] = df_ratings["movieId"].astype(int)
    df_ratings["rating"] = df_ratings["rating"].astype(float)

    # 3. Filter valid rating ranges (0.5 to 5.0)
    df_ratings = df_ratings[(df_ratings["rating"] >= 0.5) & (df_ratings["rating"] <= 5.0)]

    # 4. Drop duplicate ratings by the same user for the same movie (keep most recent if timestamp exists)
    if "timestamp" in df_ratings.columns:
        df_ratings = df_ratings.sort_values("timestamp").drop_duplicates(subset=["userId", "movieId"], keep="last")
    else:
        df_ratings = df_ratings.drop_duplicates(subset=["userId", "movieId"])

    logger.info("Ratings cleaned: %d rows retained (dropped %d duplicates/invalid).",
                len(df_ratings), initial_count - len(df_ratings))
    return df_ratings


def process_and_merge_data(
    movies_path: Optional[str] = None,
    ratings_path: Optional[str] = None,
    tags_path: Optional[str] = None,
    max_ratings_rows: Optional[int] = None
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Full data pipeline that:
    1. Locates all raw files.
    2. Cleans movies, ratings, and tags.
    3. Merges tags and rating statistics into movies dataframe.
    4. Saves data/movies_clean.csv and data/ratings_clean.csv.
    5. Prints detailed summary statistics.
    """
    raw_files = locate_and_copy_raw_files()

    m_path = movies_path or raw_files.get("movies")
    r_path = ratings_path or raw_files.get("ratings")
    t_path = tags_path or raw_files.get("tags")

    if not m_path or not os.path.exists(m_path):
        raise FileNotFoundError("Movies dataset not found.")
    if not r_path or not os.path.exists(r_path):
        raise FileNotFoundError("Ratings dataset not found.")

    # 1. Clean movies
    df_movies = clean_movies(m_path)

    # 2. Clean tags and merge
    df_tags = clean_tags(t_path)
    if df_tags is not None:
        df_movies = df_movies.merge(df_tags, on="movieId", how="left")
        df_movies["tags"] = df_movies["tags"].fillna("")
    else:
        df_movies["tags"] = ""

    # 3. Clean ratings
    df_ratings = clean_ratings(r_path, max_rows=max_ratings_rows)

    # 4. Compute rating statistics per movie
    logger.info("Computing rating aggregation statistics per movie...")
    rating_stats = df_ratings.groupby("movieId").agg(
        rating_count=("rating", "count"),
        avg_rating=("rating", "mean")
    ).reset_index()

    rating_stats["avg_rating"] = rating_stats["avg_rating"].round(2)

    # 5. Merge movies with rating statistics
    df_movies_clean = df_movies.merge(rating_stats, on="movieId", how="left")
    df_movies_clean["rating_count"] = df_movies_clean["rating_count"].fillna(0).astype(int)
    df_movies_clean["avg_rating"] = df_movies_clean["avg_rating"].fillna(0.0)

    # Create combined content feature column (genres + tags)
    df_movies_clean["combined_features"] = (
        df_movies_clean["genres"].str.replace("|", " ", regex=False) + " " + df_movies_clean["tags"]
    ).str.strip()

    # 6. Save clean outputs to data/
    out_movies_clean = os.path.join(DATA_DIR, "movies_clean.csv")
    out_ratings_clean = os.path.join(DATA_DIR, "ratings_clean.csv")

    df_movies_clean.to_csv(out_movies_clean, index=False)
    logger.info("Saved cleaned movie dataset to: %s", out_movies_clean)

    df_ratings.to_csv(out_ratings_clean, index=False)
    logger.info("Saved cleaned ratings dataset to: %s", out_ratings_clean)

    # 7. Print summary statistics
    print_dataset_summary(df_movies_clean, df_ratings)

    return df_movies_clean, df_ratings


def print_dataset_summary(df_movies: pd.DataFrame, df_ratings: pd.DataFrame) -> None:
    """Prints formatted summary statistics for CineSense."""
    n_movies = len(df_movies)
    n_users = df_ratings["userId"].nunique()
    n_ratings = len(df_ratings)
    n_rated_movies = df_ratings["movieId"].nunique()
    avg_ratings_per_user = n_ratings / n_users if n_users > 0 else 0
    avg_ratings_per_movie = n_ratings / n_movies if n_movies > 0 else 0
    density = (n_ratings / (n_users * n_movies) * 100) if (n_users > 0 and n_movies > 0) else 0

    print("\n" + "=" * 65)
    print("           CineSense Dataset Summary Statistics")
    print("=" * 65)
    print(f" Total Cleaned Movies       : {n_movies:,}")
    print(f" Total Unique Users         : {n_users:,}")
    print(f" Total Ratings Cleaned      : {n_ratings:,}")
    print(f" Movies with >= 1 Rating    : {n_rated_movies:,} ({n_rated_movies/n_movies*100:.1f}%)")
    print(f" Average Ratings per User   : {avg_ratings_per_user:.2f}")
    print(f" Average Ratings per Movie  : {avg_ratings_per_movie:.2f}")
    print(f" User-Item Matrix Density   : {density:.4f}%")
    print(f" Mean Rating Value          : {df_ratings['rating'].mean():.2f} / 5.00 (std: {df_ratings['rating'].std():.2f})")

    # Genre stats
    if "genres" in df_movies.columns:
        all_genres = [g for genres in df_movies["genres"].str.split("|") for g in genres if g]
        unique_genres = set(all_genres)
        print(f" Unique Genres Identified   : {len(unique_genres)}")
        print(f" Sample Genres              : {', '.join(sorted(list(unique_genres))[:8])}...")

    # Movies with tags
    if "tags" in df_movies.columns:
        tagged_movies = (df_movies["tags"] != "").sum()
        print(f" Movies with User Tags      : {tagged_movies:,} ({tagged_movies/n_movies*100:.1f}%)")

    print("=" * 65 + "\n")


if __name__ == "__main__":
    process_and_merge_data()
