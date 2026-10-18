import { expect, test } from "@playwright/test";

test("right-clicking blocks opens the copy/delete menu", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("kids-code-tutorial-step", "3"),
  );
  await page.goto("./");
  await page.getByRole("button", { name: "开始空白创作" }).click();
  await page.waitForURL(/\/editor\/prj_/);
  await expect(page.locator(".blocklySvg")).toBeVisible();

  const canvas = page.locator(".blocklyBlockCanvas").first();
  const blockCount = () => canvas.locator("g[data-id]").count();
  const blockPaths = canvas.locator("g[data-id] path.blocklyPath");
  const menu = page.locator(".block-context-menu");
  await expect(blockPaths.first()).toBeAttached();

  const initial = await blockCount();

  // Right-click the top block: the menu offers copy and delete.
  await blockPaths.first().click({ button: "right", force: true });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: /复制/ })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: /删除/ })).toBeVisible();

  // Copy duplicates the block together with the stack below it.
  await menu.getByRole("menuitem", { name: /复制/ }).click();
  await expect(menu).toBeHidden();
  await expect.poll(blockCount).toBeGreaterThan(initial);
  const afterCopy = await blockCount();

  // Delete removes the block again.
  await blockPaths.first().click({ button: "right", force: true });
  await expect(menu).toBeVisible();
  await menu.getByRole("menuitem", { name: /删除/ }).click();
  await expect(menu).toBeHidden();
  await expect.poll(blockCount).toBeLessThan(afterCopy);

  // Right-clicking empty space offers tidy-up, Escape dismisses the menu.
  // Copied stacks can cover a fixed coordinate on compact layouts. Find a
  // genuinely exposed background point, then exercise a real mouse gesture.
  const emptyPoint = await page.locator(".blocklySvg").evaluate((svg) => {
    const bounds = svg.getBoundingClientRect();
    for (let y = bounds.bottom - 60; y > bounds.top + 30; y -= 30) {
      for (let x = bounds.right - 60; x > bounds.left + 30; x -= 30) {
        if (
          document
            .elementFromPoint(x, y)
            ?.classList.contains("blocklyMainBackground")
        ) {
          return { x, y };
        }
      }
    }
    return null;
  });
  expect(emptyPoint).not.toBeNull();
  await page.mouse.click(emptyPoint!.x, emptyPoint!.y, { button: "right" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "整理积木" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
});
