import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { formatDate } from "@/lib/format";
import { companySettingsRepository, COMPANY_SETTINGS_ID } from "@/features/settings/repository";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-caption text-fg-subtle uppercase">{label}</p>
      <p className="text-body-sm text-fg mt-0.5">{value}</p>
    </div>
  );
}

/**
 * Admin Step 20 — Settings Foundation. Read-only this step — editing the
 * company profile comes in a later step, matching Admin Steps 5-19's
 * list+detail-first, create/edit-later discipline. There's no list here
 * because there's nothing to list: one company, one record.
 */
export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "settings.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Settings." />
      </div>
    );
  }

  let settings;
  try {
    settings = await companySettingsRepository.findById(COMPANY_SETTINGS_ID);
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Settings couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!settings) notFound();
  const canManage = hasPermission(user.role, "settings.manage");

  return (
    <>
      <AdminPageHeader
        title="Settings"
        description="Company profile, regional defaults, and system-wide configuration."
        secondaryActions={
          canManage && (
            <Link href="/admin/settings/edit" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Pencil aria-hidden className="size-3.5" />
              Edit
            </Link>
          )
        }
      />
      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-2">
        <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase">Logo</h2>
          <div className="flex items-center gap-4">
            {settings.logoMode === "name" ? (
              <div className="border-border bg-surface text-fg flex h-16 items-center rounded-lg border px-4 text-h4 font-semibold">
                {settings.displayName}
              </div>
            ) : (
              <div className="border-border bg-surface flex size-16 items-center justify-center rounded-lg border p-2">
                <Image src={settings.logo ?? "/logo.webp"} alt="" width={200} height={200} className="h-full w-full object-contain" />
              </div>
            )}
            <Fact label="Display Mode" value={settings.logoMode === "name" ? "Company Name" : "Image"} />
          </div>
        </section>

        <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase">Company</h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Legal Name" value={settings.legalName} />
            <Fact label="Display Name" value={settings.displayName} />
          </div>
        </section>

        <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase">Contact</h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Address" value={settings.address ?? "—"} />
            <Fact label="Phone" value={settings.phone ?? "—"} />
            <Fact label="WhatsApp" value={settings.whatsapp ?? "—"} />
            <Fact label="Email" value={settings.email ?? "—"} />
            <Fact label="Website" value={settings.website ?? "—"} />
            <Fact label="Hours" value={settings.hours ?? "—"} />
          </div>
        </section>

        <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase">Social Media</h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Instagram" value={settings.socialInstagram ?? "—"} />
            <Fact label="Facebook" value={settings.socialFacebook ?? "—"} />
            <Fact label="TikTok" value={settings.socialTiktok ?? "—"} />
            <Fact label="X" value={settings.socialX ?? "—"} />
            <Fact label="Threads" value={settings.socialThreads ?? "—"} />
            <Fact label="Pinterest" value={settings.socialPinterest ?? "—"} />
            <Fact label="YouTube" value={settings.socialYoutube ?? "—"} />
            <Fact label="LinkedIn" value={settings.socialLinkedin ?? "—"} />
          </div>
        </section>

        <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase">Regional & Defaults</h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Date Format" value={settings.dateFormat ?? "—"} />
            <Fact label="Time Zone" value={settings.timeZone ?? "—"} />
            <Fact label="Default Low-Stock Threshold" value={settings.defaultLowStockThreshold?.toString() ?? "—"} />
            <Fact label="Reminder Lead Days" value={settings.reminderLeadDays?.toString() ?? "—"} />
          </div>
        </section>

        <Link
          href="/admin/settings/notifications"
          className="border-border hover:border-fg-subtle group flex items-center justify-between rounded-lg border p-4 transition-colors lg:col-span-2"
        >
          <span className="text-body-sm text-fg">Notification Preferences — control which alerts reach you</span>
        </Link>

        <Link
          href="/admin/settings/backup"
          className="border-border hover:border-fg-subtle group flex items-center justify-between rounded-lg border p-4 transition-colors lg:col-span-2"
        >
          <span className="text-body-sm text-fg">Backup & Restore — download or restore all system data</span>
        </Link>

        <Link
          href="/admin/settings/blueprint-ai"
          className="border-border hover:border-fg-subtle group flex items-center justify-between rounded-lg border p-4 transition-colors lg:col-span-2"
        >
          <span className="text-body-sm text-fg">Blueprint AI — master prompts to draw or edit floor plans with an AI, and a plan checker</span>
        </Link>

        <section>
          <h2 className="text-label text-fg-subtle mb-2 uppercase">Record</h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Created" value={formatDate(new Date(settings.createdAt))} />
            <Fact label="Last Updated" value={formatDate(new Date(settings.updatedAt))} />
          </div>
        </section>
      </div>
    </>
  );
}
