"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { recordAuditEvent } from "@/features/audit/repository";
import { documentRepository } from "@/features/documents/repository";
import { saveUploadedFile, deleteUploadedFile } from "@/lib/fileStorage";
import type { DocumentOwnerType, DocumentStatus } from "@/types/document";
import type { DataVisibility } from "@/types/common";

export interface DocumentFormState {
  error?: string;
}

const OWNER_TYPES: DocumentOwnerType[] = [
  "company",
  "project",
  "unit",
  "customer",
  "shareholder",
  "landowner",
  "vendor",
  "transaction",
  "constructionActivity",
];
const DOCUMENT_STATUSES: DocumentStatus[] = ["draft", "active", "archived"];
const VISIBILITIES: DataVisibility[] = ["public", "private", "internal", "restricted"];

function isOwnerType(value: string): value is DocumentOwnerType {
  return (OWNER_TYPES as string[]).includes(value);
}
function isDocumentStatus(value: string): value is DocumentStatus {
  return (DOCUMENT_STATUSES as string[]).includes(value);
}
function isVisibility(value: string): value is DataVisibility {
  return (VISIBILITIES as string[]).includes(value);
}

async function requireDocumentsPermission(permission: "documents.upload" | "documents.delete") {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (!hasPermission(user.role, permission)) throw new Error("Forbidden");
  return user;
}

function parseDocumentFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const ownerType = String(formData.get("ownerType") ?? "");
  const ownerId = String(formData.get("ownerId") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  const visibility = String(formData.get("visibility") ?? "");

  if (!name || name.length < 2) return { error: "Name must be at least 2 characters." } as const;
  if (!category) return { error: "Enter a category, e.g. \"Contract\" or \"NID\"." } as const;
  if (!isOwnerType(ownerType)) return { error: "Choose a valid owner type." } as const;
  if (!ownerId) return { error: "Enter the owner's id." } as const;
  if (!isDocumentStatus(status)) return { error: "Choose a valid status." } as const;
  if (!isVisibility(visibility)) return { error: "Choose a valid visibility." } as const;

  return { fields: { name, category, ownerType, ownerId, status, visibility } } as const;
}

/** A file input with nothing chosen still shows up in FormData as an empty File — treat that as "no file". */
function getUploadedFile(formData: FormData): File | null {
  const file = formData.get("file");
  return file instanceof File && file.size > 0 ? file : null;
}

export async function createDocument(
  _prevState: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const user = await requireDocumentsPermission("documents.upload");

  const parsed = parseDocumentFields(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { fields } = parsed;

  const file = getUploadedFile(formData);
  if (!file) return { error: "Choose a file to upload." };

  let saved;
  try {
    saved = await saveUploadedFile(file, "documents");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't save that file." };
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  await documentRepository.create({
    id,
    name: fields.name,
    type: saved.extension,
    category: fields.category,
    ownerType: fields.ownerType,
    ownerId: fields.ownerId,
    version: 1,
    status: fields.status,
    uploadedBy: user.id,
    uploadDate: now,
    fileUrl: saved.url,
    fileSize: saved.size,
    visibility: fields.visibility,
    createdAt: now,
    updatedAt: now,
    createdBy: user.id,
  });

  await recordAuditEvent({ actorUserId: user.id, action: "document.create", entityType: "Document", entityId: id });

  revalidatePath("/admin/documents");
  redirect("/admin/documents");
}

export async function updateDocument(
  id: string,
  _prevState: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const user = await requireDocumentsPermission("documents.upload");

  const parsed = parseDocumentFields(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { fields } = parsed;

  const existing = await documentRepository.findById(id);
  if (!existing) return { error: "This document no longer exists." };

  const newFile = getUploadedFile(formData);
  let fileUrl = existing.fileUrl;
  let fileSize = existing.fileSize;
  let type = existing.type;

  if (newFile) {
    let saved;
    try {
      saved = await saveUploadedFile(newFile, "documents");
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Couldn't save that file." };
    }
    if (!(await documentRepository.list()).some((d) => d.id !== id && d.fileUrl === existing.fileUrl)) await deleteUploadedFile(existing.fileUrl);
    fileUrl = saved.url;
    fileSize = saved.size;
    type = saved.extension;
  }

  const updated = await documentRepository.update(id, {
    name: fields.name,
    type,
    category: fields.category,
    ownerType: fields.ownerType,
    ownerId: fields.ownerId,
    status: fields.status,
    fileUrl,
    fileSize,
    visibility: fields.visibility,
    version: existing.version + 1,
    updatedBy: user.id,
    updatedAt: new Date().toISOString(),
  });
  if (!updated) return { error: "This document no longer exists." };

  await recordAuditEvent({ actorUserId: user.id, action: "document.update", entityType: "Document", entityId: id });

  revalidatePath("/admin/documents");
  revalidatePath(`/admin/documents/${id}`);
  redirect(`/admin/documents/${id}`);
}

export async function deleteDocument(id: string): Promise<void> {
  const user = await requireDocumentsPermission("documents.delete");

  const existing = await documentRepository.findById(id);
  if (!existing) return;

  await documentRepository.remove(id);
  // One file can be filed under several clients (a notice sent to many): keep it while another record still points at it.
  const stillUsed = (await documentRepository.list()).some((d) => d.fileUrl === existing.fileUrl);
  if (!stillUsed) await deleteUploadedFile(existing.fileUrl);

  await recordAuditEvent({ actorUserId: user.id, action: "document.delete", entityType: "Document", entityId: id });

  revalidatePath("/admin/documents");
}
