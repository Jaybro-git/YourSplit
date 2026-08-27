import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  tone = "neutral",
  className,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 rounded-xl border border-border bg-card p-2.5 sm:gap-1 sm:rounded-2xl sm:p-4",
        className
      )}
    >
      <span className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
        {label}
      </span>
      <span
        className={cn(
          "truncate text-sm font-bold tabular-nums sm:text-xl",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative"
        )}
      >
        {value}
      </span>
    </div>
  );
}
