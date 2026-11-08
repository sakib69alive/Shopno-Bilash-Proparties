"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { recordAuditEvent } from "@/features/audit/repository";
import { customerRepository } from "@/features/customers/repository";
import { unitRepository } from "@/features/units/repository";
import { saleRepository } from "@/features/sales/repository";
import { documentRepository } from "@/features/documents/repository";
import { notificationRepository } from "@/features/notifications/repository";
import { companySettingsRepository, COMPANY_SETTINGS_ID } from "@/features/settings/repository";
import { saveUploadedFile } from "@/lib/fileStorage";
import { formatBDT } from "@/lib/format";

export interface ClientsActionResult {
  error?: string;
  ok?: boolean;
}

async function requireStaff(permission: "customer.update" | "documents.upload") {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (!hasPermission(user.role, permission)) throw new Error("Forbidden");
  return user;
}

/** What the Admin expects this client to pay next, and when. Only a plan — it changes no balance. Leave both empty to clear it. */
export async function saveClientPlan(customerId: string, amountText: string, date: string, note: string): Promise<ClientsActionResult> {
  const user = await requireStaff("customer.update");
  const customer = await customerRepository.findById(customerId);
  if (!customer) return { error: "That client no longer exists." };

  const cleaned = amountText.replace(/[,\s৳]/g, "").trim();
  const amount = cleaned === "" ? undefined : Number(cleaned);
  if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) return { error: "Enter the amount as a number, e.g. 50000." };
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Choose a valid date." };
  const trimmedNote = note.trim().slice(0, 300);

  const empty = amount === undefined && !date && !trimmedNote;
  await customerRepository.update(customerId, {
    plannedPayment: empty ? undefined : { amount, date: date || undefined, note: trimmedNote || undefined, updatedAt: new Date().toISOString() },
  });
  await recordAuditEvent({ actorUserId: user.id, action: "customer.plan", entityType: "Customer", entityId: customerId });
  revalidatePath("/admin/clients");
  return { ok: true };
}

/** Puts a client in (or takes them out of) the extra section at the foot of the Clients page. */
export async function setClientExtraSection(customerId: string, on: boolean): Promise<ClientsActionResult> {
  const user = await requireStaff("customer.update");
  const customer = await customerRepository.findById(customerId);
  if (!customer) return { error: "That client no longer exists." };
  await customerRepository.update(customerId, { inExtraSection: on ? true : undefined });
  await recordAuditEvent({ actorUserId: user.id, action: on ? "customer.extraSection.add" : "customer.extraSection.remove", entityType: "Customer", entityId: customerId });
  revalidatePath("/admin/clients");
  return { ok: true };
}

/** The two headings on the Clients page. */
export async function saveClientsTitles(title: string, extraTitle: string): Promise<ClientsActionResult> {
  const user = await requireStaff("customer.update");
  const settings = await companySettingsRepository.findById(COMPANY_SETTINGS_ID);
  if (!settings) return { error: "Company settings are missing." };
  await companySettingsRepository.update(COMPANY_SETTINGS_ID, {
    clientsOverviewTitle: title.trim().slice(0, 80) || undefined,
    clientsExtraTitle: extraTitle.trim().slice(0, 80) || undefined,
  });
  await recordAuditEvent({ actorUserId: user.id, action: "settings.clientsTitles", entityType: "CompanySettings", entityId: COMPANY_SETTINGS_ID });
  revalidatePath("/admin/clients");
  return { ok: true };
}

