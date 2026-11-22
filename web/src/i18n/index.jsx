import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import en from "./en.js";
import ur from "./ur.js";

const DICTIONARIES = { en, ur };
const I18nContext = createContext(null);

function readValue(dictionary, key) {
  if (!dictionary) return undefined;
  if (dictionary[key] !== undefined) return dictionary[key];
  return key.split(".").reduce((value, part) => (value && value[part] !== undefined ? value[part] : undefined), dictionary);
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem("rentsaathi.locale") : null;
    return stored && DICTIONARIES[stored] ? stored : import.meta.env.VITE_DEFAULT_LOCALE || "en";
  });

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ur" ? "rtl" : "ltr";
    try {
      localStorage.setItem("rentsaathi.locale", locale);
    } catch {
      // storage can be unavailable in private mode
    }
  }, [locale]);

  const setLocale = useCallback((next) => {
    if (DICTIONARIES[next]) setLocaleState(next);
  }, []);

  const t = useCallback(
    (key, fallback) => {
      const value = readValue(DICTIONARIES[locale], key);
      if (value !== undefined) return value;
      const english = readValue(en, key);
      return english !== undefined ? english : fallback ?? key;
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, languages: Object.keys(DICTIONARIES) }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
