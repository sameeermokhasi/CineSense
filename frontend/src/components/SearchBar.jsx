/**
 * components/SearchBar.jsx
 * Autocomplete Search Bar Component with Keyboard Navigation & Quick Suggestions
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Film, Sparkles, X, ChevronRight, Star, Loader2 } from 'lucide-react';
import { fetchAutocomplete } from '../services/api';

const TRENDING_SEARCHES = [
  "Toy Story (1995)",
  "Heat (1995)",
  "GoldenEye (1995)",
  "Casino (1995)",
  "Matrix, The (1999)",
  "Inception (2010)",
  "Interstellar (2014)"
];

export default function SearchBar({ onSearch, isLoading }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Debounced Autocomplete Fetcher
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await fetchAutocomplete(query, 7);
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setSelectedIndex(-1);
      } catch (err) {
        console.error('Autocomplete error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Click Outside to close dropdown
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

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelectSuggestion(suggestions[selectedIndex]);
      } else {
        handleSubmit();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelectSuggestion = (item) => {
    setQuery(item.title);
    setIsOpen(false);
    onSearch(item.title);
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      onSearch(query.trim());
    }
  };

  const handleQuickChip = (title) => {
    setQuery(title);
    setIsOpen(false);
    onSearch(title);
  };

  const clearQuery = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="w-full max-w-3xl mx-auto relative z-30">
      {/* Search Input Box */}
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-cinema-accent via-cinema-violet to-cinema-amber rounded-2xl blur-md opacity-30 group-hover:opacity-60 transition duration-500 group-focus-within:opacity-75"></div>

        <div className="relative flex items-center bg-cinema-900 border border-white/15 rounded-2xl overflow-hidden shadow-2xl focus-within:border-cinema-accent/60 transition-all">
          <div className="pl-5 text-slate-400">
            {isSearching ? (
              <Loader2 className="w-6 h-6 text-cinema-accent animate-spin" />
            ) : (
              <Search className="w-6 h-6 text-cinema-accent group-focus-within:text-white transition-colors" />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim().length >= 2 && suggestions.length > 0 && setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search any movie (e.g., 'Toy Story', 'Heat', 'The Matrix')..."
            className="w-full py-4 px-4 bg-transparent text-white placeholder-slate-400 text-base md:text-lg focus:outline-none"
            autoComplete="off"
          />

          {query && (
            <button
              type="button"
              onClick={clearQuery}
              className="p-2 mr-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="m-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cinema-accent to-cinema-violet text-cinema-950 font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Finding...</span>
              </>
            ) : (
              <>
                <span>Discover</span>
                <Sparkles className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 mt-2 bg-cinema-900/95 backdrop-blur-xl border border-cinema-accent/30 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-white/5 animate-fade-in"
        >
          <div className="px-4 py-2 text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between bg-cinema-950/60">
            <span>Movie Matches</span>
            <span>Use ↑↓ to navigate, Enter to select</span>
          </div>

          {suggestions.map((item, idx) => (
            <button
              key={item.movieId || idx}
              type="button"
              onClick={() => handleSelectSuggestion(item)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`w-full px-5 py-3 text-left flex items-center justify-between transition-colors ${
                selectedIndex === idx ? 'bg-cinema-accent/15 border-l-4 border-cinema-accent text-white' : 'hover:bg-white/5 text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-3.5 truncate">
                <div className="p-2 rounded-lg bg-cinema-800 text-cinema-accent">
                  <Film className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="font-semibold text-sm truncate">{item.title}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {item.genres ? item.genres.replace(/\|/g, ' • ') : 'Various Genres'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 flex-shrink-0 ml-4">
                {item.avg_rating > 0 && (
                  <div className="flex items-center text-xs font-mono text-cinema-amber">
                    <Star className="w-3.5 h-3.5 fill-cinema-amber mr-1" />
                    <span>{item.avg_rating.toFixed(1)}</span>
                  </div>
                )}
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Trending Quick Search Chips */}
      <div className="mt-4 flex items-center flex-wrap gap-2 text-xs">
        <span className="text-slate-400 flex items-center gap-1 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-cinema-amber" /> Trending:
        </span>
        {TRENDING_SEARCHES.map((title) => (
          <button
            key={title}
            onClick={() => handleQuickChip(title)}
            className="px-3 py-1 rounded-full bg-cinema-850 hover:bg-cinema-800 border border-white/10 hover:border-cinema-accent/40 text-slate-300 hover:text-white transition-all text-xs"
          >
            {title.replace(/\s*\(\d{4}\)/, '')}
          </button>
        ))}
      </div>
    </div>
  );
}
