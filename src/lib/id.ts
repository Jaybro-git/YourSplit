export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function timestampNow(): number {
  return Date.now();
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function toDateInputValue(timestamp: number): string {
  const d = new Date(timestamp);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Applies a picked calendar date to an existing timestamp's time-of-day, so
// same-day entries keep a stable relative order instead of all collapsing
// to midnight.
export function combineDateAndTime(dateStr: string, timeSource: number): number {
  const time = new Date(timeSource);
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(
    year,
    month - 1,
    day,
    time.getHours(),
    time.getMinutes(),
    time.getSeconds(),
    time.getMilliseconds()
  ).getTime();
}
