#!/usr/bin/env npx tsx
/**
 * 潮位風サンプルCSVデータ生成スクリプト
 *
 * Usage:
 *   npx tsx docs.local/generate-sample-csv.ts [options]
 *
 * Options:
 *   --interval <minutes>   データ間隔（分）。デフォルト: 10
 *   --days <days>          期間（日）。デフォルト: 60
 *   --start <ISO date>     開始日時。デフォルト: 現在から --days 日前
 *   --output <path>        出力先。デフォルト: docs.local/tidal-sample.csv
 */

import { writeFileSync } from "fs";
import { resolve } from "path";

// --- 引数パース ---
const args = process.argv.slice(2);
function getArg(name: string, fallback: string): string {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const intervalMin = Number(getArg("interval", "10"));
const days = Number(getArg("days", "60"));
const outputPath = resolve(getArg("output", "docs.local/tidal-sample.csv"));

const now = new Date();
const startDate = args.includes("--start")
  ? new Date(getArg("start", ""))
  : new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

// --- 潮位シミュレーション ---
// 実際の潮位は主に4つの分潮(M2, S2, K1, O1)の重ね合わせで近似できる
// 各分潮の周期と振幅を設定
const constituents = [
  { name: "M2", period_h: 12.4206, amplitude: 80, phase: 0 }, // 主太陰半日周潮
  { name: "S2", period_h: 12.0, amplitude: 30, phase: 0.5 }, // 主太陽半日周潮
  { name: "K1", period_h: 23.9345, amplitude: 25, phase: 1.2 }, // 日月合成日周潮
  { name: "O1", period_h: 25.8193, amplitude: 20, phase: 2.0 }, // 主太陰日周潮
];

const meanLevel = 150; // 平均潮位 (cm)

function tideHeight(date: Date): number {
  const hours = (date.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  let h = meanLevel;
  for (const c of constituents) {
    h += c.amplitude * Math.cos((2 * Math.PI * hours) / c.period_h + c.phase);
  }
  // わずかなノイズを加えてリアルさを出す
  h += (Math.random() - 0.5) * 4;
  return Math.round(h * 10) / 10;
}

// --- 気温シミュレーション（日周変動 + 季節変動） ---
function temperature(date: Date): number {
  const hours = (date.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  const dayOfYear =
    (date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) /
    (1000 * 60 * 60 * 24);

  // 季節変動: 夏≈28℃, 冬≈5℃
  const seasonal = 16.5 + 11.5 * Math.sin((2 * Math.PI * (dayOfYear - 80)) / 365);
  // 日周変動: 昼間は暖かく、夜は涼しい（振幅 ±5℃）
  const diurnal = 5 * Math.sin((2 * Math.PI * (hours - 6)) / 24);
  // ノイズ
  const noise = (Math.random() - 0.5) * 2;

  return Math.round((seasonal + diurnal + noise) * 10) / 10;
}

// --- CSV生成 ---
const rows: string[] = ["time,潮位(cm),気温(℃)"];
const intervalMs = intervalMin * 60 * 1000;
const endTime = startDate.getTime() + days * 24 * 60 * 60 * 1000;

let t = startDate.getTime();
while (t <= endTime) {
  const date = new Date(t);
  const iso = date.toISOString().replace(/\.\d{3}Z$/, ""); // 2026-01-15T08:30:00
  rows.push(`${iso},${tideHeight(date)},${temperature(date)}`);
  t += intervalMs;
}

writeFileSync(outputPath, rows.join("\n") + "\n", "utf-8");

const totalRows = rows.length - 1;
console.log(`Generated ${totalRows} rows (${days} days, ${intervalMin}min interval)`);
console.log(`  Period: ${startDate.toISOString().slice(0, 16)} ~ ${new Date(endTime).toISOString().slice(0, 16)}`);
console.log(`  Output: ${outputPath}`);
