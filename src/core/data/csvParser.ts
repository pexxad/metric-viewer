import Papa from "papaparse";
import type { DataRow, Dataset } from "./types";

/**
 * Parse a time string to Unix timestamp in seconds.
 * Supports ISO 8601 (2026-03-22T15:30:00) and date-only (2026-03-22).
 */
export function parseTimeToUnix(value: string): number {
  let v = value.trim();
  // Ensure UTC interpretation: append Z if no timezone indicator present
  if (!v.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(v)) {
    v += "Z";
  }
  const ms = Date.parse(v);
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid time value: "${value}"`);
  }
  return Math.floor(ms / 1000);
}

/**
 * Parse a CSV string into a Dataset.
 * First column must be time, remaining columns are attributes.
 */
export function parseCsv(
  csvText: string,
  dataId: string,
  dataName?: string,
): Dataset {
  const result = Papa.parse<string[]>(csvText, {
    skipEmptyLines: true,
  });

  if (result.data.length < 2) {
    throw new Error("CSV must contain a header row and at least one data row");
  }

  const [header, ...dataRows] = result.data;
  const attributes = header.slice(1);

  const rows: DataRow[] = dataRows
    .map((row) => {
      const time = parseTimeToUnix(row[0]);
      const entry: DataRow = { time };
      for (let i = 0; i < attributes.length; i++) {
        const val = row[i + 1];
        entry[attributes[i]] =
          val === "" || val === undefined ? null : Number(val);
      }
      return entry;
    })
    .sort((a, b) => a.time - b.time);

  return { id: dataId, name: dataName, attributes, rows };
}
