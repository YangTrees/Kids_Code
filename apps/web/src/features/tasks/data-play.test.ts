import type { RuntimeReport } from "@kids-code/runtime";
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearChartSelection,
  expectedSortBin,
  getChartValues,
  getDataPlayProgress,
  hasCorrectChartSeries,
  isSortComplete,
  placeSortCard,
  resetSortCards,
  selectChartBar,
} from "./data-play";

describe("data lesson interaction progress", () => {
  beforeEach(() => localStorage.clear());

  it("accepts only correct bins and keeps sorting isolated by project", () => {
    const first = "sort-first";
    const second = "sort-second";
    expect(placeSortCard(first, 4, "small")).toBe(false);
    expect(getDataPlayProgress(first).sortAssignments).toEqual({});
    for (let value = 1; value <= 6; value++)
      expect(placeSortCard(first, value, expectedSortBin(value))).toBe(true);
    expect(isSortComplete(getDataPlayProgress(first).sortAssignments)).toBe(
      true,
    );
    expect(isSortComplete(getDataPlayProgress(second).sortAssignments)).toBe(
      false,
    );
    expect(
      JSON.parse(localStorage.getItem("kids-code:data-play:" + first)!),
    ).toEqual(getDataPlayProgress(first).sortAssignments);
    resetSortCards(first);
    expect(getDataPlayProgress(first).sortAssignments).toEqual({});
  });

  it("reads the five latest observations and clears a previous chart answer", () => {
    const report = {
      variableHistory: { var_1: [0, 0, 1, 2, 3, 4, 5] },
    } as unknown as RuntimeReport;
    expect(getChartValues(report)).toEqual([1, 2, 3, 4, 5]);
    expect(hasCorrectChartSeries(report)).toBe(true);
    expect(
      hasCorrectChartSeries({
        variableHistory: { var_1: [0, 2, 4, 6, 8, 10] },
      } as unknown as RuntimeReport),
    ).toBe(false);
    selectChartBar("chart-first", 4, 2);
    expect(getDataPlayProgress("chart-first").chartSelection).toBe(4);
    clearChartSelection("chart-first");
    expect(getDataPlayProgress("chart-first").chartSelection).toBeNull();
  });
});
