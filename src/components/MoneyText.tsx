import { formatCurrency } from "@/lib/money";
import { cn } from "@/lib/utils";

export function MoneyText({
  cents,
  signed = false,
  className,
}: {
  cents: number;
  signed?: boolean;
  className?: string;
}) {
  const tone = !signed
    ? ""
    : cents > 0
      ? "text-positive"
      : cents < 0
        ? "text-negative"
        : "text-muted-foreground";

  return <span className={cn("tabular-nums", tone, className)}>{formatCurrency(cents)}</span>;
}
