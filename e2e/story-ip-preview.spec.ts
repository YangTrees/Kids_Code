import { expect, test } from "@playwright/test";

test("new artwork renders on the real stage, follows cells and preserves old course progress", async ({
  page,
}, testInfo) => {
  // Three WebGL stages plus the full artwork gallery can make PNG capture slow
  // on software-rendered desktops. Individual assertions keep their short limits.
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("design/story-ip");
  await expect(
    page.getByRole("heading", { name: "团团与点点的绘本世界" }),
  ).toBeVisible();
  await expect(
    page.locator('.story-sample-stage[data-ready="true"]'),
  ).toHaveCount(3);
  for (const host of await page.locator(".story-sample-stage").all()) {
    const hostBounds = await host.boundingBox();
    const canvasBounds = await host.locator("canvas").boundingBox();
    expect(canvasBounds!.width).toBeCloseTo(hostBounds!.width, 0);
    expect(canvasBounds!.height).toBeCloseTo(hostBounds!.height, 0);
    expect(canvasBounds!.width / canvasBounds!.height).toBeCloseTo(4 / 3, 2);
  }
  await expect(
    page.getByRole("region", { name: "完整最小素材包" }).locator("figure"),
  ).toHaveCount(13);
  await expect
    .poll(() =>
      page
        .locator(".story-ip-preview img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  const speaking = page.getByRole("article", { name: "让团团说话" });
  const before = await speaking.locator(".story-sample-position").textContent();
  await speaking.getByRole("button", { name: "向右一格", exact: true }).click();
  await expect(speaking.locator(".story-sample-position")).not.toHaveText(
    before!,
  );
  const moved = await speaking.locator(".story-sample-position").textContent();
  await speaking.getByRole("button", { name: "朝右姿态" }).click();
  await expect(
    speaking.getByRole("button", { name: "朝右姿态" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(speaking.locator(".story-sample-position")).toHaveText(moved!);
  await speaking.getByRole("button", { name: "重置" }).click();
  await expect(speaking.locator(".story-sample-position")).toHaveText(before!);

  const collision = page.getByRole("article", { name: "碰到宝箱" });
  for (let step = 0; step < 3; step++)
    await collision
      .getByRole("button", { name: "向右一格", exact: true })
      .click();
  await expect(collision.getByRole("status")).toHaveAttribute(
    "data-touching",
    "true",
  );
  await collision
    .getByRole("button", { name: "向左一格", exact: true })
    .click();
  await expect(collision.getByRole("status")).toHaveAttribute(
    "data-touching",
    "false",
  );

  const route = page.getByRole("article", { name: "拐弯找终点" });
  await route.getByRole("button", { name: "向上一格", exact: true }).click();
  await expect(route.getByRole("status")).toContainText("离开道路");
  for (let step = 0; step < 2; step++)
    await route.getByRole("button", { name: "向右一格", exact: true }).click();
  for (let step = 0; step < 2; step++)
    await route.getByRole("button", { name: "向上一格", exact: true }).click();
  await expect(route.locator(".story-sample-position")).toContainText(
    "格坐标 (5, 4)",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("kids-code:completed-tasks"),
    ),
  ).toBeNull();
  expect(errors).toEqual([]);
  await page.screenshot({
    path: `artifacts/story-ip/${testInfo.project.name}.png`,
    fullPage: true,
  });
});
