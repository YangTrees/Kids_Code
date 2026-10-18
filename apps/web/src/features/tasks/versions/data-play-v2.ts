import type { RuntimeReport } from "@kids-code/runtime";
export type { DataPlayProgress } from "../data-play";

export function isSortComplete(assignments: Record<string, "small" | "large">) {
  return Array.from({ length: 6 }, (_, index) => index + 1).every(
    (value) => assignments[String(value)] === (value > 3 ? "large" : "small"),
  );
}
export function hasCorrectChartSeries(report: RuntimeReport | null) {
  const values = (report?.variableHistory?.var_1 ?? []).slice(1).slice(-5);
  return (
    values.length === 5 && values.every((value, index) => value === index + 1)
  );
}
