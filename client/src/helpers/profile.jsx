import React from 'react';

// Google Workspace-inspired vibrant color palette
const GOOGLE_PALETTE = [
  { bg: 'bg-blue-600', text: 'text-blue-100', border: 'border-blue-400', ring: 'ring-blue-500' },
  { bg: 'bg-emerald-600', text: 'text-emerald-100', border: 'border-emerald-400', ring: 'ring-emerald-500' },
  { bg: 'bg-purple-600', text: 'text-purple-100', border: 'border-purple-400', ring: 'ring-purple-500' },
  { bg: 'bg-amber-600', text: 'text-amber-100', border: 'border-amber-400', ring: 'ring-amber-500' },
  { bg: 'bg-rose-600', text: 'text-rose-100', border: 'border-rose-400', ring: 'ring-rose-500' },
  { bg: 'bg-indigo-600', text: 'text-indigo-100', border: 'border-indigo-400', ring: 'ring-indigo-500' },
  { bg: 'bg-teal-600', text: 'text-teal-100', border: 'border-teal-400', ring: 'ring-teal-500' },
  { bg: 'bg-orange-600', text: 'text-orange-100', border: 'border-orange-400', ring: 'ring-orange-500' },
];

/**
 * Deterministically pick a color scheme based on username or room name hash
 */
export function getProfileColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GOOGLE_PALETTE.length;
  return GOOGLE_PALETTE[index];
}

/**
 * Generate 1 or 2 letter initials (e.g. "Ajay" -> "A", "Bob Smith" -> "BS")
 */
export function getInitials(name = '') {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Google Chat Profile Avatar Component
 */
export function UserAvatar({ name, size = 'md', className = '' }) {
  const color = getProfileColor(name);
  const initials = getInitials(name);

  const sizeClasses = {
    xs: 'w-4 h-4 text-[9px]',
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-xs font-semibold',
    lg: 'w-10 h-10 text-sm font-bold',
  }[size] || 'w-8 h-8 text-xs font-semibold';

  return (
    <div
      title={name}
      className={`rounded-full flex items-center justify-center shrink-0 select-none shadow-sm font-mono tracking-tighter ${color.bg} ${color.text} ${sizeClasses} ${className}`}
    >
      {initials}
    </div>
  );
}

/**
 * Google Chat Room Avatar Component
 */
export function RoomAvatar({ roomId, size = 'md' }) {
  const color = getProfileColor(roomId || 'ROOM');
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm font-bold',
    lg: 'w-12 h-12 text-base font-bold',
  }[size] || 'w-9 h-9 text-sm font-bold';

  return (
    <div
      className={`rounded-2xl flex items-center justify-center shrink-0 shadow-md ${color.bg} text-white ${sizeClasses}`}
    >
      <span>#</span>
    </div>
  );
}
