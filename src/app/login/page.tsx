import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { STAFF_ROLES, getPortalHomePath } from "@/config/roles";
import { ArchitecturalMotif } from "@/components/ui/ArchitecturalMotif";
import { Logo } from "@/components/navigation/Logo";
import { AuthTabs } from "@/components/auth/AuthTabs";
import { LoginM } from "@/components/mobile/LoginM";
import { companySettingsRepository, COMPANY_SETTINGS_ID } from "@/features/settings/repository";

const NAV_WORDS = ["Projects", "Properties", "Customers", "Finance"];

/**
 * Shared entry point for staff and portal roles alike (ARCHITECTURE.md
 * §1/§3) — one login, the post-auth redirect (in `lib/auth/actions.ts`)
 * decides `/admin` vs `/portal/*` by role. Already-signed-in visitors are
 * bounced straight to their own area rather than seeing the form again.
 *
 * Split-screen layout: a dark editorial panel (reusing the Footer's own
 * skyline motif and "dark statement band" language, `bg-fg` — safe here
 * because the app pins `data-theme="light"` site-wide, so `bg-fg` never
 * flips light) paired with a plain sign-in panel. Collapses to the form
 * alone below `lg`.
 */
const LINK_PROBLEMS: Record<string, string> = {
  invalid: "This link isn't working any more. Please ask Shopno Bilash Properties to send you a new one.",
  inactive: "Your access is currently switched off. Please contact Shopno Bilash Properties.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  const user = await getCurrentUser();
  if (user) {
    redirect(STAFF_ROLES.includes(user.role) ? "/admin" : getPortalHomePath(user.role));
  }

  const { link } = await searchParams;
  const linkProblem = link ? LINK_PROBLEMS[link] : undefined;

  const settings = await companySettingsRepository.findById(COMPANY_SETTINGS_ID);

  return (
    <main className="flex min-h-screen">
      {linkProblem && (
        <div role="alert" className="bg-error-soft text-error text-body-sm fixed inset-x-0 top-0 z-50 px-4 py-3 text-center font-medium shadow-sm">
          {linkProblem}
        </div>
      )}
      <LoginM
        logo={<Logo src={settings?.logo} mode={settings?.logoMode} displayName={settings?.displayName} className="h-16 sm:h-16" />}
      />
      <div className="bg-fg relative hidden overflow-hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <ArchitecturalMotif
          fit="cover"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] w-full text-white/10"
        />
        <div className="relative">
          <Logo src={settings?.logo} mode={settings?.logoMode} displayName={settings?.displayName} tone="inverted" />
        </div>
        <div className="relative flex flex-col gap-6">
          <p className="text-label uppercase tracking-wide text-white/55">Platform Access</p>
          <h1 className="text-display-l text-balance text-white">Every project deserves this much care.</h1>
          <p className="text-body max-w-md text-white/70">
            Projects, units, customers, sales and finance — one considered command center, built with the same
            restraint as the platform itself.
          </p>
        </div>
        <div className="text-label relative flex flex-wrap items-center gap-6 uppercase tracking-wide text-white/45">
          {NAV_WORDS.map((word) => (
            <span key={word}>{word}</span>
          ))}
        </div>
      </div>

      <div className="hidden flex-1 items-center justify-center p-6 sm:p-10 lg:flex">
        <div className="w-full max-w-sm">
          <p className="text-label text-fg-subtle mb-2 uppercase tracking-wide">Welcome back</p>
          <h2 className="text-h2 mb-1">Sign in</h2>
          <p className="text-body-sm text-fg-muted mb-6">Property owners and staff, in one place.</p>

          <AuthTabs />

          <div className="border-border text-caption text-fg-subtle mt-8 flex items-center gap-2 border-t pt-6">
            <Lock aria-hidden className="size-3.5 shrink-0" />
            Private access — staff and authorized portal users only.
          </div>
        </div>
      </div>
    </main>
  );
}
