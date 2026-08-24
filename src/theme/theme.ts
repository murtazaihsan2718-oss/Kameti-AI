// Native Theme Tokens & Design System - Matching Reference Designs 1-to-1

export const colors = {
  primary: '#000000', // Pitch Black Accent
  primaryDark: '#18181B',
  primaryLight: '#F4F4F5',
  primarySubtle: '#FAFAFA',
  
  secondary: '#F59E0B',
  secondaryLight: '#FEF3C7',
  
  background: '#FFFFFF', // Crisp White Page BG
  cardBg: '#F4F4F5',     // Light Gray Card BG
  cardBorder: '#E5E7EB',
  
  textPrimary: '#000000',
  textSecondary: '#52525B',
  textMuted: '#71717A',
  
  success: '#059669',
  warning: '#F59E0B',
  danger: '#E11D48',
  info: '#0284C7',
  
  gold: '#F59E0B',
  goldGlow: 'rgba(245, 158, 11, 0.2)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 26, fontWeight: '800' as const, color: colors.textPrimary },
  h2: { fontSize: 22, fontWeight: '800' as const, color: colors.textPrimary },
  h3: { fontSize: 18, fontWeight: '700' as const, color: colors.textPrimary },
  body: { fontSize: 15, fontWeight: '500' as const, color: colors.textPrimary },
  bodySecondary: { fontSize: 14, fontWeight: '500' as const, color: colors.textSecondary },
  caption: { fontSize: 11, fontWeight: '800' as const, color: colors.textMuted },
};
