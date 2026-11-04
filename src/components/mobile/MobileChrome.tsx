"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface ContactInfo {
  phone?: string;
  whatsapp?: string;
  displayName?: string;
}

interface MobileChromeValue {
  contact: ContactInfo;
  /** True while a detail page's `ActionBar` is mounted — the tab bar steps aside for it. */
  hasActionBar: boolean;
  /** True while a full-bleed hero is mounted: the top bar goes transparent over it and the page loses its top padding. */
  barOverlay: boolean;
  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
}

const MobileChromeContext = createContext<MobileChromeValue | null>(null);
const RegisterActionBarContext = createContext<(() => () => void) | null>(null);
const RegisterBarOverlayContext = createContext<(() => () => void) | null>(null);

/**
 * Shared state for the phone shell (top bar, bottom tab bar, menu sheet,
 * action bar): the company's contact numbers (read once from
 * `CompanySettings` in the layout), whether the Menu sheet is open, and
 * whether a detail page has put an `ActionBar` in the tab bar's place.
 */
export function MobileChromeProvider({ contact, children }: { contact: ContactInfo; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionBars, setActionBars] = useState(0);
  const [overlays, setOverlays] = useState(0);

  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const registerActionBar = useCallback(() => {
    setActionBars((n) => n + 1);
    return () => setActionBars((n) => n - 1);
  }, []);

  const registerBarOverlay = useCallback(() => {
    setOverlays((n) => n + 1);
    return () => setOverlays((n) => n - 1);
  }, []);

  const { phone, whatsapp, displayName } = contact;
  const value = useMemo<MobileChromeValue>(
    () => ({
      contact: { phone, whatsapp, displayName },
      hasActionBar: actionBars > 0,
      barOverlay: overlays > 0,
      menuOpen,
      openMenu,
      closeMenu,
    }),
    [phone, whatsapp, displayName, actionBars, overlays, menuOpen, openMenu, closeMenu],
  );

  return (
    <MobileChromeContext.Provider value={value}>
      <RegisterActionBarContext.Provider value={registerActionBar}>
        <RegisterBarOverlayContext.Provider value={registerBarOverlay}>{children}</RegisterBarOverlayContext.Provider>
      </RegisterActionBarContext.Provider>
    </MobileChromeContext.Provider>
  );
}

export function useMobileChrome(): MobileChromeValue {
  const ctx = useContext(MobileChromeContext);
  if (!ctx) throw new Error("useMobileChrome must be used within MobileChromeProvider");
  return ctx;
}

/** The company's phone / WhatsApp numbers — each `undefined` until set in Admin → Settings. */
export function useContactInfo(): ContactInfo {
  return useMobileChrome().contact;
}

/** Called by `ActionBar` on mount so the bottom tab bar hides while it is on screen. */
export function useRegisterActionBar() {
  const register = useContext(RegisterActionBarContext);
  useEffect(() => register?.(), [register]);
}

/** Called by a full-bleed hero on mount: the phone top bar turns transparent over it until the page scrolls. */
export function useRegisterBarOverlay() {
  const register = useContext(RegisterBarOverlayContext);
  useEffect(() => register?.(), [register]);
}
