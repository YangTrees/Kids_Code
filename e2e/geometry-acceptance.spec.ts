import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

test("checks current story geometry through real enter/exit events, scaling, hiding and scene reset", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("./learn");
  const records = await page.evaluate(async () => {
    const { runGeometryAcceptance } = await import(
      "/KidsCode/src/features/preview/" + "geometry-acceptance.ts"
    );
    return runGeometryAcceptance();
  });
  for (const record of records)
    expect(record.pass, JSON.stringify(record)).toBe(true);
  expect(records.length).toBeGreaterThanOrEqual(17);
  await mkdir("artifacts/full-course", { recursive: true });
  await writeFile(
    `artifacts/full-course/geometry-${test.info().project.name}.json`,
    JSON.stringify(records, null, 2),
  );
});
