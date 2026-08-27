// Entity hue palette — used for avatars, group accent cards, and settle-up
// cards. Each id hashes to one of 8 hues defined as CSS variables in
// globals.css (--hue-N-solid/-soft/-line, light + dark values). Returning
// CSS var() strings instead of Tailwind class names sidesteps the
// scanner-visibility constraint the old class-string approach needed, and
// gets dark mode for free since the variables themselves flip under `.dark`.
const HUE_COUNT = 8;

function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function hueIndexForId(id: string): number {
  return hashId(id) % HUE_COUNT;
}

export function solidColorForId(id: string): string {
  return `var(--hue-${hueIndexForId(id)}-solid)`;
}

export function softColorForId(id: string): string {
  return `var(--hue-${hueIndexForId(id)}-soft)`;
}

export function lineColorForId(id: string): string {
  return `var(--hue-${hueIndexForId(id)}-line)`;
}

export function lightCardColorForId(id: string): { bg: string; border: string } {
  return { bg: softColorForId(id), border: lineColorForId(id) };
}
