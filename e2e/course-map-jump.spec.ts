import { expect, test } from "@playwright/test";

test("home page jumps straight to the chosen unit on the course map", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("kids-code-tutorial-step", "3"),
  );
  await page.goto("/");

  const card = page
    .locator(".task-challenges button")
    .filter({ hasText: "数据小侦探" });
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await page.waitForURL(/\/learn#chapter-7$/);

  const target = page.locator("#chapter-7");
  await expect(target).toBeVisible();
  // The viewport lands on the chosen unit instead of staying at the page top.
  await expect
    .poll(async () => (await target.boundingBox())!.y, { timeout: 8000 })
    .toBeLessThan(300);
  // The target unit flashes briefly so kids can see where they landed.
  await expect(page.locator(".course-chapter-target")).toHaveCount(1);
  await expect(page.locator(".course-chapter-target")).toHaveCount(0, {
    timeout: 5_000,
  });
});

test("the course map CTA lands on the unit the kid is working on", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("kids-code-tutorial-step", "3"),
  );
  await page.goto("/");
  await page.getByRole("button", { name: /查看课程地图/ }).click();
  await page.waitForURL(/\/learn#chapter-1$/);

  const target = page.locator("#chapter-1");
  await expect(target).toBeVisible();
  await expect
    .poll(async () => (await target.boundingBox())!.y, { timeout: 8000 })
    .toBeLessThan(300);
});
