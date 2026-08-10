/**
 * components/HeroHome.jsx
 * Netflix-style Full Viewport Hero with Dynamic Typewriter Animation
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, Compass, ChevronDown, Film, Loader2, X } from 'lucide-react';
import { fetchAutocomplete, TOP_MOVIES_CATALOG, TV_SERIES_CATALOG } from '../services/api';
import NetflixRow from './NetflixRow';

const TRENDING_CHIPS = [
  "Inception",
  "3 Idiots",
  "The Dark Knight",
  "Pulp Fiction",
  "Dilwale Dulhania Le Jayenge",
  "Interstellar"
];

const TYPEWRITER_PHRASES = [
  "Movies you'll love,",
  "Series you'll binge,",
  "Cinema you'll cherish,",
  "Stories you'll adore,"
];

export default function HeroHome({ onSearchMovie, isLoading }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Typewriter Animation State
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(90);

  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Personalized Recommendations State
  const [personalizedRecs, setPersonalizedRecs] = useState([]);

  // Fetch and filter based on Preferences
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cinesense_preferences');
      if (saved) {
        const prefs = JSON.parse(saved);
        const hasGenres = prefs.genres && prefs.genres.length > 0;
        const hasLanguages = prefs.languages && prefs.languages.length > 0;
        
        let minRatingNum = 0;
        if (prefs.minRating && prefs.minRating !== 'Any') {
          minRatingNum = parseInt(prefs.minRating.replace('+', ''));
        }

        if (hasGenres || hasLanguages || minRatingNum > 0) {
          const allItems = [...TOP_MOVIES_CATALOG, ...TV_SERIES_CATALOG];
          const filtered = allItems.filter(item => {
            // Genre Check
            let matchesGenre = true;
            if (hasGenres) {
              matchesGenre = prefs.genres.some(g => (item.genres || '').includes(g));
            }
            
            // Language Check
            let matchesLanguage = true;
            if (hasLanguages) {
              matchesLanguage = prefs.languages.includes(item.language);
            }
            
            // Rating Check
            let matchesRating = true;
            if (minRatingNum > 0) {
              matchesRating = (item.avg_rating || 0) >= minRatingNum;
            }

            return matchesGenre && matchesLanguage && matchesRating;
          });

          // Map to NetflixRow format
          const formatted = filtered.map((m, idx) => ({
            rank: idx + 1,
            movieId: m.movieId,
            title: m.title,
            genres: m.genres,
            final_score: parseFloat((0.95 - idx * 0.01).toFixed(2)),
            avg_rating: m.avg_rating || 4.2,
            imdb_rating: m.imdb_rating || 8.0,
            rating_count: m.rating_count || 10000,
            year: m.year || m.title.match(/\((\d{4})\)/)?.[1] || "2000"
          }));

          // Sort by IMDb rating and take top 18
          formatted.sort((a, b) => b.imdb_rating - a.imdb_rating);
          setPersonalizedRecs(formatted.slice(0, 18));
        }
      }
    } catch {}
  }, []);

  // Typewriter Effect Logic
  useEffect(() => {
    const fullPhrase = TYPEWRITER_PHRASES[currentPhraseIndex];

    const timer = setTimeout(() => {
      if (!isDeleting) {
        // Typing forward
        setDisplayText(fullPhrase.substring(0, displayText.length + 1));
        setTypingSpeed(80);

        if (displayText === fullPhrase) {
          // Pause at end of phrase
          setTimeout(() => setIsDeleting(true), 1800);
        }
      } else {
        // Deleting backward
        setDisplayText(fullPhrase.substring(0, displayText.length - 1));
        setTypingSpeed(45);

        if (displayText === '') {
          setIsDeleting(false);
          setCurrentPhraseIndex((prev) => (prev + 1) % TYPEWRITER_PHRASES.length);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, currentPhraseIndex, typingSpeed]);

  // Autocomplete debounce
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetchAutocomplete(query, 7);
        setSuggestions(res);
        setIsOpen(res.length > 0);
      } catch (e) {
        // ignore
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      onSearchMovie(query.trim());
    }
  };

  const handleSelect = (title) => {
    setQuery(title);
    setIsOpen(false);
    onSearchMovie(title);
  };

  return (
    <div className="w-full flex flex-col items-center justify-between min-h-[calc(100vh-85px)] px-4 sm:px-6 relative z-10 font-netflix-body">
      {/* Center Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-4xl mx-auto pt-6 pb-12 w-full">
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1e222d]/80 border border-white/10 text-xs font-semibold text-slate-300 mb-8 backdrop-blur-md shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-[#ff3b30]" />
          <span>Find your next favorite film & series</span>
        </div>

        {/* Dynamic Typewriter Headline */}
        <div className="min-h-[140px] sm:min-h-[190px] md:min-h-[220px] lg:min-h-[240px] flex flex-col justify-center">
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight leading-[1.05] font-netflix-title">
            <span>{displayText}</span>
            <span className="inline-block w-1.5 sm:w-2.5 h-9 sm:h-14 lg:h-20 bg-[#ff3b30] ml-1 align-middle animate-pulse" />
            <br />
            <span className="bg-gradient-to-r from-[#ff453a] via-[#ff3b30] to-[#f97316] bg-clip-text text-transparent">
              one click
            </span>{' '}
            <span className="text-[#fef08a]">away</span>
          </h1>
        </div>

        {/* Subtitle */}
        <p className="mt-6 text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed font-normal">
          Search for a film or show you adore and we'll line up more like it — an endless rabbit hole of recommendations tailored to your taste.
        </p>

        {/* Big Hero Search Bar */}
        <div className="w-full max-w-2xl mt-10 relative" ref={dropdownRef}>
          <form onSubmit={handleSubmit} className="relative w-full group">
            <div className="flex items-center bg-[#1c1f28]/95 backdrop-blur-xl rounded-full border border-white/15 px-5 py-4 shadow-2xl focus-within:border-white/35 focus-within:bg-[#232733] transition-all">
              <Search className="w-5 h-5 text-slate-400 mr-3.5 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a movie or series you love..."
                className="w-full bg-transparent text-sm sm:text-base text-white placeholder-slate-400 focus:outline-none"
              />
              {isSearching ? (
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin mr-2" />
              ) : query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 mr-2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}

              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="px-6 py-2.5 rounded-full bg-[#ff3b30] hover:bg-[#e50914] text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 font-netflix-title shadow-md shadow-[#ff3b30]/20"
              >
                <span>Find</span>
              </button>
            </div>
          </form>

          {/* Hero Autocomplete Dropdown */}
          {isOpen && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-3 bg-[#161821]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-white/5 animate-fade-in text-left">
              {suggestions.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => handleSelect(item.title)}
                  className="w-full px-5 py-3.5 text-left hover:bg-white/5 flex items-center justify-between text-sm text-slate-200 transition-colors"
                >
                  <div className="flex items-center space-x-3 truncate">
                    <Film className="w-4 h-4 text-[#ff3b30]" />
                    <span className="font-bold text-white truncate">{item.title}</span>
                  </div>
                  <span className="text-xs text-slate-400 ml-4 flex-shrink-0">
                    {item.genres ? item.genres.split('|').slice(0, 2).join(', ') : 'Film'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="mt-6 flex items-center justify-center flex-wrap gap-2 text-xs text-slate-400">
          <span className="mr-1">Try:</span>
          {TRENDING_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => handleSelect(chip)}
              className="px-3.5 py-1.5 rounded-full bg-[#1a1d26] hover:bg-[#252936] text-slate-300 hover:text-white border border-white/5 transition-all text-xs font-medium"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Down Arrow Indicator */}
      <div className="pb-8 text-slate-500 animate-bounce">
        <ChevronDown className="w-5 h-5 mx-auto" />
      </div>

      {/* 3 Step Feature Guide Section */}
      <div className="w-full border-t border-white/5 bg-[#101218]/90 py-16 px-6 lg:px-16 mt-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Step 1 */}
          <div className="text-left space-y-2">
            <span className="text-xs font-bold text-[#ff3b30] font-mono tracking-widest">01</span>
            <h3 className="text-xl font-black text-white font-netflix-title">Search</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Type a movie or series title — results appear as you type.
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-left space-y-2">
            <span className="text-xs font-bold text-[#ff3b30] font-mono tracking-widest">02</span>
            <h3 className="text-xl font-black text-white font-netflix-title">Explore</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              See a row of films picked just for your choice.
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-left space-y-2">
            <span className="text-xs font-bold text-[#ff3b30] font-mono tracking-widest">03</span>
            <h3 className="text-xl font-black text-white font-netflix-title">Repeat</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Click any result to dive deeper. The rabbit hole goes on.
            </p>
          </div>
        </div>

        {/* Empty state bottom indicator or Personalized Row */}
        {personalizedRecs.length > 0 ? (
          <div className="mt-16 border-t border-white/5 pt-12 text-left w-full">
            <NetflixRow 
              title="Recommended For You" 
              recommendations={personalizedRecs} 
              onSelectMovie={(title, item) => onSearchMovie(title)} 
            />
          </div>
        ) : (
          <div className="mt-20 pt-10 border-t border-white/5 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#1b1e27] border border-white/10 flex items-center justify-center text-[#ff3b30] mb-3">
              <Compass className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-400">
              Search for a movie or series you love and we'll show you more like it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
