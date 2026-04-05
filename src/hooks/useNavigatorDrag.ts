import { useCallback, useRef } from "react";
import type { IChartApi, LogicalRange } from "lightweight-charts";

type DragMode = "move" | "resize-left" | "resize-right";

interface DragState {
  mode: DragMode;
  originX: number;
  originRange: LogicalRange;
}

/**
 * Drag interactions on the navigator highlight:
 * - move: pan the main chart visible range
 * - resize-left / resize-right: shrink/expand from one side
 * - background click: center the range on the clicked point
 */
export function useNavigatorDrag(
  mainChartRef: React.RefObject<IChartApi | null>,
  navChartRef: React.RefObject<IChartApi | null>,
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const dragState = useRef<DragState | null>(null);

  const getLogicalRange = useCallback((): LogicalRange | null => {
    return mainChartRef.current?.timeScale().getVisibleLogicalRange() ?? null;
  }, [mainChartRef]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, mode: DragMode) => {
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
    [mainChartRef, navChartRef],
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
    [mainChartRef, navChartRef, containerRef],
  );

  return { handlePointerDown, handlePointerMove, handlePointerUp, handleBackgroundClick };
}
