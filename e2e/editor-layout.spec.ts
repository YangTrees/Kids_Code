import { expect, test } from "@playwright/test";
import path from "node:path";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("kids-code-tutorial-step", "3"),
  );
  await page.goto(`./editor/prj_layout_${Date.now()}`);
  await expect(page.locator(".pixi-stage-canvas")).toBeVisible();
  await expect(page.locator(".blocklySvg")).toBeVisible();
});

test("keeps the logical stage at 4:3 without stretching the workspace", async ({
  page,
}, testInfo) => {
  await page.screenshot({
    path: `artifacts/editor-${testInfo.project.name}.png`,
  });
  const frame = await page.locator(".stage-frame").boundingBox();
  const canvas = await page.locator(".pixi-stage-canvas").boundingBox();
  const workspace = await page.locator(".workspace-panel").boundingBox();
  expect(frame).not.toBeNull();
  expect(canvas).not.toBeNull();
  expect(workspace).not.toBeNull();
  expect(frame!.width / frame!.height).toBeCloseTo(4 / 3, 2);
  expect(canvas!.width / canvas!.height).toBeCloseTo(4 / 3, 2);
  const frameBorders = await page
    .locator(".stage-frame")
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        horizontal:
          Number.parseFloat(style.borderLeftWidth) +
          Number.parseFloat(style.borderRightWidth),
        vertical:
          Number.parseFloat(style.borderTopWidth) +
          Number.parseFloat(style.borderBottomWidth),
      };
    });
  expect(Math.abs(frame!.width - canvas!.width)).toBeCloseTo(
    frameBorders.horizontal,
    1,
  );
  expect(Math.abs(frame!.height - canvas!.height)).toBeCloseTo(
    frameBorders.vertical,
    1,
  );
  expect(workspace!.width).toBeGreaterThanOrEqual(300);

  const overflow = await page.locator(".editor-page").evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
});

