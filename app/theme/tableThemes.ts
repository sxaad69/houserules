// theme/tableThemes.ts — per-deck table atmosphere. Single source of truth:
// TableScreen, ThemesScreen (gallery) and RoomScreen (multiplayer) all read
// from here. Spec §10: theming system, not one palette.

export interface TableTheme {
  overlay: string;
  opacity: number;
}

export const TABLE_THEMES: Record<string, TableTheme> = {
  classic52: { overlay: '#000000', opacity: 0 },
  uno108: { overlay: '#17123E', opacity: 0.62 }, // midnight indigo — bright cards pop
  baloot32: { overlay: '#3A2413', opacity: 0.55 }, // desert night bronze
  animals12: { overlay: '#0E3A20', opacity: 0.5 }, // deep jungle green
};
