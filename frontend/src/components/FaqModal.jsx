import React, { useState } from 'react';
import { X, HelpCircle, ChevronDown } from 'lucide-react';

const FAQS = [
  {
    q: "How does CineSense recommend movies?",
    a: "CineSense uses a powerful Hybrid AI Model. It combines Content-Based Filtering (matching genres and metadata) with Collaborative Filtering (learning from how millions of users rate movies) to give you highly personalized recommendations."
  },
  {
    q: "How do I add a movie to my Watchlist?",
    a: "When you browse the catalog or search for a movie, simply click the 'Bookmark' icon on the movie card, or click the 'Add to Watchlist' button on the movie's detail page."
  },
  {
    q: "Why don't I see recommendations for some movies?",
    a: "If a movie is extremely obscure or new, our database might not have enough ratings or metadata to generate accurate recommendations yet. The system will fall back to offering curated popular picks instead."
  },
  {
    q: "How does the search autocomplete work?",
    a: "The search bar features a fuzzy matching algorithm. Even if you misspell a title slightly, CineSense will intelligently find the closest matching movies in our catalog of thousands of films."
  },
  {
    q: "Is my viewing history saved?",
    a: "Yes! If you are logged in, CineSense securely saves your viewing history to our PostgreSQL database and uses Redis caching to instantly track your preferred genres to improve your experience."
  }
];

export default function FaqModal({ onClose }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-white dark:bg-[#161822] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-[#1b1e2a] flex-shrink-0">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-5 h-5 text-slate-800 dark:text-white" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white font-netflix-title">
              Help & FAQs
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div 
                  key={idx} 
                  className={`border rounded-xl transition-all duration-200 ${
                    isOpen 
                      ? 'border-[#e50914]/30 bg-slate-50 dark:bg-[#1b1e2a]' 
                      : 'border-slate-200 dark:border-white/5 bg-white dark:bg-[#141620] hover:border-slate-300 dark:hover:border-white/10'
                  }`}
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left focus:outline-none"
                  >
                    <span className={`font-semibold text-sm ${isOpen ? 'text-[#e50914]' : 'text-slate-800 dark:text-white'}`}>
                      {faq.q}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ml-4 ${
                      isOpen ? 'rotate-180 text-[#e50914]' : 'text-slate-400'
                    }`} />
                  </button>
                  
                  {isOpen && (
                    <div className="px-5 pb-4 pt-1 animate-fade-in text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-[#1b1e2a] border-t border-slate-100 dark:border-white/5 flex justify-end flex-shrink-0">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-[#e50914] hover:bg-[#b80710] text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
