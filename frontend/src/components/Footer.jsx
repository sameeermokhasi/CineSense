/**
 * components/Footer.jsx
 * Footer Component with Consumer-Friendly Highlights
 */

import React from 'react';
import { Clapperboard, Sparkles, Film, Compass } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/5 bg-cinema-950/80 backdrop-blur-md mt-24 py-10 px-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-400">
        {/* Brand & Mission */}
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-cinema-accent/10 border border-cinema-accent/30 text-cinema-accent">
            <Clapperboard className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">CineSense</p>
            <p className="text-slate-400 text-xs">Intelligent Movie Recommendation Platform</p>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="flex items-center gap-3 flex-wrap justify-center text-[11px]">
          <span className="px-3 py-1 rounded-lg bg-cinema-850 border border-white/5 text-slate-300 flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-cinema-accent" /> Instant Match
          </span>
          <span className="px-3 py-1 rounded-lg bg-cinema-850 border border-white/5 text-slate-300 flex items-center gap-1.5 font-medium">
            <Film className="w-3.5 h-3.5 text-cinema-violet" /> Story & Genre Matching
          </span>
          <span className="px-3 py-1 rounded-lg bg-cinema-850 border border-white/5 text-slate-300 flex items-center gap-1.5 font-medium">
            <Compass className="w-3.5 h-3.5 text-cinema-amber" /> Audience Taste
          </span>
        </div>

        {/* Copyright */}
        <div className="text-slate-500 text-center md:text-right">
          Curated Cinema Collection • 2026
        </div>
      </div>
    </footer>
  );
}
