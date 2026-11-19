import "server-only";
import * as webpush from "web-push";
import { prisma } from "@/lib/db";

export interface PushPayload {
  title: string;
  body: string;
  /** Where tapping the notification opens (a path on this site). */
  url?: string;
  /** Same tag replaces an older notification instead of stacking. */
  tag?: string;
}

let configured: boolean | null = null;

function configure() {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    configured = false;
    return false;
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub, priv);
  configured = true;
  return true;
}

export function isPushConfigured() {
  return configure();
}

/**
 * Sends a phone notification to every device `userId` allowed. Never throws —
 * a push problem must not break the action (payment, announcement…) that triggered it.
 * Devices that uninstalled / revoked permission (404/410) are cleaned up.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  try {
    if (!configure()) return;
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    if (subs.length === 0) return;
    const body = JSON.stringify({
      title: payload.title.slice(0, 120),
      body: payload.body.slice(0, 240),
      url: payload.url?.startsWith("/") ? payload.url : "/portal/notifications",
      tag: payload.tag,
    });
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
            { TTL: 60 * 60 * 24 * 3, timeout: 5000 },
          );
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await prisma.pushSubscription.deleteMany({ where: { id: s.id } });
        }
      }),
    );
  } catch {
    // Swallow: notifications are best-effort.
  }
}
