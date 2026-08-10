/**
 * components/Navbar.jsx
 * Header Navigation Bar for CineSense
 */

import React from 'react';
import { Clapperboard, Sparkles, Film, Github } from 'lucide-react';

export default function Navbar({ stats, onOpenStats }) {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/5 px-4 lg:px-8 py-3.5 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center space-x-3 cursor-pointer group">
          <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-cinema-accent/20 to-cinema-violet/20 border border-cinema-accent/30 shadow-neon-cyan group-hover:scale-105 transition-transform duration-300">
            <Clapperboard className="w-6 h-6 text-cinema-accent animate-pulse-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-cinema-accent bg-clip-text text-transparent">
                CineSense
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cinema-accent/10 border border-cinema-accent/30 text-cinema-accent">
                Discovery
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Intelligent Movie Recommendations
            </p>
          </div>
        </div>

        {/* Right Navigation & Status Indicators */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Library Stats Pill */}
          <button
            onClick={onOpenStats}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-cinema-850 hover:bg-cinema-800 border border-white/10 text-xs text-slate-300 transition-all hover:border-cinema-accent/40"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-semibold">{stats?.total_movies ? `${stats.total_movies.toLocaleString()} Films` : '27,000+ Films'}</span>
          </button>

          {/* GitHub Project Link */}
          <a
            href="https://github.com/sameeermokhasi/CineSense"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-cinema-850 hover:bg-cinema-800 border border-white/10 text-slate-300 hover:text-white transition-colors"
            title="View on GitHub"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </div>
    </header>
  );
}
