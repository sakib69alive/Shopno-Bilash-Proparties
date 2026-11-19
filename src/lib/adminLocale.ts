import type { Locale } from "@/lib/i18n";

export const ADMIN_LOCALE_COOKIE = "shopno-admin-language";

export function parseAdminLocale(value: string | undefined): Locale {
  return value === "bn" ? "bn" : "en";
}
