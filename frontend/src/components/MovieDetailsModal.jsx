/**
 * components/MovieDetailsModal.jsx
 * Modal Dialog for Detailed Movie Insights (No external images)
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
  const cleanTitle = (movie.title || '').replace(/\s*\(\d{4}\)/, '').trim();
  const genresList = movie.genres ? movie.genres.split('|').filter(Boolean) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0c0d10]/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#141620] rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-scale-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-[#1e222e] hover:bg-[#282d3d] text-slate-400 hover:text-white transition-colors border border-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header Typographic Marquee */}
        <div className="relative p-6 pt-8 bg-gradient-to-r from-[#1c1f2b] to-[#12141a] border-b border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#f97316]/20 border border-[#f97316]/40 text-[#f97316]">
                Rank #{movie.rank || 1} Recommendation
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-2 leading-tight">
                {cleanTitle}
              </h2>
            </div>

            <div className="px-4 py-2 rounded-2xl bg-[#0c0d12] border border-[#f97316]/40 text-center flex-shrink-0">
              <span className="text-xl font-mono font-black text-[#f97316]">{finalPct}%</span>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Match</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Match Breakdown Bar Chart */}
          <div className="bg-[#181a26] p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-white flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-[#f97316]" /> Why this matches your search
              </span>
              <span className="text-slate-400 font-mono">Overall: {finalPct}%</span>
            </div>

            {/* Story Match Bar */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Storyline & Theme Match</span>
                <span className="text-[#f97316] font-bold font-mono">{storyPct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#0c0d12] overflow-hidden">
                <div className="h-full bg-[#f97316] rounded-full transition-all duration-500" style={{ width: `${storyPct}%` }} />
              </div>
            </div>

            {/* Community Match Bar */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Viewer Taste & Preference Match</span>
                <span className="text-purple-400 font-bold font-mono">{communityPct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#0c0d12] overflow-hidden">
                <div className="h-full bg-purple-400 rounded-full transition-all duration-500" style={{ width: `${communityPct}%` }} />
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
                  className="px-3 py-1 rounded-xl bg-[#1c1f2b] border border-white/10 text-xs font-medium text-slate-200"
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
              className="px-5 py-2.5 rounded-xl bg-[#1c1f2b] hover:bg-[#282c3c] text-xs font-semibold text-slate-300 transition-colors"
            >
              Close
            </button>

            <button
              onClick={() => {
                onClose();
                onFindSimilar(movie.title);
              }}
              className="px-6 py-2.5 rounded-xl bg-[#f97316] text-white text-xs font-bold hover:bg-[#ea580c] active:scale-95 transition-all shadow-lg flex items-center gap-2"
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
