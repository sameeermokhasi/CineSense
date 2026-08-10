/**
 * components/NetflixRow.jsx
 * Netflix-style Movie Cards with Official Netflix Typography (Netflix Sans / Inter)
 */

import React from 'react';
import { Star, ArrowRight } from 'lucide-react';
import { getImdbRating } from '../services/api';

export default function NetflixRow({ recommendations, onSelectMovie, title = "More Films Like This" }) {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div className="w-full px-6 lg:px-12 py-6 font-netflix-body">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 font-netflix-title">
          <span>{title}</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#ff3b30]/15 text-[#ff453a] font-bold">
            {recommendations.length} films
          </span>
        </h2>
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
        {recommendations.map((movie) => {
          const matchScore = Math.round((movie.final_score || 0.85) * 100);
          const cleanTitle = (movie.title || '').replace(/\s*\(\d{4}\)/, '').trim();
          const year = movie.year || (movie.title?.match(/\((\d{4})\)/)?.[1] || '');
          const primaryGenre = movie.genres ? movie.genres.split('|')[0] : 'Cinema';
          const imdbRating = movie.imdb_rating || getImdbRating(movie.title, movie.avg_rating);
          const userRating = (movie.avg_rating || 4.1).toFixed(1);

          return (
            <div
              key={movie.title}
              onClick={() => onSelectMovie(movie.title, movie)}
              className="netflix-card group rounded-2xl overflow-hidden cursor-pointer relative flex flex-col justify-between p-4 min-h-[285px] aspect-[2/3] bg-gradient-to-br from-[#1b1e2a] via-[#141620] to-[#0c0d12] border border-white/10 hover:border-[#ff3b30]/50 shadow-xl transition-all duration-300"
            >
              {/* TMDB Image Layer */}
              {movie.poster_url && (
                <img 
                  src={movie.poster_url} 
                  alt={movie.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity z-0"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                    const hoverOverlay = e.target.parentElement.querySelector('.image-hover-overlay');
                    if (hoverOverlay) hoverOverlay.style.display = 'none';
                  }}
                />
              )}

              {/* Fallback CSS Typography Layer (Shown if no image or image fails) */}
              <div 
                className="absolute inset-0 bg-gradient-to-br from-[#1b1e2a] via-[#141620] to-[#0c0d12] flex-col justify-between p-4 z-0"
                style={{ display: movie.poster_url ? 'none' : 'flex' }}
              >
                {/* Ambient Glow */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#ff3b30]/10 rounded-full blur-xl group-hover:bg-[#ff3b30]/20 transition-all pointer-events-none" />

                {/* Top Row: Year & Match Score Badge */}
                <div className="flex items-center justify-between relative z-10 w-full">
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
                    {year || 'Film'}
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md bg-[#ff3b30]/20 border border-[#ff3b30]/40 text-[#ff453a]">
                    {matchScore}% Match
                  </span>
                </div>

                {/* Center: Movie Title in Bold Netflix Sans */}
                <div className="my-auto py-2 relative z-10 text-left">
                  <h3 className="text-sm sm:text-base font-extrabold text-white group-hover:text-[#ff453a] transition-colors line-clamp-3 leading-snug tracking-tight font-netflix-title">
                    {cleanTitle}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 truncate font-normal">
                    {primaryGenre}
                  </p>
                </div>

                {/* Ratings Row: IMDb (/10) & User Rating (★/5) */}
                <div className="pt-2.5 border-t border-white/10 relative z-10 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f5c518] text-black font-black text-[10px] tracking-tight">
                      IMDb {imdbRating}
                    </span>
                    <span className="flex items-center gap-1 text-amber-400 font-bold font-mono text-[11px]">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{userRating}/5</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 group-hover:text-white transition-colors text-[10px] pt-1 font-medium">
                    <span>Explore more</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform text-[#ff3b30]" />
                  </div>
                </div>
              </div>

              {/* Permanent Overlay for Hover Effects on Images */}
              {movie.poster_url && (
                <div className="image-hover-overlay absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10 flex flex-col justify-end p-4">
                     <h3 className="text-sm font-bold text-white mb-1 leading-tight">{cleanTitle}</h3>
                     <div className="flex items-center gap-2 text-xs">
                        <span className="text-amber-400 font-bold flex items-center gap-1"><Star className="w-3 h-3" /> {userRating}</span>
                        <span className="text-slate-300">{year}</span>
                     </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
