import { useSyncExternalStore } from "react";
import type { RuntimeReport } from "@kids-code/runtime";

export type SortBin = "small" | "large";

export interface DataPlayProgress {
  sortAssignments: Record<string, SortBin>;
  chartSelection: number | null;
  chartRunId: number | null;
}

const STORAGE_PREFIX = "kids-code:data-play:";
const emptyProgress: DataPlayProgress = {
  sortAssignments: {},
  chartSelection: null,
  chartRunId: null,
};
const progressByProject = new Map<string, DataPlayProgress>();
const listeners = new Set<() => void>();

function readAssignments(projectId: string): Record<string, SortBin> {
  if (typeof window === "undefined") return {};
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(STORAGE_PREFIX + projectId) ?? "{}",
    ) as Record<string, unknown>;
    const assignments: Record<string, SortBin> = {};
    for (let value = 1; value <= 6; value++) {
      const bin = stored[String(value)];
      if (bin === "small" || bin === "large") assignments[String(value)] = bin;
    }
    return assignments;
  } catch {
    return {};
  }
}

export function getDataPlayProgress(projectId: string): DataPlayProgress {
  if (!projectId) return emptyProgress;
  let progress = progressByProject.get(projectId);
  if (!progress) {
    progress = {
      ...emptyProgress,
      sortAssignments: readAssignments(projectId),
    };
    progressByProject.set(projectId, progress);
  }
  return progress;
}

function updateProgress(
  projectId: string,
  update: (previous: DataPlayProgress) => DataPlayProgress,
) {
  const next = update(getDataPlayProgress(projectId));
  progressByProject.set(projectId, next);
  for (const listener of listeners) listener();
}

export function useDataPlayProgress(projectId: string): DataPlayProgress {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => getDataPlayProgress(projectId),
    () => emptyProgress,
  );
}

export function expectedSortBin(value: number): SortBin {
  return value > 3 ? "large" : "small";
}

export function isSortComplete(assignments: Record<string, SortBin>) {
  return Array.from({ length: 6 }, (_, index) => index + 1).every(
    (value) => assignments[String(value)] === expectedSortBin(value),
  );
}

export function placeSortCard(projectId: string, value: number, bin: SortBin) {
  if (!Number.isInteger(value) || value < 1 || value > 6) return false;
  if (expectedSortBin(value) !== bin) return false;
  updateProgress(projectId, (previous) => {
    const sortAssignments = {
      ...previous.sortAssignments,
      [String(value)]: bin,
    };
    try {
      window.localStorage.setItem(
        STORAGE_PREFIX + projectId,
        JSON.stringify(sortAssignments),
      );
    } catch {
      // Storage may be disabled; the board still works for this session.
    }
    return { ...previous, sortAssignments };
  });
  return true;
}

export function resetSortCards(projectId: string) {
  updateProgress(projectId, (previous) => {
    try {
      window.localStorage.removeItem(STORAGE_PREFIX + projectId);
    } catch {
      // A disabled storage backend must not prevent a reset.
    }
    return { ...previous, sortAssignments: {} };
  });
}

export function getChartValues(report: RuntimeReport | null): number[] {
  return (report?.variableHistory?.var_1 ?? []).slice(1).slice(-5);
}

export function hasCorrectChartSeries(report: RuntimeReport | null) {
  const values = getChartValues(report);
  return (
    values.length === 5 && values.every((value, index) => value === index + 1)
  );
}

export function selectChartBar(
  projectId: string,
  index: number,
  runId: number,
) {
  updateProgress(projectId, (previous) => ({
    ...previous,
    chartSelection: index,
    chartRunId: runId,
  }));
}

export function clearChartSelection(projectId: string) {
  updateProgress(projectId, (previous) => ({
    ...previous,
    chartSelection: null,
    chartRunId: null,
  }));
}
