import React from 'react';
import { Film, ArrowRight } from 'lucide-react';
import { getMovieLanguage } from '../services/descriptions';

export default function MovieCard({ movie, onSelect, onFindSimilar }) {
  const finalPct = Math.round((movie.final_score || 0.9) * 100);
  const cleanTitle = (movie.title || '').replace(/\s*\(\d{4}\)/, '').trim();
  const year = movie.year || (movie.title?.match(/\((\d{4})\)/)?.[1] || '');
  const lang = movie.language || getMovieLanguage(movie.title, 'English');
  const genresList = (movie.genres || '').split('|').map(g => g.trim()).filter(Boolean);
  const displayGenres = genresList.length > 0 ? genresList.slice(0, 2).join(' • ') : 'Cinema';

  const getLanguagePillStyle = (language) => {
    switch (language) {
      case 'Hindi': return 'text-emerald-300 border-emerald-500/35 bg-emerald-500/15';
      case 'English': return 'text-sky-300 border-sky-500/35 bg-sky-500/15';
      case 'Korean': return 'text-purple-300 border-purple-500/35 bg-purple-500/15';
      case 'Japanese': return 'text-amber-300 border-amber-500/35 bg-amber-500/15';
      case 'French': return 'text-rose-300 border-rose-500/35 bg-rose-500/15';
      case 'Spanish': return 'text-orange-300 border-orange-500/35 bg-orange-500/15';
      case 'German': return 'text-yellow-300 border-yellow-500/35 bg-yellow-500/15';
      case 'Italian': return 'text-teal-300 border-teal-500/35 bg-teal-500/15';
      default: return 'text-slate-300 border-white/20 bg-white/10';
    }
  };

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
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border tracking-wide shadow-sm ${getLanguagePillStyle(lang)}`}>
            {lang}
          </span>
          <span className="text-[10px] text-slate-400 truncate font-medium">
            {displayGenres}
          </span>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-between relative z-10 text-[11px]">
        <span className="text-slate-400 font-medium truncate max-w-[130px]">
          {displayGenres}
        </span>
        <span className="flex items-center gap-1 text-[#f97316] font-semibold group-hover:translate-x-0.5 transition-transform">
          <span>Explore</span>
          <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}


