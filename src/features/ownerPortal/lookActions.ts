"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { userRepository } from "@/features/users/repository";
import { PORTAL_ROLES } from "@/config/roles";

export interface PortalLookState {
  error?: string;
}

/**
 * A client's own choice of how floor plans look on their Home screen (cream paper or blue blueprint), saved on their
 * account so it follows them to any phone. Only a signed-in portal user can change it, and only their own — the account
 * comes from the session, never from the request.
 */
export async function setPortalLookAction(look: "cream" | "blue" | "grid"): Promise<PortalLookState> {
  if (look !== "cream" && look !== "blue" && look !== "grid") return { error: "Choose one of the three looks." };

  const user = await getCurrentUser();
  if (!user || !PORTAL_ROLES.includes(user.role)) return { error: "Your session has expired. Please sign in again." };

  await userRepository.update(user.id, { portalLook: look, updatedAt: new Date().toISOString() });
  revalidatePath("/portal", "layout");
  return {};
}
