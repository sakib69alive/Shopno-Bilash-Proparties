import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, Manrope, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

// Hero and lead lines on the phone layout only — one weight, so the
// request stays small.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const notoSansBengali = Noto_Sans_Bengali({
  variable: "--font-noto-sans-bengali",
  subsets: ["bengali"],
  display: "swap",
});

// No production domain has been assigned yet — set NEXT_PUBLIC_SITE_URL
// when this site is deployed for real so absolute URLs (Open Graph images,
// canonical links, the sitemap) resolve correctly. Falls back to localhost
// for development rather than inventing a placeholder domain.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// `viewportFit: "cover"` lets the phone shell's fixed bars use
// `env(safe-area-inset-*)` for the notch / home indicator.
export const viewport: Viewport = {
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Shopno Bilash Properties",
    template: "%s | Shopno Bilash Properties",
  },
  description:
    "Shopno Bilash Properties — premium real estate development, property sales, and landowner joint-venture management, built on trust and designed for the future.",
  openGraph: {
    siteName: "Shopno Bilash Properties",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${inter.variable} ${manrope.variable} ${instrumentSerif.variable} ${notoSansBengali.variable} antialiased`}
    >
      {/*
        Horizontal clipping lives on the wrapper div INSIDE <body>, deliberately not on <html>/<body>: overflow set on
        the root elements is applied to the browser's own scroller, and on Android Chrome that makes position:fixed
        bars (the bottom tab bar) lag and get half-covered by page content while the address bar slides in/out.
        (`overflow-x-clip` rather than `hidden` keeps `position: sticky` working.)
        The clip is a deliberate safety net, not a fix for
        one specific element: decorative "bleed" motifs (e.g. Values.tsx's
        two side graphics, positioned outside their narrow container into
        the page gutter) can overflow the viewport at some breakpoints
        depending on exact gutter width, which showed up as a real
        horizontal scrollbar and made scrolling feel glitchy. The page
        itself should never scroll horizontally — DESIGN_SYSTEM.md already
        says wide content belongs in its own `overflow-x-auto` container,
        never the page — this just enforces that at the root instead of
        chasing every current/future decorative element's exact math.
      */}
      <body className="bg-bg text-fg">
        <div className="flex min-h-screen flex-col overflow-x-clip">{children}</div>
      </body>
    </html>
  );
}
