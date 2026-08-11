/**
 * App.jsx
 * CineSense Discovery Application with Integrated Authentication (Login/Sign Up)
 * and Watch History Persistence
 */

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HeroParticles from './components/HeroParticles';
import HeroHome from './components/HeroHome';
import TabCatalogView from './components/TabCatalogView';
import MovieDetailHero from './components/MovieDetailHero';
import NetflixRow from './components/NetflixRow';
import AuthPage from './components/AuthPage';
import PreferencesModal from './components/PreferencesModal';
import FaqModal from './components/FaqModal';
import CineBotModal from './components/CineBotModal';
import { fetchRecommendations, recordWatchHistory, getImdbRating, resolveFuzzyMovieMatch } from './services/api';
import { getMovieGenres } from './services/descriptions';
import { Loader2 } from 'lucide-react';

export default function App() {
  // User Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('cinesense_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('home');
  const [isViewingMovie, setIsViewingMovie] = useState(false);
  const [currentMovieTitle, setCurrentMovieTitle] = useState('');
  const [currentMovieData, setCurrentMovieData] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'preferences', 'faq', or null
  const [isCineBotOpen, setIsCineBotOpen] = useState(false);
  const [searchCorrection, setSearchCorrection] = useState(null);




  // My List local storage persistence
  const [myList, setMyList] = useState(() => {
    try {
      const saved = localStorage.getItem('cinesense_mylist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Watch History local storage persistence
  const [watchHistory, setWatchHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('cinesense_watch_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleToggleMyList = (movie) => {
    setMyList((prev) => {
      const exists = prev.some((item) => item.title === movie.title);
      let updated;
      if (exists) {
        updated = prev.filter((item) => item.title !== movie.title);
      } else {
        updated = [movie, ...prev];
      }
      try {
        localStorage.setItem('cinesense_mylist', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleClearHistory = () => {
    setWatchHistory([]);
    try {
      localStorage.removeItem('cinesense_watch_history');
    } catch {}
  };

  const recordMovieInHistory = (movieTitle, movieItem = null) => {
    if (!movieTitle) return;
    const rawGenres = getMovieGenres(movieTitle, movieItem?.genres);
    const yr = movieItem?.year || movieTitle.match(/\((\d{4})\)/)?.[1] || '2020';
    const avg = movieItem?.avg_rating || 4.2;
    const imdb = movieItem?.imdb_rating || getImdbRating(movieTitle, avg);

    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const entry = {
      movieId: movieItem?.movieId || Date.now(),
      title: movieTitle,
      genres: rawGenres,
      year: yr,
      avg_rating: avg,
      imdb_rating: imdb,
      poster_url: movieItem?.poster_url || null,
      watchedAt: formattedTime,
      timestamp: Date.now()
    };

    setWatchHistory((prev) => {
      const filtered = prev.filter((m) => m.title.toLowerCase() !== movieTitle.toLowerCase());
      const updated = [entry, ...filtered];
      try {
        localStorage.setItem('cinesense_watch_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Restore movie state from URL on initial load / reload
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const movieFromUrl = params.get('movie');
    const tabFromUrl = params.get('tab');

    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }

    if (movieFromUrl) {
      handleExploreMovie(movieFromUrl, null, false);
    }

    const handlePopState = () => {
      const p = new URLSearchParams(window.location.search);
      const m = p.get('movie');
      const t = p.get('tab');
      if (t) setActiveTab(t);
      if (m) {
        handleExploreMovie(m, null, false);
      } else {
        handleBackToHome(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigate to explore a specific movie
  const handleExploreMovie = async (movieTitle, movieItem = null, updateUrl = true) => {
    if (!movieTitle || !movieTitle.trim()) return;

    // Check fuzzy match against catalog for typos (e.g. "1 idiots", "2 idiots", "interstelar", "inceptin")
    const fuzzy = resolveFuzzyMovieMatch(movieTitle);
    let targetTitle = movieTitle;
    let targetItem = movieItem;

    if (fuzzy && fuzzy.is_typo) {
      targetTitle = fuzzy.title;
      targetItem = fuzzy.item;
      setSearchCorrection({
        original_query: movieTitle,
        corrected_title: fuzzy.title,
        confidence: fuzzy.confidence,
        is_corrected: true
      });
    } else {
      setSearchCorrection(null);
    }

    setIsLoading(true);
    setCurrentMovieTitle(targetTitle);
    setCurrentMovieData(targetItem);
    setIsViewingMovie(true);

    // Automatically record in local watch history
    recordMovieInHistory(targetTitle, targetItem);

    // Sync URL query parameter so reload preserves the page
    if (updateUrl) {
      const url = new URL(window.location);
      url.searchParams.set('movie', targetTitle);
      window.history.pushState({ movie: targetTitle, tab: activeTab }, '', url);
    }

    // Update breadcrumbs
    setBreadcrumbs((prev) => {
      const clean = targetTitle.replace(/\s*\(\d{4}\)/, '').trim();
      if (prev.includes(clean)) return prev;
      return [...prev, clean];
    });

    try {
      // Record viewing in Redis genre tracker & PostgreSQL history
      if (currentUser?.email) {
        recordWatchHistory(currentUser.email, targetTitle, targetItem?.genres || '');
      }

      const res = await fetchRecommendations(targetTitle, 18);
      setRecommendations(res.recommendations || []);
      
      // Auto-correction check from backend response
      if (res.did_you_mean && res.did_you_mean.is_corrected) {
        setSearchCorrection(res.did_you_mean);
        if (res.searched_movie?.title) {
          setCurrentMovieTitle(res.searched_movie.title);
          setCurrentMovieData(res.searched_movie);
          recordMovieInHistory(res.searched_movie.title, res.searched_movie);
        }
      } else if (res.searched_movie) {
        setCurrentMovieData(res.searched_movie);
        recordMovieInHistory(targetTitle, res.searched_movie);
      } else if (!targetItem) {
        setCurrentMovieData({ title: targetTitle });
      }
    } catch (err) {
      console.error('Error fetching movie recommendations:', err);
    } finally {
      setIsLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };



  // Tab switching
  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setIsViewingMovie(false);
    setCurrentMovieTitle('');
    setCurrentMovieData(null);

    const url = new URL(window.location);
    url.searchParams.delete('movie');
    if (tabId === 'home') {
      url.searchParams.delete('tab');
      window.history.pushState({}, '', url.pathname);
    } else {
      url.searchParams.set('tab', tabId);
      window.history.pushState({ tab: tabId }, '', url);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Back to Home / active tab
  const handleBackToHome = (updateUrl = true) => {
    setIsViewingMovie(false);
    setCurrentMovieTitle('');
    setCurrentMovieData(null);
    setBreadcrumbs([]);
    setRecommendations([]);

    if (updateUrl) {
      const url = new URL(window.location);
      url.searchParams.delete('movie');
      if (activeTab === 'home') {
        url.searchParams.delete('tab');
        window.history.pushState({}, '', url.pathname);
      } else {
        url.searchParams.set('tab', activeTab);
        window.history.pushState({ tab: activeTab }, '', url);
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Logout handler
  const handleSignOut = () => {
    try {
      localStorage.removeItem('cinesense_user');
    } catch {}
    setCurrentUser(null);
    setIsViewingMovie(false);
    setActiveTab('home');
  };

  // If user is not logged in, render the requested Login/Sign Up page
  if (!currentUser) {
    return <AuthPage onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen w-full bg-[#0c0d10] text-white flex flex-col relative overflow-x-hidden selection:bg-[#ff3b30] selection:text-white font-netflix-body">
      {/* 3D Starfield Background Particles */}
      <HeroParticles />

      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isViewingMovie={isViewingMovie}
        currentMovieTitle={currentMovieTitle}
        breadcrumbs={breadcrumbs}
        onBackToHome={() => handleBackToHome(true)}
        onSearchMovie={(title) => handleExploreMovie(title, null, true)}
        myListCount={myList.length}
        watchHistoryCount={watchHistory.length}
        onSignOut={handleSignOut}
        onOpenPreferences={() => setActiveModal('preferences')}
        onOpenFaq={() => setActiveModal('faq')}
        onOpenCineBot={() => setIsCineBotOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full relative z-10">
        {isViewingMovie ? (
          /* Movie Detail & Recommendations Screen */
          <div className="w-full flex flex-col animate-fade-in pb-16">
            <MovieDetailHero
              movieTitle={currentMovieTitle}
              movieData={currentMovieData}
              isWatched={watchHistory.some((m) => m.title.toLowerCase() === currentMovieTitle.toLowerCase())}
              searchCorrection={searchCorrection}
            />


            {isLoading ? (
              <div className="w-full py-20 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-[#ff3b30] animate-spin" />
                <p className="text-xs text-slate-400 font-medium">Finding similar films...</p>
              </div>
            ) : (
              <NetflixRow
                recommendations={recommendations}
                onSelectMovie={(title, item) => handleExploreMovie(title, item, true)}
                title="More Films Like This"
              />
            )}
          </div>
        ) : activeTab === 'home' ? (
          /* Landing Screen */
          <HeroHome
            onSearchMovie={(title) => handleExploreMovie(title, null, true)}
            isLoading={isLoading}
            onOpenCineBot={() => setIsCineBotOpen(true)}
          />
        ) : (
          /* Tabs: Cinema, Web Series, Critics' Picks, Watchlist, Watch History, World Cinema */
          <TabCatalogView
            activeTab={activeTab}
            onSelectMovie={(title, item) => handleExploreMovie(title, item, true)}
            myList={myList}
            onToggleMyList={handleToggleMyList}
            watchHistory={watchHistory}
            onClearHistory={handleClearHistory}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-8 border-t border-white/5 text-center text-xs text-slate-500 relative z-10 bg-[#0c0d10]/80 backdrop-blur-md">
        <p>CineSense — Discover your next favorite film & series.</p>
      </footer>

      {/* Modals & Conversational AI Concierge */}
      <CineBotModal
        isOpen={isCineBotOpen}
        onClose={() => setIsCineBotOpen(false)}
        onOpen={() => setIsCineBotOpen(true)}
        onExploreMovie={(title, item) => handleExploreMovie(title, item, true)}
        myList={myList}
        onToggleMyList={handleToggleMyList}
      />
      {activeModal === 'preferences' && <PreferencesModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'faq' && <FaqModal onClose={() => setActiveModal(null)} />}
    </div>
  );
}

