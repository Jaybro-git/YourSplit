const COLORS = [
  "bg-amber-500",
  "bg-orange-500",
  "bg-rose-500",
  "bg-emerald-600",
  "bg-teal-600",
  "bg-sky-600",
  "bg-violet-600",
];

function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function AvatarBadge({
  id,
  name,
  size = "md",
}: {
  id: string;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const dimensions =
    size === "sm" ? "h-6 w-6 text-xs" : size === "lg" ? "h-11 w-11 text-base" : "h-9 w-9 text-sm";
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className={`inline-flex ${dimensions} flex-shrink-0 items-center justify-center rounded-full font-semibold text-white ${colorForId(
        id
      )}`}
    >
      {initial}
    </span>
  );
}
