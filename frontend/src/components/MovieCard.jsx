/**
 * components/MovieCard.jsx
 * Typographic 3D Interactive Card (No external image files)
 */

import React from 'react';
import { Film, ArrowRight } from 'lucide-react';

export default function MovieCard({ movie, onSelect, onFindSimilar }) {
  const finalPct = Math.round((movie.final_score || 0.9) * 100);
  const cleanTitle = (movie.title || '').replace(/\s*\(\d{4}\)/, '').trim();
  const year = movie.year || (movie.title?.match(/\((\d{4})\)/)?.[1] || '');
  const primaryGenre = movie.genres ? movie.genres.split('|')[0] : 'Cinema';

  return (
    <div
      onClick={() => onSelect(movie)}
      className="netflix-card group rounded-2xl overflow-hidden cursor-pointer relative flex flex-col justify-between p-4 min-h-[260px] aspect-[2/3] bg-gradient-to-br from-[#1b1e2a] via-[#141620] to-[#0c0d12] border border-white/10 hover:border-[#f97316]/50 shadow-xl transition-all duration-300"
    >
      {/* Glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#f97316]/10 rounded-full blur-xl group-hover:bg-[#f97316]/25 transition-all pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-center justify-between relative z-10 w-full">
        {year ? (
          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
            {year}
          </span>
        ) : (
          <Film className="w-3.5 h-3.5 text-slate-500" />
        )}

        <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md bg-[#f97316]/20 border border-[#f97316]/40 text-[#f97316]">
          {finalPct}% Match
        </span>
      </div>

      {/* Center Title */}
      <div className="my-auto py-3 relative z-10 text-left">
        <h3 className="text-sm sm:text-base font-black text-white group-hover:text-[#f97316] transition-colors line-clamp-3 leading-snug tracking-tight">
          {cleanTitle}
        </h3>
      </div>

      {/* Bottom Action */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-between relative z-10 text-[11px]">
        <span className="text-slate-400 font-medium truncate max-w-[100px]">
          {primaryGenre}
        </span>
        <span className="flex items-center gap-1 text-[#f97316] font-semibold group-hover:translate-x-0.5 transition-transform">
          <span>Explore</span>
          <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}