test("shows touch-sized direction controls in immersive play", async ({
  page,
}) => {
  await page.getByRole("button", { name: "全屏试玩" }).click();
  const controls = page.locator(".touch-controls button");
  await expect(controls).toHaveCount(4);
  for (const control of await controls.all()) {
    await expect(control).toBeVisible();
    const box = await control.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

test("keeps child-friendly number menus readable without dragging blocks", async ({
  page,
}) => {
  await page.getByRole("button", { name: "⟳ 控制" }).click();
  const picker = page.locator(".kids_repeat_picker").first();
  await expect(picker).toBeVisible();

  const pickerText = picker.locator(".blocklyDropdownText");
  await expect(pickerText).toHaveText("2");
  await expect
    .poll(() =>
      pickerText.evaluate((element) => getComputedStyle(element).fill),
    )
    .toBe("rgb(41, 70, 109)");

  await pickerText.click();
  const options = page.locator(".blocklyFieldGridItem");
  await expect(options).toHaveCount(5);
  await options.filter({ hasText: "3" }).click();

  await expect(pickerText).toHaveText("3");
  await expect(page.locator(".blocklyDragging")).toHaveCount(0);
});

test("loads the P1 condition, logic, and random-number blocks", async ({
  page,
}) => {
  await page.getByRole("button", { name: "⟳ 控制" }).click();

  for (const type of [
    "kids_if",
    "kids_if_else",
    "kids_touching_condition",
    "kids_score_compare",
    "kids_logic_and",
    "kids_logic_or",
    "kids_logic_not",
    "kids_random_number",
  ]) {
    await expect(page.locator(`.${type}`)).toHaveCount(1);
  }

  await expect(
    page.locator(".kids_touching_condition .blocklyDropdownText"),
  ).not.toHaveText("栗奇");
  await expect(page.locator(".blocklyDragging")).toHaveCount(0);
});

test("creates a project variable and exposes all variable blocks", async ({
  page,
}) => {
  await page.getByRole("button", { name: "🎮 游戏" }).click();
  const createButton = page
    .locator(".blocklyFlyoutButton")
    .filter({ hasText: "创建变量" });
  await expect(createButton).toBeVisible();
  await expect(createButton).toHaveClass(/kids-create-variable-button/);
  await expect(
    createButton.locator(".blocklyFlyoutButtonBackground"),
  ).toHaveCSS("fill", "rgb(245, 138, 37)");
  await expect(
    page.locator(".kids_variable_set .blocklyPath").first(),
  ).toHaveCSS("fill", "rgb(245, 138, 37)");

  page.once("dialog", (dialog) => dialog.accept("能量"));
  await createButton.click();
  await page.getByRole("button", { name: "🎮 游戏" }).click();

  for (const type of [
    "kids_variable_set",
    "kids_variable_increase",
    "kids_variable_decrease",
    "kids_variable_show",
    "kids_variable_hide",
    "kids_variable_value",
    "kids_variable_compare",
  ]) {
    await expect(page.locator(`.${type}`)).toHaveCount(1);
  }
  await expect(
    page.locator(".kids_variable_set .blocklyDropdownText"),
  ).toHaveText("能量");
});

test("shows editor status, common shortcuts, and a grid toggle", async ({
  page,
}) => {
  await expect(page.getByLabel("工作区状态")).toContainText("X 2 · Y 7");
  await expect(page.getByLabel("工作区状态")).toContainText(/全部 \d+\/1000/);
  await expect(page.getByLabel("常用积木入口").locator("button")).toHaveCount(
    5,
  );
  for (const [name, colour] of [
    ["⚑ 事件", "rgb(244, 180, 26)"],
    ["➜ 动作", "rgb(66, 142, 244)"],
    ["✦ 外观", "rgb(138, 85, 232)"],
    ["♪ 声音", "rgb(227, 77, 145)"],
    ["⟳ 控制", "rgb(245, 138, 37)"],
    ["🎮 游戏", "rgb(69, 181, 49)"],
  ]) {
    await expect(page.getByRole("button", { name })).toHaveCSS(
      "border-bottom-color",
      colour,
    );
  }

  const gridToggle = page.getByRole("button", { name: "隐藏舞台网格" });
  await expect(gridToggle).toBeVisible();
  await gridToggle.click();
  await expect(
    page.getByRole("button", { name: "显示舞台网格" }),
  ).toBeVisible();
});

test("snaps a dragged sprite to the first and last grid cells", async ({
  page,
}) => {
  const canvas = (await page.locator(".pixi-stage-canvas").boundingBox())!;
  const point = (x: number, y: number) => ({
    x: canvas.x + (x / 480) * canvas.width,
    y: canvas.y + (y / 360) * canvas.height,
  });
  const drag = async (
    from: { x: number; y: number },
    to: { x: number; y: number },
  ) => {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 12 });
    await page.mouse.up();
  };

  await drag(point(100, 300), point(20, 20));
  await expect(page.getByLabel("工作区状态")).toContainText("X 0 · Y 0");
  await drag(point(20, 20), point(460, 340));
  await expect(page.getByLabel("工作区状态")).toContainText("X 11 · Y 8");

  await page.getByRole("button", { name: "➜ 动作" }).click();
  await expect(page.locator(".motion_gotoxy")).toContainText("列");
  await expect(page.locator(".motion_gotoxy")).toContainText("行");
});

test("steps through blocks and then continues the program", async ({
  page,
}) => {
  const stepButton = page.getByRole("button", { name: "单步运行" });
  await expect(page.getByRole("button", { name: "绿旗运行" })).toBeVisible();
  await expect(page.locator(".topbar .run-button svg")).toBeVisible();
  await expect(stepButton).toContainText("单步");
  await expect(page.getByRole("button", { name: "暂停运行" })).toHaveCount(0);
  await stepButton.click();
  await expect(page.locator(".runtime-status")).toHaveText("已暂停");
  await expect(page.getByRole("button", { name: "继续运行" })).toBeVisible();
  await expect(page.getByLabel("工作区状态")).toContainText("X 2 · Y 7");

  await stepButton.click();
  await expect(page.locator(".runtime-status")).toHaveText("已暂停");
  await expect(page.getByLabel("工作区状态")).toContainText("X 5 · Y 7");

  await page.getByRole("button", { name: "继续运行" }).click();
  await expect(page.locator(".runtime-status")).toHaveText("运行完成");
  await expect(page.getByRole("button", { name: "继续运行" })).toHaveCount(0);
});

test("shows sixty-four tasks with two open path branches", async ({ page }) => {
  await page.getByRole("button", { name: "打开创作任务" }).click();
  const tasks = page.locator(".task-panel-body > nav button");
  await expect(tasks).toHaveCount(64);
  await expect(tasks.nth(0)).toBeEnabled();
  await expect(tasks.nth(1)).toBeDisabled();
  await expect(tasks.nth(23)).toContainText("完成上一关后解锁");
  await expect(tasks.nth(24)).toBeEnabled();
  await expect(tasks.nth(25)).toBeDisabled();
  await expect(tasks.nth(28)).toBeEnabled();
  await expect(tasks.nth(29)).toBeDisabled();
  await expect(page.getByText("基础入门", { exact: true })).toBeVisible();
  const guideBlocks = page.locator(".task-block-sample");
  await expect(guideBlocks).toHaveCount(2);
  const guideColours = await guideBlocks.evaluateAll((blocks) =>
    blocks.map((block) => getComputedStyle(block).backgroundColor),
  );
  expect(new Set(guideColours).size).toBe(2);
});

test("offers complete built-in asset libraries and local image upload", async ({
  page,
}) => {
  await page.goto("./editor/prj_demo_001");
  await expect(page.getByLabel("积木脚本工作区")).toBeVisible();

  await page.getByRole("button", { name: /添加角色/ }).click();
  await expect(page.getByRole("dialog", { name: "选择角色" })).toBeVisible();
  await expect(page.locator(".library-card")).toHaveCount(12);
  await expect(
    page.getByRole("button", { name: /上传角色图片/ }),
  ).toBeVisible();
  await page
    .locator('.asset-library-dialog input[type="file"]')
    .setInputFiles(
      path.resolve(
        "apps/web/public/assets/characters/tuantuan/tuantuan-idle.png",
      ),
    );
  const uploadedSprite = page.getByRole("button", {
    name: "tuantuan-idle",
    exact: true,
  });
  await expect(uploadedSprite).toBeVisible();
  await expect(uploadedSprite.locator("img")).toHaveAttribute("src", /^blob:/);

  await page.getByRole("button", { name: "选择背景" }).click();
  await expect(
    page.getByRole("dialog", { name: "更换场景背景" }),
  ).toBeVisible();
  await expect(page.locator(".library-card")).toHaveCount(10);
  await expect(
    page.getByRole("button", { name: /上传背景图片/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "✎ 直接绘制" }).click();
  await expect(
    page.getByRole("dialog", { name: "简易绘图编辑器" }),
  ).toBeVisible();
  await expect(page.getByLabel("绘图画布")).toBeVisible();
  await page.getByRole("button", { name: "使用这幅画" }).click();
  await expect(
    page.getByRole("dialog", { name: "简易绘图编辑器" }),
  ).toBeHidden();
  await expect(page.locator(".scene-card img").first()).toHaveAttribute(
    "src",
    /^blob:/,
  );
});
