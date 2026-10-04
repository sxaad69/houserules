// Primitive tokens — raw values. Never referenced directly in components;
// components consume the semantic mappings in light.ts / dark.ts.
// Palette designed from scratch for HouseRules (felt-table casino,
// family-friendly, global): deep emerald felt, midnight VIP, gold reserved
// strictly for VIP/status surfaces.

export const felt = {
  900: '#0A2E23', // feltDark — deepest table
  800: '#0E4D3A', // felt — primary table surface
  700: '#14604A',
  600: '#1B7559',
} as const;

export const vip = {
  900: '#0D1122',
  800: '#12172E', // vipBg — midnight lounge
  700: '#1B2342',
} as const;

export const gold = {
  500: '#C9A227', // VIP gold — never used on free-tier surfaces
  400: '#D9B545',
  600: '#A8861F',
} as const;

export const cream = {
  50: '#FFFFFF',
  100: '#F5EFE0', // cream — light-mode background
  200: '#EAE0C8',
  300: '#D9CCAC',
} as const;

export const ink = {
  900: '#1A1A1A', // ink — primary text / card pips
  700: '#3A3A3A',
  500: '#6B6B6B',
  400: '#9A9A9A',
} as const;

export const amber = {
  500: '#E8A33D', // accent — warm amber CTAs (free tier friendly, not gold)
  600: '#D18F2A',
} as const;

export const cardFace = '#FFFFFF' as const;

export const semantic = {
  success: '#2E9E5B',
  warning: '#D97706',
  danger: '#C0392B',
  info: '#2D7FC4',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;
