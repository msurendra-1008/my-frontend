/**
 * Formats a number with locale-appropriate separators.
 */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat('en-US', options).format(value);
}

/**
 * Formats a date string or Date object into a readable format.
 */
export function formatDate(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
): string {
  return new Intl.DateTimeFormat('en-US', options).format(new Date(date));
}

/**
 * Truncates a string to the given max length, appending an ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * Converts a string to title case.
 */
export function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

const IST_LOCALE = 'en-IN';
const IST_TZ     = 'Asia/Kolkata';

/** Format any UTC/ISO timestamp always in IST, regardless of browser timezone. */
export function formatIST(
  date: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true },
): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat(IST_LOCALE, { ...options, timeZone: IST_TZ }).format(new Date(date));
}

/** Format date-only in IST (no time). */
export function formatISTDate(date: string | Date | null | undefined): string {
  return formatIST(date, { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Format time-only in IST. */
export function formatISTTime(date: string | Date | null | undefined): string {
  return formatIST(date, { hour: '2-digit', minute: '2-digit', hour12: true });
}

/** Returns current IST time as a live-formatted string (call inside setInterval). */
export function nowIST(): string {
  return new Intl.DateTimeFormat(IST_LOCALE, {
    timeZone: IST_TZ,
    weekday: 'short', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  }).format(new Date());
}
