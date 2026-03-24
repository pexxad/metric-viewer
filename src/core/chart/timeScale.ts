/** Format a Unix timestamp (seconds) to a localized date-time string. */
export function formatTimestamp(unix: number): string {
  return new Date(unix * 1000).toLocaleString();
}

/** Format a Unix timestamp (seconds) to ISO date string (YYYY-MM-DD). */
export function formatDate(unix: number): string {
  return new Date(unix * 1000).toISOString().slice(0, 10);
}
