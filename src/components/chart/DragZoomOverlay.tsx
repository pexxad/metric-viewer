"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { IChartApi } from "lightweight-charts";

const MIN_DRAG_PX = 5;

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>;
  chartRef: React.RefObject<IChartApi | null>;
}

/**
 * Right-click drag to zoom into a time range.
 * Double-click to reset (fit all content).
 *
 * Events are registered on the container in the **capture** phase
 * so they fire before Lightweight Charts' internal handlers.
 */
export function DragZoomOverlay({ containerRef, chartRef }: Props) {
  const [selection, setSelection] = useState<{ left: number; width: number } | null>(null);
  const dragging = useRef(false);
  const startX = useRef(0);

  const onMouseDown = useCallback(
    (e: MouseEvent) => {
      if (e.button !== 2) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      dragging.current = true;
      startX.current = e.clientX - rect.left;
      setSelection(null);
    },
    [containerRef],
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging.current) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const currentX = e.clientX - rect.left;
      const left = Math.min(startX.current, currentX);
      const width = Math.abs(currentX - startX.current);
      setSelection({ left, width });
    },
    [containerRef],
  );

  const onMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!dragging.current) return;
      dragging.current = false;

      const chart = chartRef.current;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!chart || !rect) {
        setSelection(null);
        return;
      }

      const endX = e.clientX - rect.left;
      if (Math.abs(endX - startX.current) >= MIN_DRAG_PX) {
        const ts = chart.timeScale();
        const leftCoord = Math.min(startX.current, endX);
        const rightCoord = Math.max(startX.current, endX);
        const from = ts.coordinateToLogical(leftCoord);
        const to = ts.coordinateToLogical(rightCoord);
        if (from !== null && to !== null) {
          ts.setVisibleLogicalRange({ from, to });
        }
      }
      setSelection(null);
    },
    [chartRef, containerRef],
  );

  const onContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
  }, []);

  const onDoubleClick = useCallback(() => {
    chartRef.current?.timeScale().fitContent();
  }, [chartRef]);

  // Capture-phase listeners so we receive events before LW Charts
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const capture = true;
    el.addEventListener("mousedown", onMouseDown, capture);
    el.addEventListener("mousemove", onMouseMove, capture);
    el.addEventListener("mouseup", onMouseUp, capture);
    el.addEventListener("mouseleave", onMouseUp, capture);
    el.addEventListener("contextmenu", onContextMenu, capture);
    el.addEventListener("dblclick", onDoubleClick, capture);

    return () => {
      el.removeEventListener("mousedown", onMouseDown, capture);
      el.removeEventListener("mousemove", onMouseMove, capture);
      el.removeEventListener("mouseup", onMouseUp, capture);
      el.removeEventListener("mouseleave", onMouseUp, capture);
      el.removeEventListener("contextmenu", onContextMenu, capture);
      el.removeEventListener("dblclick", onDoubleClick, capture);
    };
  }, [containerRef, onMouseDown, onMouseMove, onMouseUp, onContextMenu, onDoubleClick]);

  if (!selection) return null;

  return (
    <div
      className="pointer-events-none absolute top-0 bottom-0 z-10 bg-primary/15 border-x-2 border-primary/40"
      style={{ left: selection.left, width: selection.width }}
    />
  );
}
