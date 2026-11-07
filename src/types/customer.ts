import type { AuditFields, ID } from "./common";

/**
 * Active = current/engaged customer. Inactive = no current engagement but
 * not written off. Archived = soft-removed — kept for historical business
 * records (sales/payments/documents may still reference this customer),
 * never hard-deleted (Admin Step 7 §16).
 */
export type CustomerStatus = "active" | "inactive" | "archived";

export interface Customer extends AuditFields {
  id: ID;
  /**
   * Link to this person's portal login (`types/user.ts`'s `User`, role
   * "customer") — optional and separate on purpose (Admin Step 7 §2). A
   * Customer is a business record; not every customer has, wants, or has
   * been given portal access yet. `User.linkedCustomerId` is the reverse
   * side of this same relationship.
   */
  userId?: ID;
  name: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  presentAddress?: string;
  permanentAddress?: string;
  nidOrPassportNumber?: string;
  status: CustomerStatus;
  notes?: string;
  /**
   * Unit IDs this customer has booked/purchased. Pre-existing field, not
   * introduced by Step 7 — ownership as a business relationship (with its
   * own history, dates, and terms) belongs on a future Sale entity, not
   * here (Admin Step 7 §12). Left as-is; not read or written by anything
   * in this step.
   */
  unitIds: ID[];
  /** What the Admin expects this client to pay next, and when — typed on the Clients page, only a plan (it never changes any balance). */
  plannedPayment?: { amount?: number; date?: string; note?: string; updatedAt: string };
  /** Shown in the extra section at the foot of the Clients page (e.g. people who invested in several flats) instead of under their project. */
  inExtraSection?: boolean;
  /** This client's own colour on the Clients page — a running number handed out once, in order, and never changed (the colour is worked out from it). */
  tintIndex?: number;
}
