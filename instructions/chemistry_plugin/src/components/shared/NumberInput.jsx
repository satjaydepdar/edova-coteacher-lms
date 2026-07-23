import React from 'react';
import { AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export default function NumberInput({
  id,
  value,
  onChange,
  label,
  placeholder = '2–1000',
  error,
  min = 2,
  max = 1000,
  disabled = false,
  className = '',
}) {
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-slate-700">
          {label}
        </label>
      )}
      <input
        id={id}
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        disabled={disabled}
        className={clsx(
          'w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-400 focus:bg-white transition-all font-bold text-slate-800 outline-none',
          error && 'border-red-500/60 focus:border-red-400',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      />
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle size={12} />
          {error}
        </div>
      )}
    </div>
  );
}
