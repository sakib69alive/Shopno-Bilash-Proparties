export interface InstallmentMember {
  id: string;
  name: string;
  remaining: number;
  flats: { id: string; label: string; amount?: number }[];
}

export interface InstallmentSelection {
  contributionId: string;
  flatIds: string[];
  amount: string;
}

export interface CustomInstallmentInput {
  label: string;
  dueDate: string;
  members: InstallmentSelection[];
}

export function installmentMinorUnits(amount: number) {
  return Math.round(amount * 100);
}

export function parseInstallmentAmount(value: string) {
  return /^\d{1,12}(?:\.\d{1,2})?$/.test(value) ? installmentMinorUnits(Number(value)) : null;
}

export function suggestedInstallmentAmount(member: InstallmentMember, flatIds: string[]) {
  const selected = member.flats.filter((flat) => flatIds.includes(flat.id));
  const original = member.flats.reduce((sum, flat) => sum + (flat.amount ?? 0), 0);
  const selectedAmount = selected.reduce((sum, flat) => sum + (flat.amount ?? 0), 0);
  return (selected.length === member.flats.length || !original
    ? member.remaining
    : Math.round(member.remaining * selectedAmount / original * 100) / 100).toFixed(2);
}

export function summarizeInstallmentAmounts(members: InstallmentSelection[], budget: number | null) {
  const amounts = members.map((member) => parseInstallmentAmount(member.amount));
  const total = amounts.some((amount) => amount === null) ? null : amounts.reduce<number>((sum, amount) => sum + (amount ?? 0), 0);
  return {
    total: total === null ? null : total / 100,
    difference: total === null || budget === null ? null : (installmentMinorUnits(budget) - total) / 100,
  };
}

export function installmentBalance(outstanding: number, scheduledUnpaid: number) {
  return Math.max(0, installmentMinorUnits(outstanding) - installmentMinorUnits(scheduledUnpaid)) / 100;
}
