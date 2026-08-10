/**
 * components/NetflixRow.jsx
 * Netflix-style Movie Cards with IMDb Rating (/10) and User Rating (★/5)
 */

import React from 'react';
import { Star, ArrowRight } from 'lucide-react';
import { getImdbRating } from '../services/api';

export default function NetflixRow({ recommendations, onSelectMovie, title = "Recommended For You" }) {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div className="w-full px-6 lg:px-12 py-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>{title}</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#f97316]/15 text-[#f97316] font-semibold">
            {recommendations.length} films
          </span>
        </h2>
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
        {recommendations.map((movie) => {
          const matchScore = Math.round((movie.final_score || 0.92) * 100);
          const cleanTitle = (movie.title || '').replace(/\s*\(\d{4}\)/, '').trim();
          const year = movie.year || (movie.title?.match(/\((\d{4})\)/)?.[1] || '');
          const primaryGenre = movie.genres ? movie.genres.split('|')[0] : 'Cinema';
          const imdbRating = movie.imdb_rating || getImdbRating(movie.title, movie.avg_rating);
          const userRating = (movie.avg_rating || 4.1).toFixed(1);

          return (
            <div
              key={movie.title}
              onClick={() => onSelectMovie(movie.title, movie)}
              className="netflix-card group rounded-2xl overflow-hidden cursor-pointer relative flex flex-col justify-between p-4 min-h-[290px] aspect-[2/3] bg-gradient-to-br from-[#1b1e2a] via-[#141620] to-[#0c0d12] border border-white/10 hover:border-[#f97316]/50 shadow-xl transition-all duration-300"
            >
              {/* Ambient Glow */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#f97316]/10 rounded-full blur-xl group-hover:bg-[#f97316]/25 transition-all pointer-events-none" />

              {/* Top Row: Year & Match Score Badge */}
              <div className="flex items-center justify-between relative z-10 w-full">
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
                  {year || 'Film'}
                </span>

                <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md bg-[#f97316]/20 border border-[#f97316]/40 text-[#f97316]">
                  {matchScore}% Match
                </span>
              </div>

              {/* Center: Movie Title */}
              <div className="my-auto py-2 relative z-10 text-left">
                <h3 className="text-sm sm:text-base font-black text-white group-hover:text-[#f97316] transition-colors line-clamp-3 leading-snug tracking-tight">
                  {cleanTitle}
                </h3>

                {/* Genre Tag */}
                <p className="text-[11px] text-slate-400 mt-1 truncate">
                  {primaryGenre}
                </p>
              </div>

              {/* Ratings Row: IMDb (/10) & User Rating (★/5) */}
              <div className="pt-2.5 border-t border-white/10 relative z-10 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  {/* IMDb Badge */}
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f5c518] text-black font-extrabold text-[10px] tracking-tight">
                    IMDb {imdbRating}
                  </span>

                  {/* User Stars Rating */}
                  <span className="flex items-center gap-1 text-amber-400 font-bold font-mono text-[11px]">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{userRating}/5</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-400 group-hover:text-white transition-colors text-[10px] pt-1">
                  <span>Explore more</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform text-[#f97316]" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
