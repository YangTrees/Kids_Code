import { test, expect } from "@playwright/test";
import { openPilot, runPilot } from "./teaching-helpers";
test("opens the single current course, saves it and replays it without an upgrade flow", async ({
  page,
}, info) => {
  const id = await openPilot(page, "speak");
  await expect(
    page.getByRole("button", { name: "新建新版 · 保留原作品", exact: true }),
  ).toHaveCount(0);
  await runPilot(page, true);
  await page.getByRole("button", { name: "留在这里", exact: true }).click();
  await expect(page.locator(".save-state")).toContainText("已保存");
  await page.reload();
  await expect(page.getByLabel("当前挑战")).toContainText("让团团说话");
  expect(page.url()).toContain(id);
  await runPilot(page, true);
  await page.screenshot({
    path: `artifacts/full-course/current-entry-${info.project.name}.png`,
  });
});
