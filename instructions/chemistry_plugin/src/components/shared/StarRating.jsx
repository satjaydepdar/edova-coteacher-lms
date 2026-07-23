import React from 'react';
import { Star } from 'lucide-react';
import clsx from 'clsx';

export default function StarRating({ stars = 0, max = 3, className = '' }) {
  return (
    <div className={clsx("flex items-center gap-1", className)}>
      {[...Array(max)].map((_, i) => (
        <Star 
          key={i} 
          size={18} 
          className={i < stars ? "text-amber-400 fill-amber-400 drop-shadow-sm" : "text-slate-300 fill-slate-200"} 
        />
      ))}
    </div>
  );
}
