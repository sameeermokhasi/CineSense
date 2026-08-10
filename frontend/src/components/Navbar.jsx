/**
 * components/Navbar.jsx
 * Header Navigation Bar matching the Netflix-style CineSense UI
 */

import React, { useState, useEffect, useRef } from 'react';
import { Clapperboard, ArrowLeft, Search, Film, Loader2, X } from 'lucide-react';
import { fetchAutocomplete } from '../services/api';

export default function Navbar({
  isViewingMovie,
  currentMovieTitle,
  breadcrumbs = [],
  onBackToHome,
  onSearchMovie
}) {
  const [navQuery, setNavQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!navQuery || navQuery.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetchAutocomplete(navQuery, 6);
        setSuggestions(res);
        setIsOpen(res.length > 0);
      } catch (e) {
        // ignore
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [navQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (title) => {
    setNavQuery('');
    setIsOpen(false);
    onSearchMovie(title);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && navQuery.trim()) {
      e.preventDefault();
      handleSelect(navQuery.trim());
    }
  };

  return (
    <header className="w-full px-6 lg:px-12 py-5 z-40 relative flex items-center justify-between">
      {/* Left: Logo & Navigation */}
      <div className="flex items-center space-x-6">
        <div
          onClick={onBackToHome}
          className="flex items-center space-x-2.5 cursor-pointer group select-none"
        >
          {/* Glowing Red Icon */}
          <div className="w-9 h-9 rounded-xl bg-[#ff3b30] flex items-center justify-center shadow-[0_0_20px_rgba(255,59,48,0.55)] group-hover:scale-105 transition-transform duration-300">
            <Film className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white flex items-center">
            Cine<span className="text-[#f97316]">Sense</span>
          </span>
        </div>

        {/* Back to Home Button (Shown on details page) */}
        {isViewingMovie && (
          <button
            onClick={onBackToHome}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#1e222d]/90 hover:bg-[#282d3c] border border-white/10 text-xs font-medium text-slate-300 hover:text-white transition-all shadow-md"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to home</span>
          </button>
        )}
      </div>

      {/* Center/Right: Breadcrumb trail when exploring */}
      {isViewingMovie && breadcrumbs.length > 0 && (
        <div className="hidden md:flex items-center space-x-2 text-xs text-slate-400 font-medium truncate max-w-md">
          {breadcrumbs.slice(-2).map((item, idx, arr) => (
            <React.Fragment key={item}>
              <span
                onClick={() => onSearchMovie(item)}
                className={`cursor-pointer hover:text-white transition-colors truncate ${
                  idx === arr.length - 1 ? 'text-white font-bold' : ''
                }`}
              >
                {item}
              </span>
              {idx < arr.length - 1 && <span className="text-slate-600">/</span>}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Right: Search Pill */}
      <div className="relative w-72 sm:w-80" ref={dropdownRef}>
        <div className="relative flex items-center bg-[#1c1f28]/90 backdrop-blur-md rounded-full border border-white/10 px-4 py-2 focus-within:border-white/25 focus-within:bg-[#232733] transition-all">
          <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
          <input
            type="text"
            value={navQuery}
            onChange={(e) => setNavQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search for a movie..."
            className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          {isSearching ? (
            <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
          ) : navQuery ? (
            <button onClick={() => setNavQuery('')} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>

        {/* Autocomplete Dropdown */}
        {isOpen && suggestions.length > 0 && (
          <div className="absolute right-0 mt-2 w-80 bg-[#161821]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-white/5 animate-fade-in">
            {suggestions.map((item) => (
              <button
                key={item.title}
                onClick={() => handleSelect(item.title)}
                className="w-full px-4 py-3 text-left hover:bg-white/5 flex items-center justify-between text-xs text-slate-200 transition-colors"
              >
                <span className="font-semibold text-white truncate">{item.title}</span>
                <span className="text-[10px] text-slate-400 ml-2 flex-shrink-0">
                  {item.genres ? item.genres.split('|')[0] : 'Movie'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
