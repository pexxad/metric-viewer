import { useEffect, useRef } from "react";
import type {
  IChartApi,
  ISeriesApi,
  SeriesType,
  MouseEventParams,
  Time,
} from "lightweight-charts";
import { useDatasetStore } from "@/stores/datasetStore";
import { useUiStore } from "@/stores/uiStore";
import { useLabelStore } from "@/stores/labelStore";
import { getColor } from "@/core/chart/colors";

/**
 * Subscribe to crosshair move on the chart and update tooltip state.
 */
export function useChartTooltip(
  chartRef: React.RefObject<IChartApi | null>,
  seriesMapRef: React.RefObject<Map<string, ISeriesApi<SeriesType>>>,
) {
  const panels = useDatasetStore((s) => s.panels);
  const datasets = useDatasetStore((s) => s.datasets);
  const setTooltipData = useUiStore((s) => s.setTooltipData);
  const resolveLabel = useLabelStore((s) => s.resolve);

  // Keep latest values in refs to avoid re-subscribing on every change
  const panelsRef = useRef(panels);
  const datasetsRef = useRef(datasets);
  const resolveRef = useRef(resolveLabel);
  panelsRef.current = panels;
  datasetsRef.current = datasets;
  resolveRef.current = resolveLabel;

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const handler = (param: MouseEventParams<Time>) => {
      if (!param.time || !param.seriesData?.size || !param.point) {
        setTooltipData(null);
        return;
      }

      const values: { color: string; label: string; value: number }[] = [];
      for (const panel of panelsRef.current) {
        if (!panel.visible) continue;
        const series = seriesMapRef.current.get(panel.panelId);
        if (!series) continue;
        const data = param.seriesData.get(series);
        if (data && "value" in data && typeof data.value === "number") {
          const ds = datasetsRef.current[panel.datasetId];
          const attrLabel = resolveRef.current(panel.attribute);
          const label = ds
            ? `${ds.name || ds.id} / ${attrLabel}`
            : attrLabel;
          values.push({
            color: getColor(panel.colorIndex),
            label,
            value: data.value,
          });
        }
      }

      if (values.length > 0) {
        setTooltipData({
          time: param.time as number,
          values,
          x: param.point.x,
          y: param.point.y,
        });
      } else {
        setTooltipData(null);
      }
    };

    chart.subscribeCrosshairMove(handler);
    return () => {
      chart.unsubscribeCrosshairMove(handler);
    };
  }, [chartRef, seriesMapRef, setTooltipData]);
}
