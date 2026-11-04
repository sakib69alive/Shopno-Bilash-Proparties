"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { dismissCookieNotice, getServerSnapshot, getSnapshot, subscribe } from "@/lib/cookieNotice";

/**
 * A one-line, dismissible notice — not a blocking modal — because this
 * site has nothing to ask consent for: no tracking cookies, no ads, no
 * analytics. It exists purely to be upfront about the two local-storage
 * features (recent searches, saved properties) rather than staying silent
 * about them.
 */
export function CookieNotice() {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (dismissed) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(var(--m-bar-h)+env(safe-area-inset-bottom))] z-30 px-4 pb-3 sm:px-6 lg:bottom-0 lg:pb-6">
      <div className="bg-fg text-bg mx-auto flex max-w-xl items-center gap-4 rounded-lg px-5 py-4 shadow-sm">
        <p className="text-body-sm flex-1 text-white/80">
          This site keeps recent searches and saved properties in your browser only — nothing is
          tracked or sent anywhere.{" "}
          <Link href="/cookies" className="text-white underline underline-offset-4 hover:text-white/70">
            Learn more
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={dismissCookieNotice}
          aria-label="Dismiss this notice"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}
