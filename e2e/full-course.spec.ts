import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
test("compiles and runs all 64 current lessons with the real Pixi stage", async ({
  page,
}, info) => {
  test.setTimeout(600_000);
  await page.goto("./learn");
  const records = await page.evaluate(async () => {
    const { runCurrentCurriculum } = await import(
      "/KidsCode/src/features/preview/" + "full-course-acceptance.ts"
    );
    return runCurrentCurriculum();
  });
  await mkdir("artifacts/full-course", { recursive: true });
  await writeFile(
    `artifacts/full-course/stage-${info.project.name}.json`,
    JSON.stringify(
      {
        viewport: info.project.use.viewport,
        scope:
          "Real StageController geometry and Blockly/RuntimeSession; accelerated time and muted audio; data board actions via public API",
        records,
      },
      null,
      2,
    ),
  );
  expect(records).toHaveLength(64);
  expect(
    records.filter((record) => !record.passed),
    JSON.stringify(records.filter((record) => !record.passed)),
  ).toEqual([]);
});

test("keeps the two classification messages distinct through real Blockly loading", async ({
  page,
}) => {
  await page.goto("./learn");
  const records = await page.evaluate(async () => {
    const { runCurrentCurriculum } = await import(
      "/KidsCode/src/features/preview/" + "full-course-acceptance.ts"
    );
    return runCurrentCurriculum(["ai_sort"]);
  });
  expect(records).toHaveLength(1);
  expect(records[0]?.passed, JSON.stringify(records)).toBe(true);
  expect(records[0]?.report?.spokenTexts).toEqual([
    "小堆",
    "小堆",
    "小堆",
    "大堆",
    "大堆",
    "大堆",
  ]);
});
