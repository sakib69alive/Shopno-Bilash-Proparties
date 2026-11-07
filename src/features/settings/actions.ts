"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { recordAuditEvent } from "@/features/audit/repository";
import { companySettingsRepository, COMPANY_SETTINGS_ID } from "@/features/settings/repository";
import { saveUploadedFile, deleteUploadedFile } from "@/lib/fileStorage";
import type { CompanySettings } from "@/types/settings";

export interface SettingsFormState {
  error?: string;
}

function getUploadedFile(formData: FormData, field: string): File | null {
  const file = formData.get(field);
  return file instanceof File && file.size > 0 ? file : null;
}

function isLogoMode(value: string): value is NonNullable<CompanySettings["logoMode"]> {
  return value === "image" || value === "name";
}

/** Prompt 9 §14 — the first edit path for `CompanySettings` (Admin Step 20 shipped it read-only). Still a singleton: no create/delete, just update the one real row. */
export async function updateCompanySettings(_prevState: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (!hasPermission(user.role, "settings.manage")) throw new Error("Forbidden");

  const logoModeRaw = String(formData.get("logoMode") ?? "image").trim();
  const legalName = String(formData.get("legalName") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const hours = String(formData.get("hours") ?? "").trim();
  const socialInstagram = String(formData.get("socialInstagram") ?? "").trim();
  const socialFacebook = String(formData.get("socialFacebook") ?? "").trim();
  const socialTiktok = String(formData.get("socialTiktok") ?? "").trim();
  const socialX = String(formData.get("socialX") ?? "").trim();
  const socialThreads = String(formData.get("socialThreads") ?? "").trim();
  const socialPinterest = String(formData.get("socialPinterest") ?? "").trim();
  const socialYoutube = String(formData.get("socialYoutube") ?? "").trim();
  const socialLinkedin = String(formData.get("socialLinkedin") ?? "").trim();
  const dateFormat = String(formData.get("dateFormat") ?? "").trim();
  const timeZone = String(formData.get("timeZone") ?? "").trim();
  const defaultLowStockThresholdRaw = String(formData.get("defaultLowStockThreshold") ?? "").trim();
  const reminderLeadDaysRaw = String(formData.get("reminderLeadDays") ?? "").trim();
  const impactOngoingDevelopmentsRaw = String(formData.get("impactOngoingDevelopments") ?? "").trim();
  const impactDevelopmentAreaAcresRaw = String(formData.get("impactDevelopmentAreaAcres") ?? "").trim();
  const impactLocationsRaw = String(formData.get("impactLocations") ?? "").trim();
  const impactLandownerPartnershipsRaw = String(formData.get("impactLandownerPartnerships") ?? "").trim();
  const requireOwnerPin = formData.get("requireOwnerPin") === "on";
  const showPublicSignInLink = formData.get("showPublicSignInLink") === "on";
  const lookRaw = formData.get("portalHomeLook");
  const portalHomeLook: "cream" | "blue" | "grid" = lookRaw === "cream" || lookRaw === "blue" ? lookRaw : "grid";

  if (!legalName || legalName.length < 2) return { error: "Enter a legal name." };
  if (!displayName || displayName.length < 2) return { error: "Enter a display name." };

  const defaultLowStockThreshold = defaultLowStockThresholdRaw ? Number(defaultLowStockThresholdRaw) : undefined;
  const reminderLeadDays = reminderLeadDaysRaw ? Number(reminderLeadDaysRaw) : undefined;
  const impactOngoingDevelopments = impactOngoingDevelopmentsRaw ? Number(impactOngoingDevelopmentsRaw) : undefined;
  const impactDevelopmentAreaAcres = impactDevelopmentAreaAcresRaw ? Number(impactDevelopmentAreaAcresRaw) : undefined;
  const impactLocations = impactLocationsRaw ? Number(impactLocationsRaw) : undefined;
  const impactLandownerPartnerships = impactLandownerPartnershipsRaw ? Number(impactLandownerPartnershipsRaw) : undefined;

  if (!isLogoMode(logoModeRaw)) return { error: "Choose a valid logo display option." };

  const existing = await companySettingsRepository.findById(COMPANY_SETTINGS_ID);
  if (!existing) return { error: "Settings record is missing." };

  const newLogo = getUploadedFile(formData, "logo");
  let logo = existing.logo;
  if (newLogo) {
    let saved;
    try {
      saved = await saveUploadedFile(newLogo, "branding");
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Couldn't save that logo image." };
    }
    if (existing.logo) await deleteUploadedFile(existing.logo);
    logo = saved.url;
  }

  await companySettingsRepository.update(COMPANY_SETTINGS_ID, {
    legalName,
    displayName,
    logo,
    logoMode: logoModeRaw,
    address: address || undefined,
    phone: phone || undefined,
    whatsapp: whatsapp || undefined,
    email: email || undefined,
    website: website || undefined,
    hours: hours || undefined,
    socialInstagram: socialInstagram || undefined,
    socialFacebook: socialFacebook || undefined,
    socialTiktok: socialTiktok || undefined,
    socialX: socialX || undefined,
    socialThreads: socialThreads || undefined,
    socialPinterest: socialPinterest || undefined,
    socialYoutube: socialYoutube || undefined,
    socialLinkedin: socialLinkedin || undefined,
    dateFormat: dateFormat || undefined,
    timeZone: timeZone || undefined,
    defaultLowStockThreshold: Number.isFinite(defaultLowStockThreshold) ? defaultLowStockThreshold : undefined,
    reminderLeadDays: Number.isFinite(reminderLeadDays) ? reminderLeadDays : undefined,
    impactOngoingDevelopments: Number.isFinite(impactOngoingDevelopments) ? impactOngoingDevelopments : undefined,
    impactDevelopmentAreaAcres: Number.isFinite(impactDevelopmentAreaAcres) ? impactDevelopmentAreaAcres : undefined,
    impactLocations: Number.isFinite(impactLocations) ? impactLocations : undefined,
    impactLandownerPartnerships: Number.isFinite(impactLandownerPartnerships) ? impactLandownerPartnerships : undefined,
    requireOwnerPin,
    showPublicSignInLink,
    portalHomeLook,
    updatedBy: user.id,
    updatedAt: new Date().toISOString(),
  });

  await recordAuditEvent({ actorUserId: user.id, action: "settings.update", entityType: "CompanySettings", entityId: COMPANY_SETTINGS_ID });

  revalidatePath("/admin/settings");
  revalidatePath("/about");
  // The logo (and hours/social links) show up on effectively every public
  // route plus login/admin/portal — revalidating layout-level paths covers
  // all of them, since Next.js revalidation cascades to a path's children.
  revalidatePath("/", "layout");
  revalidatePath("/login");
  revalidatePath("/admin", "layout");
  revalidatePath("/portal", "layout");
  redirect("/admin/settings");
}
