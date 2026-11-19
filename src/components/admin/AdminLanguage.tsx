"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Languages } from "lucide-react";
import { englishCopy, UiLanguageContext, useUiLanguage } from "@/components/ui/UiLanguage";
import type { Locale } from "@/lib/i18n";
import { ADMIN_LOCALE_COOKIE } from "@/lib/adminLocale";
import { translateAdminCopy } from "@/locales/bn/admin";

export { UiText as AdminText, useUiLanguage as useAdminLanguage } from "@/components/ui/UiLanguage";

export function AdminLanguageProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const [locale, setLocale] = useState(initialLocale);
  const context = useMemo(() => ({
    locale,
    t: locale === "bn" ? translateAdminCopy : englishCopy,
    toggle() {
      const next = locale === "bn" ? "en" : "bn";
      const secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${ADMIN_LOCALE_COOKIE}=${next}; Path=/admin; Max-Age=31536000; SameSite=Lax${secure}`;
      setLocale(next);
    },
  }), [locale]);

  return <UiLanguageContext.Provider value={context}>{children}</UiLanguageContext.Provider>;
}

export function AdminLanguageToggle() {
  const { locale, toggle } = useUiLanguage();
  const isBangla = locale === "bn";
  const label = isBangla ? "Switch admin to English" : "অ্যাডমিন প্যানেল বাংলায় দেখুন";

  return (
    <button type="button" onClick={toggle} aria-label={label} title={label}
      className="border-border bg-surface-raised text-fg hover:border-border-strong focus-visible:ring-accent inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3 text-sm font-medium focus-visible:ring-2">
      <Languages aria-hidden className="size-4" />
      <span lang={isBangla ? "en" : "bn"}>{isBangla ? "English" : "বাংলা"}</span>
    </button>
  );
}
