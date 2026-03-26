"use client";

import { useCallback, useState } from "react";
import { useDatasetStore } from "@/stores/datasetStore";
import { useUiStore } from "@/stores/uiStore";
import { DatasetPanel } from "./DatasetPanel";
import { AddPanelButton } from "./AddPanelButton";

export function PanelList() {
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

  return (
    <aside
      className={`flex w-64 shrink-0 flex-col gap-2 overflow-y-auto border-r border-border bg-surface p-3 transition-colors ${
        dragging ? "bg-primary/5" : ""
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <AddPanelButton />
      {panels.map((panel) => (
        <DatasetPanel key={panel.panelId} panel={panel} />
      ))}
    </aside>
  );
}
