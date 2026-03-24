"use client";

import { useUiStore } from "@/stores/uiStore";
import { formatTimestamp } from "@/core/chart/timeScale";

export function ChartOverlay() {
  const tooltipData = useUiStore((s) => s.tooltipData);

  if (!tooltipData) return null;

  return (
    <div
      className="pointer-events-none absolute z-10 rounded bg-background/95 px-3 py-2 text-xs shadow-lg ring-1 ring-border"
      style={{
        left: tooltipData.x + 16,
        top: tooltipData.y + 16,
      }}
    >
      <div className="mb-1 font-medium text-muted">
        {formatTimestamp(tooltipData.time)}
      </div>
      {tooltipData.values.map((v, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: v.color }}
          />
          <span className="text-muted">{v.label}:</span>
          <span className="font-medium text-foreground">{v.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
