"use client";

import type { PanelEntry } from "@/core/data/types";
import { getColor } from "@/core/chart/colors";
import { useDatasetStore } from "@/stores/datasetStore";

export function DatasetPanel({ panel }: { panel: PanelEntry }) {
  const dataset = useDatasetStore((s) => s.datasets[panel.datasetId]);
  const removePanel = useDatasetStore((s) => s.removePanel);
  const toggleVisibility = useDatasetStore((s) => s.togglePanelVisibility);
  const setPanelAttribute = useDatasetStore((s) => s.setPanelAttribute);
  const setPanelAxis = useDatasetStore((s) => s.setPanelAxis);
  const color = getColor(panel.colorIndex);

  if (!dataset) return null;

  return (
    <div
      className="flex flex-col gap-1.5 rounded border-l-4 bg-background px-3 py-2 shadow-sm"
      style={{ borderLeftColor: color }}
    >
      {/* Header row: visibility dot, dataset title, delete button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => toggleVisibility(panel.panelId)}
          className="h-3 w-3 shrink-0 rounded-full"
          style={{
            backgroundColor: color,
            opacity: panel.visible ? 1 : 0.3,
          }}
          title={panel.visible ? "非表示にする" : "表示する"}
          aria-label={panel.visible ? "非表示にする" : "表示する"}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">
            {dataset.id}
            {dataset.name && (
              <span className="ml-1 text-muted">({dataset.name})</span>
            )}
          </div>
        </div>
        <button
          onClick={() => removePanel(panel.panelId)}
          className="shrink-0 text-muted hover:text-danger"
          title="パネルを削除"
          aria-label="パネルを削除"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Controls row: attribute dropdown + axis toggle */}
      <div className="flex items-center gap-2">
        <select
          value={panel.attribute}
          onChange={(e) => setPanelAttribute(panel.panelId, e.target.value)}
          className="min-w-0 flex-1 truncate rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground"
        >
          {dataset.attributes.map((attr) => (
            <option key={attr} value={attr}>
              {attr}
            </option>
          ))}
        </select>

        <div
          className="flex shrink-0 overflow-hidden rounded-full border border-border bg-surface text-[10px] leading-none"
          role="radiogroup"
          aria-label="軸の割り当て"
        >
          <button
            role="radio"
            aria-checked={panel.axis === "left"}
            onClick={() => setPanelAxis(panel.panelId, panel.axis === "left" ? "right" : "left")}
            className={`px-1.5 py-1 font-medium transition-colors ${
              panel.axis === "left"
                ? "bg-primary text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            左軸
          </button>
          <button
            role="radio"
            aria-checked={panel.axis === "right"}
            onClick={() => setPanelAxis(panel.panelId, panel.axis === "right" ? "left" : "right")}
            className={`px-1.5 py-1 font-medium transition-colors ${
              panel.axis === "right"
                ? "bg-primary text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            右軸
          </button>
        </div>
      </div>
    </div>
  );
}
