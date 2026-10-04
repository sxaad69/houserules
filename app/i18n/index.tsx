import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { en, type Strings } from './en';
import { ar } from './ar';

export type Locale = 'en' | 'ar';

const LOCALE_KEY = '@houserules:locale/v1';
const dictionaries: Record<Locale, Strings> = { en, ar };

// ponytail: no i18n library for two small dictionaries — a typed map plus
// I18nManager for RTL is the whole thing.
interface LocaleState {
  locale: Locale;
  strings: Strings;
  isRtl: boolean;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleState | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    AsyncStorage.getItem(LOCALE_KEY).then((saved) => {
      if (saved === 'ar' || saved === 'en') {
        setLocaleState(saved);
        I18nManager.forceRTL(saved === 'ar');
      }
    });
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    AsyncStorage.setItem(LOCALE_KEY, next).catch(() => {});
    // RTL applies fully on next app start; layout flips live for most views.
    I18nManager.forceRTL(next === 'ar');
  }, []);

  const value = useMemo<LocaleState>(
    () => ({
      locale,
      strings: dictionaries[locale],
      isRtl: locale === 'ar',
      setLocale,
    }),
    [locale, setLocale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleState {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider');
  return ctx;
}

/** Shorthand: const { t } = useStrings() — t('home.quickPlay'). */
export function useStrings(): { t: Strings; locale: Locale } {
  const { strings, locale } = useLocale();
  return { t: strings, locale };
}
