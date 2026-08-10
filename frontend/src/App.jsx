/**
 * App.jsx
 * Full-Bleed Netflix-style CineSense Movie Discovery Application
 * Includes URL state persistence and browser Back/Forward navigation
 */

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HeroParticles from './components/HeroParticles';
import HeroHome from './components/HeroHome';
import MovieDetailHero from './components/MovieDetailHero';
import NetflixRow from './components/NetflixRow';
import { fetchRecommendations } from './services/api';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [isViewingMovie, setIsViewingMovie] = useState(false);
  const [currentMovieTitle, setCurrentMovieTitle] = useState('');
  const [currentMovieData, setCurrentMovieData] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Restore movie state from URL on initial load / reload
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const movieFromUrl = params.get('movie');
    if (movieFromUrl) {
      handleExploreMovie(movieFromUrl, null, false);
    }

    const handlePopState = () => {
      const p = new URLSearchParams(window.location.search);
      const m = p.get('movie');
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
      window.history.pushState({ movie: movieTitle }, '', url);
    }

    // Update breadcrumbs
    setBreadcrumbs((prev) => {
      const clean = movieTitle.replace(/\s*\(\d{4}\)/, '').trim();
      if (prev.includes(clean)) return prev;
      return [...prev, clean];
    });

    try {
      const res = await fetchRecommendations(movieTitle, 18);
      setRecommendations(res.recommendations || []);
    } catch (err) {
      console.error('Error fetching movie recommendations:', err);
    } finally {
      setIsLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Back to Landing View
  const handleBackToHome = (updateUrl = true) => {
    setIsViewingMovie(false);
    setCurrentMovieTitle('');
    setCurrentMovieData(null);
    setBreadcrumbs([]);
    setRecommendations([]);

    if (updateUrl) {
      const url = new URL(window.location);
      url.searchParams.delete('movie');
      window.history.pushState({}, '', url.pathname);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen w-full bg-[#0c0d10] text-white flex flex-col relative overflow-x-hidden selection:bg-[#f97316] selection:text-black">
      {/* 3D Starfield Background Particles */}
      <HeroParticles />

      {/* Top Navbar */}
      <Navbar
        isViewingMovie={isViewingMovie}
        currentMovieTitle={currentMovieTitle}
        breadcrumbs={breadcrumbs}
        onBackToHome={() => handleBackToHome(true)}
        onSearchMovie={(title) => handleExploreMovie(title, null, true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full relative z-10">
        {!isViewingMovie ? (
          /* Landing Screen (Screenshot 1 & 2) */
          <HeroHome
            onSearchMovie={(title) => handleExploreMovie(title, null, true)}
            isLoading={isLoading}
          />
        ) : (
          /* Movie Detail & Recommendations Screen (Screenshot 3) */
          <div className="w-full flex flex-col animate-fade-in pb-16">
            {/* Selected Movie Hero Banner with IMDb & User Rating */}
            <MovieDetailHero
              movieTitle={currentMovieTitle}
              movieData={currentMovieData}
            />

            {/* Recommendations Grid */}
            {isLoading ? (
              <div className="w-full py-20 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-[#f97316] animate-spin" />
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
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-8 border-t border-white/5 text-center text-xs text-slate-500 relative z-10 bg-[#0c0d10]/80 backdrop-blur-md">
        <p>CineSense — Discover your next favorite film.</p>
      </footer>
    </div>
  );
}
