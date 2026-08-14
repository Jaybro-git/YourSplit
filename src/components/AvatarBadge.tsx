import { solidColorForId } from "@/lib/palette";

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
      className={`inline-flex ${dimensions} flex-shrink-0 items-center justify-center rounded-full font-semibold text-white ${solidColorForId(
        id
      )}`}
    >
      {initial}
    </span>
  );
}
