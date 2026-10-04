import { amber, cream, felt, gold, ink, semantic, vip } from './tokens';

// Light mode: warm cream lobby; felt appears on table surfaces, never as
// the whole background (keeps text contrast AA-safe).
export interface Colors {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  accent: string;
  accentMuted: string;
  felt: string;
  feltDeep: string;
  vip: string;
  gold: string;
  vipText: string; // text on midnight VIP surfaces (readable in both modes)
  cardFace: string;
  danger: string;
  warning: string;
  success: string;
  info: string;
  overlay: string;
}

export const lightColors: Colors = {
  background: cream[100],
  surface: cream[50],
  surfaceAlt: cream[200],
  border: cream[300],
  borderStrong: ink[400],
  textPrimary: ink[900],
  textSecondary: ink[700],
  textTertiary: ink[500],
  textInverse: cream[50],
  accent: amber[500],
  accentMuted: 'rgba(232,163,61,0.16)',
  felt: felt[800],
  feltDeep: felt[900],
  vip: vip[800],
  gold: gold[500],
  vipText: cream[100],
  cardFace: cream[50],
  danger: semantic.danger,
  warning: semantic.warning,
  success: semantic.success,
  info: semantic.info,
  overlay: 'rgba(10,46,35,0.55)',
};
