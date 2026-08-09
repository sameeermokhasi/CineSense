/**
 * components/ErrorMessage.jsx
 * Error State Component with "Did you mean?" suggestions and popular movie quick-picks
 */

import React from 'react';
import { AlertCircle, Search, Film, RotateCcw } from 'lucide-react';

export default function ErrorMessage({ error, onSelectSuggestion, onRetry }) {
  const suggestions = error?.suggestions || [
    "Toy Story (1995)",
    "Heat (1995)",
    "GoldenEye (1995)",
    "Matrix, The (1999)",
    "Inception (2010)"
  ];

  return (
    <div className="w-full max-w-2xl mx-auto my-12 px-4 animate-fade-in">
      <div className="glass-panel p-8 rounded-3xl border border-cinema-crimson/30 shadow-2xl text-center relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-cinema-crimson/20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-cinema-crimson/15 border border-cinema-crimson/30 text-cinema-crimson mx-auto flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-bold text-white">Movie Not Found in Catalog</h3>
        <p className="text-sm text-slate-300 mt-2 max-w-md mx-auto">
          {error?.message || "We couldn't locate that specific movie title in the MovieLens database. Try another title or select one of the suggestions below."}
        </p>

        {/* Suggestions Section */}
        {suggestions.length > 0 && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-cinema-accent" /> Did you mean one of these?
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {suggestions.map((title) => (
                <button
                  key={title}
                  onClick={() => onSelectSuggestion(title)}
                  className="px-3.5 py-1.5 rounded-xl bg-cinema-850 hover:bg-cinema-accent hover:text-cinema-950 border border-white/10 text-xs font-semibold text-slate-200 transition-all active:scale-95 shadow-md"
                >
                  {title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Retry Button */}
        {onRetry && (
          <div className="mt-6">
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-cinema-800 hover:bg-cinema-700 text-xs font-bold text-white border border-white/10 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try Another Search</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
