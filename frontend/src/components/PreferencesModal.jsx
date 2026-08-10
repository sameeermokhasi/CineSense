import React, { useState, useEffect } from 'react';
import { X, Settings, Star, Check } from 'lucide-react';

const GENRES = ['Action', 'Comedy', 'Drama', 'Thriller', 'Romance', 'Sci-Fi', 'Horror', 'Fantasy'];
const LANGUAGES = ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Korean'];
const RATINGS = ['Any', '2+', '3+', '4+'];

export default function PreferencesModal({ onClose }) {
  const [preferences, setPreferences] = useState({
    genres: [],
    languages: [],
    minRating: 'Any'
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cinesense_preferences');
      if (saved) {
        setPreferences(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const toggleArrayItem = (key, item) => {
    setPreferences(prev => {
      const current = prev[key];
      if (current.includes(item)) {
        return { ...prev, [key]: current.filter(i => i !== item) };
      } else {
        return { ...prev, [key]: [...current, item] };
      }
    });
  };

  const setRating = (rating) => {
    setPreferences(prev => ({ ...prev, minRating: rating }));
  };

  const handleSave = () => {
    try {
      localStorage.setItem('cinesense_preferences', JSON.stringify(preferences));
      window.dispatchEvent(new Event('preferences_updated'));
    } catch {}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-[#161822] rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#1b1e2a] flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold text-white font-netflix-title">
              Content Preferences
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* Favorite Genres */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
                Favorite Genres
              </h3>
              <p className="text-xs text-slate-400 mt-1">Select the types of movies you love most.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {GENRES.map(genre => {
                const isSelected = preferences.genres.includes(genre);
                return (
                  <button
                    key={genre}
                    onClick={() => toggleArrayItem('genres', genre)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      isSelected
                        ? 'bg-[#e50914] border-[#e50914] text-white shadow-md shadow-[#e50914]/20'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preferred Languages */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
                Preferred Languages
              </h3>
              <p className="text-xs text-slate-400 mt-1">Which languages do you prefer to watch?</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map(lang => {
                const isSelected = preferences.languages.includes(lang);
                return (
                  <button
                    key={lang}
                    onClick={() => toggleArrayItem('languages', lang)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      isSelected
                        ? 'bg-[#e50914] border-[#e50914] text-white shadow-md shadow-[#e50914]/20'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {lang}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Minimum Rating */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
                Minimum Rating
              </h3>
              <p className="text-xs text-slate-400 mt-1">Only show movies above this rating.</p>
            </div>
            <div className="flex bg-[#0c0d10] p-1 rounded-xl border border-white/5">
              {RATINGS.map(rating => {
                const isSelected = preferences.minRating === rating;
                return (
                  <button
                    key={rating}
                    onClick={() => setRating(rating)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1 ${
                      isSelected
                        ? 'bg-[#1b1e2a] text-white shadow-sm border border-white/10'
                        : 'text-slate-500 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {rating !== 'Any' && <Star className={`w-3 h-3 ${isSelected ? 'text-amber-400 fill-amber-400' : ''}`} />}
                    <span>{rating}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-[#1b1e2a] border-t border-white/5 flex items-center justify-between flex-shrink-0">
          <p className="text-[10px] text-slate-400">Preferences are saved locally to your device.</p>
          <button 
            onClick={handleSave}
            className="flex items-center space-x-2 px-5 py-2 bg-[#e50914] hover:bg-[#b80710] text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
          >
            <Check className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
}
