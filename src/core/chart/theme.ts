import type { ChartOptions, DeepPartial } from "lightweight-charts";

export const CHART_THEME: DeepPartial<ChartOptions> = {
  layout: {
    background: { color: "#ffffff" },
    textColor: "#333",
    attributionLogo: false,
  },
  grid: {
    vertLines: { color: "#f0f0f0" },
    horzLines: { color: "#f0f0f0" },
  },
  crosshair: {
    mode: 0, // Normal
  },
  rightPriceScale: {
    borderColor: "#e0e0e0",
  },
  leftPriceScale: {
    visible: true,
    borderColor: "#e0e0e0",
  },
  timeScale: {
    borderColor: "#e0e0e0",
    timeVisible: true,
    minBarSpacing: 0.001,
    fixLeftEdge: true,
    fixRightEdge: true,
    tickMarkFormatter: (time: number, tickMarkType: number) => {
      const d = new Date(time * 1000);
      const md = `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
      // tickMarkType: 0=Year, 1=Month, 2=DayOfMonth, 3=Time, 4=TimeWithSeconds
      if (tickMarkType >= 3) {
        const hh = String(d.getUTCHours()).padStart(2, "0");
        const mm = String(d.getUTCMinutes()).padStart(2, "0");
        return `${md} ${hh}:${mm}`;
      }
      return md;
    },
  },
} as const;

export const SERIES_DEFAULTS = {
  lineWidth: 2 as const,
  lineType: 0 as const, // LineType.Simple
  crosshairMarkerVisible: true,
  crosshairMarkerRadius: 5,
  pointMarkersVisible: true,
  pointMarkersRadius: 4,
} as const;
