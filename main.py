"""
main.py
-------
Interactive CLI and Demonstration Interface for CineSense Hybrid Movie Recommender.

Usage:
  1. Direct query:
     python main.py --movie "Toy Story" --n 10 --alpha 0.5
  2. Compare different alpha weights:
     python main.py --movie "Heat" --compare
  3. Interactive mode:
     python main.py --interactive
  4. Run end-to-end training if models not found:
     python main.py --train
"""

import os
import sys
import time
import argparse
from typing import Optional

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from model.hybrid import HybridRecommender, get_recommendations
from model.train import train_and_save_models

MODEL_PATH = os.path.join(BASE_DIR, "models", "hybrid_recommender.pkl")


def format_table_output(recommendations: list, title: str, alpha: float) -> None:
    """Formats recommendations into a clean tabular ASCII output."""
    print("\n" + "=" * 95)
    print(f" CineSense Recommendations for: '{title}'  |  Alpha: {alpha:.2f} "
          f"({alpha*100:.0f}% Content / {(1-alpha)*100:.0f}% Collab)")
    print("=" * 95)
    print(f"{'#':<3} | {'Title':<34} | {'Hybrid':<7} | {'Content':<7} | {'Collab':<7} | {'Rating':<11} | {'Genres':<18}")
    print("-" * 95)

    for rec in recommendations:
        rank = f"#{rec['rank']}"
        m_title = rec['title'][:33]
        final_s = f"{rec['final_score']:.4f}"
        cont_s = f"{rec['content_similarity']:.4f}"
        collab_s = f"{rec['collaborative_score']:.4f}"
        rating_info = f"{rec['avg_rating']:.1f}* ({rec['rating_count']})"
        genres = rec['genres'][:18]

        print(f"{rank:<3} | {m_title:<34} | {final_s:<7} | {cont_s:<7} | {collab_s:<7} | {rating_info:<11} | {genres:<18}")

    print("=" * 95 + "\n")


def compare_alphas(recommender: HybridRecommender, movie_title: str, n: int = 5) -> None:
    """Compares recommendation results across alpha values: 1.0 (Content), 0.5 (Hybrid), 0.0 (Collab)."""
    alpha_scenarios = [
        (1.0, "Pure Content-Based (TF-IDF on Genres & Tags)"),
        (0.5, "Balanced Hybrid (50% Content + 50% Collaborative)"),
        (0.0, "Pure Collaborative Filtering (Matrix Factorization SVD/ALS)")
    ]

    print("\n" + "#" * 95)
    print(f"                      ALPHA COMPARISON STUDY: '{movie_title}'")
    print("#" * 95)

    for alpha, label in alpha_scenarios:
        recs = recommender.get_recommendations(movie_title, n=n, alpha=alpha)
        print(f"\n>>> Mode: {label} (Alpha = {alpha:.1f})")
        print(f"{'#':<3} | {'Title':<36} | {'Final':<7} | {'Content':<7} | {'Collab':<7} | {'Genres':<20}")
        print("-" * 90)
        for r in recs:
            print(f"#{r['rank']:<2} | {r['title'][:35]:<36} | {r['final_score']:.4f}  | {r['content_similarity']:.4f}  | {r['collaborative_score']:.4f}  | {r['genres'][:20]}")

    print("\n" + "#" * 95 + "\n")


def interactive_session(recommender: HybridRecommender) -> None:
    """Runs interactive search prompt in terminal."""
    print("\n" + "=" * 60)
    print("      Welcome to CineSense Hybrid Movie Recommender")
    print("=" * 60)
    print("Type a movie name to get recommendations, or 'q' to exit.\n")

    while True:
        try:
            query = input("Enter movie title: ").strip()
            if query.lower() in ["q", "quit", "exit"]:
                print("Goodbye!")
                break
            if not query:
                continue

            alpha_input = input("Enter alpha weight [0.0 to 1.0, default 0.5]: ").strip()
            alpha = float(alpha_input) if alpha_input else 0.5

            n_input = input("Number of recommendations [default 10]: ").strip()
            n = int(n_input) if n_input else 10

            t0 = time.time()
            recs = recommender.get_recommendations(movie_title=query, n=n, alpha=alpha)
            latency_ms = (time.time() - t0) * 1000.0

            format_table_output(recs, title=query, alpha=alpha)
            print(f"Retrieved {len(recs)} recommendations in {latency_ms:.2f} ms using Min-Heap O(n log k).\n")

        except KeyboardInterrupt:
            print("\nSession ended.")
            break
        except Exception as e:
            print(f"Error: {e}\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="CineSense Hybrid Movie Recommender CLI")
    parser.add_argument("--movie", type=str, help="Target movie title to get recommendations for")
    parser.add_argument("--n", type=int, default=10, help="Number of recommendations (default: 10)")
    parser.add_argument("--alpha", type=float, default=0.5, help="Hybrid weight alpha: 0.0 (collab) to 1.0 (content)")
    parser.add_argument("--compare", action="store_true", help="Compare recommendations across alpha=1.0, 0.5, 0.0")
    parser.add_argument("--interactive", action="store_true", help="Run interactive terminal prompt")
    parser.add_argument("--train", action="store_true", help="Force retrain models")

    args = parser.parse_args()

    # Load or train model
    if args.train or not os.path.exists(MODEL_PATH):
        print("Training CineSense model artifacts...")
        recommender = train_and_save_models(collab_algo="svd", n_factors=50, max_ratings=1000000, alpha=0.5)
    else:
        recommender = HybridRecommender.load(MODEL_PATH)

    if args.interactive:
        interactive_session(recommender)
    elif args.movie:
        if args.compare:
            compare_alphas(recommender, movie_title=args.movie, n=args.n)
        else:
            t0 = time.time()
            recs = recommender.get_recommendations(movie_title=args.movie, n=args.n, alpha=args.alpha)
            latency_ms = (time.time() - t0) * 1000.0
            format_table_output(recs, title=args.movie, alpha=args.alpha)
            print(f"Latency: {latency_ms:.2f} ms\n")
    else:
        # Default demo runs
        print("No movie specified. Running showcase demo for 'Toy Story' and 'Heat'...")
        compare_alphas(recommender, "Toy Story", n=5)
        compare_alphas(recommender, "Heat", n=5)
        print("Tip: Run `python main.py --interactive` or `python main.py --movie \"Movie Name\"`")


if __name__ == "__main__":
    main()
