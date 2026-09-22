import { expect, test } from "@playwright/test";

test("runs the coin template, accepts play clicks, and verifies the task", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("kids-code-tutorial-step", "3");
    localStorage.setItem(
      "kids-code:completed-tasks",
      JSON.stringify(["speak", "move", "turn", "repeat", "collision"]),
    );
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: /收集金币/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/editor\/prj_/);
  await expect(page.locator(".pixi-stage-canvas")).toBeVisible();

  await page.getByRole("button", { name: "打开创作任务" }).click();
  await page.getByRole("button", { name: /收集金币/ }).click();
  await page.getByRole("button", { name: "关闭任务" }).click();

  await page.getByRole("button", { name: "运行作品" }).first().click();
  await page.waitForTimeout(2_200);
  await expect(page.locator(".stop-button")).toBeEnabled();

  const canvas = await page.locator(".pixi-stage-canvas").boundingBox();
  expect(canvas).not.toBeNull();
  await page.mouse.click(
    canvas!.x + (320 / 480) * canvas!.width,
    canvas!.y + (160 / 360) * canvas!.height,
  );

  await expect(page.getByRole("dialog", { name: "任务完成！" })).toBeVisible();
  await page.getByRole("button", { name: "留在这里" }).click();
  await expect(page.getByRole("dialog", { name: "任务完成！" })).toBeHidden();

  await expect(page.getByText("已保存")).toBeVisible({ timeout: 5_000 });
  await page.reload();
  await expect(page.locator(".pixi-stage-canvas")).toBeVisible();
  await expect(page.locator(".blocklySvg")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "任务完成！" })).toBeHidden();

  // Replaying gets a new completion, then opens a clean next challenge.
  const previousUrl = page.url();
  await page.getByRole("button", { name: "运行作品" }).click();
  await page.waitForTimeout(2_200);
  const replayCanvas = (await page
    .locator(".pixi-stage-canvas")
    .boundingBox())!;
  await page.mouse.click(
    replayCanvas.x + (320 / 480) * replayCanvas.width,
    replayCanvas.y + (160 / 360) * replayCanvas.height,
  );
  await expect(page.getByRole("dialog", { name: "任务完成！" })).toBeVisible();
  await page.getByRole("button", { name: "进入下一任务" }).click();
  await expect(page).not.toHaveURL(previousUrl);
  await expect(page.getByLabel("当前挑战")).toContainText("挑战 7 / 15");
  await expect(page.getByRole("dialog", { name: "任务完成！" })).toBeHidden();
  await expect(page.getByLabel("工作区状态")).toContainText("当前 0");
});

test("moves one visible grid per key, stops at the treasure, and restores the starting position", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("kids-code-tutorial-step", "3"),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: /寻找宝箱/ })
    .first()
    .click();
  await expect(page.locator(".pixi-stage-canvas")).toBeVisible();
  await expect(page.locator(".stage-ruler")).toContainText("1 格 = 40 像素");
  await page.getByRole("button", { name: "运行作品" }).click();
  await expect(page.locator(".runtime-status")).toHaveText("运行中");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("工作区状态")).toContainText("X 120 · Y 280");
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(320);
  }
  await expect(page.locator(".runtime-status")).toHaveText("运行完成");
  const position = await page.getByLabel("工作区状态").textContent();
  const x = Number(position?.match(/X (\d+)/)?.[1]);
  expect(x).toBeGreaterThan(300);
  expect(x).toBeLessThan(400);
  await page.locator(".stop-button").click();
  await expect(page.getByLabel("工作区状态")).toContainText("X 80 · Y 280");
  await page.getByRole("button", { name: "隐藏舞台网格" }).click();
  await expect(
    page.getByRole("button", { name: "显示舞台网格" }),
  ).toBeVisible();
});

test("persists an edited template and uses its dragged position on replay", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("kids-code-tutorial-step", "3"),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: /寻找宝箱/ })
    .first()
    .click();
  await expect(page.locator(".pixi-stage-canvas")).toBeVisible();
  const canvas = (await page.locator(".pixi-stage-canvas").boundingBox())!;
  await page.mouse.move(
    canvas.x + (80 / 480) * canvas.width,
    canvas.y + (260 / 360) * canvas.height,
  );
  await page.mouse.down();
  await page.mouse.move(
    canvas.x + (160 / 480) * canvas.width,
    canvas.y + (260 / 360) * canvas.height,
    { steps: 10 },
  );
  await page.mouse.up();
  await expect(page.getByLabel("工作区状态")).toContainText("X 160 · Y 280");
  await expect(page.locator(".save-state")).toContainText("已保存");
  await page.getByRole("button", { name: "运行作品" }).click();
  await expect(page.locator(".runtime-status")).toHaveText("运行中");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("工作区状态")).toContainText("X 200 · Y 280");
  await page.locator(".stop-button").click();
  await expect(page.getByLabel("工作区状态")).toContainText("X 160 · Y 280");
  await page.reload();
  await expect(page.getByLabel("工作区状态")).toContainText("X 160 · Y 280");
});

test("captures and displays a project thumbnail", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "＋ 开始空白创作" }).click();

  await expect(page.locator(".pixi-stage-canvas")).toBeVisible();
  await expect(page.getByLabel("作品舞台")).toHaveAttribute(
    "data-thumbnail-ready",
    "true",
  );
  await page.getByRole("button", { name: "返回首页" }).click();

  const thumbnail = page.locator(".project-card img").first();
  await expect(thumbnail).toBeVisible();
  await expect.poll(() => thumbnail.getAttribute("src")).toMatch(/^blob:/);
});
