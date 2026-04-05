import type { Dataset } from "../data/types";

/** Data point for Lightweight Charts LineSeries. */
export interface LineDataPoint {
  time: number; // UTCTimestamp (seconds)
  value: number;
}

/** Whitespace point — tells Lightweight Charts "no data here" (breaks the line). */
export interface WhitespacePoint {
  time: number;
}

export type SeriesDataPoint = LineDataPoint | WhitespacePoint;

/**
 * Detect the median interval between consecutive data points.
 * Uses median to be robust against existing gaps in the data.
 */
function detectInterval(times: number[]): number {
  if (times.length < 2) return 0;
  const diffs: number[] = [];
  for (let i = 1; i < times.length; i++) {
    diffs.push(times[i] - times[i - 1]);
  }
  diffs.sort((a, b) => a - b);
  return diffs[Math.floor(diffs.length / 2)];
}

/**
 * Extract a single attribute from a Dataset as SeriesDataPoint[].
 * Gaps larger than 2× the median interval are filled with WhitespaceData
 * so the chart shows empty space and breaks the line.
 */
export function toLineData(
  dataset: Dataset,
  attribute: string,
): SeriesDataPoint[] {
  const points: SeriesDataPoint[] = [];
  const times = dataset.rows.map((r) => r.time);
  const interval = detectInterval(times);

  for (let i = 0; i < dataset.rows.length; i++) {
    const row = dataset.rows[i];

    // Fill gap with whitespace points at regular intervals
    if (interval > 0 && i > 0) {
      const prevTime = dataset.rows[i - 1].time;
      const gap = row.time - prevTime;
      if (gap > interval * 2) {
        for (let t = prevTime + interval; t < row.time; t += interval) {
          points.push({ time: t });
        }
      }
    }

    const val = row[attribute];
    if (val !== null && val !== undefined) {
      points.push({ time: row.time, value: val });
    } else {
      points.push({ time: row.time });
    }
  }
  return points;
}
