"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { recordAuditEvent } from "@/features/audit/repository";
import { teamMemberRepository } from "@/features/teamMembers/repository";
import { saveUploadedFile, deleteUploadedFile } from "@/lib/fileStorage";

export interface TeamMemberFormState {
  error?: string;
}

async function requireContentPermission(permission: "content.create" | "content.update" | "content.delete") {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (!hasPermission(user.role, permission)) throw new Error("Forbidden");
  return user;
}

function parseTeamMemberFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  if (!name || name.length < 2) return { error: "Enter a name." } as const;
  if (!title || title.length < 2) return { error: "Enter a title/role." } as const;

  return { fields: { name, title, bio: bio || undefined } } as const;
}

/** A file input with nothing chosen still shows up in FormData as an empty File — treat that as "no file". */
function getUploadedFile(formData: FormData, field: string): File | null {
  const file = formData.get(field);
  return file instanceof File && file.size > 0 ? file : null;
}

export async function createTeamMember(_prevState: TeamMemberFormState, formData: FormData): Promise<TeamMemberFormState> {
  const user = await requireContentPermission("content.create");

  const parsed = parseTeamMemberFields(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { fields } = parsed;

  let photo: string | undefined;
  const file = getUploadedFile(formData, "photo");
  if (file) {
    try {
      const saved = await saveUploadedFile(file, "team");
      photo = saved.url;
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Couldn't save that photo." };
    }
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  await teamMemberRepository.create({
    id,
    ...fields,
    photo,
    createdAt: now,
    updatedAt: now,
    createdBy: user.id,
  });

  await recordAuditEvent({ actorUserId: user.id, action: "content.teamMember.create", entityType: "TeamMember", entityId: id });

  revalidatePath("/founder");
  revalidatePath("/admin/content/team");
  redirect("/admin/content/team");
}

export async function updateTeamMember(
  id: string,
  _prevState: TeamMemberFormState,
  formData: FormData,
): Promise<TeamMemberFormState> {
  const user = await requireContentPermission("content.update");

  const parsed = parseTeamMemberFields(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { fields } = parsed;

  const existing = await teamMemberRepository.findById(id);
  if (!existing) return { error: "This team member no longer exists." };

  const newFile = getUploadedFile(formData, "photo");
  const removePhoto = formData.get("photo-remove") === "on";
  let photo = existing.photo;

  if (newFile) {
    let saved;
    try {
      saved = await saveUploadedFile(newFile, "team");
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Couldn't save that photo." };
    }
    if (existing.photo) await deleteUploadedFile(existing.photo);
    photo = saved.url;
  } else if (removePhoto && existing.photo) {
    await deleteUploadedFile(existing.photo);
    photo = undefined;
  }

  const updated = await teamMemberRepository.update(id, {
    ...fields,
    photo,
    updatedAt: new Date().toISOString(),
    updatedBy: user.id,
  });
  if (!updated) return { error: "This team member no longer exists." };

  await recordAuditEvent({ actorUserId: user.id, action: "content.teamMember.update", entityType: "TeamMember", entityId: id });

  revalidatePath("/founder");
  revalidatePath("/admin/content/team");
  redirect("/admin/content/team");
}

export async function deleteTeamMember(id: string): Promise<void> {
  const user = await requireContentPermission("content.delete");

  const existing = await teamMemberRepository.findById(id);
  if (!existing) return;

  await teamMemberRepository.remove(id);
  if (existing.photo) await deleteUploadedFile(existing.photo);

  await recordAuditEvent({ actorUserId: user.id, action: "content.teamMember.delete", entityType: "TeamMember", entityId: id });

  revalidatePath("/founder");
  revalidatePath("/admin/content/team");
}
