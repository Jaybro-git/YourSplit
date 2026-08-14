import type { ExpenseSplit } from "@/types";

export function toCents(rupees: number): number {
  return Math.round(rupees * 100);
}

export function formatCurrency(cents: number): string {
  const abs = Math.abs(cents) / 100;
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${cents < 0 ? "-" : ""}Rs. ${formatted}`;
}

export function splitEqually(
  totalCents: number,
  participantIds: string[]
): ExpenseSplit[] {
  const n = participantIds.length;
  if (n === 0) return [];

  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;

  return participantIds.map((personId, index) => ({
    personId,
    amountCents: base + (index < remainder ? 1 : 0),
  }));
}

export function sumSplits(splits: ExpenseSplit[]): number {
  return splits.reduce((sum, s) => sum + s.amountCents, 0);
}
