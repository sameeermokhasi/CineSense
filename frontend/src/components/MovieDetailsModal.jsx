/**
 * components/MovieDetailsModal.jsx
 * Modal Dialog for Detailed Movie Insights and Score Decomposition
 */

import React, { useEffect } from 'react';
import { X, Star, Sparkles, Film, Compass, BarChart2 } from 'lucide-react';

export default function MovieDetailsModal({ movie, onClose, onFindSimilar }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!movie) return null;

  const finalPct = Math.round((movie.final_score || 0) * 100);
  const storyPct = Math.round((movie.content_similarity || 0) * 100);
  const communityPct = Math.round((movie.collaborative_score || 0) * 100);

  const genresList = movie.genres ? movie.genres.split('|').filter(Boolean) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cinema-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl glass-panel rounded-3xl border border-cinema-accent/30 shadow-2xl overflow-hidden animate-scale-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-cinema-900/80 hover:bg-cinema-800 text-slate-400 hover:text-white transition-colors border border-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header & Poster Banner */}
        <div className="relative aspect-[21/9] w-full bg-cinema-900 overflow-hidden">
          <img
            src={movie.poster_url || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80"}
            alt={movie.title}
            className="w-full h-full object-cover brightness-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-cinema-950 via-cinema-950/60 to-transparent" />

          <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cinema-accent/20 border border-cinema-accent/40 text-cinema-accent">
                Rank #{movie.rank} Recommendation
              </span>
              <h2 className="text-2xl font-black text-white mt-1.5 line-clamp-1">{movie.title}</h2>
            </div>

            <div className="px-3.5 py-1.5 rounded-2xl bg-cinema-900/90 border border-cinema-accent/50 shadow-neon-cyan text-center">
              <span className="text-lg font-mono font-black text-cinema-accent">{finalPct}%</span>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Match</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Metadata Row */}
          <div className="flex items-center gap-4 flex-wrap text-xs">
            {movie.avg_rating > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cinema-850 border border-white/10 font-mono text-cinema-amber font-bold">
                <Star className="w-4 h-4 fill-cinema-amber" />
                <span>{movie.avg_rating.toFixed(1)} / 5.0</span>
                <span className="text-slate-400 font-normal">({movie.rating_count?.toLocaleString()} reviews)</span>
              </div>
            )}

            {movie.year && (
              <div className="px-3 py-1.5 rounded-xl bg-cinema-850 border border-white/10 text-slate-300 font-mono">
                Release: {movie.year}
              </div>
            )}
          </div>

          {/* Score Breakdown Bar Chart */}
          <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-white flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-cinema-accent" /> Why this matches your search
              </span>
              <span className="text-slate-400 font-mono">Overall: {finalPct}%</span>
            </div>

            {/* Story Match Bar */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Storyline, Genres & Themes Match</span>
                <span className="text-cinema-accent font-bold font-mono">{storyPct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-cinema-800 overflow-hidden">
                <div className="h-full bg-cinema-accent rounded-full transition-all duration-500" style={{ width: `${storyPct}%` }} />
              </div>
            </div>

            {/* Community Match Bar */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Viewer Community Preference Match</span>
                <span className="text-cinema-violet font-bold font-mono">{communityPct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-cinema-800 overflow-hidden">
                <div className="h-full bg-cinema-violet rounded-full transition-all duration-500" style={{ width: `${communityPct}%` }} />
              </div>
            </div>
          </div>

          {/* Genres */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-2">Genres</h4>
            <div className="flex flex-wrap gap-2">
              {genresList.map((g) => (
                <span
                  key={g}
                  className="px-3 py-1 rounded-xl bg-cinema-800 border border-white/10 text-xs font-medium text-slate-200"
                >
                  {g}
                </span>
              ))}
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-cinema-800 hover:bg-cinema-700 text-xs font-semibold text-slate-300 transition-colors"
            >
              Close
            </button>

            <button
              onClick={() => {
                onClose();
                onFindSimilar(movie.title);
              }}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cinema-accent to-cinema-violet text-cinema-950 text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-neon-cyan flex items-center gap-2"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Similar Movies</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
