import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { translations, languages, type Language, type TranslationKey } from "./translations";
import { getCurrencyForLang, formatPrice, formatPriceWithPeriod, getStripeLink, type Currency } from "./currency";

const STORAGE_KEY = "flexora_language";
const DEFAULT_LANGUAGE: Language = "en";

function detectBrowserLanguage(): Language {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  const navLang = (navigator.language || (navigator as any).userLanguage || "").toLowerCase();
  // Match the primary language subtag
  const code = navLang.split("-")[0];
  const match = languages.find((l) => l.code === code);
  return match ? match.code : DEFAULT_LANGUAGE;
}

function getStoredLanguage(): Language {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && languages.some((l) => l.code === stored)) {
      return stored as Language;
    }
  } catch {}
  return detectBrowserLanguage();
}

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  isRTL: boolean;
  currency: Currency;
  formatPrice: (usdCents: number) => string;
  formatPriceWithPeriod: (usdCents: number, suffix: string) => string;
  getStripeLink: (plan: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: DEFAULT_LANGUAGE,
  setLang: () => {},
  t: (key: TranslationKey) => key,
  isRTL: false,
  currency: "USD",
  formatPrice: (usdCents: number) => `${(usdCents / 100).toFixed(2)}`,
  formatPriceWithPeriod: (usdCents: number, suffix: string) =>
    `${(usdCents / 100).toFixed(2)}${suffix}`,
  getStripeLink: () => "#pricing",
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(DEFAULT_LANGUAGE);

  // Initialize from localStorage on mount (client-side only)
  useEffect(() => {
    setLangState(getStoredLanguage());
  }, []);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {}
    // Set dir on html element for RTL
    if (typeof document !== "undefined") {
      document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = newLang;
    }
  }, []);

  // Apply RTL on initial load and language change
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const langStrings = translations[lang] as unknown as Record<string, string | readonly string[]>;
      let value: string | readonly string[] | undefined = langStrings[key];

      // Fallback to English
      if (value === undefined) {
        value = (translations.en as unknown as Record<string, string | readonly string[]>)[key];
      }
      if (value === undefined) return key;

      // Handle array (for things like ptFeatures list)
      if (Array.isArray(value)) {
        if (params && params.index !== undefined) {
          return value[params.index as number] as string ?? key;
        }
        return value.join(", ");
      }

      // Replace parameters like {name}, {plan}, {days}
      if (params) {
        let result = value;
        for (const [param, replacement] of Object.entries(params)) {
          result = result.replace(`{${param}}`, String(replacement));
        }
        return result;
      }

      return value;
    },
    [lang]
  );

  const isRTL = lang === "ar";
  const currency = getCurrencyForLang(lang);

  const fmtPrice = useCallback(
    (usdCents: number) => formatPrice(usdCents, lang),
    [lang],
  );
  const fmtPricePeriod = useCallback(
    (usdCents: number, suffix: string) => formatPriceWithPeriod(usdCents, lang, suffix),
    [lang],
  );
  const stripeLink = useCallback(
    (plan: string) => getStripeLink(plan, lang),
    [lang],
  );

  return (
    <I18nContext.Provider
      value={{
        lang,
        setLang,
        t,
        isRTL,
        currency,
        formatPrice: fmtPrice,
        formatPriceWithPeriod: fmtPricePeriod,
        getStripeLink: stripeLink,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}

export { languages };

export function useLanguage() {
  const { t, lang } = useTranslation();
  // One price, one currency: NOK (matches the real Stripe payment links).
  const currency: Currency = "NOK";
  return { t, lang, currency };
}

export const LanguageProvider = I18nProvider;
