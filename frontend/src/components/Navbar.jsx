/**
 * components/Navbar.jsx
 * CineSense Header with Distinctive Navigation, Notification System & Authenticated Profile
 */

import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, ChevronLeft, ChevronDown, Film, Loader2, X, Sparkles, Check, User, Settings, HelpCircle, LogOut, Bookmark } from 'lucide-react';
import { fetchAutocomplete } from '../services/api';

const NAV_TABS = [
  { id: 'home', label: 'Discover' },
  { id: 'movies', label: 'Cinema' },
  { id: 'series', label: 'Web Series' },
  { id: 'popular', label: "Critics' Picks" },
  { id: 'mylist', label: 'Watchlist' },
  { id: 'languages', label: 'World Cinema' }
];

const HOT_TOPIC_NOTIFICATIONS = [
  {
    id: 1,
    movie: "Breaking Bad",
    message: "Did you watch Breaking Bad? If not, then go man watch this masterpiece!",
    time: "Just now",
    tag: "Trending Series"
  },
  {
    id: 2,
    movie: "3 Idiots",
    message: "Did you watch 3 Idiots? If not, then go man watch this all-time classic!",
    time: "2h ago",
    tag: "Bollywood Pick"
  },
  {
    id: 3,
    movie: "Mirzapur",
    message: "Did you watch Mirzapur? If not, then go man watch this intense crime saga!",
    time: "4h ago",
    tag: "Hot Series"
  },
  {
    id: 4,
    movie: "Stranger Things",
    message: "Did you watch Stranger Things? If not, then go man watch the Upside Down mystery!",
    time: "6h ago",
    tag: "Global Hit"
  },
  {
    id: 5,
    movie: "Inception",
    message: "Did you watch Inception? If not, then go man watch this dream-bending heist!",
    time: "8h ago",
    tag: "Sci-Fi Top Pick"
  },
  {
    id: 6,
    movie: "Panchayat",
    message: "Did you watch Panchayat? If not, then go man watch this heartwarming comedy!",
    time: "10h ago",
    tag: "Fan Favorite"
  }
];

