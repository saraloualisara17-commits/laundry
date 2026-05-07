import { Platform } from 'react-native';

export const Colors = {
  primary: '#0D7377',
  primaryDark: '#0A5560',
  primaryLight: '#14A3A8',
  primary50: 'rgba(13,115,119,0.05)',
  primary100: 'rgba(13,115,119,0.10)',
  primary200: 'rgba(13,115,119,0.20)',
  accent: '#C9A84C',
  accent100: 'rgba(201,168,76,0.10)',
  bg: '#F4F6F8',
  surface: '#FFFFFF',
  surface2: '#F9FAFB',
  textPrimary: '#0D1B2A',
  textSecondary: '#4A5568',
  textMuted: '#94A3B8',
  border: 'rgba(0,0,0,0.07)',
  borderMedium: 'rgba(0,0,0,0.12)',
  success: '#10B981',
  successBg: 'rgba(16,185,129,0.10)',
  warning: '#F59E0B',
  warningBg: 'rgba(245,158,11,0.10)',
  danger: '#EF4444',
  dangerBg: 'rgba(239,68,68,0.10)',
  info: '#3B82F6',
  infoBg: 'rgba(59,130,246,0.10)',
};

export const StatusColors: Record<string, { bg: string; border: string; text: string; dot: string; label: string }> = {
  PENDING_PICKUP: {
    bg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.20)',
    text: '#D97706',
    dot: '#F59E0B',
    label: 'En attente'
  },
  PICKED_UP: {
    bg: 'rgba(59,130,246,0.10)',
    border: 'rgba(59,130,246,0.20)',
    text: '#2563EB',
    dot: '#3B82F6',
    label: 'Récupérée'
  },
  IN_PROCESS: {
    bg: 'rgba(13,115,119,0.10)',
    border: 'rgba(13,115,119,0.20)',
    text: '#0D7377',
    dot: '#14A3A8',
    label: 'En traitement'
  },
  READY_FOR_DELIVERY: {
    bg: 'rgba(201,168,76,0.10)',
    border: 'rgba(201,168,76,0.25)',
    text: '#92400E',
    dot: '#C9A84C',
    label: 'Prête'
  },
  DELIVERED: {
    bg: 'rgba(16,185,129,0.10)',
    border: 'rgba(16,185,129,0.20)',
    text: '#065F46',
    dot: '#10B981',
    label: 'Livrée'
  },
  CANCELLED: {
    bg: 'rgba(239,68,68,0.10)',
    border: 'rgba(239,68,68,0.20)',
    text: '#991B1B',
    dot: '#EF4444',
    label: 'Annulée'
  },
};

export const Shadows = {
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  teal: {
    shadowColor: '#0D7377',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  accent: {
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
};

export const Typography = {
  size: {
    xs: 11,
    sm: 12,
    base: 14,
    md: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

// Map existing light/dark Colors for compatibility if needed, 
// but we will primarily use the new flat Colors object.
export const ThemeColors = {
  light: {
    text: Colors.textPrimary,
    background: Colors.bg,
    tint: Colors.primary,
    icon: Colors.textSecondary,
    tabIconDefault: Colors.textMuted,
    tabIconSelected: Colors.primary,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#fff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
  },
};
