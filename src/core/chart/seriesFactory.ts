import type { Dataset } from "../data/types";

/** Data point for Lightweight Charts LineSeries. */
export interface LineDataPoint {
  time: number; // UTCTimestamp (seconds)
  value: number;
}

/**
 * Extract a single attribute from a Dataset as LineDataPoint[].
 * Null values are skipped (LW Charts renders gaps).
 */
export function toLineData(
  dataset: Dataset,
  attribute: string,
): LineDataPoint[] {
  const points: LineDataPoint[] = [];
  for (const row of dataset.rows) {
    const val = row[attribute];
    if (val !== null && val !== undefined) {
      points.push({ time: row.time, value: val });
    }
  }
  return points;
}
