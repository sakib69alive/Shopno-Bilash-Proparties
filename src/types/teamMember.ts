import type { AuditFields, ID } from "./common";

/**
 * Additional leadership/partners shown alongside the Founder on the public
 * `/founder` page — unlike `FounderProfile` (one fixed singleton record),
 * this is a plain list: admin can add, edit and remove as many people as
 * the company actually has.
 */
/** Who a person is to the company — drives which tab/section of the public Founder page they appear under. */
export type TeamGroup = "partner" | "shareholder" | "employee";

export const TEAM_GROUPS: TeamGroup[] = ["partner", "shareholder", "employee"];

/** Singular label (admin form / badge) and plural label (public tab / heading). */
export const TEAM_GROUP_LABEL: Record<TeamGroup, { one: string; many: string }> = {
  partner: { one: "Partner", many: "Partners" },
  shareholder: { one: "Shareholder", many: "Shareholders" },
  employee: { one: "Team member", many: "Our team" },
};

/** Entries added before groups existed were "leadership/partners", so that is what a missing group means. */
export function teamGroupOf(member: { group?: TeamGroup }): TeamGroup {
  return member.group ?? "partner";
}

export interface TeamMember extends AuditFields {
  id: ID;
  name: string;
  /** Partner, shareholder or employee — see `TeamGroup`. Missing on older entries, which count as partners. */
  group?: TeamGroup;
  /** Role/title, e.g. "Partner & Director of Sales". */
  title: string;
  /** Short bio — one or two sentences, not the founder's full life story. */
  bio?: string;
  photo?: string;
}
