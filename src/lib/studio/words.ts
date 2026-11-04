const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function below100(n: number): string {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`;
}

function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return `${h ? `${ONES[h]} Hundred` : ""}${h && rest ? " " : ""}${rest ? below100(rest) : ""}`;
}

/** 1450000 → "Taka Fourteen Lakh Fifty Thousand only" (lakh / crore grouping, as used in Bangladesh). */
export function takaInWords(amount: number): string {
  const n = Math.round(amount);
  if (!Number.isFinite(n) || n <= 0) return "Taka zero only";
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  const parts = [
    crore ? `${below1000(crore)} Crore` : "",
    lakh ? `${below100(lakh)} Lakh` : "",
    thousand ? `${below100(thousand)} Thousand` : "",
    rest ? below1000(rest) : "",
  ].filter(Boolean);
  return `Taka ${parts.join(" ")} only`;
}
