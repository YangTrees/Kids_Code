import { expect, test } from "@playwright/test";
import { BLOCK_PALETTE } from "../packages/block-adapter/src/teaching";

test("programming palette matches the editor without changing course entry", async ({
  page,
}, info) => {
  await page.addInitScript(() =>
    localStorage.setItem("kids-code-tutorial-step", "3"),
  );
  await page.goto("./learn");
  const demo = page.locator(".course-intro .program-example");
  await expect(demo.locator(".program-display-block")).toHaveCount(3);
  await expect(demo.getByRole("img", { name: /非可拖动工作区/ })).toBeVisible();
  await expect(demo.locator("button, input, select")).toHaveCount(0);
  const legend = page.getByRole("group", { name: "积木配色图例" });
  await expect(legend.locator(".program-category")).toHaveCount(8);
  for (const [category, color] of Object.entries(BLOCK_PALETTE)) {
    if (category === "condition") continue;
    await expect(legend.locator(`[data-category=${category}]`)).toHaveCSS(
      "--block-color",
      color,
    );
  }
  await expect(page.locator(".course-level")).toHaveCount(64);
  await expect(page.locator(".course-level").first()).toHaveAttribute(
    "data-block-category",
    "looks",
  );
  await expect(page.locator(".course-level").nth(1)).toHaveAttribute(
    "data-block-category",
    "motion",
  );
  await page.screenshot({
    path: `artifacts/programming-theme/course-${info.project.name}.png`,
  });
  await page.locator("#chapter-1").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `artifacts/programming-theme/lessons-${info.project.name}.png`,
  });
  await page.locator(".course-level").first().click();
  await expect(page).toHaveURL(/\/editor\/prj_/);
  await expect(page.locator(".blocklySvg").first()).toBeVisible();
});

test("home and narrow course keep illustrations, block motifs and readable layouts", async ({
  page,
}, info) => {
  for (const width of [info.project.use.viewport!.width, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("./");
    await expect(
      page.locator(".home-program-example .program-display-block"),
    ).toHaveCount(3);
    await expect(page.locator(".story-home-hero > img")).toBeVisible();
    await expect(
      page.locator(".task-challenges button > .program-categories"),
    ).toHaveCount(10);
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: `artifacts/programming-theme/home-${info.project.name}-${width}.png`,
    });
    await page.goto("./learn");
    await expect(page.locator(".course-level").first()).toBeEnabled();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: `artifacts/programming-theme/course-${info.project.name}-${width}.png`,
    });
    await page.locator("#chapter-1 h2").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `artifacts/programming-theme/lessons-${info.project.name}-${width}.png`,
    });
  }
});