export default function Navbar({
  currentUser,
  activeTab,
  onSelectTab,
  isViewingMovie,
  currentMovieTitle,
  breadcrumbs = [],
  onBackToHome,
  onSearchMovie,
  myListCount = 0,
  onSignOut
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [navQuery, setNavQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Notification & Profile States
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [hasUnreadNotif, setHasUnreadNotif] = useState(true);
  const [toastNotif, setToastNotif] = useState(null);

  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Periodic Notification Trigger (Every 2 Hours + Initial 6s Demo Toast)
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      const randomNotif = HOT_TOPIC_NOTIFICATIONS[Math.floor(Math.random() * HOT_TOPIC_NOTIFICATIONS.length)];
      setToastNotif(randomNotif);
      setHasUnreadNotif(true);
    }, 6000);

    const twoHoursMs = 2 * 60 * 60 * 1000;
    const intervalTimer = setInterval(() => {
      const randomNotif = HOT_TOPIC_NOTIFICATIONS[Math.floor(Math.random() * HOT_TOPIC_NOTIFICATIONS.length)];
      setToastNotif(randomNotif);
      setHasUnreadNotif(true);
    }, twoHoursMs);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, []);

  // Autocomplete debounce
  useEffect(() => {
    if (!navQuery || navQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetchAutocomplete(navQuery, 6);
        setSuggestions(res);
      } catch (e) {
        // ignore
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [navQuery]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        if (!navQuery) setIsSearchOpen(false);
        setSuggestions([]);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [navQuery]);

  const handleSelectSuggestion = (title) => {
    setNavQuery('');
    setIsSearchOpen(false);
    setSuggestions([]);
    onSearchMovie(title);
  };

  const handleNavSearchSubmit = (e) => {
    e.preventDefault();
    if (navQuery.trim()) {
      setIsSearchOpen(false);
      setSuggestions([]);
      onSearchMovie(navQuery.trim());
      setNavQuery('');
    }
  };

  const handleOpenNotification = (movieName) => {
    setIsNotifOpen(false);
    setToastNotif(null);
    setHasUnreadNotif(false);
    onSearchMovie(movieName);
  };

  const initials = currentUser?.avatarInitials || (currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'CS');
  const displayName = currentUser?.name || currentUser?.email?.split('@')[0] || 'Cinephile';

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0c0d10]/95 backdrop-blur-md border-b border-white/5 transition-all duration-300 font-netflix-body">
      <div className="w-full px-4 sm:px-8 lg:px-12 h-16 sm:h-20 flex items-center justify-between">
        
        {/* Left Side: Brand Logo + Distinctive Navigation Tabs */}
        <div className="flex items-center space-x-6 lg:space-x-8">
          {/* Red CineSense Logo */}
          <button
            onClick={() => {
              onBackToHome();
              onSelectTab('home');
            }}
            className="flex items-center space-x-2 group focus:outline-none flex-shrink-0"
          >
            <span className="text-2xl sm:text-3xl font-black tracking-tighter text-[#e50914] font-netflix-title drop-shadow-md">
              CINESENSE
            </span>
          </button>

          {/* Unique Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 text-xs lg:text-sm font-medium">
            {NAV_TABS.map((tab) => {
              const isActive = activeTab === tab.id && !isViewingMovie;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full transition-all duration-200 ${
                    isActive
                      ? 'bg-white/15 text-white font-bold shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                  {tab.id === 'mylist' && myListCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-[#e50914] text-white text-[10px] font-bold">
                      {myListCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Side: Back to home, Search, Notification Bell, Unique Profile Avatar */}
        <div className="flex items-center space-x-3 sm:space-x-5 flex-shrink-0 relative z-20">
          {/* Back to Home Button when in movie details */}
          {isViewingMovie && (
            <button
              onClick={onBackToHome}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-xs text-slate-200 border border-white/10 transition-colors flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4 text-[#e50914]" />
              <span>Back to home</span>
            </button>
          )}

          {/* Expandable Search Bar */}
          <div className="relative flex-shrink-0" ref={searchContainerRef}>
            <div
              className={`flex items-center transition-all duration-300 ${
                isSearchOpen
                  ? 'w-44 sm:w-60 bg-[#1b1e28] border border-white/20 rounded-full px-3 py-1.5'
                  : 'w-8 sm:w-9 justify-center'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
                className="text-slate-300 hover:text-white transition-colors flex-shrink-0 p-1"
                title="Search"
              >
                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {isSearchOpen && (
                <form onSubmit={handleNavSearchSubmit} className="flex-1 flex items-center ml-2">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={navQuery}
                    onChange={(e) => setNavQuery(e.target.value)}
                    placeholder="Search movies..."
                    className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none font-normal"
                  />
                  {isSearching ? (
                    <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin mr-1" />
                  ) : navQuery ? (
                    <button
                      type="button"
                      onClick={() => setNavQuery('')}
                      className="p-0.5 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </form>
              )}
            </div>

            {/* Live Autocomplete Dropdown */}
            {isSearchOpen && suggestions.length > 0 && (
              <div className="absolute right-0 mt-2 w-72 bg-[#161821] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 divide-y divide-white/5 animate-fade-in">
                {suggestions.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => handleSelectSuggestion(item.title)}
                    className="w-full px-4 py-2.5 text-left hover:bg-white/10 flex items-center justify-between text-xs text-slate-200 transition-colors"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Film className="w-3.5 h-3.5 text-[#e50914] flex-shrink-0" />
                      <span className="font-semibold text-white truncate">{item.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 ml-2 flex-shrink-0">
                      {item.genres ? item.genres.split('|')[0] : 'Film'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 1. Notification Bell */}
          <div className="relative flex-shrink-0" ref={notifRef}>
            <button
              onClick={() => {
                setIsNotifOpen(!isNotifOpen);
                setHasUnreadNotif(false);
                setIsProfileOpen(false);
              }}
              className="text-slate-300 hover:text-white transition-colors relative p-1.5 focus:outline-none rounded-lg hover:bg-white/5"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {hasUnreadNotif && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#e50914] rounded-full ring-2 ring-[#0c0d10] animate-ping" />
              )}
              {hasUnreadNotif && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#e50914] rounded-full ring-2 ring-[#0c0d10]" />
              )}
            </button>

            {/* Notification Dropdown Menu */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#161822] border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in divide-y divide-white/10">
                <div className="px-4 py-3 bg-[#1b1e2a] flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#e50914]" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Recommendations</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Every 2 hours</span>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                  {HOT_TOPIC_NOTIFICATIONS.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleOpenNotification(notif.movie)}
                      className="p-3.5 hover:bg-white/5 cursor-pointer transition-colors flex items-start space-x-3 text-left group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff3b30]/20 to-[#f97316]/20 border border-[#ff3b30]/30 flex items-center justify-center flex-shrink-0 text-[#ff3b30] group-hover:scale-105 transition-transform">
                        <Film className="w-4 h-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#e50914] uppercase tracking-wide">
                            {notif.tag}
                          </span>
                          <span className="text-[10px] text-slate-400">{notif.time}</span>
                        </div>
                        <p className="text-xs font-semibold text-white group-hover:text-[#ff3b30] transition-colors leading-snug">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Unique CineSense Brand Avatar */}
          <div className="relative flex-shrink-0" ref={profileRef}>
            <button
              onClick={() => {
                setIsProfileOpen(!isProfileOpen);
                setIsNotifOpen(false);
              }}
              className="flex items-center space-x-1.5 cursor-pointer p-1 rounded-xl hover:bg-white/5 transition-all focus:outline-none"
              title="CineSense Profile"
            >
              {/* Custom Cinematic CS Badge Avatar */}
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#e50914] via-[#ff5722] to-[#ff9800] p-[1.5px] shadow-lg shadow-[#e50914]/30 hover:scale-105 transition-transform flex-shrink-0">
                <div className="w-full h-full rounded-[10px] bg-[#141620] flex items-center justify-center">
                  <span className="text-xs font-black tracking-tight text-white font-netflix-title">
                    {initials}
                  </span>
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-3 w-60 bg-[#161822] border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in divide-y divide-white/10 text-xs">
                <div className="p-3.5 flex items-center space-x-3 bg-[#1b1e2a]">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#e50914] to-[#ff5722] p-[1.5px] flex-shrink-0">
                    <div className="w-full h-full rounded-[10px] bg-[#141620] flex items-center justify-center font-black text-white text-xs">
                      {initials}
                    </div>
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-white truncate">{displayName}</p>
                    <p className="text-[10px] text-amber-400 font-semibold truncate">{currentUser?.email || "Cinephile Pass"}</p>
                  </div>
                </div>

                <div className="py-2">
                  <button
                    onClick={() => {
                      onSelectTab('mylist');
                      setIsProfileOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-slate-300 hover:text-white hover:bg-white/5 flex items-center space-x-2.5"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-[#ff3b30]" />
                    <span>My Watchlist ({myListCount})</span>
                  </button>
                  <button
                    onClick={() => setIsProfileOpen(false)}
                    className="w-full px-4 py-2 text-left text-slate-300 hover:text-white hover:bg-white/5 flex items-center space-x-2.5"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Preferences</span>
                  </button>
                  <button
                    onClick={() => setIsProfileOpen(false)}
                    className="w-full px-4 py-2 text-left text-slate-300 hover:text-white hover:bg-white/5 flex items-center space-x-2.5"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>Help & FAQs</span>
                  </button>
                </div>

                <div className="py-1.5">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      onSignOut();
                    }}
                    className="w-full px-4 py-2 text-left text-[#ff3b30] hover:bg-[#ff3b30]/10 flex items-center space-x-2.5 font-bold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating 2-Hour Notification Toast */}
      {toastNotif && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#161822] border border-[#e50914]/40 rounded-2xl p-4 shadow-[0_15px_40px_rgba(0,0,0,0.8)] animate-fade-in flex items-start space-x-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-[#e50914]/20 border border-[#e50914]/40 flex items-center justify-center flex-shrink-0 text-[#e50914]">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#e50914] uppercase tracking-wider">
                {toastNotif.tag}
              </span>
              <button
                onClick={() => setToastNotif(null)}
                className="text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs font-semibold text-white leading-snug">
              {toastNotif.message}
            </p>
            <button
              onClick={() => handleOpenNotification(toastNotif.movie)}
              className="mt-2 text-[11px] px-3 py-1 rounded-full bg-[#e50914] hover:bg-[#b80710] text-white font-bold transition-all inline-block shadow-sm"
            >
              Watch & Explore Now →
            </button>
          </div>
        </div>
      )}

      {/* Mobile Navigation Tabs */}
      <div className="flex md:hidden items-center space-x-2 px-4 py-2 overflow-x-auto no-scrollbar border-t border-white/5 bg-[#0c0d10]/95 text-xs font-medium">
        {NAV_TABS.map((tab) => {
          const isActive = activeTab === tab.id && !isViewingMovie;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`px-3 py-1 rounded-full whitespace-nowrap ${
                isActive ? 'bg-white/20 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
