"use client";

import { useCallback, useRef, useState } from "react";
import { parseCsv } from "@/core/data/csvParser";
import { useDatasetStore } from "@/stores/datasetStore";
import { useUiStore } from "@/stores/uiStore";
import { Modal } from "@/components/ui/Modal";

export function CsvImportDialog() {
  const open = useUiStore((s) => s.csvDialogOpen);
  const setCsvDialogOpen = useUiStore((s) => s.setCsvDialogOpen);
  const addDataset = useDatasetStore((s) => s.addDataset);
  const addPanel = useDatasetStore((s) => s.addPanel);

  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [attributes, setAttributes] = useState<string[]>([]);
  const [selectedAttr, setSelectedAttr] = useState<string>("");
  const csvTextRef = useRef<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setError(null);
    setFileName("");
    setAttributes([]);
    setSelectedAttr("");
    csvTextRef.current = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setError(null);
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        csvTextRef.current = text;

        try {
          const ds = parseCsv(text, "preview");
          setAttributes(ds.attributes);
          if (ds.attributes.length > 0) {
            setSelectedAttr(ds.attributes[0]);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to parse CSV");
        }
      };
      reader.readAsText(file);
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    if (!csvTextRef.current || !selectedAttr || !fileName) return;

    try {
      const dataId = fileName.replace(/\.csv$/i, "");
      const ds = parseCsv(csvTextRef.current, dataId);
      addDataset(ds);
      addPanel(ds.id, selectedAttr);
      reset();
      setCsvDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV");
    }
  }, [fileName, selectedAttr, addDataset, addPanel, reset, setCsvDialogOpen]);

  const handleClose = useCallback(() => {
    reset();
    setCsvDialogOpen(false);
  }, [reset, setCsvDialogOpen]);

  return (
    <Modal open={open} onClose={handleClose}>
      <div className="w-96 rounded-lg bg-background p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-foreground">CSVファイル読み込み</h2>

        <p className="mt-3 mb-1 block text-sm font-medium text-muted-foreground">
          {"1. CSVファイルを選択"}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mb-1 w-full rounded border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:bg-surface-hover"
        >
          {fileName ? `${fileName} を選択中` : "ファイル選択"}
        </button>

        <label className="mt-3 mb-1 block text-sm font-medium text-muted-foreground">
          2. グラフ表示するパラメータを選択
        </label>
        <select
          value={selectedAttr}
          onChange={(e) => setSelectedAttr(e.target.value)}
          disabled={attributes.length === 0}
          className="mb-3 w-full rounded border border-border bg-background px-2 py-1 text-sm text-foreground disabled:opacity-50"
        >
          {attributes.length === 0 ? (
            <option value="">先にCSVファイルを選択してください</option>
          ) : (
            attributes.map((attr) => (
              <option key={attr} value={attr}>
                {attr}
              </option>
            ))
          )}
        </select>

        {error && (
          <p className="mb-3 text-sm text-danger">{error}</p>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="rounded border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-surface"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={!csvTextRef.current || !selectedAttr}
            className="rounded bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-hover disabled:opacity-50"
          >
            読み込み
          </button>
        </div>
      </div>
    </Modal>
  );
}
