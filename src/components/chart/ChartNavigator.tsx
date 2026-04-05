"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, SeriesType } from "lightweight-charts";
import { useDatasetStore } from "@/stores/datasetStore";
import { syncSeries } from "@/core/chart/syncSeries";
import { useNavigatorDrag } from "@/hooks/useNavigatorDrag";

const NAV_HEIGHT = 60;
const HANDLE_WIDTH = 6;

const NAV_SERIES_DEFAULTS = {
  lineWidth: 1 as const,
  crosshairMarkerVisible: false,
  pointMarkersVisible: false,
  priceLineVisible: false,
  lastValueVisible: false,
};

interface Props {
  mainChartRef: React.RefObject<IChartApi | null>;
  mainChartReady: boolean;
}

export function ChartNavigator({ mainChartRef, mainChartReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navChartRef = useRef<IChartApi | null>(null);
  const seriesMapRef = useRef<Map<string, ISeriesApi<SeriesType>>>(new Map());
  const lcModuleRef = useRef<typeof import("lightweight-charts") | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const panels = useDatasetStore((s) => s.panels);
  const datasets = useDatasetStore((s) => s.datasets);

  const [highlight, setHighlight] = useState<{ left: number; width: number } | null>(null);
  const [navReady, setNavReady] = useState(false);

  const { handlePointerDown, handlePointerMove, handlePointerUp, handleBackgroundClick } =
    useNavigatorDrag(mainChartRef, navChartRef, containerRef);

  // --- Create the mini chart ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

    import("lightweight-charts").then((lc) => {
      if (cancelled) return;
      lcModuleRef.current = lc;

      const chart = lc.createChart(container, {
        height: NAV_HEIGHT,
        layout: {
          background: { color: "#fafafa" },
          textColor: "#999",
          attributionLogo: false,
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { visible: false },
        },
        leftPriceScale: { visible: false },
        rightPriceScale: { visible: false },
        timeScale: { visible: false, minBarSpacing: 0.001 },
        crosshair: {
          mode: 0,
          vertLine: { visible: false },
          horzLine: { visible: false },
        },
        handleScroll: false,
        handleScale: false,
      });
      chart.timeScale().fitContent();
      navChartRef.current = chart;

      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          chart.applyOptions({ width: entry.contentRect.width });
        }
      });
      ro.observe(container);
      resizeObserverRef.current = ro;

      setNavReady(true);
    });

    return () => {
      cancelled = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      navChartRef.current?.remove();
      navChartRef.current = null;
      lcModuleRef.current = null;
      seriesMapRef.current.clear();
      setNavReady(false);
    };
  }, []);

  // --- Sync series with panels ---
  useEffect(() => {
    if (!navReady) return;
    const chart = navChartRef.current;
    const lc = lcModuleRef.current;
    if (!chart || !lc) return;

    syncSeries(chart, lc, seriesMapRef.current, panels, datasets, {
      seriesDefaults: NAV_SERIES_DEFAULTS,
    });

    // 全データのmin/maxタイムスタンプを求め、余白なく全体を表示する
    let minTime = Infinity;
    let maxTime = -Infinity;
    for (const panel of panels) {
      const dataset = datasets[panel.datasetId];
      if (!dataset) continue;
      for (const row of dataset.rows) {
        if (row.time < minTime) minTime = row.time;
        if (row.time > maxTime) maxTime = row.time;
      }
    }
    if (minTime !== Infinity && maxTime !== -Infinity) {
      chart.timeScale().setVisibleRange({
        from: minTime as import("lightweight-charts").Time,
        to: maxTime as import("lightweight-charts").Time,
      });
    } else {
      chart.timeScale().fitContent();
    }
  }, [navReady, panels, datasets]);

  // --- Sync highlight with main chart's visible range ---
  const updateHighlight = useCallback(() => {
    const mainChart = mainChartRef.current;
    const navChart = navChartRef.current;
    if (!mainChart || !navChart) return;

    const mainRange = mainChart.timeScale().getVisibleLogicalRange();
    if (!mainRange) {
      setHighlight(null);
      return;
    }

    const navTs = navChart.timeScale();
    const leftPx = navTs.logicalToCoordinate(mainRange.from);
    const rightPx = navTs.logicalToCoordinate(mainRange.to);

    if (leftPx === null || rightPx === null) {
      setHighlight(null);
      return;
    }

    setHighlight({
      left: Math.max(0, leftPx),
      width: Math.max(4, rightPx - leftPx),
    });
  }, [mainChartRef]);

  // Subscribe to main chart's visible range changes
  useEffect(() => {
    if (!navReady || !mainChartReady) return;
    const mainChart = mainChartRef.current;
    if (!mainChart) return;

    const handler = () => updateHighlight();
    mainChart.timeScale().subscribeVisibleLogicalRangeChange(handler);
    updateHighlight();

    return () => {
      mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
    };
  }, [navReady, mainChartReady, mainChartRef, updateHighlight, panels]);

  return (
    <div
      className="relative shrink-0 border-t border-border"
      style={{ height: NAV_HEIGHT }}
    >
      <div ref={containerRef} className="h-full w-full" />

      {highlight && (
        <>
          <div
            className="pointer-events-none absolute top-0 bottom-0 left-0 bg-black/10"
            style={{ width: highlight.left }}
          />
          <div
            className="pointer-events-none absolute top-0 bottom-0 bg-black/10"
            style={{ left: highlight.left + highlight.width, right: 0 }}
          />
        </>
      )}

      <div
        className="absolute inset-0 z-[1]"
        onClick={handleBackgroundClick}
      />

      {highlight && (
        <div
          className="absolute top-0 bottom-0 z-[2] cursor-grab border-x border-primary/60 bg-primary/10 active:cursor-grabbing"
          style={{ left: highlight.left, width: highlight.width }}
          onPointerDown={(e) => handlePointerDown(e, "move")}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div
            className="absolute top-0 bottom-0 left-0 z-[3] cursor-col-resize"
            style={{ width: HANDLE_WIDTH, transform: `translateX(-${HANDLE_WIDTH / 2}px)` }}
            onPointerDown={(e) => handlePointerDown(e, "resize-left")}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
          <div
            className="absolute top-0 right-0 bottom-0 z-[3] cursor-col-resize"
            style={{ width: HANDLE_WIDTH, transform: `translateX(${HANDLE_WIDTH / 2}px)` }}
            onPointerDown={(e) => handlePointerDown(e, "resize-right")}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        </div>
      )}
    </div>
  );
}
