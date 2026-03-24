"use client";

import type { PanelEntry } from "@/core/data/types";
import { getColor } from "@/core/chart/colors";
import { useDatasetStore } from "@/stores/datasetStore";

export function DatasetPanel({ panel }: { panel: PanelEntry }) {
  const dataset = useDatasetStore((s) => s.datasets[panel.datasetId]);
  const removePanel = useDatasetStore((s) => s.removePanel);
  const toggleVisibility = useDatasetStore((s) => s.togglePanelVisibility);
  const color = getColor(panel.colorIndex);

  if (!dataset) return null;

  return (
    <div
      className="flex items-center gap-2 rounded border-l-4 bg-background px-3 py-2 shadow-sm"
      style={{ borderLeftColor: color }}
    >
      <button
        onClick={() => toggleVisibility(panel.panelId)}
        className="h-3 w-3 shrink-0 rounded-full"
        style={{
          backgroundColor: color,
          opacity: panel.visible ? 1 : 0.3,
        }}
        title={panel.visible ? "Hide" : "Show"}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">
          {dataset.id}
          {dataset.name && (
            <span className="ml-1 text-muted">({dataset.name})</span>
          )}
        </div>
        <div className="truncate text-xs text-muted">{panel.attribute}</div>
      </div>
      <button
        onClick={() => removePanel(panel.panelId)}
        className="shrink-0 text-muted hover:text-danger"
        title="Remove"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
