import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { so, type Dictionary } from './so';
import { en } from './en';

export const DICTIONARIES = { so, en } as const;
export type Locale = keyof typeof DICTIONARIES;

const STORAGE_KEY = 'reveal.locale';

interface I18nValue {
  t: Dictionary;
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nValue>({ t: so, locale: 'so', setLocale: () => undefined });

function readStoredLocale(): Locale {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'en' || v === 'so' ? v : 'so';
  } catch {
    return 'so';
  }
}

export function I18nProvider({ children, initial }: { children: ReactNode; initial?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initial ?? readStoredLocale);
  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* storage unavailable */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo(() => ({ t: DICTIONARIES[locale], locale, setLocale }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
export const useT = () => useContext(I18nContext).t;
