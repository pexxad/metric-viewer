"use client";

import { useCallback } from "react";
import { useDatasetStore } from "@/stores/datasetStore";
import { useUiStore } from "@/stores/uiStore";
import { DatasetPanel } from "./DatasetPanel";
import { AddPanelButton } from "./AddPanelButton";
import { useCsvDropZone } from "@/hooks/useCsvDropZone";

export function PanelList() {
  const panels = useDatasetStore((s) => s.panels);
  const setCsvDialogOpen = useUiStore((s) => s.setCsvDialogOpen);
  const setDroppedFile = useUiStore((s) => s.setDroppedFile);

  const onCsvFile = useCallback(
    (file: File) => {
      setDroppedFile(file);
      setCsvDialogOpen(true);
    },
    [setDroppedFile, setCsvDialogOpen],
  );
  const { dragging, handlers } = useCsvDropZone(onCsvFile);

  return (
    <aside
      className={`flex w-64 shrink-0 flex-col gap-2 overflow-y-auto border-r border-border bg-surface p-3 transition-colors ${
        dragging ? "bg-primary/5" : ""
      }`}
      onDrop={handlers.onDrop}
      onDragOver={handlers.onDragOver}
      onDragLeave={handlers.onDragLeave}
    >
      <AddPanelButton />
      {panels.map((panel) => (
        <DatasetPanel key={panel.panelId} panel={panel} />
      ))}
    </aside>
  );
}
