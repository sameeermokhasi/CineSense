/**
 * App.jsx
 * CineSense Discovery Application with Integrated Authentication (Login/Sign Up)
 */

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HeroParticles from './components/HeroParticles';
import HeroHome from './components/HeroHome';
import TabCatalogView from './components/TabCatalogView';
import MovieDetailHero from './components/MovieDetailHero';
import NetflixRow from './components/NetflixRow';
import AuthPage from './components/AuthPage';
import { fetchRecommendations } from './services/api';
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

  // My List local storage persistence
  const [myList, setMyList] = useState(() => {
    try {
      const saved = localStorage.getItem('cinesense_mylist');
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

    setIsLoading(true);
    setCurrentMovieTitle(movieTitle);
    setCurrentMovieData(movieItem);
    setIsViewingMovie(true);

    // Sync URL query parameter so reload preserves the page
    if (updateUrl) {
      const url = new URL(window.location);
      url.searchParams.set('movie', movieTitle);
      window.history.pushState({ movie: movieTitle, tab: activeTab }, '', url);
    }

    // Update breadcrumbs
    setBreadcrumbs((prev) => {
      const clean = movieTitle.replace(/\s*\(\d{4}\)/, '').trim();
      if (prev.includes(clean)) return prev;
      return [...prev, clean];
    });

    try {
      // Record viewing in Redis genre tracker & PostgreSQL history
      if (currentUser?.email) {
        recordWatchHistory(currentUser.email, movieTitle, movieItem?.genres || '');
      }

      const res = await fetchRecommendations(movieTitle, 18);
      setRecommendations(res.recommendations || []);
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
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full relative z-10">
        {isViewingMovie ? (
          /* Movie Detail & Recommendations Screen */
          <div className="w-full flex flex-col animate-fade-in pb-16">
            <MovieDetailHero
              movieTitle={currentMovieTitle}
              movieData={currentMovieData}
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
          />
        ) : (
          /* Tabs: Cinema, Web Series, Critics' Picks, Watchlist, World Cinema */
          <TabCatalogView
            activeTab={activeTab}
            onSelectMovie={(title, item) => handleExploreMovie(title, item, true)}
            myList={myList}
            onToggleMyList={handleToggleMyList}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-8 border-t border-white/5 text-center text-xs text-slate-500 relative z-10 bg-[#0c0d10]/80 backdrop-blur-md">
        <p>CineSense — Discover your next favorite film & series.</p>
      </footer>
    </div>
  );
}
