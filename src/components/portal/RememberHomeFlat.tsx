"use client";

import { useEffect } from "react";
import { HOME_FLAT_COOKIE } from "@/lib/homeFlat";

/** Opening a flat under My Property makes it the flat the Home screen shows from now on (and after the app is closed and reopened). */
export function RememberHomeFlat({ unitId }: { unitId: string }) {
  useEffect(() => {
    try {
      document.cookie = `${HOME_FLAT_COOKIE}=${encodeURIComponent(unitId)}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // cookies blocked — nothing to remember with
    }
  }, [unitId]);
  return null;
}
