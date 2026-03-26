import { create } from "zustand";

export interface TooltipValue {
  color: string;
  label: string;
  value: number;
}

export interface TooltipData {
  time: number;
  values: TooltipValue[];
  x: number;
  y: number;
}

interface UiState {
  sidebarOpen: boolean;
  csvDialogOpen: boolean;
  tooltipData: TooltipData | null;
  droppedFile: File | null;

  setSidebarOpen: (open: boolean) => void;
  setCsvDialogOpen: (open: boolean) => void;
  setTooltipData: (data: TooltipData | null) => void;
  setDroppedFile: (file: File | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  csvDialogOpen: false,
  tooltipData: null,
  droppedFile: null,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCsvDialogOpen: (open) => set({ csvDialogOpen: open }),
  setTooltipData: (data) => set({ tooltipData: data }),
  setDroppedFile: (file) => set({ droppedFile: file }),
}));
