"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  createChart,
  LineSeries,
  LineType,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
  type MouseEventParams,
  type Time,
} from "lightweight-charts";
import { useDatasetStore } from "@/stores/datasetStore";
import { useUiStore } from "@/stores/uiStore";
import { getColor } from "@/core/chart/colors";
import { toLineData } from "@/core/chart/seriesFactory";

export function useChart(containerRef: React.RefObject<HTMLDivElement | null>) {
  const chartRef = useRef<IChartApi | null>(null);
  const seriesMapRef = useRef<Map<string, ISeriesApi<SeriesType>>>(new Map());

  const panels = useDatasetStore((s) => s.panels);
  const datasets = useDatasetStore((s) => s.datasets);
  const setTooltipData = useUiStore((s) => s.setTooltipData);

  // Create / destroy chart
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      layout: {
        background: { color: "#ffffff" },
        textColor: "#333",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "#f0f0f0" },
        horzLines: { color: "#f0f0f0" },
      },
      crosshair: {
        mode: 0, // Normal
      },
      rightPriceScale: {
        borderColor: "#e0e0e0",
      },
      timeScale: {
        borderColor: "#e0e0e0",
        timeVisible: true,
      },
    });

    chart.timeScale().fitContent();
    chartRef.current = chart;

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height });
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesMapRef.current.clear();
    };
  }, [containerRef]);

  // Sync series with panels
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

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

      if (!series) {
        series = chart.addSeries(LineSeries, {
          color,
          lineWidth: 2,
          lineType: LineType.Curved,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 5,
          pointMarkersVisible: true,
          pointMarkersRadius: 4,
          visible: panel.visible,
        });
        seriesMapRef.current.set(panel.panelId, series);
      } else {
        series.applyOptions({
          color,
          visible: panel.visible,
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
          const label = ds
            ? `${ds.name || ds.id} / ${panel.attribute}`
            : panel.attribute;
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
  }, [panels, datasets, setTooltipData]);

  const fitContent = useCallback(() => {
    chartRef.current?.timeScale().fitContent();
  }, []);

  return { chartRef, fitContent };
}
