import type { AuditFields, ID } from "./common";

/**
 * Additional leadership/partners shown alongside the Founder on the public
 * `/founder` page — unlike `FounderProfile` (one fixed singleton record),
 * this is a plain list: admin can add, edit and remove as many people as
 * the company actually has.
 */
export interface TeamMember extends AuditFields {
  id: ID;
  name: string;
  /** Role/title, e.g. "Partner & Director of Sales". */
  title: string;
  /** Short bio — one or two sentences, not the founder's full life story. */
  bio?: string;
  photo?: string;
}
