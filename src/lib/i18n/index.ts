import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources } from "./resources";

export const LOCALE_KEY = "YoGas_locale";
export type AppLocale = "en" | "ne";

export function detectLocale(): AppLocale {
  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem(LOCALE_KEY);
    if (saved === "en" || saved === "ne") return saved;
    if (window.navigator.language?.toLowerCase().startsWith("ne")) return "ne";
  }
  return "en";
}

export function applyDocLocale(locale: AppLocale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale === "ne" ? "ne" : "en";
  document.documentElement.dir = "ltr";
}

export function appLocale(): AppLocale {
  return i18n.language === "ne" ? "ne" : "en";
}

i18n.use(initReactI18next).init({
  resources,
  lng: detectLocale(),
  fallbackLng: "en",
  ns: [
    "common",
    "auth",
    "landing",
    "onboarding",
    "dashboard",
    "waitlist",
    "dealers",
    "scan",
    "profile",
    "dealer",
    "notifications",
    "site",
    "about",
    "howItWorks",
    "howItWorksShort",
    "faq",
    "contact",
    "privacy",
    "terms",
  ],
  defaultNS: "common",
  interpolation: { escapeValue: false },
  returnNull: false,
});

applyDocLocale(appLocale());

export function setAppLocale(locale: AppLocale) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCALE_KEY, locale);
  }
  void i18n.changeLanguage(locale);
  applyDocLocale(locale);
}

const numberFormat = (options?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat(appLocale() === "ne" ? "ne-NP" : "en-NP", options);

/** Locale-aware number formatting (Devanagari digits + lakh/crore grouping in Nepali). */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  return numberFormat(options).format(value);
}

/** Nepali Rupee (NPR) currency formatting. */
export function formatCurrency(value: number, options?: Intl.NumberFormatOptions) {
  return numberFormat({
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
    ...options,
  }).format(value);
}

/** Locale-aware date formatting. */
export function formatDate(value: string | number | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(appLocale() === "ne" ? "ne-NP" : "en-NP", options).format(
    new Date(value),
  );
}

export default i18n;
