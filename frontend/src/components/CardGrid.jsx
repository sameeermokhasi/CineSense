/**
 * components/CardGrid.jsx
 * Responsive Grid Layout with Sorting, Filter Pills, and 3D Galaxy View Toggle
 */

import React, { useState } from 'react';
import { Film, Orbit, Grid, ArrowUpDown, Sparkles, Clock } from 'lucide-react';
import MovieCard from './MovieCard';

export default function CardGrid({
  response,
  onSelectMovie,
  onFindSimilar,
  isGalaxyViewOpen,
  onToggleGalaxyView
}) {
  const [sortBy, setSortBy] = useState('match'); // 'match', 'rating', 'reviews'

  if (!response || !response.recommendations || response.recommendations.length === 0) {
    return null;
  }

  const { query_movie, recommendations, count } = response;

  // Sorting
  const sortedRecs = [...recommendations].sort((a, b) => {
    if (sortBy === 'rating') return b.avg_rating - a.avg_rating;
    if (sortBy === 'reviews') return b.rating_count - a.rating_count;
    return b.final_score - a.final_score; // default 'match'
  });

  return (
    <section className="w-full max-w-7xl mx-auto my-8 px-4">
      {/* Results Header Bar */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cinema-accent/15 border border-cinema-accent/30 text-cinema-accent">
              {count} Recommendations
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-black text-white mt-1.5 flex items-center gap-2 flex-wrap">
            Recommended for <span className="text-cinema-accent">"{query_movie}"</span>
          </h2>
        </div>

        {/* View Switcher & Sorting Controls */}
        <div className="flex items-center space-x-3 flex-wrap gap-2">
          {/* 3D Universe Toggle */}
          <button
            onClick={onToggleGalaxyView}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
              isGalaxyViewOpen
                ? 'bg-cinema-accent text-cinema-950 border-cinema-accent shadow-neon-cyan'
                : 'bg-cinema-850 hover:bg-cinema-800 text-slate-300 border-white/10 hover:border-cinema-accent/30'
            }`}
          >
            <Orbit className={`w-4 h-4 ${isGalaxyViewOpen ? 'animate-spin-slow' : ''}`} />
            <span>3D Movie Universe</span>
          </button>

          {/* Sort Dropdown */}
          <div className="flex items-center space-x-2 bg-cinema-850 border border-white/10 rounded-xl px-3 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="match" className="bg-cinema-900">Sort: Highest Match</option>
              <option value="rating" className="bg-cinema-900">Sort: Top Rated</option>
              <option value="reviews" className="bg-cinema-900">Sort: Most Reviews</option>
            </select>
          </div>
        </div>
      </div>

      {/* Movie Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedRecs.map((movie) => (
          <MovieCard
            key={movie.movieId || movie.rank}
            movie={movie}
            onSelect={onSelectMovie}
            onFindSimilar={onFindSimilar}
          />
        ))}
      </div>
    </section>
  );
}
