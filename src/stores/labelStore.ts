import { create } from "zustand";
import yaml from "js-yaml";

interface LabelState {
  /** 英語名 → 表示名 の辞書 */
  labels: Record<string, string>;
  /** 選択肢に表示しないカラム名 */
  excludes: Set<string>;
  loaded: boolean;
  /** 辞書を読み込む（public/labels.yaml） */
  loadLabels: () => Promise<void>;
  /** 英語名を表示名に変換。辞書に無ければそのまま返す */
  resolve: (key: string) => string;
  /** カラム名が除外対象か判定 */
  isExcluded: (key: string) => boolean;
  /** カラム名リストから除外対象を取り除く */
  filterAttributes: (attrs: string[]) => string[];
}

export const useLabelStore = create<LabelState>((set, get) => ({
  labels: {},
  excludes: new Set(),
  loaded: false,

  loadLabels: async () => {
    if (get().loaded) return;
    try {
      const res = await fetch("/labels.yaml");
      if (!res.ok) {
        set({ loaded: true });
        return;
      }
      const text = await res.text();
      const parsed = yaml.load(text) as Record<string, unknown> | null;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        // labels セクション
        const labels: Record<string, string> = {};
        const labelsObj = parsed.labels;
        if (labelsObj && typeof labelsObj === "object" && !Array.isArray(labelsObj)) {
          for (const [k, v] of Object.entries(labelsObj)) {
            if (typeof v === "string") labels[k] = v;
          }
        }
        // exclude セクション
        const excludes = new Set<string>();
        const excludeArr = parsed.exclude;
        if (Array.isArray(excludeArr)) {
          for (const item of excludeArr) {
            if (typeof item === "string") excludes.add(item);
          }
        }
        set({ labels, excludes, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  resolve: (key: string) => {
    const label = get().labels[key];
    return label ? `${label} (${key})` : key;
  },

  isExcluded: (key: string) => get().excludes.has(key),

  filterAttributes: (attrs: string[]) => {
    const ex = get().excludes;
    return ex.size === 0 ? attrs : attrs.filter((a) => !ex.has(a));
  },
}));
