import type { ReactNode } from "react";
import { CookieNotice } from "@/components/ui/CookieNotice";
import { Footer } from "@/components/navigation/Footer";
import { Header } from "@/components/navigation/Header";
import { HeaderVariantProvider } from "@/components/navigation/HeaderVariantContext";
import { SitePageLoader } from "@/components/navigation/SitePageLoader";
import { PageContent } from "@/components/navigation/PageContent";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import { SearchProvider } from "@/components/search/SearchContext";
import { SmoothScroll } from "@/components/navigation/SmoothScroll";
import { DesktopOnly } from "@/components/mobile/DesktopOnly";
import { MobileChromeProvider } from "@/components/mobile/MobileChrome";
import { MobileFooter } from "@/components/mobile/MobileFooter";
import { MobileShell } from "@/components/mobile/MobileShell";
import { getSiteNavDataAsync } from "@/lib/siteNavDataAsync";
import { companySettingsRepository, COMPANY_SETTINGS_ID } from "@/features/settings/repository";

/**
 * Public marketing site shell. From `lg` up: fixed Header, route content,
 * Footer, and the branded page-transition overlay. Below `lg` (phones and
 * tablets): the app-style chrome in `components/mobile/` — solid top bar,
 * bottom tab bar, Menu sheet and a slim footer — in place of Header and
 * Footer. Fetches the live CMS data both `SitePageLoader` (destination
 * titles) and `SearchOverlay` (search results) need exactly once per
 * request — same fetch-in-a-Server-Component-then-pass-as-prop pattern
 * `/properties` already uses — so neither Client Component needs to (or
 * can) `await` a repository call itself.
 */
export default async function PublicLayout({ children }: { children: ReactNode }) {
  const [{ projects, units, listings, newsArticles }, settings] = await Promise.all([
    getSiteNavDataAsync(),
    companySettingsRepository.findById(COMPANY_SETTINGS_ID),
  ]);

  return (
    <HeaderVariantProvider>
      <SearchProvider>
        <MobileChromeProvider
          contact={{ phone: settings?.phone, whatsapp: settings?.whatsapp, displayName: settings?.displayName }}
        >
          <SmoothScroll />
          <DesktopOnly>
            <Header settings={settings} />
          </DesktopOnly>
          <MobileShell settings={settings} routeTitleData={{ projects, units, newsArticles }} />
          <PageContent>{children}</PageContent>
          <DesktopOnly>
            <Footer settings={settings} />
          </DesktopOnly>
          <MobileFooter settings={settings} />
          <SitePageLoader routeTitleData={{ projects, units, newsArticles }} />
          <SearchOverlay searchData={{ projects, listings, newsArticles }} />
          <CookieNotice />
        </MobileChromeProvider>
      </SearchProvider>
    </HeaderVariantProvider>
  );
}
