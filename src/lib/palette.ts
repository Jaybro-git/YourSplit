const HUES = [
  "amber",
  "rose",
  "teal",
  "sky",
  "violet",
  "emerald",
  "orange",
  "fuchsia",
] as const;

type Hue = (typeof HUES)[number];

// Full class strings, written out literally so Tailwind's scanner can see
// them (dynamic `bg-${hue}-500` template strings won't be picked up).
const SOLID: Record<Hue, string> = {
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  teal: "bg-teal-600",
  sky: "bg-sky-600",
  violet: "bg-violet-600",
  emerald: "bg-emerald-600",
  orange: "bg-orange-500",
  fuchsia: "bg-fuchsia-500",
};

const LIGHT_BG: Record<Hue, string> = {
  amber: "bg-amber-50",
  rose: "bg-rose-50",
  teal: "bg-teal-50",
  sky: "bg-sky-50",
  violet: "bg-violet-50",
  emerald: "bg-emerald-50",
  orange: "bg-orange-50",
  fuchsia: "bg-fuchsia-50",
};

const LIGHT_BORDER: Record<Hue, string> = {
  amber: "border-amber-200",
  rose: "border-rose-200",
  teal: "border-teal-200",
  sky: "border-sky-200",
  violet: "border-violet-200",
  emerald: "border-emerald-200",
  orange: "border-orange-200",
  fuchsia: "border-fuchsia-200",
};

function hueForId(id: string): Hue {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return HUES[Math.abs(hash) % HUES.length];
}

export function solidColorForId(id: string): string {
  return SOLID[hueForId(id)];
}

export function lightCardColorForId(id: string): { bg: string; border: string } {
  const hue = hueForId(id);
  return { bg: LIGHT_BG[hue], border: LIGHT_BORDER[hue] };
}
