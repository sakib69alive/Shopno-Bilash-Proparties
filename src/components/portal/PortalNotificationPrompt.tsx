"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { savePushSubscription } from "@/features/push/actions";

const PREFERENCE_KEY = "shopno-portal-push-preference";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const INSTALL_CARD = '[aria-label="Install the client portal"]';

function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing / managed devices may deny storage.
  }
}

function keyToBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function subscribe(publicKey: string) {
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) }));
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return false;
  return savePushSubscription({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
}

/**
 * Asks the client to allow phone notifications (new announcements, payments received, due reminders).
 * On iPhone this only works once the portal is added to the Home Screen — the install card handles that first.
 */
export function PortalNotificationPrompt({ publicKey }: { publicKey: string | null }) {
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<"idle" | "working" | "denied" | "error">("idle");

  useEffect(() => {
    if (!publicKey || !window.isSecureContext) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;

    // Already allowed: quietly keep this device registered (e.g. after a re-login or a refreshed subscription).
    if (Notification.permission === "granted") {
      void subscribe(publicKey).catch(() => {});
      return;
    }
    if (Notification.permission === "denied") return;

    const preference = readStorage(PREFERENCE_KEY);
    if (preference === "never" || Number(preference) > Date.now()) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Wait a little, and never sit on top of the install card.
    const tryShow = () => {
      if (cancelled) return;
      if (document.querySelector(INSTALL_CARD)) {
        timer = setTimeout(tryShow, 5_000);
        return;
      }
      setVisible(true);
    };
    timer = setTimeout(tryShow, 12_000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [publicKey]);

  function dismiss(never = false) {
    writeStorage(PREFERENCE_KEY, never ? "never" : String(Date.now() + SNOOZE_MS));
    setVisible(false);
  }

  async function enable() {
    if (!publicKey) return;
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }
      const saved = await subscribe(publicKey);
      if (!saved) {
        setState("error");
        return;
      }
      setVisible(false);
    } catch {
      setState("error");
    }
  }

  if (!visible) return null;

  return (
    <section
      aria-label="Turn on notifications"
      className="bg-surface-raised border-border fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-50 rounded-2xl border p-5 shadow-xl sm:right-6 sm:left-auto sm:w-96 lg:bottom-6"
    >
      <div className="flex items-start gap-3">
        <span className="bg-accent-soft text-accent grid size-10 shrink-0 place-items-center rounded-xl">
          <Bell className="size-5" aria-hidden />
        </span>
        <div className="flex-1">
          <h2 className="text-h4 text-fg">Get notified on your phone</h2>
          <p className="text-body-sm text-fg-muted mt-1">
            New project announcements, payments we receive, and reminders before a payment is due.
          </p>
        </div>
        <button type="button" aria-label="Remind me later" onClick={() => dismiss()} className="text-fg-muted hover:text-fg rounded-lg p-2">
          <X className="size-5" aria-hidden />
        </button>
      </div>
      {state === "denied" || state === "error" ? (
        <p className="text-body-sm bg-surface mt-4 rounded-lg p-3" role="status">
          {state === "denied"
            ? "Notifications are blocked. Open your browser's site settings for this page and allow Notifications."
            : "Couldn't turn notifications on. Please try again in a moment."}
        </p>
      ) : (
        <button
          type="button"
          onClick={enable}
          disabled={state === "working"}
          className="bg-accent text-accent-foreground mt-4 w-full rounded-lg px-4 py-2.5 font-medium disabled:opacity-60"
        >
          {state === "working" ? "Turning on…" : "Turn on notifications"}
        </button>
      )}
      <div className="text-body-sm text-fg-muted mt-4 flex flex-wrap justify-between gap-2">
        <button type="button" onClick={() => dismiss()} className="hover:text-fg underline underline-offset-4">Later</button>
        <button type="button" onClick={() => dismiss(true)} className="hover:text-fg underline underline-offset-4">Don&apos;t show again</button>
      </div>
    </section>
  );
}
