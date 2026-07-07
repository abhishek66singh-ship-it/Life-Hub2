/* Date helpers powering countdowns, annual recurrence, and renewal windows. */

export const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

export const parseISO = (iso: string): Date => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

export const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const toISO = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

/** Whole-day difference between two ISO dates (b - a). */
export const daysBetween = (aISO: string, bISO: string): number => {
  const a = parseISO(aISO);
  const b = parseISO(bISO);
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / 86_400_000);
};

export const addDays = (iso: string, n: number): string => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

export const greetByHour = (): string => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const dayShort = (d: Date): string => DOW[d.getDay()];
export const monthName = (m: number): string => MONTHS[m];
export const monthNameShort = (m: number): string => MONTHS[m].slice(0, 3);
export const DOW_FULL = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

/** Compute the next occurrence of an annual event (MM-DD) relative to today. */
export const nextAnnualOccurrence = (originalISO: string, today: string): string => {
  const orig = parseISO(originalISO);
  const now = parseISO(today);
  const thisYearOccur = new Date(
    now.getFullYear(),
    orig.getMonth(),
    orig.getDate()
  );
  // If today is the event day or after, roll to next year.
  if (thisYearOccur < now) {
    return toISO(
      new Date(now.getFullYear() + 1, orig.getMonth(), orig.getDate())
    );
  }
  return toISO(thisYearOccur);
};

export const formatDateLong = (iso: string): string => {
  const d = parseISO(iso);
  return `${DOW_FULL[d.getDay()]}, ${monthNameShort(d.getMonth())} ${d.getDate()}`;
};

export const formatTime12 = (time?: string): string => {
  if (!time) return "";
  const [hStr, m] = time.split(":");
  let h = Number(hStr);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
};

export const monthMatrix = (year: number, month: number): (Date | null)[] => {
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

export const ordinalSuffix = (n: number): string => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
