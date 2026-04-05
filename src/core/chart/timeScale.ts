/** Format a Unix timestamp (seconds) to a localized date-time string. */
export function formatTimestamp(unix: number): string {
  return new Date(unix * 1000).toLocaleString();
}
