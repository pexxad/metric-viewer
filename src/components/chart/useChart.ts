"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { IChartApi, ISeriesApi, SeriesType } from "lightweight-charts";
import { useDatasetStore } from "@/stores/datasetStore";
import { CHART_THEME, SERIES_DEFAULTS } from "@/core/chart/theme";
import { syncSeries } from "@/core/chart/syncSeries";
import { useChartTooltip } from "@/hooks/useChartTooltip";

export function useChart(containerRef: React.RefObject<HTMLDivElement | null>) {
  const chartRef = useRef<IChartApi | null>(null);
  const seriesMapRef = useRef<Map<string, ISeriesApi<SeriesType>>>(new Map());
  const lcModuleRef = useRef<typeof import("lightweight-charts") | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [chartReady, setChartReady] = useState(false);

  const panels = useDatasetStore((s) => s.panels);
  const datasets = useDatasetStore((s) => s.datasets);

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

      setChartReady(true);
    });

    return () => {
      cancelled = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      chartRef.current?.remove();
      chartRef.current = null;
      lcModuleRef.current = null;
      seriesMapRef.current.clear();
      setChartReady(false);
    };
  }, [containerRef]);

  // Sync series with panels
  useEffect(() => {
    const chart = chartRef.current;
    const lc = lcModuleRef.current;
    if (!chart || !lc) return;

    syncSeries(chart, lc, seriesMapRef.current, panels, datasets, {
      seriesDefaults: SERIES_DEFAULTS,
      usePriceScale: true,
    });

    chart.timeScale().fitContent();
  }, [panels, datasets]);

  // Crosshair tooltip
  useChartTooltip(chartRef, seriesMapRef);

  const fitContent = useCallback(() => {
    chartRef.current?.timeScale().fitContent();
  }, []);

  return { chartRef, chartReady, fitContent };
}
