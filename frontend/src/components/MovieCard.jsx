/**
 * components/MovieCard.jsx
 * 3D Interactive Tilt Movie Card with Match Score Ring, Breakdown, and Actions
 */

import React, { useState, useRef } from 'react';
import { Star, Sparkles, Film, ArrowUpRight, Info, Compass } from 'lucide-react';

export default function MovieCard({ movie, onSelect, onFindSimilar }) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const cardRef = useRef(null);

  const finalPct = Math.round((movie.final_score || 0) * 100);
  const storyPct = Math.round((movie.content_similarity || 0) * 100);
  const communityPct = Math.round((movie.collaborative_score || 0) * 100);

  // 3D Perspective Tilt on Mouse Movement
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -10; // Max 10 deg tilt
    const rY = ((x - centerX) / centerX) * 10;

    setRotateX(rX);
    setRotateY(rY);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  const genresList = movie.genres ? movie.genres.split('|').filter(Boolean) : [];

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative group perspective-1000 cursor-pointer"
      style={{
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        transition: 'transform 0.15s ease-out',
      }}
    >
      {/* Background Ambient Glow */}
      <div className="absolute -inset-0.5 bg-gradient-to-br from-cinema-accent/30 via-cinema-violet/20 to-transparent rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition duration-500"></div>

      <div className="relative h-full flex flex-col glass-panel rounded-2xl overflow-hidden border border-white/10 group-hover:border-cinema-accent/40 shadow-xl transition-all duration-300">
        {/* Movie Poster & Top Badges */}
        <div className="relative aspect-[16/10] sm:aspect-[4/3] w-full overflow-hidden bg-cinema-900">
          <img
            src={movie.poster_url || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80"}
            alt={movie.title}
            loading="lazy"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 brightness-90 group-hover:brightness-100"
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-cinema-950 via-cinema-950/40 to-transparent" />

          {/* Rank Badge */}
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-cinema-950/80 backdrop-blur-md border border-white/15 text-xs font-mono font-bold text-white flex items-center gap-1 shadow-md">
            <span>#{movie.rank}</span>
          </div>

          {/* Match Score Circular Ring */}
          <div
            className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cinema-950/85 backdrop-blur-md border border-cinema-accent/40 shadow-neon-cyan"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <div className="relative w-7 h-7 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-cinema-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-cinema-accent"
                  strokeDasharray={`${finalPct}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-[10px] font-mono font-black text-white">{finalPct}%</span>
            </div>
            <span className="text-[11px] font-bold text-cinema-accent hidden sm:inline">Match</span>
          </div>

          {/* Score Breakdown Tooltip */}
          {showTooltip && (
            <div className="absolute top-12 right-3 z-30 glass-panel p-2.5 rounded-xl border border-cinema-accent/40 shadow-xl text-[10px] text-slate-200 w-44 animate-fade-in pointer-events-none">
              <div className="flex justify-between py-0.5">
                <span className="text-cinema-accent">Story & Genre:</span>
                <span className="font-bold">{storyPct}%</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-cinema-violet">Audience Taste:</span>
                <span className="font-bold">{communityPct}%</span>
              </div>
            </div>
          )}

          {/* Star Rating & Year Bottom Floating */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
            {movie.avg_rating > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cinema-900/80 backdrop-blur-sm border border-white/10 text-cinema-amber font-mono font-bold">
                <Star className="w-3.5 h-3.5 fill-cinema-amber" />
                <span>{movie.avg_rating.toFixed(1)}</span>
                <span className="text-[10px] text-slate-400 font-normal">({movie.rating_count.toLocaleString()})</span>
              </div>
            )}

            {movie.year && (
              <span className="px-2 py-0.5 rounded-md bg-white/10 backdrop-blur-sm text-slate-300 font-mono text-[11px]">
                {movie.year}
              </span>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <h3
              onClick={() => onSelect(movie)}
              className="text-base font-bold text-white group-hover:text-cinema-accent transition-colors line-clamp-1 cursor-pointer"
              title={movie.title}
            >
              {movie.title}
            </h3>

            {/* Genre Pills */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {genresList.slice(0, 3).map((g) => (
                <span
                  key={g}
                  className="px-2 py-0.5 rounded-md bg-cinema-800/80 border border-white/5 text-[11px] font-medium text-slate-300 hover:border-cinema-accent/30 transition-colors"
                >
                  {g}
                </span>
              ))}
              {genresList.length > 3 && (
                <span className="px-1.5 py-0.5 rounded-md bg-cinema-800/50 text-[10px] text-slate-400">
                  +{genresList.length - 3}
                </span>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
            <button
              onClick={() => onSelect(movie)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium transition-colors"
            >
              <Info className="w-3.5 h-3.5 text-cinema-accent" />
              <span>Details</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onFindSimilar(movie.title);
              }}
              className="px-3 py-1.5 rounded-xl bg-cinema-850 hover:bg-cinema-accent hover:text-cinema-950 border border-white/10 hover:border-transparent text-xs font-semibold text-slate-200 transition-all flex items-center gap-1 active:scale-95"
              title={`Find movies similar to ${movie.title}`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Explore Similar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
