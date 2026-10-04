import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, type Colors } from './light';
import { darkColors } from './dark';
import { spacing, radii } from './tokens';
import { typography } from './typography';

export type ColorScheme = 'light' | 'dark';
export type ColorSchemePreference = ColorScheme | 'system';

export interface Theme {
  colors: Colors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  colorScheme: ColorScheme;
  setColorScheme: (preference: ColorSchemePreference) => void;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme: ColorScheme =
    useColorScheme() === 'dark' ? 'dark' : 'light';
  const [preference, setPreference] = useState<ColorSchemePreference>('system');
  const colorScheme: ColorScheme =
    preference === 'system' ? systemScheme : preference;

  const theme = useMemo<Theme>(
    () => ({
      colors: colorScheme === 'dark' ? darkColors : lightColors,
      spacing,
      radii,
      typography,
      colorScheme,
      setColorScheme: setPreference,
    }),
    [colorScheme],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used within a ThemeProvider');
  return theme;
}
