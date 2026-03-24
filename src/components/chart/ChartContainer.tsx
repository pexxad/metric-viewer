"use client";

import { useRef } from "react";
import { useChart } from "./useChart";
import { ChartOverlay } from "./ChartOverlay";

export function ChartContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  useChart(containerRef);

  return (
    <div className="relative flex-1">
      <div ref={containerRef} className="h-full w-full" />
      <ChartOverlay />
    </div>
  );
}
