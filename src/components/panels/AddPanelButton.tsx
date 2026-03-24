"use client";

import { useUiStore } from "@/stores/uiStore";

export function AddPanelButton() {
  const setCsvDialogOpen = useUiStore((s) => s.setCsvDialogOpen);

  return (
    <button
      onClick={() => setCsvDialogOpen(true)}
      className="flex w-full items-center justify-center gap-1 rounded border-2 border-dashed border-border px-3 py-2 text-sm text-muted hover:border-primary hover:text-primary"
    >
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
          clipRule="evenodd"
        />
      </svg>
      Add Dataset
    </button>
  );
}
