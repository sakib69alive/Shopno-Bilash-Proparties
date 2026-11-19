export const PORTAL_INSTALL_EVENTS = ["visited", "installed", "standalone_opened", "dismissed", "opted_out"] as const;

export type PortalInstallEventKind = (typeof PORTAL_INSTALL_EVENTS)[number];
