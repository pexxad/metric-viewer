"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseCsv } from "@/core/data/csvParser";
import { readCsvFile } from "@/core/data/readCsvFile";
import { useDatasetStore } from "@/stores/datasetStore";
import { useUiStore } from "@/stores/uiStore";
import { useLabelStore } from "@/stores/labelStore";
import { Modal } from "@/components/ui/Modal";

type Tab = "csv" | "api";

/* ------------------------------------------------------------------ */
/*  Mock API data                                                      */
/* ------------------------------------------------------------------ */
const MOCK_API_IDS = [
  { id: "USDJPY", name: "米ドル/円" },
  { id: "EURJPY", name: "ユーロ/円" },
  { id: "GBPJPY", name: "英ポンド/円" },
];

const MOCK_API_ATTRIBUTES = ["price", "volume", "spread"];

function generateMockData(dataId: string, attribute: string) {
  const rows = [];
  const base = dataId === "USDJPY" ? 150 : dataId === "EURJPY" ? 160 : 190;
  const now = Math.floor(Date.now() / 1000);
  const daySeconds = 86400;
  for (let i = 60; i >= 0; i--) {
    const time = now - i * daySeconds;
    const value =
      attribute === "volume"
        ? Math.round(1000 + Math.random() * 5000)
        : attribute === "spread"
          ? +(0.1 + Math.random() * 0.5).toFixed(2)
          : +(base + (Math.random() - 0.5) * 10).toFixed(2);
    rows.push({ time, [attribute]: value });
  }
  return {
    id: dataId,
    name: MOCK_API_IDS.find((m) => m.id === dataId)?.name,
    attributes: MOCK_API_ATTRIBUTES,
    rows,
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CsvImportDialog() {
  const open = useUiStore((s) => s.csvDialogOpen);
  const setCsvDialogOpen = useUiStore((s) => s.setCsvDialogOpen);
  const droppedFile = useUiStore((s) => s.droppedFile);
  const setDroppedFile = useUiStore((s) => s.setDroppedFile);
  const addDataset = useDatasetStore((s) => s.addDataset);
  const addPanel = useDatasetStore((s) => s.addPanel);
  const resolveLabel = useLabelStore((s) => s.resolve);
  const filterAttributes = useLabelStore((s) => s.filterAttributes);

  const [tab, setTab] = useState<Tab>("csv");
  const [error, setError] = useState<string | null>(null);

  // --- CSV state ---
  const [fileName, setFileName] = useState("");
  const [csvAttributes, setCsvAttributes] = useState<string[]>([]);
  const [csvSelectedAttr, setCsvSelectedAttr] = useState("");
  const [dragging, setDragging] = useState(false);
  const csvTextRef = useRef("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- API state ---
  const [apiDataId, setApiDataId] = useState(MOCK_API_IDS[0].id);
  const [apiAttr, setApiAttr] = useState(MOCK_API_ATTRIBUTES[0]);

  const reset = useCallback(() => {
    setError(null);
    setFileName("");
    setCsvAttributes([]);
    setCsvSelectedAttr("");
    setDragging(false);
    csvTextRef.current = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
    setApiDataId(MOCK_API_IDS[0].id);
    setApiAttr(MOCK_API_ATTRIBUTES[0]);
  }, []);

  // If a file was dropped externally, switch to CSV tab
  useEffect(() => {
    if (open && droppedFile) {
      setTab("csv");
      loadFile(droppedFile);
      setDroppedFile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, droppedFile]);

  const loadFile = useCallback(async (file: File) => {
    setError(null);
    try {
      const { text, fileName: name } = await readCsvFile(file);
      setFileName(name);
      csvTextRef.current = text;

      const ds = parseCsv(text, "preview");
      setCsvAttributes(ds.attributes);
      const visible = filterAttributes(ds.attributes);
      if (visible.length > 0) {
        setCsvSelectedAttr(visible[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV解析に失敗しました");
    }
  }, [filterAttributes]);

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

  const handleCsvSubmit = useCallback(() => {
    if (!csvTextRef.current || !csvSelectedAttr || !fileName) return;
    try {
      const dataId = fileName.replace(/\.csv$/i, "");
      const ds = parseCsv(csvTextRef.current, dataId);
      addDataset(ds);
      addPanel(ds.id, csvSelectedAttr);
      reset();
      setCsvDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV解析に失敗しました");
    }
  }, [fileName, csvSelectedAttr, addDataset, addPanel, reset, setCsvDialogOpen]);

  const handleApiSubmit = useCallback(() => {
    const ds = generateMockData(apiDataId, apiAttr);
    addDataset(ds);
    addPanel(ds.id, apiAttr);
    reset();
    setCsvDialogOpen(false);
  }, [apiDataId, apiAttr, addDataset, addPanel, reset, setCsvDialogOpen]);

  const handleClose = useCallback(() => {
    reset();
    setCsvDialogOpen(false);
  }, [reset, setCsvDialogOpen]);

  const canSubmitCsv = !!csvTextRef.current && !!csvSelectedAttr;
  const canSubmitApi = !!apiDataId && !!apiAttr;

  return (
    <Modal open={open} onClose={handleClose} ariaLabel="データ読み込み">
      <div className="w-[28rem] rounded-lg bg-background p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          データ読み込み
        </h2>

        {/* Tabs */}
        <div className="mb-4 flex border-b border-border">
          <button
            onClick={() => setTab("csv")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === "csv"
                ? "border-b-2 border-primary text-primary"
                : "text-muted hover:text-foreground"
            }`}
          >
            CSV読込
          </button>
          <button
            onClick={() => setTab("api")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === "api"
                ? "border-b-2 border-primary text-primary"
                : "text-muted hover:text-foreground"
            }`}
          >
            API読込
          </button>
        </div>

        {/* CSV Tab */}
        {tab === "csv" && (
          <>
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              1. CSVファイルを選択
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
              className={`mb-3 flex w-full cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed px-3 py-4 text-sm transition-colors ${
                dragging
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-surface text-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {fileName ? (
                <span>{fileName} を選択中</span>
              ) : (
                <span>ファイル選択またはドラッグ&ドロップ</span>
              )}
            </div>

            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              2. グラフ表示するパラメータを選択
            </label>
            <select
              value={csvSelectedAttr}
              onChange={(e) => setCsvSelectedAttr(e.target.value)}
              disabled={csvAttributes.length === 0}
              className="mb-3 w-full rounded border border-border bg-background px-2 py-1 text-sm text-foreground disabled:opacity-50"
            >
              {csvAttributes.length === 0 ? (
                <option value="">先にCSVファイルを選択してください</option>
              ) : (
                filterAttributes(csvAttributes).map((attr) => (
                  <option key={attr} value={attr}>
                    {resolveLabel(attr)}
                  </option>
                ))
              )}
            </select>
          </>
        )}

        {/* API Tab */}
        {tab === "api" && (
          <>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              1. データIDを選択
            </label>
            <select
              value={apiDataId}
              onChange={(e) => setApiDataId(e.target.value)}
              className="mb-3 w-full rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
            >
              {MOCK_API_IDS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.id} — {item.name}
                </option>
              ))}
            </select>

            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              2. 属性を選択
            </label>
            <select
              value={apiAttr}
              onChange={(e) => setApiAttr(e.target.value)}
              className="mb-3 w-full rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
            >
              {filterAttributes(MOCK_API_ATTRIBUTES).map((attr) => (
                <option key={attr} value={attr}>
                  {resolveLabel(attr)}
                </option>
              ))}
            </select>

            <p className="mb-3 text-xs text-muted">
              ※ 現在はモックデータを使用しています。認証実装後にAPIへ接続されます。
            </p>
          </>
        )}

        {error && <p className="mb-3 text-sm text-danger">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="rounded border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-surface"
          >
            キャンセル
          </button>
          <button
            onClick={tab === "csv" ? handleCsvSubmit : handleApiSubmit}
            disabled={tab === "csv" ? !canSubmitCsv : !canSubmitApi}
            className="rounded bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-hover disabled:opacity-50"
          >
            読み込み
          </button>
        </div>
      </div>
    </Modal>
  );
}
