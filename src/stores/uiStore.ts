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
  csvDialogOpen: boolean;
  tooltipData: TooltipData | null;
  droppedFile: File | null;

  setCsvDialogOpen: (open: boolean) => void;
  setTooltipData: (data: TooltipData | null) => void;
  setDroppedFile: (file: File | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  csvDialogOpen: false,
  tooltipData: null,
  droppedFile: null,

  setCsvDialogOpen: (open) => set({ csvDialogOpen: open }),
  setTooltipData: (data) => set({ tooltipData: data }),
  setDroppedFile: (file) => set({ droppedFile: file }),
}));
