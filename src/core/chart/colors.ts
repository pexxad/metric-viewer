export const PALETTE = [
  "#2196F3",
  "#FF5722",
  "#4CAF50",
  "#9C27B0",
  "#FF9800",
  "#00BCD4",
  "#E91E63",
  "#8BC34A",
  "#3F51B5",
  "#FFEB3B",
  "#795548",
  "#607D8B",
] as const;

export function getColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}
