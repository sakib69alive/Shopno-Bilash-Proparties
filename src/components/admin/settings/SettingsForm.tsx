"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import Image from "next/image";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import type { CompanySettings } from "@/types/settings";
import type { SettingsFormState } from "@/features/settings/actions";

const LOGO_MODE_OPTIONS = [
  { value: "image", label: "Image (a logo file)" },
  { value: "name", label: "Company Name (text only)" },
];

export interface SettingsFormProps {
  action: (state: SettingsFormState, formData: FormData) => Promise<SettingsFormState>;
  settings: CompanySettings;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Save Changes
    </Button>
  );
}

export function SettingsForm({ action, settings }: SettingsFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <h2 id="logo" className="text-label text-fg-subtle scroll-mt-24 uppercase">Logo</h2>
      <p className="text-caption text-fg-subtle -mt-3">
        Shown everywhere the site has a logo — header, footer, login page, Admin sidebar, Owner Portal.
      </p>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        {settings.logo && (
          <div className="border-border bg-surface-raised flex size-20 shrink-0 items-center justify-center rounded-lg border p-2">
            <Image src={settings.logo} alt="Current logo" width={200} height={200} className="h-full w-full object-contain" />
          </div>
        )}
        <div className="flex flex-1 flex-col gap-5">
          <Input
            label="New Logo Image (optional)"
            name="logo"
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            helperText={
              settings.logo
                ? "A transparent-background PNG or WEBP works best. Leave empty to keep the current logo."
                : "A transparent-background PNG or WEBP works best, up to 15MB."
            }
          />
          <Select
            label="Logo Display"
            name="logoMode"
            options={LOGO_MODE_OPTIONS}
            defaultValue={settings.logoMode ?? "image"}
            helperText="Don't have a finished logo image yet? Switch this to “Company Name” and the site shows your name as text instead, everywhere a logo would go."
          />
        </div>
      </div>

      <h2 id="company" className="text-label text-fg-subtle mt-2 scroll-mt-24 uppercase">Company</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Legal Name" name="legalName" required defaultValue={settings.legalName} />
        <Input label="Display Name" name="displayName" required defaultValue={settings.displayName} />
      </div>

      <h2 id="contact" className="text-label text-fg-subtle mt-2 scroll-mt-24 uppercase">Contact</h2>
      <p className="text-caption text-fg-subtle -mt-3">Shown in the public site&rsquo;s footer, under &ldquo;Contact&rdquo; — each field is hidden there individually while empty, nothing is ever shown as a placeholder.</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Address (optional)" name="address" defaultValue={settings.address} />
        <Input label="Phone (optional)" name="phone" defaultValue={settings.phone} />
        <Input
          label="WhatsApp Number (optional)"
          name="whatsapp"
          defaultValue={settings.whatsapp}
          placeholder="e.g. 8801XXXXXXXXX"
          helperText="With country code, digits only — becomes a tap-to-chat link in the footer."
        />
        <Input label="Email (optional)" name="email" type="email" defaultValue={settings.email} />
        <Input label="Website (optional)" name="website" defaultValue={settings.website} />
        <div className="sm:col-span-2">
          <Input
            label="Hours (optional)"
            name="hours"
            defaultValue={settings.hours}
            placeholder="e.g. Sat–Thu, 10am–7pm (GMT+6)"
          />
        </div>
      </div>

      <h2 id="social" className="text-label text-fg-subtle mt-2 scroll-mt-24 uppercase">Social Media</h2>
      <p className="text-caption text-fg-subtle -mt-3">
        Full profile URLs (e.g. https://instagram.com/yourpage). Shown as an icon in the public footer&rsquo;s &ldquo;Follow&rdquo;
        column — only for the platforms you fill in here, never an invented or dead link.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Instagram (optional)" name="socialInstagram" type="url" defaultValue={settings.socialInstagram} placeholder="https://instagram.com/…" />
        <Input label="Facebook (optional)" name="socialFacebook" type="url" defaultValue={settings.socialFacebook} placeholder="https://facebook.com/…" />
        <Input label="TikTok (optional)" name="socialTiktok" type="url" defaultValue={settings.socialTiktok} placeholder="https://tiktok.com/@…" />
        <Input label="X (optional)" name="socialX" type="url" defaultValue={settings.socialX} placeholder="https://x.com/…" />
        <Input label="Threads (optional)" name="socialThreads" type="url" defaultValue={settings.socialThreads} placeholder="https://threads.net/@…" />
        <Input label="Pinterest (optional)" name="socialPinterest" type="url" defaultValue={settings.socialPinterest} placeholder="https://pinterest.com/…" />
        <Input label="YouTube (optional)" name="socialYoutube" type="url" defaultValue={settings.socialYoutube} placeholder="https://youtube.com/@…" />
        <Input label="LinkedIn (optional)" name="socialLinkedin" type="url" defaultValue={settings.socialLinkedin} placeholder="https://linkedin.com/company/…" />
      </div>

      <h2 className="text-label text-fg-subtle mt-2 uppercase">Regional & Defaults</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Date Format (optional)" name="dateFormat" defaultValue={settings.dateFormat} placeholder="e.g. DD MMM YYYY" />
        <Input label="Time Zone (optional)" name="timeZone" defaultValue={settings.timeZone} placeholder="e.g. Asia/Dhaka" />
        <Input
          label="Default Low-Stock Threshold (optional)"
          name="defaultLowStockThreshold"
          type="number"
          defaultValue={settings.defaultLowStockThreshold}
          helperText="Used when a material has no threshold of its own set."
        />
        <Input
          label="Reminder Lead Days (optional)"
          name="reminderLeadDays"
          type="number"
          defaultValue={settings.reminderLeadDays}
          helperText="How many days ahead documents/bookings expiring soon are surfaced."
        />
      </div>

      <h2 id="impact" className="text-label text-fg-subtle mt-2 scroll-mt-24 uppercase">Public &ldquo;Our Impact&rdquo; Stats</h2>
      <p className="text-caption text-fg-subtle -mt-3">Shown on the public About page. Leave any of these empty and the site shows a placeholder instead of a made-up number.</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Ongoing Developments" name="impactOngoingDevelopments" type="number" defaultValue={settings.impactOngoingDevelopments} />
        <Input label="Development Area (acres)" name="impactDevelopmentAreaAcres" type="number" defaultValue={settings.impactDevelopmentAreaAcres} />
        <Input label="Locations" name="impactLocations" type="number" defaultValue={settings.impactLocations} />
        <Input label="Landowner Partnerships" name="impactLandownerPartnerships" type="number" defaultValue={settings.impactLandownerPartnerships} />
      </div>

      <h2 id="client-look" className="text-label text-fg-subtle mt-2 scroll-mt-24 uppercase">Client app look</h2>
      <fieldset className="flex flex-col gap-3">
        <legend className="text-body-sm text-fg font-medium">Floor-plan look on the client&rsquo;s Home screen</legend>
        <p className="text-caption text-fg-subtle">
          What your clients see by default. Each client can switch it for themselves in the app under Profile → Appearance, and their own pick wins. This only changes the
          client app&rsquo;s Home screen — the My Property pages always show the blue sheet, and nothing on the public website or in Admin changes.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              { value: "cream", title: "Cream paper", note: "The plan on a clean, plain cream background.", swatch: "bg-[#efe7d6]" },
              { value: "blue", title: "Blue", note: "The plan as white lines on a clean, plain blue background.", swatch: "bg-[#1d5aa6]" },
              {
                value: "grid",
                title: "Blue grid (default)",
                note: "The same blue with a fine drafting grid, like a real blueprint.",
                swatch: "bg-[#1d5aa6] [background-image:linear-gradient(rgb(255_255_255/0.28)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.28)_1px,transparent_1px)] [background-size:10px_10px]",
              },
            ] as const
          ).map((option) => (
            <label key={option.value} className="border-border-strong has-[:checked]:border-accent has-[:checked]:bg-accent-soft flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors">
              <input type="radio" name="portalHomeLook" value={option.value} defaultChecked={(settings.portalHomeLook ?? "grid") === option.value} className="accent-accent mt-1" />
              <span className={`${option.swatch} border-border size-9 shrink-0 rounded-md border`} aria-hidden />
              <span>
                <span className="text-body-sm text-fg block font-medium">{option.title}</span>
                <span className="text-caption text-fg-muted block">{option.note}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <h2 className="text-label text-fg-subtle mt-2 uppercase">Security</h2>
      <Switch
        name="requireOwnerPin"
        label="Require PIN for Property Owner login"
        description="On (default): owners must enter their 4-digit PIN, same as today. Off: entering a registered phone number alone signs an owner straight in, no PIN asked — easier for owners who find a PIN confusing, but anyone who knows an owner's phone number can then see that owner's portal data too. Staff/Admin login always requires a password regardless of this setting."
        defaultChecked={settings.requireOwnerPin ?? true}
      />
      <Switch
        name="showPublicSignInLink"
        label="Show a Sign In link on the public website"
        description="Off (default): the login page has no visible link anywhere on the public site — Property Owners and Staff bookmark /login themselves. On: a 'Sign In' link appears in the public header on every page, for anyone who can't type a URL. Turn it back off any time if this ever feels like it draws the wrong kind of attention — it never affects who can actually sign in, only whether the door is signposted."
        defaultChecked={settings.showPublicSignInLink ?? false}
      />

      <div className="flex items-center gap-3">
        <SubmitButton />
      </div>
    </PersistForm>
  );
}
