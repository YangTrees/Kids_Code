import { expect, test } from "@playwright/test";

test("opens the course map and resumes the current level", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("kids-code-tutorial-step", "3"),
  );
  await page.goto("./");
  await page.getByRole("button", { name: "▶ 开始学习" }).click();
  await expect(page).toHaveURL(/\/learn$/);
  await expect(
    page.getByRole("heading", { name: "小小程序员的冒险地图" }),
  ).toBeVisible();
  await expect(page.locator(".course-chapter")).toHaveCount(10);
  await expect(page.locator(".course-level")).toHaveCount(64);
  await expect(page.locator(".course-level").first()).toBeEnabled();
  await expect(page.locator(".course-level").nth(1)).toBeDisabled();

  await page.getByRole("button", { name: /开始第一关/ }).click();
  await expect(page).toHaveURL(/\/editor\/prj_/);
  const firstProjectUrl = page.url();
  await expect(page.getByLabel("当前挑战")).toContainText("让栗奇说话");
  await page.getByRole("button", { name: "返回课程地图" }).click();
  await expect(page).toHaveURL(/\/learn$/);
  await page.getByRole("button", { name: /继续学习/ }).click();
  await expect(page).toHaveURL(firstProjectUrl);
});

test("opens the independent fixed-path challenge and draws its stage", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("kids-code-tutorial-step", "3"),
  );
  await page.goto("./learn");
  const pathChapter = page.locator(".course-chapter").nth(4);
  await expect(pathChapter).toContainText("路线挑战");
  await expect(pathChapter.locator(".course-level").first()).toBeEnabled();
  await expect(pathChapter.locator(".course-level").nth(1)).toBeDisabled();
  await pathChapter.locator(".course-level").first().click();
  await expect(page).toHaveURL(/\/editor\/prj_/);
  await expect(page.getByLabel("当前挑战")).toContainText("走过小木桥");
  await expect(page.locator(".pixi-stage-canvas")).toBeVisible();
  await expect(page.locator(".blocklySvg")).toBeVisible();
  await page.screenshot({ path: "artifacts/path-challenge.png" });
});

test("opens the new sky-island unit with its dedicated map and goals", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("kids-code-tutorial-step", "3"),
  );
  await page.goto("./learn");
  const skyChapter = page.locator(".course-chapter").nth(5);
  await expect(skyChapter).toContainText("云岛远征");
  await expect(skyChapter.locator(".course-level")).toHaveCount(4);
  await expect(skyChapter.locator(".course-level").first()).toBeEnabled();
  await expect(skyChapter.locator(".course-level").nth(1)).toBeDisabled();
  await skyChapter.locator(".course-level").first().click();
  await expect(page.getByLabel("当前挑战")).toContainText("经过紫色路标");
  await expect(page.locator(".pixi-stage-canvas")).toBeVisible();
  await page.screenshot({ path: "artifacts/sky-islands-challenge.png" });
});

test("opens a clean challenge project from a free template", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("kids-code-tutorial-step", "3");
    localStorage.setItem(
      "kids-code:completed-tasks",
      JSON.stringify([
        "speak",
        "move",
        "sequence",
        "turn",
        "diagonal",
        "repeat",
        "collision",
        "collision_sound",
        "touch_end",
      ]),
    );
  });
  await page.goto("./");
  await page
    .getByRole("button", { name: /收集金币/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/editor\/prj_/);
  const freeProjectUrl = page.url();
  await expect(page.locator(".pixi-stage-canvas")).toBeVisible();

  await page.getByRole("button", { name: "打开创作任务" }).click();
  await page.getByRole("button", { name: /收集金币/ }).click();
  await expect(page).not.toHaveURL(freeProjectUrl);
  await expect(page.getByLabel("当前挑战")).toContainText("收集金币");
  await expect(page.getByLabel("工作区状态")).toContainText("当前 0");
});

