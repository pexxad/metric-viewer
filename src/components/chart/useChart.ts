"use client";

import { useEffect, useRef, useCallback } from "react";
import type {
  IChartApi,
  ISeriesApi,
  SeriesType,
  MouseEventParams,
  Time,
} from "lightweight-charts";
import { useDatasetStore } from "@/stores/datasetStore";
import { useUiStore } from "@/stores/uiStore";
import { useLabelStore } from "@/stores/labelStore";
import { getColor } from "@/core/chart/colors";
import { toLineData } from "@/core/chart/seriesFactory";
import { CHART_THEME, SERIES_DEFAULTS } from "@/core/chart/theme";

export function useChart(containerRef: React.RefObject<HTMLDivElement | null>) {
  const chartRef = useRef<IChartApi | null>(null);
  const seriesMapRef = useRef<Map<string, ISeriesApi<SeriesType>>>(new Map());
  const lcModuleRef = useRef<typeof import("lightweight-charts") | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const panels = useDatasetStore((s) => s.panels);
  const datasets = useDatasetStore((s) => s.datasets);
  const setTooltipData = useUiStore((s) => s.setTooltipData);
  const resolveLabel = useLabelStore((s) => s.resolve);

  // Dynamically load lightweight-charts and create chart
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    import("lightweight-charts").then((lc) => {
      if (cancelled) return;
      lcModuleRef.current = lc;

      const chart = lc.createChart(container, CHART_THEME);
      chart.timeScale().fitContent();
      chartRef.current = chart;

      // Resize observer
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          chart.applyOptions({ width, height });
        }
      });
      ro.observe(container);
      resizeObserverRef.current = ro;
    });

    return () => {
      cancelled = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      chartRef.current?.remove();
      chartRef.current = null;
      lcModuleRef.current = null;
      seriesMapRef.current.clear();
    };
  }, [containerRef]);

  // Sync series with panels
  useEffect(() => {
    const chart = chartRef.current;
    const lc = lcModuleRef.current;
    if (!chart || !lc) return;

    const currentPanelIds = new Set(panels.map((p) => p.panelId));
    const existingPanelIds = new Set(seriesMapRef.current.keys());

    // Remove series for panels that no longer exist
    for (const panelId of existingPanelIds) {
      if (!currentPanelIds.has(panelId)) {
        const series = seriesMapRef.current.get(panelId);
        if (series) {
          chart.removeSeries(series);
          seriesMapRef.current.delete(panelId);
        }
      }
    }

    // Add / update series for current panels
    for (const panel of panels) {
      const dataset = datasets[panel.datasetId];
      if (!dataset) continue;

      const color = getColor(panel.colorIndex);
      let series = seriesMapRef.current.get(panel.panelId);

      const priceScaleId = panel.axis === "left" ? "left" : "right";

      if (!series) {
        series = chart.addSeries(lc.LineSeries, {
          color,
          ...SERIES_DEFAULTS,
          visible: panel.visible,
          priceScaleId,
        });
        seriesMapRef.current.set(panel.panelId, series);
      } else {
        series.applyOptions({
          color,
          visible: panel.visible,
          priceScaleId,
        });
      }

      const data = toLineData(dataset, panel.attribute);
      series.setData(data as Parameters<typeof series.setData>[0]);
    }

    chart.timeScale().fitContent();
  }, [panels, datasets]);

  // Crosshair tooltip
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const handler = (param: MouseEventParams<Time>) => {
      if (!param.time || !param.seriesData?.size || !param.point) {
        setTooltipData(null);
        return;
      }

      const values: { color: string; label: string; value: number }[] = [];
      for (const panel of panels) {
        if (!panel.visible) continue;
        const series = seriesMapRef.current.get(panel.panelId);
        if (!series) continue;
        const data = param.seriesData.get(series);
        if (data && "value" in data && typeof data.value === "number") {
          const ds = datasets[panel.datasetId];
          const attrLabel = resolveLabel(panel.attribute);
          const label = ds
            ? `${ds.name || ds.id} / ${attrLabel}`
            : attrLabel;
          values.push({
            color: getColor(panel.colorIndex),
            label,
            value: data.value,
          });
        }
      }

      if (values.length > 0) {
        setTooltipData({
          time: param.time as number,
          values,
          x: param.point.x,
          y: param.point.y,
        });
      } else {
        setTooltipData(null);
      }
    };

    chart.subscribeCrosshairMove(handler);
    return () => {
      chart.unsubscribeCrosshairMove(handler);
    };
  }, [panels, datasets, setTooltipData, resolveLabel]);

  const fitContent = useCallback(() => {
    chartRef.current?.timeScale().fitContent();
  }, []);

  return { chartRef, fitContent };
}
