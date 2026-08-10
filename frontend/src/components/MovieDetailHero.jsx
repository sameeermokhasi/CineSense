/**
 * components/MovieDetailHero.jsx
 * Selected Movie Hero Banner with IMDb Rating (/10) & User Star Rating (★/5)
 */

import React from 'react';
import { Play, Film, Star } from 'lucide-react';
import { getMovieDescription } from '../services/descriptions';
import { getImdbRating } from '../services/api';

export default function MovieDetailHero({ movieTitle, movieData }) {
  const cleanTitle = (movieTitle || '').replace(/\s*\(\d{4}\)/, '').trim();
  const year = movieData?.year || (movieTitle?.match(/\((\d{4})\)/)?.[1] || 'Film');
  const genres = movieData?.genres ? movieData.genres.split('|').slice(0, 3).join(' • ') : 'Cinema';
  const description = getMovieDescription(movieTitle, movieData?.genres || '', year);

  const avg = movieData?.avg_rating || 4.2;
  const imdb = movieData?.imdb_rating || getImdbRating(movieTitle, avg);
  const userScore = avg.toFixed(1);

  return (
    <div className="w-full px-6 lg:px-12 pt-8 pb-10">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-8 lg:gap-12 max-w-6xl">
        {/* Left: Typographic Cinema Card */}
        <div className="relative w-44 sm:w-56 aspect-[2/3] rounded-2xl overflow-hidden bg-gradient-to-br from-[#1c1f2b] via-[#14161f] to-[#0d0e14] border border-white/15 p-5 flex flex-col justify-between shadow-[0_15px_40px_rgba(0,0,0,0.8)] flex-shrink-0 group">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#f97316]/20 rounded-full blur-2xl pointer-events-none" />

          {/* Top Row: Year & Film Icon */}
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
              {year}
            </span>
            <Film className="w-4 h-4 text-[#f97316]" />
          </div>

          {/* Center: Movie Title */}
          <div className="my-auto relative z-10 py-2">
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight drop-shadow-md">
              {cleanTitle}
            </h2>
          </div>

          {/* Bottom Row: IMDb & User Rating */}
          <div className="pt-2.5 border-t border-white/10 relative z-10 flex items-center justify-between">
            <span className="px-1.5 py-0.5 rounded bg-[#f5c518] text-black font-black text-[10px]">
              IMDb {imdb}
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-bold text-[11px]">
              <Star className="w-3 h-3 fill-amber-400" />
              <span>{userScore}/5</span>
            </span>
          </div>
        </div>

        {/* Right: Info & Description */}
        <div className="flex-1 text-left space-y-4">
          {/* Now Exploring Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ff3b30]/15 border border-[#ff3b30]/30 text-xs font-semibold text-[#ff6b4a]">
            <Play className="w-3 h-3 fill-current" />
            <span>Now exploring</span>
          </div>

          {/* Big Bold Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
            {cleanTitle}
          </h1>

          {/* 4-5 Line Rich Plot */}
          <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed font-normal">
            {description}
          </p>

          {/* Ratings & Genre Row */}
          <div className="flex items-center gap-3 pt-2 text-xs text-slate-400 font-medium flex-wrap">
            {/* IMDb Badge */}
            <span className="px-2.5 py-1 rounded-lg bg-[#f5c518] text-black font-black text-xs tracking-tight shadow-md">
              IMDb {imdb} / 10
            </span>

            {/* User Star Rating */}
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1c1f28] border border-white/10 text-amber-400 font-bold font-mono">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>{userScore} / 5.0 User Rating</span>
            </span>

            <span className="px-2.5 py-1 rounded-lg bg-[#1c1f28] border border-white/10 text-slate-200">
              {year}
            </span>

            <span className="text-slate-400">{genres}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
