"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseCsv } from "@/core/data/csvParser";
import { readCsvFile } from "@/core/data/readCsvFile";
import { useDatasetStore } from "@/stores/datasetStore";
import { useUiStore } from "@/stores/uiStore";
import { Modal } from "@/components/ui/Modal";

export function CsvImportDialog() {
  const open = useUiStore((s) => s.csvDialogOpen);
  const setCsvDialogOpen = useUiStore((s) => s.setCsvDialogOpen);
  const droppedFile = useUiStore((s) => s.droppedFile);
  const setDroppedFile = useUiStore((s) => s.setDroppedFile);
  const addDataset = useDatasetStore((s) => s.addDataset);
  const addPanel = useDatasetStore((s) => s.addPanel);

  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [attributes, setAttributes] = useState<string[]>([]);
  const [selectedAttr, setSelectedAttr] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const csvTextRef = useRef<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setError(null);
    setFileName("");
    setAttributes([]);
    setSelectedAttr("");
    setDragging(false);
    csvTextRef.current = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const loadFile = useCallback(async (file: File) => {
    setError(null);
    try {
      const { text, fileName: name } = await readCsvFile(file);
      setFileName(name);
      csvTextRef.current = text;

      const ds = parseCsv(text, "preview");
      setAttributes(ds.attributes);
      if (ds.attributes.length > 0) {
        setSelectedAttr(ds.attributes[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV");
    }
  }, []);

  // Auto-load dropped file when dialog opens
  useEffect(() => {
    if (open && droppedFile) {
      loadFile(droppedFile);
      setDroppedFile(null);
    }
  }, [open, droppedFile, loadFile, setDroppedFile]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      loadFile(file);
    },
    [loadFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".csv")) {
        loadFile(file);
      } else {
        setError("CSVファイルをドロップしてください");
      }
    },
    [loadFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

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
          className="sr-only"
        />
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`mb-1 flex w-full cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed px-3 py-4 text-sm transition-colors ${
            dragging
              ? "border-primary bg-primary/5 text-primary"
              : "border-border bg-surface text-foreground hover:border-primary hover:text-primary"
          }`}
        >
          {fileName ? (
            <span>{fileName} を選択中</span>
          ) : (
            <>
              <span>ファイル選択またはドラッグ&ドロップ</span>
            </>
          )}
        </div>

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
