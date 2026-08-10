/**
 * components/LoadingSkeleton.jsx
 * Shimmering Pulse Loading State for Movie Cards
 */

import React from 'react';

export default function LoadingSkeleton({ count = 8 }) {
  return (
    <div className="w-full max-w-7xl mx-auto my-8 px-4">
      {/* Header Skeleton */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-white/10 rounded-full"></div>
          <div className="h-7 w-64 bg-white/15 rounded-xl"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-9 w-32 bg-white/10 rounded-xl"></div>
          <div className="h-9 w-36 bg-white/10 rounded-xl"></div>
        </div>
      </div>

      {/* Grid Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="glass-panel rounded-2xl overflow-hidden border border-white/5 flex flex-col h-[380px] skeleton-shimmer"
          >
            {/* Image Placeholder */}
            <div className="relative aspect-[16/10] sm:aspect-[4/3] bg-cinema-900/80 p-3 flex justify-between items-start">
              <div className="w-10 h-6 bg-white/10 rounded-lg"></div>
              <div className="w-16 h-7 bg-white/10 rounded-xl"></div>
            </div>

            {/* Content Placeholder */}
            <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="h-5 w-4/5 bg-white/15 rounded-lg"></div>
                <div className="flex gap-1.5 pt-1">
                  <div className="h-4 w-16 bg-white/10 rounded-md"></div>
                  <div className="h-4 w-20 bg-white/10 rounded-md"></div>
                  <div className="h-4 w-12 bg-white/10 rounded-md"></div>
                </div>
              </div>

              {/* Action Buttons Placeholder */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <div className="h-4 w-16 bg-white/10 rounded-md"></div>
                <div className="h-7 w-20 bg-white/15 rounded-xl"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