/** Sends a document straight to one client: it is filed under them (they see it in their app) and they get an in-app message if they have an account. */
export async function sendClientDocument(customerId: string, formData: FormData): Promise<ClientsActionResult> {
  const user = await requireStaff("documents.upload");
  const customer = await customerRepository.findById(customerId);
  if (!customer) return { error: "That client no longer exists." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to send." };
  const name = String(formData.get("name") ?? "").trim() || file.name.replace(/\.[^.]+$/, "") || "Document";

  let saved;
  try {
    saved = await saveUploadedFile(file, "documents");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't save that file." };
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  await documentRepository.create({
    id,
    name,
    type: saved.extension,
    category: "Sent to client",
    ownerType: "customer",
    ownerId: customerId,
    version: 1,
    status: "active",
    uploadedBy: user.id,
    uploadDate: now,
    fileUrl: saved.url,
    fileSize: saved.size,
    visibility: "private", // owner-visible
    createdAt: now,
    updatedAt: now,
    createdBy: user.id,
  });

  if (customer.userId) {
    await notificationRepository.create({
      id: randomUUID(),
      recipientUserId: customer.userId,
      event: "document.uploaded",
      channel: "in-app",
      title: "A new document for you",
      body: `${name} has been added to your documents.`,
      relatedEntityId: id,
      category: "document",
      priority: "medium",
      actionHref: "/portal/documents",
      actorUserId: user.id,
      status: "unread",
      createdAt: now,
    });
  }

  await recordAuditEvent({ actorUserId: user.id, action: "document.sendToClient", entityType: "Document", entityId: id });
  revalidatePath("/admin/clients");
  revalidatePath("/admin/documents");
  return { ok: true };
}

/**
 * Sends one file (a statement, a notice, a PDF or picture received from a phone…) to several clients at once: the file is stored once and
 * filed under each client, so each sees it in their own app's Documents and, if they have an account, gets an in-app message.
 */
export async function sendDocumentToClients(customerIds: string[], formData: FormData): Promise<ClientsActionResult & { sent?: number }> {
  const user = await requireStaff("documents.upload");
  const ids = Array.from(new Set(customerIds)).slice(0, 500);
  if (ids.length === 0) return { error: "Choose at least one client." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to send." };
  const name = String(formData.get("name") ?? "").trim().slice(0, 120) || file.name.replace(/\.[^.]+$/, "") || "Document";

  const customers = (await Promise.all(ids.map((id) => customerRepository.findById(id)))).filter((c): c is NonNullable<typeof c> => !!c);
  if (customers.length === 0) return { error: "Those clients no longer exist." };

  let saved;
  try {
    saved = await saveUploadedFile(file, "documents");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't save that file." };
  }

  const now = new Date().toISOString();
  for (const customer of customers) {
    const id = randomUUID();
    await documentRepository.create({
      id,
      name,
      type: saved.extension,
      category: "Sent to client",
      ownerType: "customer",
      ownerId: customer.id,
      version: 1,
      status: "active",
      uploadedBy: user.id,
      uploadDate: now,
      fileUrl: saved.url, // one stored file, shared by every client's record (deleting one record keeps the file while others use it)
      fileSize: saved.size,
      visibility: "private", // owner-visible
      createdAt: now,
      updatedAt: now,
      createdBy: user.id,
    });
    if (customer.userId) {
      await notificationRepository.create({
        id: randomUUID(),
        recipientUserId: customer.userId,
        event: "document.uploaded",
        channel: "in-app",
        title: "A new document for you",
        body: `${name} has been added to your documents.`,
        relatedEntityId: id,
        category: "document",
        priority: "medium",
        actionHref: "/portal/documents",
        actorUserId: user.id,
        status: "unread",
        createdAt: now,
      });
    }
    await recordAuditEvent({ actorUserId: user.id, action: "document.sendToClient", entityType: "Document", entityId: id });
  }
  revalidatePath("/admin/clients");
  revalidatePath("/admin/documents");
  return { ok: true, sent: customers.length };
}

/** A short in-app message to one client (they see it in Notifications, and the Clients page then shows whether it has been read). */
export async function sendClientMessage(customerId: string, text: string): Promise<ClientsActionResult> {
  const user = await requireStaff("customer.update");
  const customer = await customerRepository.findById(customerId);
  if (!customer) return { error: "That client no longer exists." };
  if (!customer.userId) return { error: "This client has no app account yet — send them their link first." };
  const body = text.trim().slice(0, 500);
  if (body.length < 2) return { error: "Write the message first." };
  const planned = customer.plannedPayment?.amount;
  await notificationRepository.create({
    id: randomUUID(),
    recipientUserId: customer.userId,
    event: "project.updated",
    channel: "in-app",
    title: planned ? `A message from the office · ${formatBDT(planned)} expected` : "A message from the office",
    body,
    category: "system",
    priority: "medium",
    actorUserId: user.id,
    status: "unread",
    createdAt: new Date().toISOString(),
  });
  revalidatePath("/admin/clients");
  return { ok: true };
}

/**
 * What one client sees about one of their flats in the app, and the flat's size. The money switch lives on the sale (the portal already
 * honours it); the plan and construction switches live on the flat. Size changes are written to the flat itself, so every sum that uses
 * the flat's sqft follows.
 */
export async function savePortalView(
  customerId: string,
  unitId: string,
  view: { sizeSqft?: number; hidePlan: boolean; hideConstruction: boolean },
): Promise<ClientsActionResult> {
  const user = await requireStaff("customer.update");
  const unit = await unitRepository.findById(unitId);
  if (!unit) return { error: "That flat no longer exists." };
  const owned = unit.customerId === customerId || (await saleRepository.list()).some((s) => s.customerId === customerId && s.unitId === unitId && s.status !== "cancelled");
  if (!owned) return { error: "That flat does not belong to this client." };

  const patch: { sizeSqft?: number; hidePlanFromOwner?: boolean; hideConstructionFromOwner?: boolean } = {
    hidePlanFromOwner: view.hidePlan || undefined,
    hideConstructionFromOwner: view.hideConstruction || undefined,
  };
  if (view.sizeSqft !== undefined) {
    if (!Number.isFinite(view.sizeSqft) || view.sizeSqft <= 0 || view.sizeSqft > 100000) return { error: "Enter a size between 1 and 100,000 sqft." };
    patch.sizeSqft = view.sizeSqft;
  }
  await unitRepository.update(unitId, patch);
  await recordAuditEvent({
    actorUserId: user.id,
    action: "unit.portalView",
    entityType: "Unit",
    entityId: unitId,
    previousValue: { sizeSqft: unit.sizeSqft, hidePlan: !!unit.hidePlanFromOwner, hideConstruction: !!unit.hideConstructionFromOwner },
    newValue: { sizeSqft: patch.sizeSqft ?? unit.sizeSqft, hidePlan: view.hidePlan, hideConstruction: view.hideConstruction },
  });
  revalidatePath("/admin/clients");
  revalidatePath("/portal");
  return { ok: true };
}
