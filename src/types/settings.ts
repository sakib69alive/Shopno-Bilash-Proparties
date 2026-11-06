import type { AuditFields, ID } from "./common";

/**
 * Company profile — a singleton, not a list (one company, one record,
 * fixed id `"company"`). Contact fields are optional and start unset,
 * same honesty already established by `content/contact.ts`'s
 * `contactInfo`: no real office address/phone/email exists yet, so none
 * is invented here either.
 */
export interface CompanySettings extends AuditFields {
  id: ID;
  legalName: string;
  displayName: string;
  /**
   * A custom uploaded logo, replacing the bundled `/logo.webp` everywhere
   * the site shows a logo (public header/footer, login page, Admin
   * sidebar, Owner Portal). Independent of `logoMode` — uploading an
   * image doesn't switch to it automatically, the admin picks explicitly.
   */
  logo?: string;
  /** Whether the logo mark actually shown is the uploaded/default image, or just the company name as text — for a company that doesn't have a finished logo image yet. Defaults to "image" (the original bundled logo) when unset, so nothing changes until this is touched. */
  logoMode?: "image" | "name";
  address?: string;
  phone?: string;
  /** Digits only (with country code, e.g. "8801XXXXXXXXX") — the footer builds a `https://wa.me/<digits>` link from this directly, so anything typed here has non-digit characters stripped before use. Separate from `phone` since a business's call number and WhatsApp number are often different in Bangladesh. */
  whatsapp?: string;
  email?: string;
  website?: string;
  /** Free text since hours don't fit one fixed format (e.g. "Sat–Thu, 10am–7pm (GMT+6)") — shown in the footer's Contact column next to phone/email/address, hidden entirely while unset. */
  hours?: string;
  /**
   * Social profile URLs — each optional and independent, same "never
   * invent, never show a dead/placeholder link" rule as `socialLinks` in
   * `content/footer.ts` used to enforce by staying empty: the footer's
   * Follow column only ever renders an icon for a platform that actually
   * has a URL set here.
   */
  socialInstagram?: string;
  socialFacebook?: string;
  socialTiktok?: string;
  socialPinterest?: string;
  socialYoutube?: string;
  socialLinkedin?: string;
  socialX?: string;
  socialThreads?: string;
  /** Prompt 9 §14 — configurable rather than hardcoded, consumed by `formatDate`-adjacent display logic where wired. */
  dateFormat?: string;
  timeZone?: string;
  /** Fallback used by the alert engine's low-stock check when a material has no per-material `MaterialThreshold` row of its own. */
  defaultLowStockThreshold?: number;
  /** How many days before a due date (installment, document expiry, booking expiry, task/milestone) the alert engine starts surfacing it. */
  reminderLeadDays?: number;
  /** The public About page's "Our Impact" stat row — four fixed slots (not an open-ended list, so no separate CRUD table). Each is `undefined` until the admin sets a real figure; the public page shows an honest "—" placeholder rather than a fabricated number. */
  impactOngoingDevelopments?: number;
  impactDevelopmentAreaAcres?: number;
  impactLocations?: number;
  impactLandownerPartnerships?: number;
  /**
   * Defaults to required (`true`) when unset — an explicit admin choice to
   * turn this off, not an accidental one. When `false`, a Property Owner
   * who enters a registered phone number is signed straight in with no PIN
   * check, even if they've already set one. A deliberate tradeoff the
   * business owner made after being warned it means anyone who knows an
   * owner's phone number can see that owner's portal data — never apply
   * this same relaxation to Staff/Admin login, which stays password-only
   * regardless of this setting.
   */
  requireOwnerPin?: boolean;
  /**
   * Defaults to hidden (`false`/unset) — matches this site's original,
   * deliberate design (see DEPLOYMENT_GUIDE.md: "no visible Admin link
   * anywhere on the public site"). When `true`, a "Sign In" link appears
   * in the public header (`Header.tsx`) pointing at `/login`, for Property
   * Owners/Staff who can't type the URL themselves — an explicit
   * discoverability-vs-obscurity tradeoff the admin opts into, and can
   * turn back off in one click if it ever looks like a problem.
   */
  showPublicSignInLink?: boolean;
  /**
   * The client app's Home screen: show each flat's floor plan on the blue
   * blueprint sheet (`true`, and the default when unset) or on the classic
   * cream paper (`false` — the admin switches back in Settings). Only
   * affects the client portal Home; the My Property pages always use the blue sheet.
   */
  portalHomeBlueBlueprint?: boolean;
}
