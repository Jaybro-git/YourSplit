import { cva, type VariantProps } from "class-variance-authority";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { solidColorForId, softColorForId } from "@/lib/palette";
import { cn } from "@/lib/utils";

const avatarBadgeVariants = cva("shrink-0", {
  variants: {
    size: {
      sm: "size-6 text-xs",
      md: "size-9 text-sm",
      lg: "size-11 text-base",
    },
  },
  defaultVariants: { size: "md" },
});

export function AvatarBadge({
  id,
  name,
  avatarUrl,
  size = "md",
  className,
}: {
  id: string;
  name: string;
  avatarUrl?: string | null;
  className?: string;
} & VariantProps<typeof avatarBadgeVariants>) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <Avatar className={cn(avatarBadgeVariants({ size }), className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
      <AvatarFallback
        className="font-semibold"
        style={{ backgroundColor: softColorForId(id), color: solidColorForId(id) }}
      >
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
