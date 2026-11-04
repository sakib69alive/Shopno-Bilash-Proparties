import type { Sale } from "@/types/sales";
import type { CustomerPayment } from "@/types/finance/customer";

export interface SalePaymentSummary {
  /** What the customer owes for the flat now: the sale price plus any later price adjustments. */
  price: number;
  /** The price originally agreed at the sale, before adjustments. */
  agreedPrice: number;
  /** Net of all price adjustments (negative = the price came down). */
  adjustmentsTotal: number;
  /** Everything recorded as received against this sale. */
  paid: number;
  /** Never negative — an overpayment reads as 0 remaining, not a minus figure. */
  remaining: number;
  percentPaid: number;
  /** Newest first. */
  payments: CustomerPayment[];
}

/**
 * Which recorded payments belong to a sale. A payment filed with a sale
 * (`saleId`) belongs to exactly that one. An older / unlinked payment (no
 * `saleId`) is only attributed when it is unambiguous: the same customer, the
 * payment's project matches (or it has none), and the customer has just one
 * live sale that could own it — otherwise it would be counted twice, or
 * against the wrong flat, so it is left out here (it still shows in the
 * customer's full payment list).
 */
export function paymentsForSale(sale: Sale, customerSales: Sale[], payments: CustomerPayment[]): CustomerPayment[] {
  const live = customerSales.filter((s) => s.status !== "cancelled");
  return payments.filter((p) => {
    if (p.customerId !== sale.customerId) return false;
    if (p.saleId) return p.saleId === sale.id;
    if (p.projectId && p.projectId !== sale.projectId) return false;
    const candidates = live.filter((s) => (p.projectId ? s.projectId === p.projectId : true));
    return candidates.length === 1 && candidates[0].id === sale.id;
  });
}

export function summarizeSale(sale: Sale, customerSales: Sale[], payments: CustomerPayment[]): SalePaymentSummary {
  const own = paymentsForSale(sale, customerSales, payments).sort((a, b) => b.date.localeCompare(a.date));
  const paid = own.reduce((sum, p) => sum + p.amount.amount, 0);
  const agreedPrice = sale.salePrice.amount;
  const adjustmentsTotal = (sale.priceAdjustments ?? []).reduce((sum, a) => sum + a.amount, 0);
  const price = Math.max(0, agreedPrice + adjustmentsTotal);
  return {
    price,
    agreedPrice,
    adjustmentsTotal,
    paid,
    remaining: Math.max(0, price - paid),
    percentPaid: price > 0 ? Math.min(100, Math.round((paid / price) * 100)) : 0,
    payments: own,
  };
}