test("runs and replays the free coin template", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("kids-code-tutorial-step", "3"),
  );
  await page.goto("./");
  await page
    .getByRole("button", { name: /收集金币/ })
    .first()
    .click();
  await page.getByRole("button", { name: "运行作品" }).first().click();
  await page.waitForTimeout(2_200);
  await expect(page.locator(".stop-button")).toBeEnabled();

  const canvas = await page.locator(".pixi-stage-canvas").boundingBox();
  expect(canvas).not.toBeNull();
  await page.mouse.click(
    canvas!.x + (340 / 480) * canvas!.width,
    canvas!.y + (180 / 360) * canvas!.height,
  );

  await expect(page.locator(".runtime-status")).toHaveText("运行完成");
  await expect(page.getByRole("dialog", { name: "任务完成！" })).toBeHidden();

  await expect(page.getByText("已保存")).toBeVisible({ timeout: 5_000 });
  await page.reload();
  await expect(page.locator(".pixi-stage-canvas")).toBeVisible();
  await expect(page.locator(".blocklySvg")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "任务完成！" })).toBeHidden();

  await page.getByRole("button", { name: "运行作品" }).click();
  await page.waitForTimeout(2_200);
  const replayCanvas = (await page
    .locator(".pixi-stage-canvas")
    .boundingBox())!;
  await page.mouse.click(
    replayCanvas.x + (340 / 480) * replayCanvas.width,
    replayCanvas.y + (180 / 360) * replayCanvas.height,
  );
  await expect(page.locator(".runtime-status")).toHaveText("运行完成");
  await expect(page.getByRole("dialog", { name: "任务完成！" })).toBeHidden();
});

test("moves one visible grid per key, stops at the treasure, and restores the starting position", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("kids-code-tutorial-step", "3"),
  );
  await page.goto("./");
  await page
    .getByRole("button", { name: /寻找宝箱/ })
    .first()
    .click();
  await expect(page.locator(".pixi-stage-canvas")).toBeVisible();
  await expect(page.locator(".stage-ruler")).toContainText("1 格 = 40 像素");
  await page.getByRole("button", { name: "运行作品" }).click();
  await expect(page.locator(".runtime-status")).toHaveText("运行中");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("工作区状态")).toContainText("X 3 · Y 7");
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(320);
  }
  await expect(page.locator(".runtime-status")).toHaveText("运行完成");
  const position = await page.getByLabel("工作区状态").textContent();
  const x = Number(position?.match(/X (\d+)/)?.[1]);
  expect(x).toBeGreaterThan(7);
  expect(x).toBeLessThan(11);
  await page.locator(".stop-button").click();
  await expect(page.getByLabel("工作区状态")).toContainText("X 2 · Y 7");
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
  await page.goto("./");
  await page
    .getByRole("button", { name: /寻找宝箱/ })
    .first()
    .click();
  await expect(page.locator(".pixi-stage-canvas")).toBeVisible();
  const canvas = (await page.locator(".pixi-stage-canvas").boundingBox())!;
  await page.mouse.move(
    canvas.x + (100 / 480) * canvas.width,
    canvas.y + (300 / 360) * canvas.height,
  );
  await page.mouse.down();
  await page.mouse.move(
    canvas.x + (180 / 480) * canvas.width,
    canvas.y + (300 / 360) * canvas.height,
    { steps: 10 },
  );
  await page.mouse.up();
  await expect(page.getByLabel("工作区状态")).toContainText("X 4 · Y 7");
  await expect(page.locator(".save-state")).toContainText("已保存");
  await page.getByRole("button", { name: "运行作品" }).click();
  await expect(page.locator(".runtime-status")).toHaveText("运行中");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("工作区状态")).toContainText("X 5 · Y 7");
  await page.locator(".stop-button").click();
  await expect(page.getByLabel("工作区状态")).toContainText("X 4 · Y 7");
  await page.reload();
  await expect(page.getByLabel("工作区状态")).toContainText("X 4 · Y 7");
});

test("captures and displays a project thumbnail", async ({ page }) => {
  await page.goto("./");
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
