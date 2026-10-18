import { expect, test } from "@playwright/test";
import { openPilot, runPilot } from "./teaching-helpers";

test("shows earned star icons and saves the lesson before using next/previous navigation", async ({
  page,
}) => {
  await openPilot(page, "speak");
  const navigation = page.getByRole("navigation", { name: "课程前后导航" });
  await expect(page.locator(".project-title small")).toContainText("第 1 课");
  await expect(
    navigation.getByRole("button", { name: /下一课/ }),
  ).toBeDisabled();
  await runPilot(page, true);
  await page.getByRole("button", { name: "留在这里", exact: true }).click();
  await expect(
    navigation.getByRole("button", { name: /下一课/ }),
  ).toBeEnabled();
  await navigation.getByRole("button", { name: /下一课/ }).click();
  await expect(page.locator(".project-title small")).toContainText("第 2 课");
  await page
    .getByRole("navigation", { name: "课程前后导航" })
    .getByRole("button", { name: /上一课/ })
    .click();
  await expect(page.locator(".project-title small")).toContainText("第 1 课");
  await expect(
    page
      .locator(".block-workspace-host .blocklyText")
      .filter({ hasText: "你好，我是团团" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "返回课程地图", exact: true }).click();
  const first = page.locator(".course-level").first();
  await expect(first.locator(".lesson-stars svg")).toHaveCount(3);
  await expect(
    first.locator('.lesson-stars svg[data-earned="true"]'),
  ).toHaveCount(3);
  await expect(first).not.toContainText(/\d 星/);
});

test("selects sound fields in the workspace and flyout without starting a block drag", async ({
  page,
}) => {
  await openPilot(page, "sound");
  const fieldId = await page.evaluate(async () => {
    const { useEditorStore } = await import(
      "/KidsCode/src/features/preview/" + "pilot-store.ts"
    );
    const state = useEditorStore.getState();
    const find = (value: unknown): string | null => {
      if (!value || typeof value !== "object") return null;
      const block = value as Record<string, unknown>;
      if (block.type === "kids_sound_menu") return block.id as string;
      for (const child of Object.values(block)) {
        const result = find(child);
        if (result) return result;
      }
      return null;
    };
    return find(
      state.project.workspaceStates[state.project.course.bindings.actor],
    );
  });
  const field = page
    .locator(
      `.block-workspace-host .blocklyBlockCanvas [data-id="${fieldId}"] .blocklyText`,
    )
    .first();
  await field.click();
  const dialog = page.getByRole("dialog", { name: "选择声音", exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "铃铛", exact: true }).click();
  await dialog.getByRole("button", { name: "确定", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".blocklyDragging")).toHaveCount(0);
  await expect(field).toHaveText("铃铛");
  await page.locator(".category-button.category-sound").click();
  const flyoutField = page
    .locator(".blocklyFlyout .blocklyText")
    .filter({ hasText: /按钮|你好/ })
    .first();
  await flyoutField.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "魔法", exact: true }).click();
  await dialog.getByRole("button", { name: "确定", exact: true }).click();
  await expect(page.locator(".blocklyDragging")).toHaveCount(0);
  const before = await page.evaluate(async () => {
    const { useEditorStore } = await import(
      "/KidsCode/src/features/preview/" + "pilot-store.ts"
    );
    const state = useEditorStore.getState();
    return (
      JSON.stringify(state.project.workspaceStates).match(
        /"type":"sound_play"/g,
      )?.length ?? 0
    );
  });
  const source = page
    .locator(".blocklyFlyout .blocklyDraggable")
    .filter({
      has: page.locator(".blocklyText").filter({ hasText: /^播放声音$/ }),
    })
    .first();
  const sourceBox = (await source.boundingBox())!;
  const workspace = (await page
    .locator(".block-workspace-host")
    .boundingBox())!;
  await page.mouse.move(sourceBox.x + 24, sourceBox.y + 16);
  await page.mouse.down();
  await page.mouse.move(
    workspace.x + workspace.width - 140,
    workspace.y + 220,
    { steps: 18 },
  );
  await page.mouse.up();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { useEditorStore } = await import(
          "/KidsCode/src/features/preview/" + "pilot-store.ts"
        );
        return (
          JSON.stringify(
            useEditorStore.getState().project.workspaceStates,
          ).match(/"type":"sound_play"/g)?.length ?? 0
        );
      }),
    )
    .toBe(before + 1);
  await expect(page.locator(".blocklyDragging")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "绿旗运行", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "绿旗运行", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "停止运行", exact: true }),
  ).toBeEnabled();
});

