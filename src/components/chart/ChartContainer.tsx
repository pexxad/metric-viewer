"use client";

import { useCallback, useRef, useState } from "react";
import { useChart } from "./useChart";
import { ChartOverlay } from "./ChartOverlay";
import { useDatasetStore } from "@/stores/datasetStore";
import { useUiStore } from "@/stores/uiStore";

export function ChartContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  useChart(containerRef);

  const panels = useDatasetStore((s) => s.panels);
  const setCsvDialogOpen = useUiStore((s) => s.setCsvDialogOpen);
  const setDroppedFile = useUiStore((s) => s.setDroppedFile);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".csv")) {
        setDroppedFile(file);
        setCsvDialogOpen(true);
      }
    },
    [setDroppedFile, setCsvDialogOpen],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const isEmpty = panels.length === 0;

  return (
    <div
      className="relative flex-1"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div ref={containerRef} className="h-full w-full" />
      {!isEmpty && <ChartOverlay />}
      {isEmpty && (
        <div
          className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed transition-colors ${
            dragging
              ? "border-primary bg-primary/5"
              : "border-border bg-background"
          }`}
        >
          <svg
            className="h-12 w-12 text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-sm text-muted">
            CSVファイルをドラッグ&ドロップ
          </p>
          <p className="text-xs text-muted">
            または左メニューの「グラフ表示するデータを選択」から追加
          </p>
        </div>
      )}
    </div>
  );
}
