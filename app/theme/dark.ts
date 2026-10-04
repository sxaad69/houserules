import { amber, cream, felt, gold, ink, semantic, vip } from './tokens';
import type { Colors } from './light';

// Dark mode: the felt table IS the room. Surfaces get lighter than the
// background (never pure black); gold stays reserved for VIP surfaces.
export const darkColors: Colors = {
  background: felt[900],
  surface: felt[800],
  surfaceAlt: felt[700],
  border: felt[700],
  borderStrong: felt[600],
  textPrimary: cream[100],
  textSecondary: cream[200],
  textTertiary: cream[300],
  textInverse: ink[900],
  accent: amber[500],
  accentMuted: 'rgba(232,163,61,0.18)',
  felt: felt[800],
  feltDeep: felt[900],
  vip: vip[800],
  gold: gold[400],
  vipText: cream[100],
  cardFace: cream[50],
  danger: '#E0684F',
  warning: semantic.warning,
  success: semantic.success,
  info: semantic.info,
  overlay: 'rgba(0,0,0,0.6)',
};
