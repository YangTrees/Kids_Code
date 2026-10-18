import { expect, test } from "@playwright/test";

test("handbook keeps all units navigable and lessons playable", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() =>
    localStorage.setItem("kids-code-tutorial-step", "3"),
  );
  await page.goto("./learn");
  await expect(
    page.getByRole("heading", { name: "好奇心的编程旅行" }),
  ).toBeVisible();
  const units = page.getByRole("navigation", { name: "单元导航" });
  await expect(units.getByRole("link")).toHaveCount(10);
  await expect(page.locator(".course-level")).toHaveCount(64);
  await expect(page.locator(".course-level").first()).toBeEnabled();
  await expect(page.locator(".course-level").nth(1)).toBeDisabled();
  await expect(page.locator(".course-level").nth(1)).toHaveCSS("opacity", "1");
  await expect(page.locator(".course-level-copy > strong").first()).toHaveCSS(
    "font-size",
    "16px",
  );
  await expect(page.locator(".course-progress progress")).toHaveAttribute(
    "value",
    "0",
  );
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: `artifacts/course-design/overview-${testInfo.project.name}.png`,
  });
  await units.getByRole("link", { name: /AI 小创客/ }).click();
  await expect(page).toHaveURL(/#chapter-10$/);
  await expect(page.locator("#chapter-10 h2")).toBeInViewport();
  await expect
    .poll(() =>
      page
        .locator("#chapter-10")
        .evaluate((el) => el.getBoundingClientRect().top),
    )
    .toBeLessThan(135);
  await page.screenshot({
    path: `artifacts/course-design/late-unit-${testInfo.project.name}.png`,
  });
  await units.getByRole("link", { name: /路线挑战/ }).click();
  await expect(page.locator("#chapter-5 h2")).toBeInViewport();
  await page.locator("#chapter-5 .course-level").first().click();
  await expect(page).toHaveURL(/\/editor\/prj_/);
  await expect(page.locator(".blocklySvg").first()).toBeVisible();
});

test("completed IDs show progress without inventing a star rating", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "kids-code:completed-tasks",
      JSON.stringify(["speak", "move"]),
    );
    localStorage.setItem(
      "kids-code:settings",
      JSON.stringify({ reduceMotion: true }),
    );
  });
  await page.goto("./learn");
  await expect(page.locator(".course-level[data-state=done]")).toHaveCount(2);
  await expect(page.locator(".course-level").first()).toContainText(
    "已完成 · 再试一次",
  );
  await expect(page.locator(".course-level").first()).not.toContainText("星");
  await expect(
    page.locator(".course-level[data-state=current] .course-level-index"),
  ).toHaveText("03");
  await expect(page.locator(".course-progress progress")).toHaveAttribute(
    "value",
    "2",
  );
  await page.screenshot({
    path: `artifacts/course-design/progress-${testInfo.project.name}.png`,
  });
});

test("narrow handbook has navigable units without horizontal page overflow", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./learn");
  await expect(page.locator(".course-level")).toHaveCount(64);
  await expect(page.locator(".course-level").first()).toBeEnabled();
  await expect(page.locator(".course-level-copy > strong").first()).toHaveCSS(
    "font-size",
    "16px",
  );
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: `artifacts/course-design/narrow-${testInfo.project.name}.png`,
  });
  await page
    .getByRole("navigation", { name: "单元导航" })
    .getByRole("link", { name: /数据小侦探/ })
    .click();
  await expect(page.locator("#chapter-7 h2")).toBeInViewport();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
});
