/**
 * components/Navbar.jsx
 * CineSense Header with Distinctive Navigation, Rich Multi-Category Notification System,
 * Smooth 5-Second Auto-Dismiss Animated Toast, and Interactive Preferences/FAQ Modals
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Search, Bell, ChevronLeft, ChevronDown, Film, Loader2, X, Sparkles, 
  Check, User, Settings, HelpCircle, LogOut, Bookmark, Flame, Award, 
  Globe, Zap, Compass, Star, Play, History, Bot
} from 'lucide-react';
import { fetchAutocomplete } from '../services/api';

const NAV_TABS = [
  { id: 'home', label: 'Discover' },
  { id: 'movies', label: 'Cinema' },
  { id: 'series', label: 'Web Series' },
  { id: 'popular', label: "Critics' Picks" },
  { id: 'mylist', label: 'Watchlist' },
  { id: 'history', label: 'Watch History' },
  { id: 'languages', label: 'World Cinema' }
];

// Rich, Multi-Category Notification Types (No Repetitive Copy)
const HOT_TOPIC_NOTIFICATIONS = [
  {
    id: 1,
    type: "ai_match",
    tag: "AI 98% MATCH",
    headline: "Tailored For Your Taste",
    movie: "Inception",
    message: "Based on your love for mind-bending thrillers, Inception has an ultra-high 98% compatibility match for you.",
    time: "Just now",
    badgeBg: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    gradientBorder: "from-purple-500 via-indigo-500 to-pink-500",
    iconName: "sparkles"
  },
  {
    id: 2,
    type: "trending",
    tag: "TRENDING #1",
    headline: "Worldwide Phenomenon",
    movie: "Stranger Things",
    message: "Stranger Things is trending globally with over 150k ratings. Step inside the mystery of Hawkins and the Upside Down.",
    time: "5m ago",
    badgeBg: "bg-red-500/20 text-red-400 border-red-500/40",
    gradientBorder: "from-red-600 via-orange-500 to-amber-500",
    iconName: "flame"
  },
  {
    id: 3,
    type: "critics",
    tag: "CRITICS' CHOICE",
    headline: "Masterpiece (9.5/10 Rating)",
    movie: "Breaking Bad",
    message: "Ranked among the greatest TV dramas in history. Witness Walter White's iconic journey from chemist to kingpin.",
    time: "20m ago",
    badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    gradientBorder: "from-amber-500 via-yellow-500 to-orange-500",
    iconName: "award"
  },
  {
    id: 4,
    type: "world_cinema",
    tag: "WORLD CINEMA GEM",
    headline: "Heartwarming Classic",
    movie: "3 Idiots",
    message: "An inspiring comedy-drama about following your dreams that touched millions across the globe.",
    time: "1h ago",
    badgeBg: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    gradientBorder: "from-cyan-500 via-blue-500 to-indigo-500",
    iconName: "globe"
  },
  {
    id: 5,
    type: "blockbuster",
    tag: "HIGH OCTANE PICK",
    headline: "Legendary Crime Epic",
    movie: "The Dark Knight",
    message: "Heath Ledger's unforgettable performance as the Joker in Christopher Nolan's legendary Gotham saga.",
    time: "2h ago",
    badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    gradientBorder: "from-rose-500 via-pink-500 to-purple-500",
    iconName: "zap"
  },
  {
    id: 6,
    type: "discovery",
    tag: "SCI-FI DISCOVERY",
    headline: "Beyond Time & Space",
    movie: "Interstellar",
    message: "Journey through the wormhole in Hans Zimmer's mesmerizing space odyssey. An emotional, breathtaking voyage.",
    time: "4h ago",
    badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    gradientBorder: "from-emerald-500 via-teal-500 to-cyan-500",
    iconName: "compass"
  },
  {
    id: 7,
    type: "crime_saga",
    tag: "CRIME THRILLER",
    headline: "Gritty Power Struggle",
    movie: "Mirzapur",
    message: "Power, family politics, and ruthless revenge collide in the heartland. A high-stakes Indian crime thriller.",
    time: "6h ago",
    badgeBg: "bg-red-700/20 text-orange-400 border-red-600/40",
    gradientBorder: "from-red-700 via-rose-600 to-orange-600",
    iconName: "flame"
  },
  {
    id: 8,
    type: "audience_fav",
    tag: "AUDIENCE FAVORITE",
    headline: "Pure & Uplifting Story",
    movie: "Panchayat",
    message: "A delightful look into rural life filled with authentic warmth, humor, and unforgettable characters.",
    time: "8h ago",
    badgeBg: "bg-lime-500/20 text-lime-300 border-lime-500/40",
    gradientBorder: "from-lime-500 via-emerald-500 to-teal-500",
    iconName: "star"
  }
];

function renderNotificationIcon(iconName, className = "w-4 h-4") {
  switch (iconName) {
    case 'sparkles': return <Sparkles className={className} />;
    case 'flame': return <Flame className={className} />;
    case 'award': return <Award className={className} />;
    case 'globe': return <Globe className={className} />;
    case 'zap': return <Zap className={className} />;
    case 'compass': return <Compass className={className} />;
    case 'star': return <Star className={className} />;
    default: return <Film className={className} />;
  }
}

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
  watchHistoryCount = 0,
  onSignOut,
  onOpenPreferences,
  onOpenFaq,
  onOpenCineBot
}) {

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [navQuery, setNavQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Notification & Profile States
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [hasUnreadNotif, setHasUnreadNotif] = useState(true);

  // Toast States for Smooth 5-second Fade In / Fade Out
  const [toastNotif, setToastNotif] = useState(null);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const autoDismissTimerRef = useRef(null);
  const fadeOutTimerRef = useRef(null);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Smooth Dismiss Function
  const triggerToastDismiss = useCallback(() => {
    setIsToastVisible(false); // Triggers smooth CSS fade-out transition
    if (fadeOutTimerRef.current) clearTimeout(fadeOutTimerRef.current);
    fadeOutTimerRef.current = setTimeout(() => {
      setToastNotif(null);
    }, 500); // 500ms matches transition duration
  }, []);

  // Display New Toast with Smooth 5-Second Lifespan
  const displayToast = useCallback((notif) => {
    if (fadeOutTimerRef.current) clearTimeout(fadeOutTimerRef.current);
    if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);

    setToastNotif(notif);
    // Smooth entry next frame
    setTimeout(() => {
      setIsToastVisible(true);
    }, 40);

    // Auto-dismiss smoothly after 5000ms
    autoDismissTimerRef.current = setTimeout(() => {
      triggerToastDismiss();
    }, 5000);
  }, [triggerToastDismiss]);

  // Periodic Notification Trigger (Initial 4s Demo + Regular Interval)
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      const randomNotif = HOT_TOPIC_NOTIFICATIONS[Math.floor(Math.random() * HOT_TOPIC_NOTIFICATIONS.length)];
      displayToast(randomNotif);
      setHasUnreadNotif(true);
    }, 4000);

    const intervalTimer = setInterval(() => {
      const randomNotif = HOT_TOPIC_NOTIFICATIONS[Math.floor(Math.random() * HOT_TOPIC_NOTIFICATIONS.length)];
      displayToast(randomNotif);
      setHasUnreadNotif(true);
    }, 60000); // Trigger periodic notifications

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
      if (fadeOutTimerRef.current) clearTimeout(fadeOutTimerRef.current);
    };
  }, [displayToast]);

  // Pause auto-dismiss when hovering over toast
  const handleToastMouseEnter = () => {
    setIsHovered(true);
    if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
  };

  const handleToastMouseLeave = () => {
    setIsHovered(false);
    // Give 3.5 seconds after cursor leaves before fading out
    autoDismissTimerRef.current = setTimeout(() => {
      triggerToastDismiss();
    }, 3500);
  };

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
    triggerToastDismiss();
    setHasUnreadNotif(false);
    onSearchMovie(movieName);
  };

  const initials = currentUser?.avatarInitials || (currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'CS');
  const displayName = currentUser?.name || currentUser?.email?.split('@')[0] || 'Cinephile';

  return (
    <>
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
                    {tab.id === 'history' && watchHistoryCount > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                        {watchHistoryCount}
                      </span>
                    )}
                  </button>

                );
              })}
            </nav>
          </div>

          {/* Center/Right Side: Breadcrumbs / Quick Action Search + Notifications + Profile */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            
            {/* Movie Detail Breadcrumb Mode */}
            {isViewingMovie && currentMovieTitle && (
              <div className="hidden lg:flex items-center space-x-2 text-xs bg-white/5 px-3 py-1.5 rounded-full border border-white/10 max-w-[280px]">
                <button
                  onClick={onBackToHome}
                  className="flex items-center text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
                  <span>Home</span>
                </button>
                <span className="text-slate-600">/</span>
                <span className="text-white font-semibold truncate text-[#ff3b30]">{currentMovieTitle}</span>
              </div>
            )}

            {/* Ask CineBot AI Button */}
            {onOpenCineBot && (
              <button
                onClick={onOpenCineBot}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#e50914]/20 to-[#ff5722]/20 hover:from-[#e50914] hover:to-[#ff3b30] border border-[#ff3b30]/35 text-xs font-bold text-[#ff453a] hover:text-white transition-all shadow-sm flex-shrink-0 active:scale-95"
                title="Ask CineBot AI Concierge"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>CineBot AI</span>
              </button>
            )}

            {/* Global Search Bar */}
            <div className="relative" ref={searchContainerRef}>
              <form onSubmit={handleNavSearchSubmit} className="relative flex items-center">

                <div
                  className={`flex items-center bg-[#181a24] border transition-all duration-300 rounded-full px-3 py-1.5 ${
                    isSearchOpen ? 'w-48 sm:w-72 border-[#e50914] shadow-[0_0_15px_rgba(229,9,20,0.3)]' : 'w-9 sm:w-48 border-white/10'
                  }`}
                >
                  <Search
                    className="w-4 h-4 text-slate-400 cursor-pointer flex-shrink-0"
                    onClick={() => {
                      setIsSearchOpen(true);
                      setTimeout(() => searchInputRef.current?.focus(), 100);
                    }}
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search movies, genres..."
                    value={navQuery}
                    onChange={(e) => setNavQuery(e.target.value)}
                    onFocus={() => setIsSearchOpen(true)}
                    className={`bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none ml-2 transition-all duration-300 ${
                      isSearchOpen ? 'w-full opacity-100' : 'w-0 sm:w-full opacity-0 sm:opacity-100 pointer-events-none sm:pointer-events-auto'
                    }`}
                  />
                  {navQuery && (
                    <button
                      type="button"
                      onClick={() => setNavQuery('')}
                      className="text-slate-400 hover:text-white p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </form>

              {/* Autocomplete Dropdown List */}
              {isSearchOpen && suggestions.length > 0 && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-[#161822] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in divide-y divide-white/5">
                  <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-white/5 flex items-center justify-between">
                    <span>Instant Matches</span>
                    {isSearching && <Loader2 className="w-3 h-3 animate-spin text-[#e50914]" />}
                  </div>
                  {suggestions.map((item) => (
                    <button
                      key={item.movieId}
                      onClick={() => handleSelectSuggestion(item.title)}
                      className="w-full px-3.5 py-2.5 text-left text-xs text-slate-200 hover:text-white hover:bg-white/10 flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <Film className="w-3.5 h-3.5 text-[#e50914] flex-shrink-0 group-hover:scale-110 transition-transform" />
                        <span className="truncate font-medium">{item.title}</span>
                      </div>
                      <span className="text-[10px] text-amber-400 font-bold ml-2 flex-shrink-0">
                        ★ {item.avg_rating?.toFixed(1) || '4.0'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setIsNotifOpen(!isNotifOpen);
                  setIsProfileOpen(false);
                  setHasUnreadNotif(false);
                }}
                className="relative p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors focus:outline-none"
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
                      <span className="text-xs font-bold text-white uppercase tracking-wider">CineSense Feed</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">8 Fresh Alerts</span>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                    {HOT_TOPIC_NOTIFICATIONS.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleOpenNotification(notif.movie)}
                        className="p-3.5 hover:bg-white/5 cursor-pointer transition-colors flex items-start space-x-3 text-left group"
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${notif.badgeBg} group-hover:scale-105 transition-transform`}>
                          {renderNotificationIcon(notif.iconName, "w-4 h-4")}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${notif.badgeBg}`}>
                              {notif.tag}
                            </span>
                            <span className="text-[10px] text-slate-400">{notif.time}</span>
                          </div>
                          <h5 className="text-xs font-bold text-white group-hover:text-[#ff3b30] transition-colors leading-tight">
                            {notif.headline}
                          </h5>
                          <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Unique CineSense Brand Avatar & Profile Menu */}
            <div className="relative flex-shrink-0" ref={profileRef}>
              <button
                onClick={() => {
                  setIsProfileOpen(!isProfileOpen);
                  setIsNotifOpen(false);
                }}
                className="flex items-center space-x-1.5 cursor-pointer p-1 rounded-xl hover:bg-white/5 transition-all focus:outline-none"
                title="CineSense Profile"
              >
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
                      onClick={() => {
                        onSelectTab('history');
                        setIsProfileOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-slate-300 hover:text-white hover:bg-white/5 flex items-center space-x-2.5"
                    >
                      <History className="w-3.5 h-3.5 text-amber-400" />
                      <span>Watch History ({watchHistoryCount})</span>
                    </button>
                    {onOpenCineBot && (
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          onOpenCineBot();
                        }}
                        className="w-full px-4 py-2 text-left text-slate-300 hover:text-white hover:bg-white/5 flex items-center space-x-2.5"
                      >
                        <Bot className="w-3.5 h-3.5 text-[#ff453a]" />
                        <span>Ask CineBot AI</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);

                        if (onOpenPreferences) onOpenPreferences();
                      }}

                      className="w-full px-4 py-2 text-left text-slate-300 hover:text-white hover:bg-white/5 flex items-center space-x-2.5"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      <span>Preferences</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        if (onOpenFaq) onOpenFaq();
                      }}
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

      {/* Floating Smooth 5-Second Toast Notification (Positioned Completely Outside Header to Prevent ANY Clipping) */}
      {toastNotif && (
        <div
          onMouseEnter={handleToastMouseEnter}
          onMouseLeave={handleToastMouseLeave}
          className={`fixed bottom-6 right-6 z-[9999] max-w-sm sm:max-w-md w-[calc(100vw-2.5rem)] transition-all duration-500 ease-in-out transform ${
            isToastVisible
              ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
              : 'opacity-0 translate-y-8 scale-95 pointer-events-none'
          }`}
        >
          <div className="relative rounded-2xl bg-[#141622]/95 backdrop-blur-xl border border-white/15 p-4 sm:p-5 shadow-[0_25px_50px_rgba(0,0,0,0.85)] overflow-hidden">
            
            {/* Top Distinctive Gradient Line */}
            <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${toastNotif.gradientBorder}`} />

            <div className="flex items-start space-x-3.5 text-left">
              {/* Category Icon Badge */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${toastNotif.badgeBg} shadow-inner`}>
                {renderNotificationIcon(toastNotif.iconName, "w-5 h-5")}
              </div>

              {/* Toast Details */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[9px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full border ${toastNotif.badgeBg}`}>
                    {toastNotif.tag}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-slate-400 font-medium">{toastNotif.time}</span>
                    <button
                      onClick={triggerToastDismiss}
                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                      title="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">
                  {toastNotif.headline}
                </h4>

                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                  {toastNotif.message}
                </p>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    onClick={() => handleOpenNotification(toastNotif.movie)}
                    className="flex items-center space-x-1.5 text-xs px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff5722] hover:from-[#ff1e2b] hover:to-[#ff7043] text-white font-bold transition-all shadow-md shadow-[#e50914]/25 hover:scale-[1.02] active:scale-95 cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Explore "{toastNotif.movie}"</span>
                  </button>
                  
                  <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                    {isHovered ? "Paused on hover" : "Fades in 5s"}
                  </span>
                </div>
              </div>
            </div>

            {/* 5-second Animated Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white/10 overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${toastNotif.gradientBorder}`}
                style={{
                  animationName: isToastVisible && !isHovered ? 'shrink' : 'none',
                  animationDuration: '5000ms',
                  animationFillMode: 'forwards',
                  animationTimingFunction: 'linear'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
