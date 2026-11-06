import type { User, UserStatus } from "@/types/user";

/** The slice of a portal account the Admin "Portal Access" panel and link buttons need — plain data, safe to hand to a Client Component (never the link id itself). */
export interface PortalAccessView {
  id: string;
  status: UserStatus;
  link: { enabled: boolean; createdAt?: string; lastUsedAt?: string; useCount: number };
}

export function toPortalAccessView(user: User | null | undefined): PortalAccessView | null {
  if (!user) return null;
  return {
    id: user.id,
    status: user.status,
    link: {
      enabled: Boolean(user.portalLinkId),
      createdAt: user.portalLinkCreatedAt,
      lastUsedAt: user.portalLinkLastUsedAt,
      useCount: user.portalLinkUseCount ?? 0,
    },
  };
}
