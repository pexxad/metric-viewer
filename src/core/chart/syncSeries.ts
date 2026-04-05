import type { IChartApi, ISeriesApi, SeriesType } from "lightweight-charts";
import type { Dataset, PanelEntry } from "@/core/data/types";
import { getColor } from "./colors";
import { toLineData } from "./seriesFactory";

export interface SyncSeriesOptions {
  seriesDefaults?: Record<string, unknown>;
  /** "left"|"right" per panel (main chart) or undefined (navigator ignores axis) */
  usePriceScale?: boolean;
}

/**
 * Add / update / remove LineSeries on a chart to match the current panels.
 * Shared between the main chart (useChart) and the navigator chart (ChartNavigator).
 */
export function syncSeries(
  chart: IChartApi,
  lc: typeof import("lightweight-charts"),
  seriesMap: Map<string, ISeriesApi<SeriesType>>,
  panels: PanelEntry[],
  datasets: Record<string, Dataset>,
  options: SyncSeriesOptions = {},
): void {
  const currentIds = new Set(panels.map((p) => p.panelId));
  const existingIds = new Set(seriesMap.keys());

  // Remove series for panels that no longer exist
  for (const id of existingIds) {
    if (!currentIds.has(id)) {
      const s = seriesMap.get(id);
      if (s) {
        chart.removeSeries(s);
        seriesMap.delete(id);
      }
    }
  }

  // Add / update series
  for (const panel of panels) {
    const dataset = datasets[panel.datasetId];
    if (!dataset) continue;

    const color = getColor(panel.colorIndex);
    let series = seriesMap.get(panel.panelId);

    if (!series) {
      const priceScaleId =
        options.usePriceScale ? (panel.axis === "left" ? "left" : "right") : undefined;
      series = chart.addSeries(lc.LineSeries, {
        color,
        ...options.seriesDefaults,
        visible: panel.visible,
        ...(priceScaleId !== undefined && { priceScaleId }),
      });
      seriesMap.set(panel.panelId, series);
    } else {
      const applyOpts: Record<string, unknown> = { color, visible: panel.visible };
      if (options.usePriceScale) {
        applyOpts.priceScaleId = panel.axis === "left" ? "left" : "right";
      }
      series.applyOptions(applyOpts);
    }

    const data = toLineData(dataset, panel.attribute);
    series.setData(data as Parameters<typeof series.setData>[0]);
  }
}
