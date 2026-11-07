"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { HOME_FLAT_COOKIE } from "@/lib/homeFlat";

interface HomeFlatContextValue {
  /** The flat the owner is looking at on the home screen: its blueprint, numbers and payments all follow it. */
  selectedId: string;
  select: (unitId: string) => void;
}

const HomeFlatContext = createContext<HomeFlatContextValue | null>(null);

/**
 * Holds "which of my flats am I looking at" for the phone home screen, so the
 * blueprint at the top and the payment block further down stay in step: tap a
 * different flat and both change together.
 */
export function HomeFlatProvider({ unitIds, initialId, children }: { unitIds: string[]; initialId?: string; children: ReactNode }) {
  const [selectedId, setSelectedIdState] = useState(initialId && unitIds.includes(initialId) ? initialId : (unitIds[0] ?? ""));
  const setSelectedId = (id: string) => {
    setSelectedIdState(id);
    try {
      document.cookie = `${HOME_FLAT_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // cookies blocked: the choice simply lasts until the page is closed
    }
  };
  const value = useMemo<HomeFlatContextValue>(
    () => ({ selectedId: unitIds.includes(selectedId) ? selectedId : (unitIds[0] ?? ""), select: setSelectedId }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedId, unitIds],
  );
  return <HomeFlatContext.Provider value={value}>{children}</HomeFlatContext.Provider>;
}

export function useHomeFlat(): HomeFlatContextValue {
  const ctx = useContext(HomeFlatContext);
  if (!ctx) throw new Error("useHomeFlat must be used inside HomeFlatProvider");
  return ctx;
}
