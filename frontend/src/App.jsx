/**
 * App.jsx
 * Main Application Shell for CineSense Movie Discovery Engine
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Film, Compass, Info, Sliders, Layers, Clapperboard, Star, Users } from 'lucide-react';

import Navbar from './components/Navbar';
import Hero3D from './components/Hero3D';
import SearchBar from './components/SearchBar';
import AlphaSlider from './components/AlphaSlider';
import CardGrid from './components/CardGrid';
import MovieGalaxy3D from './components/MovieGalaxy3D';
import LoadingSkeleton from './components/LoadingSkeleton';
import ErrorMessage from './components/ErrorMessage';
import MovieDetailsModal from './components/MovieDetailsModal';
import Footer from './components/Footer';

import { fetchRecommendations, fetchStats } from './services/api';

// Initial showcase data for instant first-paint
const INITIAL_SHOWCASE_DATA = {
  query_movie: "Toy Story (1995)",
  query_movieId: 1,
  query_genres: "Adventure|Animation|Children|Comedy|Fantasy",
  query_poster_url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
  alpha: 0.5,
  count: 8,
  latency_ms: 12.4,
  recommendations: [
    { rank: 1, movieId: 3114, title: "Toy Story 2 (1999)", genres: "Adventure|Animation|Children|Comedy|Fantasy", final_score: 0.9420, content_similarity: 0.9650, collaborative_score: 0.9190, avg_rating: 4.1, rating_count: 42000, poster_url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80", year: "1999" },
    { rank: 2, movieId: 4886, title: "Monsters, Inc. (2001)", genres: "Adventure|Animation|Children|Comedy|Fantasy", final_score: 0.8930, content_similarity: 0.9120, collaborative_score: 0.8740, avg_rating: 4.0, rating_count: 37500, poster_url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80", year: "2001" },
    { rank: 3, movieId: 6377, title: "Finding Nemo (2003)", genres: "Adventure|Animation|Children|Comedy", final_score: 0.8650, content_similarity: 0.8840, collaborative_score: 0.8460, avg_rating: 4.1, rating_count: 40100, poster_url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80", year: "2003" },
    { rank: 4, movieId: 2355, title: "Bug's Life, A (1998)", genres: "Adventure|Animation|Children|Comedy", final_score: 0.8410, content_similarity: 0.8910, collaborative_score: 0.7910, avg_rating: 3.8, rating_count: 28900, poster_url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80", year: "1998" },
    { rank: 5, movieId: 4306, title: "Shrek (2001)", genres: "Adventure|Animation|Children|Comedy|Fantasy|Romance", final_score: 0.8320, content_similarity: 0.8450, collaborative_score: 0.8190, avg_rating: 4.0, rating_count: 43200, poster_url: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80", year: "2001" },
    { rank: 6, movieId: 8961, title: "Incredibles, The (2004)", genres: "Action|Adventure|Animation|Children|Comedy", final_score: 0.8280, content_similarity: 0.8360, collaborative_score: 0.8200, avg_rating: 4.1, rating_count: 36800, poster_url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80", year: "2004" },
    { rank: 7, movieId: 588, title: "Aladdin (1992)", genres: "Adventure|Animation|Children|Comedy|Musical", final_score: 0.8050, content_similarity: 0.7950, collaborative_score: 0.8150, avg_rating: 3.9, rating_count: 45000, poster_url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80", year: "1992" },
    { rank: 8, movieId: 364, title: "Lion King, The (1994)", genres: "Adventure|Animation|Children|Drama|Musical", final_score: 0.7980, content_similarity: 0.7420, collaborative_score: 0.8540, avg_rating: 4.2, rating_count: 58000, poster_url: "https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=600&auto=format&fit=crop&q=80", year: "1994" }
  ]
};

export default function App() {
  const [currentQuery, setCurrentQuery] = useState('Toy Story (1995)');
  const [alpha, setAlpha] = useState(0.5);
  const [recommendResponse, setRecommendResponse] = useState(INITIAL_SHOWCASE_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total_movies: 27278,
    is_fitted: true,
    default_alpha: 0.5,
    collaborative_model: "Audience Preferences",
    content_vocabulary_size: 15420
  });

  // Modals and 3D views
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isGalaxyViewOpen, setIsGalaxyViewOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  // Initial stats sync
  useEffect(() => {
    fetchStats().then((data) => {
      if (data) setStats(data);
    }).catch(() => {});
  }, []);

  // Handler to trigger recommendation search
  const handleSearch = async (title, customAlpha = alpha, triggerConfetti = true) => {
    if (!title || !title.trim()) return;

    setIsLoading(true);
    setError(null);
    setCurrentQuery(title);

    try {
      const data = await fetchRecommendations(title, 12, customAlpha);
      setRecommendResponse(data);

      if (triggerConfetti && data.recommendations?.length > 0) {
        try {
          confetti({
            particleCount: 40,
            spread: 55,
            origin: { y: 0.8 },
            colors: ['#06b6d4', '#8b5cf6', '#f59e0b']
          });
        } catch (e) {
          // ignore confetti if unsupported
        }
      }
    } catch (err) {
      console.error('Recommendation fetch error:', err);
      setError({
        message: err.message || 'Movie not found in catalog.',
        suggestions: ["Toy Story (1995)", "Heat (1995)", "GoldenEye (1995)", "Matrix, The (1999)", "Inception (2010)"]
      });
      setRecommendResponse(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-calculate when Alpha slider changes
  const handleAlphaChange = (newAlpha) => {
    setAlpha(newAlpha);
    if (currentQuery) {
      handleSearch(currentQuery, newAlpha, false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-cinema-950 text-slate-100 selection:bg-cinema-accent selection:text-cinema-950">
      {/* Background 3D Particles */}
      <Hero3D />

      {/* Top Navbar */}
      <Navbar stats={stats} onOpenStats={() => setIsStatsModalOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 relative z-10">
        {/* Hero Section */}
        <section className="pt-12 pb-6 px-4 text-center max-w-4xl mx-auto">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cinema-accent/10 border border-cinema-accent/30 text-cinema-accent text-xs font-medium mb-4 shadow-neon-cyan animate-pulse-slow">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smart Movie Recommendations</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-tight">
            Find Your Next <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-cinema-accent via-cinema-violet to-cinema-amber bg-clip-text text-transparent">
              Favorite Movie
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Discover films tailored to your taste. Search any movie you love, and we'll find matching stories, themes, and community favorites.
          </p>

          {/* Autocomplete Search Bar */}
          <div className="mt-8">
            <SearchBar onSearch={(title) => handleSearch(title, alpha, true)} isLoading={isLoading} />
          </div>

          {/* User-Friendly Style Controller */}
          <AlphaSlider alpha={alpha} onChange={handleAlphaChange} disabled={isLoading} />
        </section>

        {/* 3D Recommendation Space (Toggleable) */}
        {isGalaxyViewOpen && recommendResponse && (
          <div className="max-w-7xl mx-auto px-4">
            <MovieGalaxy3D
              recommendations={recommendResponse.recommendations}
              queryMovie={recommendResponse.query_movie}
              onSelectMovie={(m) => setSelectedMovie(m)}
              onClose={() => setIsGalaxyViewOpen(false)}
            />
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && <LoadingSkeleton count={8} />}

        {/* Error Handling */}
        {error && !isLoading && (
          <ErrorMessage
            error={error}
            onSelectSuggestion={(title) => handleSearch(title, alpha, true)}
            onRetry={() => handleSearch('Toy Story (1995)', alpha, true)}
          />
        )}

        {/* Results Card Grid */}
        {!isLoading && !error && recommendResponse && (
          <CardGrid
            response={recommendResponse}
            onSelectMovie={(movie) => setSelectedMovie(movie)}
            onFindSimilar={(title) => handleSearch(title, alpha, true)}
            isGalaxyViewOpen={isGalaxyViewOpen}
            onToggleGalaxyView={() => setIsGalaxyViewOpen(!isGalaxyViewOpen)}
          />
        )}
      </main>

      {/* Movie Details Modal */}
      {selectedMovie && (
        <MovieDetailsModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onFindSimilar={(title) => handleSearch(title, alpha, true)}
        />
      )}

      {/* Database & Coverage Modal */}
      {isStatsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cinema-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg glass-panel p-6 rounded-3xl border border-cinema-accent/40 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Clapperboard className="w-5 h-5 text-cinema-accent" /> CineSense Movie Library
            </h3>

            <p className="text-xs text-slate-300">
              Browse through our curated collection of worldwide cinema with real community ratings.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-cinema-900 border border-white/10">
                <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Total Movies</span>
                <span className="text-lg font-bold text-white mt-1 block">{(stats?.total_movies || 27278).toLocaleString()} Films</span>
              </div>
              <div className="p-3.5 rounded-xl bg-cinema-900 border border-white/10">
                <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Community Reviews</span>
                <span className="text-lg font-bold text-cinema-accent mt-1 block">20M+ Ratings</span>
              </div>
              <div className="p-3.5 rounded-xl bg-cinema-900 border border-white/10">
                <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Movie Genres</span>
                <span className="text-lg font-bold text-cinema-violet mt-1 block">20+ Categories</span>
              </div>
              <div className="p-3.5 rounded-xl bg-cinema-900 border border-white/10">
                <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Search Speed</span>
                <span className="text-lg font-bold text-cinema-amber mt-1 block">Instant (&lt;15ms)</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setIsStatsModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-cinema-800 hover:bg-cinema-700 text-xs font-bold text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}
