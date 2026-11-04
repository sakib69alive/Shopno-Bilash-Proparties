import type { ID } from "../common";
import type { FinancialRecordBase } from "./base";

export type PaymentMethod = "cash" | "bank-transfer" | "cheque" | "mobile-banking" | "card";

/** A payment made by a customer against a contract/installment. */
export interface CustomerPayment extends FinancialRecordBase {
  customerId: ID;
  contractId?: ID;
  installmentId?: ID;
  /** The flat sale this money is for — what lets the portal and the sale page show paid / remaining per flat. */
  saleId?: ID;
  method: PaymentMethod;
  receiptNumber?: string;
}

export interface CustomerInvoice extends FinancialRecordBase {
  customerId: ID;
  dueDate: string;
  paidAmount: number;
  status: "unpaid" | "partially-paid" | "paid" | "overdue";
}

/** Convenience read-model, not a stored record — receivable = invoiced - paid. */
export interface CustomerReceivable {
  customerId: ID;
  projectId: ID;
  totalDue: number;
  totalPaid: number;
  outstanding: number;
}
