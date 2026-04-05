import type { Dataset } from "./types";

export const MOCK_API_IDS = [
  { id: "USDJPY", name: "米ドル/円" },
  { id: "EURJPY", name: "ユーロ/円" },
  { id: "GBPJPY", name: "英ポンド/円" },
];

export const MOCK_API_ATTRIBUTES = ["price", "volume", "spread"];

export function generateMockData(dataId: string, attribute: string): Dataset {
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
