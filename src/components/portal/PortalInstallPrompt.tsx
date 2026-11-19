"use client";

import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { recordPortalInstallEvent } from "@/features/ownerPortal/installActions";
import type { PortalInstallEventKind } from "@/types/portalInstall";

interface InstallPromptEvent extends Event {
  prompt(): Promise<unknown>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const PREFERENCE_KEY = "shopno-portal-install-preference";
const DEVICE_KEY = "shopno-portal-install-device";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

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
    // Some private browsing or managed devices deny local storage.
  }
}

function isAppleMobile() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function PortalInstallPrompt({ accountId }: { accountId: string }) {
  const [mode, setMode] = useState<"native" | "apple" | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const prompt = useRef<InstallPromptEvent | null>(null);
  const device = useRef<string | null>(null);

  useEffect(() => {
    if (!window.isSecureContext || !crypto.randomUUID) return;
    device.current = readStorage(DEVICE_KEY) ?? crypto.randomUUID();
    writeStorage(DEVICE_KEY, device.current);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const apple = isAppleMobile();
    const standalone = matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    function observe(kind: PortalInstallEventKind) {
      if (device.current) void recordPortalInstallEvent(accountId, device.current, kind).catch(() => {});
    }

    if (standalone) {
      const marker = `${DEVICE_KEY}-standalone-${accountId}`;
      if (!readStorage(marker)) {
        void recordPortalInstallEvent(accountId, device.current, "standalone_opened")
          .then((saved) => { if (saved) writeStorage(marker, "1"); })
          .catch(() => {});
      }
      return;
    }

    const visitMarker = `${DEVICE_KEY}-visit-${accountId}`;
    if (!readStorage(visitMarker)) {
      void recordPortalInstallEvent(accountId, device.current, "visited")
        .then((saved) => { if (saved) writeStorage(visitMarker, "1"); })
        .catch(() => {});
    }

    function canOffer() {
      const preference = readStorage(PREFERENCE_KEY);
      return preference !== "never" && !(Number(preference) > Date.now());
    }

    function offer(nextMode: "native" | "apple") {
      if (!canOffer()) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (canOffer()) setMode(nextMode);
      }, 4_000);
    }

    function onPreferenceChange(event: StorageEvent) {
      if (event.key !== PREFERENCE_KEY || canOffer()) return;
      clearTimeout(timer);
      setMode(null);
      setShowSteps(false);
    }

    function onPrompt(event: Event) {
      event.preventDefault();
      prompt.current = event as InstallPromptEvent;
      offer("native");
    }

    function onInstalled() {
      clearTimeout(timer);
      prompt.current = null;
      setMode(null);
      observe("installed");
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("storage", onPreferenceChange);
    if (apple && /Safari\//i.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram/i.test(navigator.userAgent)) {
      offer("apple");
    }
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("storage", onPreferenceChange);
    };
  }, [accountId]);

  function dismiss(never = false) {
    writeStorage(PREFERENCE_KEY, never ? "never" : String(Date.now() + SNOOZE_MS));
    setMode(null);
    setShowSteps(false);
    const kind = never ? "opted_out" : "dismissed";
    if (device.current) void recordPortalInstallEvent(accountId, device.current, kind).catch(() => {});
  }

  async function install() {
    if (mode === "apple") {
      setShowSteps(true);
      return;
    }
    const event = prompt.current;
    if (!event) return;
    prompt.current = null;
    setMode(null);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === "dismissed") dismiss();
    } catch {
      // An install prompt can expire between page display and interaction.
    }
  }

  if (!mode) return null;

  return (
    <section
      aria-label="Install the client portal"
      className="bg-surface-raised border-border fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-50 rounded-2xl border p-5 shadow-xl sm:right-6 sm:left-auto sm:w-96 lg:bottom-6"
    >
      <div className="flex items-start gap-3">
        <span className="bg-accent-soft text-accent grid size-10 shrink-0 place-items-center rounded-xl">
          <Download className="size-5" aria-hidden />
        </span>
        <div className="flex-1">
          <h2 className="text-h4 text-fg">Install the client portal</h2>
          <p className="text-body-sm text-fg-muted mt-1">Install the app to get notifications for new project announcements, payments received and due reminders.</p>
        </div>
        <button type="button" aria-label="Remind me later" onClick={() => dismiss()} className="text-fg-muted hover:text-fg rounded-lg p-2">
          <X className="size-5" aria-hidden />
        </button>
      </div>
      {showSteps ? (
        <p className="text-body-sm bg-surface mt-4 rounded-lg p-3" role="status">
          In Safari, tap Share, choose Add to Home Screen, then tap Add. Turn on Open as Web App if Safari shows that option.
        </p>
      ) : (
        <button type="button" onClick={install} className="bg-accent text-accent-foreground mt-4 w-full rounded-lg px-4 py-2.5 font-medium">
          {mode === "apple" ? "See how to install" : "Install app"}
        </button>
      )}
      <div className="text-body-sm text-fg-muted mt-4 flex flex-wrap justify-between gap-2">
        <button type="button" onClick={() => dismiss()} className="hover:text-fg underline underline-offset-4">Later</button>
        <button type="button" onClick={() => dismiss(true)} className="hover:text-fg underline underline-offset-4">Don&apos;t show again</button>
      </div>
    </section>
  );
}
