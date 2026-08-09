/**
 * components/AlphaSlider.jsx
 * User-Friendly Recommendation Style Controller
 */

import React from 'react';
import { Sliders, Sparkles, Users, Clapperboard, HeartHandshake } from 'lucide-react';

export default function AlphaSlider({ alpha, onChange, disabled }) {
  const storyPct = Math.round(alpha * 100);
  const communityPct = 100 - storyPct;

  const presets = [
    { label: "Community Favorites", value: 0.0, desc: "What viewers with similar taste loved" },
    { label: "Smart Balance", value: 0.5, desc: "Balanced blend of story themes & viewer ratings" },
    { label: "Story & Genre", value: 1.0, desc: "Matches exact themes, vibe & genres" },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto glass-panel p-5 rounded-2xl border border-white/10 my-6 shadow-xl">
      {/* Title & Description */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-cinema-violet/20 border border-cinema-violet/40 text-cinema-violet">
            <Sliders className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              Recommendation Style
            </h4>
            <p className="text-xs text-slate-400">
              Customize how we find movies for you: match the storyline or audience favorites
            </p>
          </div>
        </div>

        {/* Proportions Badge */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-cinema-accent/15 border border-cinema-accent/30 text-cinema-accent font-bold">
            {storyPct}% Story & Vibe
          </span>
          <span className="text-slate-500 font-bold">:</span>
          <span className="px-2.5 py-1 rounded-lg bg-cinema-violet/15 border border-cinema-violet/30 text-cinema-violet font-bold">
            {communityPct}% Audience Taste
          </span>
        </div>
      </div>

      {/* Slider & Visual Gradient Bar */}
      <div className="space-y-3">
        <div className="relative flex items-center">
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={alpha}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            disabled={disabled}
            className="w-full h-2.5 bg-cinema-800 rounded-lg appearance-none cursor-pointer accent-cinema-accent focus:outline-none"
          />
        </div>

        {/* Dual-Color Indicator Bar */}
        <div className="w-full h-2 rounded-full overflow-hidden flex bg-cinema-800 border border-white/5">
          <div
            className="h-full bg-gradient-to-r from-cinema-accent to-cyan-400 transition-all duration-200"
            style={{ width: `${storyPct}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-cinema-violet transition-all duration-200"
            style={{ width: `${communityPct}%` }}
          />
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {presets.map((p) => {
            const isSelected = Math.abs(alpha - p.value) < 0.05;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => onChange(p.value)}
                disabled={disabled}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  isSelected
                    ? 'bg-white text-cinema-950 border-white shadow-md scale-105'
                    : 'bg-cinema-850 text-slate-300 border-white/10 hover:bg-cinema-800 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cinema-amber" />
          <span>Tailored specifically to your mood</span>
        </div>
      </div>
    </div>
  );
}
