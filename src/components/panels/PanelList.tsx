"use client";

import { useDatasetStore } from "@/stores/datasetStore";
import { DatasetPanel } from "./DatasetPanel";
import { AddPanelButton } from "./AddPanelButton";

export function PanelList() {
  const panels = useDatasetStore((s) => s.panels);

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-2 overflow-y-auto border-r border-border bg-surface p-3">
      <AddPanelButton />
      {panels.map((panel) => (
        <DatasetPanel key={panel.panelId} panel={panel} />
      ))}
    </aside>
  );
}
