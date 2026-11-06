"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

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
export function HomeFlatProvider({ unitIds, children }: { unitIds: string[]; children: ReactNode }) {
  const [selectedId, setSelectedId] = useState(unitIds[0] ?? "");
  const value = useMemo<HomeFlatContextValue>(
    () => ({ selectedId: unitIds.includes(selectedId) ? selectedId : (unitIds[0] ?? ""), select: setSelectedId }),
    [selectedId, unitIds],
  );
  return <HomeFlatContext.Provider value={value}>{children}</HomeFlatContext.Provider>;
}

export function useHomeFlat(): HomeFlatContextValue {
  const ctx = useContext(HomeFlatContext);
  if (!ctx) throw new Error("useHomeFlat must be used inside HomeFlatProvider");
  return ctx;
}
