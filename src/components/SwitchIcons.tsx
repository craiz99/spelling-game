import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export const PokeBallIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#E64545',
  className,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 28"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <circle cx="14" cy="14" r="12" fill={color} />
    <path d="M2 14 A12 12 0 0 0 26 14 Z" fill="#FFFFFF" opacity="0.88" />
    <line x1="2" y1="14" x2="26" y2="14" stroke="#1E2B3C" strokeWidth="2.2" />
    <circle cx="14" cy="14" r="4.2" fill="#FFFFFF" stroke="#1E2B3C" strokeWidth="2" />
    <circle cx="14" cy="14" r="1.6" fill={color} />
  </svg>
);

export const StarIcon: React.FC<{ size?: number; filled?: boolean; color?: string }> = ({
  size = 20,
  filled = true,
  color = '#F5B82E',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 2.4l2.85 6.08 6.65.82-4.9 4.58 1.28 6.58L12 17.2l-5.88 3.26 1.28-6.58-4.9-4.58 6.65-.82L12 2.4z"
      fill={filled ? color : '#E2E8F0'}
      stroke={filled ? '#D99316' : '#CBD5E1'}
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

export const SpeakerIcon: React.FC<{ size?: number; muted?: boolean; color?: string }> = ({
  size = 20,
  muted = false,
  color = 'currentColor',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    {muted ? (
      <>
        <line x1="22" y1="9" x2="16" y2="15" />
        <line x1="16" y1="9" x2="22" y2="15" />
      </>
    ) : (
      <>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </>
    )}
  </svg>
);

export const PawPrintIcon: React.FC<IconProps> = ({
  size = 26,
  color = '#A66B37',
  className,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <circle cx="16" cy="20.5" r="6" fill={color} />
    <circle cx="9.2" cy="13.2" r="2.8" fill={color} />
    <circle cx="13.8" cy="10" r="2.8" fill={color} />
    <circle cx="18.6" cy="10" r="2.8" fill={color} />
    <circle cx="23.2" cy="13.4" r="2.7" fill={color} />
  </svg>
);

export const GearIcon: React.FC<IconProps> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.1"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const BookIcon: React.FC<IconProps> = ({ size = 19 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.1"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

export const CrownIcon: React.FC<IconProps> = ({ size = 19 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.1"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2 18h20l-2-10-4.5 4L12 5l-3.5 7L4 8l-2 10z" />
  </svg>
);

export const HeartIcon: React.FC<IconProps> = ({ size = 16, color = '#E11D48' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

export const BackChevronIcon: React.FC<IconProps> = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export const LockIcon: React.FC<IconProps> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const SparkleIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M12 2l2.1 6.2L20 10l-5.9 1.8L12 18l-2.1-6.2L4 10l5.9-1.8L12 2z" />
  </svg>
);

export const BadgeGlyph: React.FC<{
  type: 'house' | 'paw' | 'controller' | 'heart' | 'bolt' | 'chain' | 'pokeball' | 'crown';
  size?: number;
}> = ({ type, size = 28 }) => {
  switch (type) {
    case 'paw':
      return <PawPrintIcon size={size} color="#FFFFFF" />;
    case 'crown':
      return <CrownIcon size={size} />;
    case 'heart':
      return <HeartIcon size={size - 2} color="#FFFFFF" />;
    case 'pokeball':
      return <PokeBallIcon size={size} color="#FFFFFF" />;
    case 'bolt':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case 'controller':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" aria-hidden="true">
          <rect x="2" y="6" width="20" height="12" rx="4" />
          <line x1="8" y1="10" x2="8" y2="14" />
          <line x1="6" y1="12" x2="10" y2="12" />
          <circle cx="16" cy="11" r="1" fill="#FFFFFF" />
          <circle cx="18" cy="13" r="1" fill="#FFFFFF" />
        </svg>
      );
    case 'chain':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
    case 'house':
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" aria-hidden="true">
          <path d="M3 10.5L12 3l9 7.5" />
          <path d="M5 10v10h14V10" />
        </svg>
      );
  }
};
