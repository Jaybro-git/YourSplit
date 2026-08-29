import {
  Bus,
  Clapperboard,
  Heart,
  Home,
  Plane,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  UtensilsCrossed,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Deliberately a short, generic list — this is a quick tag while logging an
// expense, not an accounting chart. "other" is the default and the fallback
// for any value that isn't recognised (e.g. rows saved before this field
// existed, or a category removed from this list later).
export const EXPENSE_CATEGORIES = [
  "food",
  "groceries",
  "transport",
  "accommodation",
  "entertainment",
  "shopping",
  "utilities",
  "health",
  "travel",
  "other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const DEFAULT_CATEGORY: ExpenseCategory = "other";

type CategoryMeta = { label: string; icon: LucideIcon };

const CATEGORY_META: Record<ExpenseCategory, CategoryMeta> = {
  food: { label: "Food & drink", icon: UtensilsCrossed },
  groceries: { label: "Groceries", icon: ShoppingCart },
  transport: { label: "Transport", icon: Bus },
  accommodation: { label: "Accommodation", icon: Home },
  entertainment: { label: "Entertainment", icon: Clapperboard },
  shopping: { label: "Shopping", icon: ShoppingBag },
  utilities: { label: "Utilities", icon: Zap },
  health: { label: "Health", icon: Heart },
  travel: { label: "Travel", icon: Plane },
  other: { label: "Other", icon: Receipt },
};

// Total over ExpenseCategory, but callers often hold a plain string straight
// from the database, so narrow here rather than at every call site.
export function categoryMeta(category: string | null | undefined): CategoryMeta {
  return CATEGORY_META[(category ?? DEFAULT_CATEGORY) as ExpenseCategory] ?? CATEGORY_META.other;
}

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(value);
}

// Notes are a one-line aside under the description, not a second body field.
export const NOTE_MAX_LENGTH = 40;
