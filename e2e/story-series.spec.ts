import { expect, test } from "@playwright/test";
import { openPilot } from "./teaching-helpers";

test("shows one coherent story series across home, ten units and late-lesson hints", async ({
  page,
}, info) => {
  await page.goto("./");
  await expect(page.locator(".story-home-hero img").first()).toBeVisible();
  for (const button of await page.locator(".hero-actions button").all())
    await expect(button).toHaveCSS("white-space", "nowrap");
  await page.screenshot({
    path: `artifacts/full-course/home-${info.project.name}.png`,
  });
  await page.goto("./learn");
  await expect(page.locator(".course-chapter")).toHaveCount(10);
  const images = page.locator(".course-chapter header img");
  await expect(images).toHaveCount(10);
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate((element) => (element as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
  }
  const sources = await images.evaluateAll((elements) =>
    elements.map((element) => (element as HTMLImageElement).src),
  );
  expect(new Set(sources).size).toBe(10);
  expect(sources.every((source) => source.includes("/ui/story-ip/"))).toBe(
    true,
  );
  await page.locator(".course-chapter").last().scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `artifacts/full-course/course-late-${info.project.name}.png`,
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `artifacts/full-course/course-${info.project.name}.png`,
  });
  await openPilot(page, "ai_sort");
  await expect(page.locator(".lesson-role-picker")).toBeVisible();
  await page.getByRole("button", { name: "打开创作任务" }).click();
  await page.getByRole("button", { name: "给我一个提示", exact: true }).click();
  await page.getByRole("button", { name: "再提示一点", exact: true }).click();
  await page.getByRole("button", { name: "再提示一点", exact: true }).click();
  const guide = page.locator(".real-block-guide");
  await expect(guide.locator(".blocklySvg")).toBeVisible();
  await expect(guide).toContainText("大堆");
  await expect(guide).toContainText("小堆");
  for (const label of await guide.locator(".blocklyDropdownText").all())
    await expect(label).not.toHaveText(/^msg_/);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: `artifacts/full-course/late-hint-${info.project.name}.png`,
  });
  await page.getByRole("button", { name: "关闭任务" }).click();
  await page.screenshot({
    path: `artifacts/full-course/late-editor-${info.project.name}.png`,
  });
});
