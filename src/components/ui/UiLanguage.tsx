"use client";

import { createContext, useContext } from "react";
import type { Locale } from "@/lib/i18n";

type UiCopy = (text: string) => string;
export const englishCopy: UiCopy = (text) => text;

export const UiLanguageContext = createContext({ locale: "en" as Locale, t: englishCopy, toggle: () => {} });

export function useUiLanguage() {
  return useContext(UiLanguageContext);
}

export function UiText({ children, values }: { children: string; values?: Record<string, string | number> }) {
  const translated = useUiLanguage().t(children);
  if (!values) return translated;
  return translated.replace(/\{(\w+)\}/g, (placeholder, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : placeholder,
  );
}
