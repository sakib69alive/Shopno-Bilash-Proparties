import type { AuditFields, ID, Money } from "./common";

export type BookingStatus = "reserved" | "booked" | "confirmed" | "expired" | "cancelled" | "converted";

/**
 * A temporary unit reservation — distinct from `Sale` (Prompt 8 §1/§4). A
 * unit moves `available` → (this record, unit status `reserved`/`booked`)
 * → either `converted` (a real `Sale` is created, `Sale.bookingId` points
 * back here) or `cancelled`/`expired` (unit returns to `available`). Never
 * deleted — a cancelled/expired/converted row stays as history, same as
 * every other domain in this app.
 */
export interface Booking extends AuditFields {
  id: ID;
  projectId: ID;
  unitId: ID;
  customerId: ID;
  bookingDate: string;
  bookingAmount: Money;
  agreedPrice: Money;
  discount?: Money;
  paymentTerms?: string;
  status: BookingStatus;
  salespersonId?: ID;
  reference?: string;
  notes?: string;
  expiryDate?: string;
  cancelledAt?: string;
  cancelledReason?: string;
  /** Set once this booking converts into a real `Sale`. */
  convertedSaleId?: ID;
}

export type SaleStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type DiscountType = "flat" | "percentage";

/**
 * A later change to what the customer owes for the flat — the agreed price
 * went up or down after the sale. `amount` is signed: negative lowers the
 * price (a discount), positive raises it. The flat's effective price is
 * `salePrice` plus every adjustment (see `lib/salePayments.ts`).
 */
export interface SalePriceAdjustment {
  id: ID;
  date: string;
  amount: number;
  reason: string;
}

export interface Sale extends AuditFields {
  id: ID;
  projectId: ID;
  unitId: ID;
  customerId: ID;
  saleDate: string;
  /** Unit's own reference price at time of sale — kept separate from the negotiated `salePrice` (Prompt 8 §5: "reference price and actual negotiated sale price must remain separate"). */
  basePrice: Money;
  floorPremium?: Money;
  parkingPrice?: Money;
  additionalCharges?: Money;
  discountAmount?: Money;
  discountType?: DiscountType;
  discountReason?: string;
  /** The final, negotiated price actually charged — basePrice + floorPremium + parkingPrice + additionalCharges - discountAmount, computed at write time and stored (not re-derived on every read, since it's the number every downstream Installment/report keys off of). */
  salePrice: Money;
  paymentTerms?: string;
  salespersonId?: ID;
  agreementDocumentId?: ID;
  status: SaleStatus;
  /** Set when this sale originated from a converted `Booking`. */
  bookingId?: ID;
  /** Price changes after the sale; the effective price is `salePrice` + these. */
  priceAdjustments?: SalePriceAdjustment[];
  /** When true the owner portal shows nothing about this flat's price, payments or balance. Unset = shown. */
  hideFromOwner?: boolean;
}

export type ContractStatus = "draft" | "sent" | "signed" | "void";

export interface Contract extends AuditFields {
  id: ID;
  unitId: ID;
  customerId: ID;
  status: ContractStatus;
  documentId?: ID;
  signedDate?: string;
}

export type InstallmentStatus = "pending" | "due-soon" | "paid" | "overdue";

export interface Installment extends AuditFields {
  id: ID;
  /** The flat sale this installment belongs to — what lets the owner portal and the sale page list it. */
  saleId?: ID;
  contractId: ID;
  installmentNumber: number;
  dueDate: string;
  amount: Money;
  status: InstallmentStatus;
  paidDate?: string;
}
