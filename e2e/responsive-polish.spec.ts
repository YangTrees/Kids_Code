import { expect, test } from "@playwright/test";

test("keeps grid scale readable and reserves touch controls for play mode", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() =>
    localStorage.setItem("kids-code-tutorial-step", "3"),
  );
  await page.goto("./editor/prj_demo_001");
  await expect(page.locator(".pixi-stage-canvas")).toBeVisible();
  const gridLabel = page.locator(".stage-ruler strong");
  await expect(gridLabel).toBeVisible();
  const box = await gridLabel.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeLessThan(30);

  if (testInfo.project.name === "ipad-landscape") {
    await expect(page.locator(".touch-dpad")).toHaveCount(0);
    await page.getByRole("button", { name: /全屏试玩/ }).click();
    await expect(page.locator(".touch-dpad")).toBeVisible();
  }
});
