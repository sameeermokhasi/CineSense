/**
 * components/TabCatalogView.jsx
 * CineSense Catalog View: Cinema, Web Series, Critics' Picks, Watchlist, Watch History, World Cinema
 */

import React, { useState } from 'react';
import { 
  Star, ArrowRight, Bookmark, BookmarkCheck, Globe, Film, Tv, Sparkles, 
  History, Trash2, Clock 
} from 'lucide-react';
import { TV_SERIES_CATALOG, TOP_MOVIES_CATALOG } from '../services/api';

const LANGUAGES = [
  "All",
  "Hindi (Bollywood)",
  "English",
  "Japanese",
  "Korean",
  "Spanish",
  "German"
];

export default function TabCatalogView({
  activeTab,
  onSelectMovie,
  myList = [],
  onToggleMyList,
  watchHistory = [],
  onClearHistory
}) {
  const [selectedLanguage, setSelectedLanguage] = useState("All");

  // Determine items based on activeTab
  let items = [];
  let title = "Catalog";
  let subtitle = "";

  if (activeTab === 'series') {
    title = "Web Series & Epics";
    subtitle = "Binge-worthy series, iconic seasons, and gripping storytelling.";
    items = TV_SERIES_CATALOG;
  } else if (activeTab === 'movies') {
    title = "Cinema & Feature Films";
    subtitle = "Award-winning motion pictures, Bollywood legends, and timeless blockbusters.";
    items = TOP_MOVIES_CATALOG;
  } else if (activeTab === 'popular') {
    title = "Critics' Picks & Top Rated";
    subtitle = "Masterpieces and universal favorites with IMDb 8.5+ ratings.";
    items = [...TV_SERIES_CATALOG, ...TOP_MOVIES_CATALOG].filter(item => (item.imdb_rating || 0) >= 8.5);
  } else if (activeTab === 'mylist') {
    title = "Your Watchlist";
    subtitle = "Films and series you have bookmarked for later.";
    items = myList;
  } else if (activeTab === 'history') {
    title = "Recently Watched History";
    subtitle = "All films and web series you have explored and discovered on CineSense.";
    items = watchHistory;
  } else if (activeTab === 'languages') {
    title = "World Cinema & Languages";
    subtitle = "Explore stories across Bollywood, Hollywood, Japanese Anime, and Korean Cinema.";
    const all = [...TOP_MOVIES_CATALOG, ...TV_SERIES_CATALOG];
    if (selectedLanguage === "All") {
      items = all;
    } else if (selectedLanguage.includes("Hindi")) {
      items = all.filter(item => item.language === "Hindi");
    } else {
      items = all.filter(item => item.language === selectedLanguage);
    }
  }

  return (
    <div className="w-full px-6 lg:px-12 py-8 animate-fade-in font-netflix-body">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-white/10 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff3b30]/15 text-[#ff453a] text-xs font-bold mb-2">
            {activeTab === 'series' ? (
              <Tv className="w-3.5 h-3.5" />
            ) : activeTab === 'history' ? (
              <History className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Film className="w-3.5 h-3.5" />
            )}
            <span className="uppercase tracking-wider font-netflix-title">
              {activeTab === 'mylist' ? 'WATCHLIST' : activeTab === 'history' ? 'WATCH HISTORY' : activeTab}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight font-netflix-title">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {subtitle}
          </p>
        </div>

        {/* Action Buttons: Clear History button for History tab */}
        {activeTab === 'history' && items.length > 0 && (
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 text-xs font-bold transition-all"
            title="Clear all watch history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}

        {/* Language Filter Pills for "World Cinema" */}
        {activeTab === 'languages' && (
          <div className="flex items-center flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedLanguage === lang
                    ? 'bg-[#ff3b30] text-white font-bold shadow-md shadow-[#ff3b30]/30'
                    : 'bg-[#1b1e28] text-slate-300 hover:text-white border border-white/5'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Empty State for Watchlist */}
      {activeTab === 'mylist' && items.length === 0 && (
        <div className="w-full py-24 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#1b1e28] border border-white/10 flex items-center justify-center text-[#ff3b30]">
            <Bookmark className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white font-netflix-title">Your Watchlist is empty</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm">
            Click the bookmark icon on any card to save movies & series directly to your private watchlist.
          </p>
        </div>
      )}

      {/* Empty State for Watch History */}
      {activeTab === 'history' && items.length === 0 && (
        <div className="w-full py-24 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#1b1e28] border border-white/10 flex items-center justify-center text-amber-400">
            <History className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white font-netflix-title">No watch history yet</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm">
            Explore and search any movie or web series to automatically record your viewing journey here.
          </p>
        </div>
      )}

      {/* Grid of Cards */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {items.map((movie) => {
            const cleanTitle = (movie.title || '').replace(/\s*\(\d{4}\)/, '').trim();
            const year = movie.year || (movie.title?.match(/\((\d{4})\)/)?.[1] || '');
            const rawGenres = movie.genres || '';
            const genresList = rawGenres.split('|').map(g => g.trim()).filter(Boolean);
            const displayGenres = genresList.length > 0 ? genresList.slice(0, 2).join(' • ') : 'Cinema';
            const imdbRating = movie.imdb_rating || 8.5;
            const userRating = (movie.avg_rating || 4.2).toFixed(1);
            const isSaved = myList.some(item => item.title === movie.title);

            return (
              <div
                key={movie.title + (movie.watchedAt || '')}
                onClick={() => onSelectMovie(movie.title, movie)}
                className="netflix-card group rounded-2xl overflow-hidden cursor-pointer relative flex flex-col justify-between p-4 min-h-[290px] aspect-[2/3] bg-gradient-to-br from-[#1b1e2a] via-[#141620] to-[#0c0d12] border border-white/10 hover:border-[#ff3b30]/50 shadow-xl transition-all duration-300"
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
                    }}
                  />
                )}

                {/* Ambient Glow */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#ff3b30]/10 rounded-full blur-xl group-hover:bg-[#ff3b30]/25 transition-all pointer-events-none" />

                {/* Top Row: Year / Season / Watched Badge & Bookmark Button */}
                <div className="flex items-center justify-between relative z-10 w-full">
                  {activeTab === 'history' && movie.watchedAt ? (
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{movie.watchedAt}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
                      {movie.seasons || year || 'Title'}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMyList(movie);
                    }}
                    className={`p-1.5 rounded-full transition-all ${
                      isSaved
                        ? 'bg-[#ff3b30] text-white shadow-md'
                        : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/20'
                    }`}
                    title={isSaved ? "Remove from Watchlist" : "Add to Watchlist"}
                  >
                    {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Center: Title & Genre */}
                <div className="my-auto py-2 relative z-10 text-left">
                  <h3 className="text-sm sm:text-base font-extrabold text-white group-hover:text-[#ff453a] transition-colors line-clamp-3 leading-snug tracking-tight font-netflix-title">
                    {cleanTitle}
                  </h3>

                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[11px] text-slate-400 truncate">
                      {displayGenres}
                    </p>
                    {movie.language && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-slate-300 font-medium">
                        {movie.language}
                      </span>
                    )}
                  </div>
                </div>

                {/* Ratings Row: IMDb & User Rating */}
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

                  <div className="flex items-center justify-between text-slate-400 group-hover:text-white transition-colors text-[10px] pt-1">
                    <span>Explore recommendations</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform text-[#ff3b30]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