test("shows arrow keys and keeps lesson 19 visibly running while waiting for input", async ({
  page,
}) => {
  await openPilot(page, "keyboard");
  await expect(page.locator(".project-title small")).toContainText("第 19 课");
  await expect(
    page
      .locator(".block-workspace-host .blocklyBlockCanvas .blocklyText")
      .filter({ hasText: /^→$/ }),
  ).toBeVisible();
  const run = page.getByRole("button", { name: "绿旗运行", exact: true });
  await run.click();
  await expect(run).toHaveText("运行中");
  await expect(run).toBeDisabled();
  await expect(page.locator(".runtime-status")).toContainText("等待按键");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog", { name: "任务完成！" })).toBeVisible();
  await page.getByRole("button", { name: "留在这里", exact: true }).click();
  await page.getByRole("button", { name: "停止运行", exact: true }).click();
  await expect(run).toBeEnabled();
  await expect(run).toHaveText("运行");
});

test("scrolls the task menu to lesson 64 and shows separate variable subtasks", async ({
  page,
}) => {
  await openPilot(page, "variable");
  const guide = page
    .locator(".lesson-guide ol li")
    .filter({ hasText: "设置变量初始值" });
  await expect(guide).toHaveText(/设置变量初始值\n增加或减少变量/);
  await expect(guide).toHaveCSS("white-space", "pre-line");
  await page.getByRole("button", { name: "打开创作任务", exact: true }).click();
  const list = page.getByRole("navigation", { name: "任务列表" });
  expect(
    await list.evaluate((node) => node.scrollHeight > node.clientHeight),
  ).toBe(true);
  if (test.info().project.use.isMobile) {
    // Playwright mobile WebKit has no mouse-wheel command. Exercise the
    // focusable scroll container's native keyboard scrolling instead.
    await list.focus();
    await page.keyboard.press("End");
  } else {
    await list.hover();
    await page.mouse.wheel(0, 10000);
  }
  const last = list.getByRole("button", { name: /64.*花园物资守卫/ });
  await expect(last).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "关闭任务", exact: true }),
  ).toBeInViewport();
});

test("renders lesson six as a two-step route on a high-density stage", async ({
  page,
}, info) => {
  await openPilot(page, "repeat");
  const route = await page.evaluate(async () => {
    const { useEditorStore } = await import(
      "/KidsCode/src/features/preview/" + "pilot-store.ts"
    );
    return useEditorStore.getState().project.pathMap;
  });
  expect(route.tiles).toHaveLength(3);
  await runPilot(page, true);
  await page.getByRole("button", { name: "留在这里", exact: true }).click();
  const canvas = page.locator(".pixi-stage-canvas");
  const size = await canvas.evaluate((node: HTMLCanvasElement) => ({
    width: node.width,
    css: node.getBoundingClientRect().width,
  }));
  expect(size.width).toBeGreaterThanOrEqual(960);
  expect(size.width / size.css).toBeGreaterThanOrEqual(1.8);
  await page.screenshot({
    path: `artifacts/lesson-experience/route-six-${info.project.name}.png`,
  });
});

test("plays the bundled Chinese greeting voice when the say block executes", async ({
  page,
}) => {
  await openPilot(page, "speak");
  await page.evaluate(() => {
    const played: string[] = [];
    Object.assign(window, { voicePlayed: played });
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      played.push(this.src);
      return original.call(this);
    };
  });
  await page.getByRole("button", { name: "绿旗运行", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { voicePlayed: string[] }).voicePlayed.some(
          (src) => src.endsWith("hello-tuantuan.wav"),
        ),
      ),
    )
    .toBe(true);
  const response = await page.request.get("./assets/sounds/hello-tuantuan.wav");
  expect(response.ok()).toBe(true);
  const bytes = await response.body();
  expect(bytes.subarray(0, 4).toString()).toBe("RIFF");
  expect(bytes.byteLength).toBeGreaterThan(10000);
});
