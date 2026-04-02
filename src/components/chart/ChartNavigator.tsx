"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  IChartApi,
  ISeriesApi,
  SeriesType,
  LogicalRange,
} from "lightweight-charts";
import { useDatasetStore } from "@/stores/datasetStore";
import { getColor } from "@/core/chart/colors";
import { toLineData } from "@/core/chart/seriesFactory";

const NAV_HEIGHT = 60;
const HANDLE_WIDTH = 6;

interface Props {
  mainChartRef: React.RefObject<IChartApi | null>;
}

export function ChartNavigator({ mainChartRef }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navChartRef = useRef<IChartApi | null>(null);
  const seriesMapRef = useRef<Map<string, ISeriesApi<SeriesType>>>(new Map());
  const lcModuleRef = useRef<typeof import("lightweight-charts") | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const panels = useDatasetStore((s) => s.panels);
  const datasets = useDatasetStore((s) => s.datasets);

  const [highlight, setHighlight] = useState<{ left: number; width: number } | null>(null);
  // Signal that the nav chart is ready for series sync
  const [navReady, setNavReady] = useState(false);

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
        timeScale: { visible: false },
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

  // --- Sync series with panels (runs once nav chart is ready) ---
  useEffect(() => {
    if (!navReady) return;
    const chart = navChartRef.current;
    const lc = lcModuleRef.current;
    if (!chart || !lc) return;

    const currentIds = new Set(panels.map((p) => p.panelId));
    const existingIds = new Set(seriesMapRef.current.keys());

    for (const id of existingIds) {
      if (!currentIds.has(id)) {
        const s = seriesMapRef.current.get(id);
        if (s) {
          chart.removeSeries(s);
          seriesMapRef.current.delete(id);
        }
      }
    }

    for (const panel of panels) {
      const dataset = datasets[panel.datasetId];
      if (!dataset) continue;

      const color = getColor(panel.colorIndex);
      let series = seriesMapRef.current.get(panel.panelId);

      if (!series) {
        series = chart.addSeries(lc.LineSeries, {
          color,
          lineWidth: 1,
          crosshairMarkerVisible: false,
          pointMarkersVisible: false,
          priceLineVisible: false,
          lastValueVisible: false,
          visible: panel.visible,
        });
        seriesMapRef.current.set(panel.panelId, series);
      } else {
        series.applyOptions({ color, visible: panel.visible });
      }

      const data = toLineData(dataset, panel.attribute);
      series.setData(data as Parameters<typeof series.setData>[0]);
    }

    chart.timeScale().fitContent();
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

  // Poll for main chart readiness, then subscribe
  useEffect(() => {
    if (!navReady) return;

    let subscribed = false;
    let timer: ReturnType<typeof setInterval>;
    const handler = () => updateHighlight();

    const trySubscribe = () => {
      const mainChart = mainChartRef.current;
      if (!mainChart) return;
      // Main chart is ready — subscribe and stop polling
      clearInterval(timer);
      subscribed = true;
      mainChart.timeScale().subscribeVisibleLogicalRangeChange(handler);
      updateHighlight();
    };

    // Try immediately, then poll every 200ms until main chart is available
    trySubscribe();
    if (!subscribed) {
      timer = setInterval(trySubscribe, 200);
    }

    return () => {
      clearInterval(timer);
      const mainChart = mainChartRef.current;
      if (subscribed && mainChart) {
        mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
      }
    };
  }, [navReady, mainChartRef, updateHighlight, panels]);

  // --- Drag interactions on the highlight ---
  const dragState = useRef<{
    mode: "move" | "resize-left" | "resize-right";
    originX: number;
    originRange: LogicalRange;
  } | null>(null);

  const getLogicalRange = useCallback((): LogicalRange | null => {
    return mainChartRef.current?.timeScale().getVisibleLogicalRange() ?? null;
  }, [mainChartRef]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, mode: "move" | "resize-left" | "resize-right") => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const range = getLogicalRange();
      if (!range) return;
      dragState.current = { mode, originX: e.clientX, originRange: range };
    },
    [getLogicalRange],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const ds = dragState.current;
      const navChart = navChartRef.current;
      const mainChart = mainChartRef.current;
      if (!ds || !navChart || !mainChart) return;

      const deltaPx = e.clientX - ds.originX;
      const navTs = navChart.timeScale();
      const mainTs = mainChart.timeScale();

      const refPx = navTs.logicalToCoordinate(ds.originRange.from);
      if (refPx === null) return;
      const targetLogical = navTs.coordinateToLogical(refPx + deltaPx);
      if (targetLogical === null) return;
      const logicalDelta = targetLogical - ds.originRange.from;

      if (ds.mode === "move") {
        mainTs.setVisibleLogicalRange({
          from: ds.originRange.from + logicalDelta,
          to: ds.originRange.to + logicalDelta,
        });
      } else if (ds.mode === "resize-left") {
        const newFrom = ds.originRange.from + logicalDelta;
        if (newFrom < ds.originRange.to - 1) {
          mainTs.setVisibleLogicalRange({ from: newFrom, to: ds.originRange.to });
        }
      } else {
        const refPxR = navTs.logicalToCoordinate(ds.originRange.to);
        if (refPxR === null) return;
        const targetR = navTs.coordinateToLogical(refPxR + deltaPx);
        if (targetR === null) return;
        const deltaR = targetR - ds.originRange.to;
        const newTo = ds.originRange.to + deltaR;
        if (newTo > ds.originRange.from + 1) {
          mainTs.setVisibleLogicalRange({ from: ds.originRange.from, to: newTo });
        }
      }
    },
    [mainChartRef],
  );

  const handlePointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      const navChart = navChartRef.current;
      const mainChart = mainChartRef.current;
      if (!navChart || !mainChart) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const clickedLogical = navChart.timeScale().coordinateToLogical(x);
      const range = mainChart.timeScale().getVisibleLogicalRange();
      if (clickedLogical === null || !range) return;

      const span = range.to - range.from;
      mainChart.timeScale().setVisibleLogicalRange({
        from: clickedLogical - span / 2,
        to: clickedLogical + span / 2,
      });
    },
    [mainChartRef],
  );

  const hasPanels = panels.length > 0;
  if (!hasPanels) return null;

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
