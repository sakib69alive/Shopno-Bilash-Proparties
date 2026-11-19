"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { PORTAL_ROLES } from "@/config/roles";
import { prisma } from "@/lib/db";
import { PORTAL_INSTALL_EVENTS, type PortalInstallEventKind } from "@/types/portalInstall";

export async function recordPortalInstallEvent(accountId: string, deviceId: string, kind: PortalInstallEventKind) {
  if (typeof deviceId !== "string" || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(deviceId)) return false;
  if (!PORTAL_INSTALL_EVENTS.includes(kind)) return false;

  const user = await getCurrentUser();
  if (!user || user.id !== accountId || !PORTAL_ROLES.includes(user.role)) return false;

  const agent = (await headers()).get("user-agent") ?? "";
  const platform = /Android/i.test(agent) ? "Android"
    : /iPhone|iPad|iPod/i.test(agent) ? "iOS / iPadOS"
    : /Windows/i.test(agent) ? "Windows"
    : /Macintosh/i.test(agent) ? "Apple desktop / tablet"
    : /Linux/i.test(agent) ? "Linux"
    : "Unknown";
  const browser = /Edg|EdgiOS|EdgA/i.test(agent) ? "Edge"
    : /Chrome|CriOS/i.test(agent) ? "Chrome"
    : /Firefox|FxiOS/i.test(agent) ? "Firefox"
    : /Safari/i.test(agent) ? "Safari"
    : "Unknown";

  const once = kind !== "dismissed";
  const day = once ? "" : new Date().toISOString().slice(0, 10);
  const id = createHash("sha256").update(JSON.stringify([user.id, deviceId, kind, day])).digest("hex");
  await prisma.portalInstallEvent.upsert({
    where: { id },
    create: { id, userId: user.id, deviceId, kind, platform, browser },
    update: {},
  });
  return true;
}
