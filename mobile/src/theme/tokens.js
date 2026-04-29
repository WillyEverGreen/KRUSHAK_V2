// Design tokens mirroring the web app's theme.css
export const colors = {
  primaryGreen: '#2e7d32',
  lightGreen: '#e8f5e9',
  accentGreen: '#4caf50',
  backgroundGreen: '#f1f8e9',
  cardBackground: '#ffffff',
  textDark: '#1b5e20',
  textGrey: '#757575',
  borderSoft: '#e5ece7',
  warning: '#f97316',
  danger: '#ef4444',
  white: '#ffffff',
  black: '#000000',
  // Extra
  bgGradientStart: '#f4faed',
  heroGradientStart: '#3a9d41',
  heroGradientEnd: '#2e7d32',
  overlayDark: 'rgba(0,0,0,0.45)',
  overlayLight: 'rgba(255,255,255,0.16)',
  // Additional
  successLight: '#dcfce7',
  warningLight: '#fef3c7',
  dangerLight: '#fee2e2',
  blueAccent: '#3b82f6',
  blueDark: '#1d4ed8',
  tabBar: '#ffffff',
  overlay: 'rgba(0,0,0,0.5)',
};

export const radii = {
  xl: 28,
  lg: 20,
  md: 16,
  sm: 12,
  xs: 8,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const typography = {
  fontFamily: undefined, // Uses system font by default; swap to custom if needed
  xs: 12,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 26,
};

export const shadows = {
  card: {
    shadowColor: '#1b5e20',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 4,
  },
  hero: {
    shadowColor: '#1b5e20',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 8,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
};
