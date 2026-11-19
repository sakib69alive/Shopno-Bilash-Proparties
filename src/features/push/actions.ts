"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { PORTAL_ROLES } from "@/config/roles";
import { prisma } from "@/lib/db";

interface BrowserSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

function valid(sub: BrowserSubscription) {
  return typeof sub?.endpoint === "string" && sub.endpoint.startsWith("https://") && sub.endpoint.length < 1000 &&
    typeof sub.keys?.p256dh === "string" && sub.keys.p256dh.length < 200 &&
    typeof sub.keys?.auth === "string" && sub.keys.auth.length < 100;
}

const idFor = (endpoint: string) => createHash("sha256").update(endpoint).digest("hex");

/** Saves this phone/browser so the portal user gets notifications on it. */
export async function savePushSubscription(sub: BrowserSubscription) {
  const user = await getCurrentUser();
  if (!user || !PORTAL_ROLES.includes(user.role) || !valid(sub)) return false;
  const userAgent = ((await headers()).get("user-agent") ?? "").slice(0, 300);
  const id = idFor(sub.endpoint);
  const data = { userId: user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent };
  await prisma.pushSubscription.upsert({ where: { id }, create: { id, ...data }, update: data });
  return true;
}

export async function removePushSubscription(endpoint: string) {
  const user = await getCurrentUser();
  if (!user || typeof endpoint !== "string") return false;
  await prisma.pushSubscription.deleteMany({ where: { id: idFor(endpoint), userId: user.id } });
  return true;
}
