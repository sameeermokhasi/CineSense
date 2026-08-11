/**
 * components/MovieDetailHero.jsx
 * Selected Movie Hero Banner with Netflix Sans Typography & IMDb/User Ratings
 */

import React from 'react';
import { Play, Film, Star, Tag, History, Check, Sparkles, Globe } from 'lucide-react';
import { getMovieDescription, getMovieGenres, getMovieLanguage } from '../services/descriptions';
import { getImdbRating } from '../services/api';

export default function MovieDetailHero({ movieTitle, movieData, isWatched = false, searchCorrection = null }) {
  const cleanTitle = (movieTitle || '').replace(/\s*\(\d{4}\)/, '').trim();
  const year = movieData?.year || (movieTitle?.match(/\((\d{4})\)/)?.[1] || 'Film');
  const language = movieData?.language || getMovieLanguage(movieTitle, "English");
  const rawGenres = getMovieGenres(movieTitle, movieData?.genres);
  const genreList = rawGenres
    .split('|')
    .map(g => g.trim())
    .filter(g => Boolean(g) && g.toUpperCase() !== 'IMAX')
    .slice(0, 2);
  const description = getMovieDescription(movieTitle, rawGenres, year);


  const avg = movieData?.avg_rating || 4.2;
  const imdb = movieData?.imdb_rating || getImdbRating(movieTitle, avg);
  const userScore = avg.toFixed(1);

  return (
    <div className="w-full px-6 lg:px-12 pt-8 pb-10 font-netflix-body">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-8 lg:gap-12 max-w-6xl">
        {/* Left: Typographic Cinema Card */}
        <div className="relative w-44 sm:w-56 aspect-[2/3] rounded-2xl overflow-hidden bg-gradient-to-br from-[#1c1f2b] via-[#14161f] to-[#0d0e14] border border-white/15 shadow-[0_15px_40px_rgba(0,0,0,0.8)] flex-shrink-0 group">
          {/* TMDB Image Layer */}
          {movieData?.poster_url && (
            <img 
              src={movieData.poster_url} 
              alt={cleanTitle}
              className="absolute inset-0 w-full h-full object-cover z-0"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          )}

          {/* Fallback CSS Typography Layer (Shown if no image or image fails) */}
          <div 
            className="absolute inset-0 flex flex-col justify-between p-5 z-0"
            style={{ display: movieData?.poster_url ? 'none' : 'flex' }}
          >
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#ff3b30]/15 rounded-full blur-2xl pointer-events-none" />

            {/* Top Row: Year & Film Icon */}
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
                {year}
              </span>
              <Film className="w-4 h-4 text-[#ff3b30]" />
            </div>

            {/* Center: Movie Title & Subtitle Genres */}
            <div className="my-auto relative z-10 py-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight drop-shadow-md font-netflix-title">
                {cleanTitle}
              </h2>
              <p className="text-[11px] text-slate-400 mt-1 font-medium truncate">
                {genreList.join(' • ')}
              </p>
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
        </div>

        {/* Right: Info & Description in Netflix Sans */}
        <div className="flex-1 text-left space-y-4">
          {/* Smart Search Correction Banner */}
          {searchCorrection && searchCorrection.is_corrected && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/40 text-xs shadow-lg animate-fade-in">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-slate-300">
                Corrected from <span className="line-through text-slate-400 font-mono italic">"{searchCorrection.original_query || searchCorrection.original}"</span> → Showing results for <strong className="text-white font-bold underline decoration-amber-400 underline-offset-2">{cleanTitle}</strong>
              </span>
            </div>
          )}

          {/* Badges Row */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ff3b30]/15 border border-[#ff3b30]/30 text-xs font-bold text-[#ff453a]">
              <Play className="w-3 h-3 fill-current" />
              <span>Now exploring</span>
            </div>

            {isWatched && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-xs font-bold text-amber-300 shadow-sm">
                <History className="w-3 h-3 text-amber-400" />
                <span>In Watch History</span>
              </div>
            )}
          </div>

          {/* Big Bold Netflix Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.05] font-netflix-title">
            {cleanTitle}
          </h1>


          {/* 4-5 Line Rich Plot */}
          <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed font-normal">
            {description}
          </p>

          {/* Ratings & Genre Row */}
          <div className="flex items-center gap-2.5 pt-2 text-xs text-slate-400 font-medium flex-wrap">
            {/* IMDb Badge */}
            <span className="px-2.5 py-1 rounded-lg bg-[#f5c518] text-black font-black text-xs tracking-tight shadow-md">
              IMDb {imdb} / 10
            </span>

            {/* User Star Rating */}
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1c1f28] border border-white/10 text-amber-400 font-bold font-mono">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>{userScore} / 5.0 User Rating</span>
            </span>

            {/* Language Badge */}
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 font-bold text-xs tracking-wide shadow-sm flex items-center gap-1">
              <Globe className="w-3 h-3 text-emerald-400" />
              <span>{language}</span>
            </span>

            <span className="px-2.5 py-1 rounded-lg bg-[#1c1f28] border border-white/10 text-slate-200">
              {year}
            </span>

            {/* Prominent Genre Pill Badges */}
            {genreList.map((genre) => (
              <span
                key={genre}
                className="px-2.5 py-1 rounded-lg bg-[#ff3b30]/15 border border-[#ff3b30]/35 text-[#ff453a] font-bold text-xs tracking-wide shadow-sm"
              >
                {genre}
              </span>
            ))}

          </div>
        </div>
      </div>
    </div>
  );
}

