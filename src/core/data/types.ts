/** A single time-indexed row. Keys are attribute names, values are numbers or null (sparse). */
export interface DataRow {
  time: number; // Unix timestamp in seconds
  [attribute: string]: number | null;
}

/** One dataset loaded from CSV or API. */
export interface Dataset {
  id: string;
  name?: string;
  attributes: string[];
  rows: DataRow[];
}

/** Which price scale the series is pinned to. */
export type AxisSide = "left" | "right";

/** A panel the user has added to the UI, referencing a dataset + chosen attribute. */
export interface PanelEntry {
  panelId: string;
  datasetId: string;
  attribute: string;
  colorIndex: number;
  visible: boolean;
  axis: AxisSide;
}
