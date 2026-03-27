import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { AxisSide, Dataset, PanelEntry } from "@/core/data/types";

interface DatasetState {
  datasets: Record<string, Dataset>;
  panels: PanelEntry[];
  nextColorIndex: number;

  addDataset: (ds: Dataset) => void;
  removeDataset: (id: string) => void;
  addPanel: (datasetId: string, attribute: string) => void;
  removePanel: (panelId: string) => void;
  togglePanelVisibility: (panelId: string) => void;
  setPanelAttribute: (panelId: string, attribute: string) => void;
  setPanelAxis: (panelId: string, axis: AxisSide) => void;
}

export const useDatasetStore = create<DatasetState>((set) => ({
  datasets: {},
  panels: [],
  nextColorIndex: 0,

  addDataset: (ds) =>
    set((state) => ({
      datasets: { ...state.datasets, [ds.id]: ds },
    })),

  removeDataset: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.datasets;
      return {
        datasets: rest,
        panels: state.panels.filter((p) => p.datasetId !== id),
      };
    }),

  addPanel: (datasetId, attribute) =>
    set((state) => ({
      panels: [
        ...state.panels,
        {
          panelId: uuidv4(),
          datasetId,
          attribute,
          colorIndex: state.nextColorIndex,
          visible: true,
          axis: "right",
        },
      ],
      nextColorIndex: state.nextColorIndex + 1,
    })),

  removePanel: (panelId) =>
    set((state) => ({
      panels: state.panels.filter((p) => p.panelId !== panelId),
    })),

  togglePanelVisibility: (panelId) =>
    set((state) => ({
      panels: state.panels.map((p) =>
        p.panelId === panelId ? { ...p, visible: !p.visible } : p,
      ),
    })),

  setPanelAttribute: (panelId, attribute) =>
    set((state) => ({
      panels: state.panels.map((p) =>
        p.panelId === panelId ? { ...p, attribute } : p,
      ),
    })),

  setPanelAxis: (panelId, axis) =>
    set((state) => ({
      panels: state.panels.map((p) =>
        p.panelId === panelId ? { ...p, axis } : p,
      ),
    })),
}));
