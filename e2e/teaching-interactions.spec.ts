import { expect, test } from "@playwright/test";
import { openPilot, runPilot } from "./teaching-helpers";

test("edits parameters through large buttons using the keyboard without dragging blocks", async ({
  page,
}, info) => {
  await openPilot(page, "repeat");
  const trigger = page.getByRole("button", { name: "打开积木参数列表" });
  const bounds = await trigger.boundingBox();
  expect(bounds!.height).toBeGreaterThanOrEqual(44);
  await trigger.focus();
  await page.keyboard.press("Enter");
  const list = page.getByRole("dialog", { name: "积木参数", exact: true });
  await expect(list).toBeVisible();
  await expect(list).toBeInViewport({ ratio: 1 });
  await page.screenshot({
    path: `artifacts/pilot-acceptance/parameters-${info.project.name}.png`,
  });
  const choice = list.getByRole("button", { name: "重复次数：2", exact: true });
  expect((await choice.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await choice.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "重复次数", exact: true });
  await expect(dialog.getByRole("spinbutton")).toBeFocused();
  await expect(dialog).toBeInViewport({ ratio: 1 });
  await dialog.getByRole("spinbutton").fill("7");
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect(
    page
      .locator(".block-workspace-host .blocklyText")
      .filter({ hasText: /^7$/ }),
  ).toBeVisible();
  await expect(page.locator(".blocklyDragging")).toHaveCount(0);
  await expect(page.locator(".block-workspace-host")).toBeFocused();
  await page.screenshot({
    path: `artifacts/pilot-acceptance/editor-${info.project.name}.png`,
  });
});

test("snaps a dragged story actor to a cell center and restores the original task layout before running", async ({
  page,
}) => {
  await openPilot(page, "move");
  const start = await page.evaluate(async () => {
    const { useEditorStore } = await import(
      "/KidsCode/src/features/preview/" + "pilot-store.ts"
    );
    const project = useEditorStore.getState().project;
    return project.scenes[0].instances.find(
      (item: { spriteId: string }) =>
        item.spriteId === project.course.bindings.actor,
    ).transform;
  });
  const canvas = (await page.locator(".pixi-stage-canvas").boundingBox())!;
  await page.mouse.move(
    canvas.x + (start.x / 480) * canvas.width,
    canvas.y + (start.y / 360) * canvas.height,
  );
  await page.mouse.down();
  await page.mouse.move(
    canvas.x + ((start.x + 63) / 480) * canvas.width,
    canvas.y + ((start.y - 13) / 360) * canvas.height,
    { steps: 10 },
  );
  await page.mouse.up();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { useEditorStore } = await import(
          "/KidsCode/src/features/preview/" + "pilot-store.ts"
        );
        const project = useEditorStore.getState().project;
        const actor = project.scenes[0].instances.find(
          (item: { spriteId: string }) =>
            item.spriteId === project.course.bindings.actor,
        );
        return { x: actor.transform.x, y: actor.transform.y };
      }),
    )
    .toEqual({ x: start.x + 80, y: start.y });
  await page.getByRole("button", { name: "恢复任务布局", exact: true }).click();
  await expect(page.getByLabel("任务版本与布局")).toHaveCount(0);
  await runPilot(page, true);
});

test("allows a chest program to observe the actual story actor", async ({
  page,
}) => {
  await openPilot(page, "collision");
  await page.evaluate(async () => {
    const { useEditorStore } = await import(
      "/KidsCode/src/features/preview/" + "pilot-store.ts"
    );
    const state = useEditorStore.getState(),
      project = structuredClone(state.project);
    const actor = project.course.bindings.actor;
    const root = project.workspaceStates[actor].blocks.blocks[0];
    root.next.block.next = {
      block: {
        type: "control_wait",
        id: "bound-wait",
        inputs: {
          DURATION: { shadow: { type: "math_number", fields: { NUM: 1 } } },
        },
      },
    };
    project.workspaceStates.spr_box = {
      blocks: {
        blocks: [
          {
            type: "kids_when_touching",
            id: "bound-chest",
            fields: { TARGET: actor },
            next: {
              block: {
                type: "looks_sayforsecs",
                id: "bound-reply",
                inputs: {
                  MESSAGE: {
                    shadow: { type: "text", fields: { TEXT: "团团找到我啦" } },
                  },
                  SECS: {
                    shadow: { type: "math_number", fields: { NUM: 0.2 } },
                  },
                },
              },
            },
          },
        ],
      },
    };
    state.applyProjectUpdate(project);
  });
  await runPilot(page, true);
  await page.getByRole("button", { name: "留在这里", exact: true }).click();
  await page.getByRole("button", { name: "停止运行", exact: true }).click();
});

test("creates a free copy with all tools and code while leaving the course work intact", async ({
  page,
}) => {
  const oldId = await openPilot(page, "repeat");
  await page.getByRole("button", { name: "展开完整工具" }).click();
  await page.getByRole("button", { name: "复制为自由作品" }).click();
  await expect(page).not.toHaveURL(new RegExp(oldId + "$"));
  await expect(page.getByLabel("当前挑战")).toContainText("自由创作");
  await expect(page.locator(".asset-tray")).toBeVisible();
  await expect(page.locator(".category-rail .category-button")).toHaveCount(8);
  const result = await page.evaluate(async (oldId) => {
    const { useEditorStore } = await import(
      "/KidsCode/src/features/preview/" + "pilot-store.ts"
    );
    const current = useEditorStore.getState().project;
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open("kids-code-studio");
      request.onsuccess = () => resolve(request.result);
    });
    const original = await new Promise<{
      project: { course: unknown; workspaceStates: unknown };
    }>((resolve) => {
      const request = db
        .transaction("projects")
        .objectStore("projects")
        .get(oldId);
      request.onsuccess = () => resolve(request.result);
    });
    db.close();
    return {
      oldCourse: original.project.course,
      newCourse: current.course,
      keptCode: await (async () => {
        const { compileSerializedWorkspace } = await import(
          "/KidsCode/src/features/preview/" + "pilot-store.ts"
        );
        const code = (project: { workspaceStates: Record<string, object> }) =>
          Object.entries(project.workspaceStates).flatMap(
            ([owner, workspace]) =>
              compileSerializedWorkspace(owner, workspace),
          );
        return (
          JSON.stringify(code(original.project)) ===
          JSON.stringify(code(current))
        );
      })(),
    };
  }, oldId);
  expect(result.oldCourse).toMatchObject({
    taskId: "repeat",
    contentVersion: "4",
  });
  expect(result.newCourse).toBeUndefined();
  expect(result.keptCode).toBe(true);
});

test("edits coordinates, angles, seconds, size, text and scene thumbnails, then reloads", async ({
  page,
}) => {
  await openPilot(page, "repeat");
  await page.evaluate(async () => {
    const { useEditorStore } = await import(
      "/KidsCode/src/features/preview/" + "pilot-store.ts"
    );
    const state = useEditorStore.getState(),
      project = structuredClone(state.project);
    const num = (id: string, value: number) => ({
      shadow: { type: "math_number", id, fields: { NUM: value } },
    });
    const nodes: Array<Record<string, unknown>> = [
      { type: "event_whenflagclicked", id: "p-flag", x: 20, y: 20 },
      {
        type: "motion_gotoxy",
        id: "p-goto",
        inputs: { X: num("p-x", 0), Y: num("p-y", 0) },
      },
      {
        type: "kids_turn_left",
        id: "p-turn",
        inputs: { DEGREES: num("p-angle", 90) },
      },
      {
        type: "looks_changesizeby",
        id: "p-size",
        inputs: { CHANGE: num("p-change", 10) },
      },
      {
        type: "control_wait",
        id: "p-wait",
        inputs: { DURATION: num("p-duration", 1) },
      },
      {
        type: "looks_sayforsecs",
        id: "p-say",
        inputs: {
          MESSAGE: {
            shadow: { type: "text", id: "p-text", fields: { TEXT: "你好" } },
          },
          SECS: num("p-seconds", 1),
        },
      },
      {
        type: "kids_switch_scene",
        id: "p-scene",
        fields: { SCENE: project.currentSceneId },
      },
    ];
    nodes.forEach((node, index) => {
      if (nodes[index + 1]) node.next = { block: nodes[index + 1] };
    });
    project.workspaceStates[project.course.bindings.actor] = {
      blocks: { blocks: [nodes[0]] },
    };
    const second = structuredClone(project.scenes[0]);
    second.sceneId = "scn_parameter_second";
    second.name = "第二个场景";
    second.instances.forEach(
      (item: { instanceId: string }) => (item.instanceId += "_second"),
    );
    project.scenes.push(second);
    state.applyProjectUpdate(project);
  });
  for (const [id, label, value] of [
    ["p-x", "X 列坐标", "11"],
    ["p-y", "Y 行坐标", "8"],
    ["p-angle", "转动角度", "135"],
    ["p-change", "大小变化", "-15"],
    ["p-duration", "持续时间", "0.7"],
    ["p-text", "说话内容", "我有新的想法"],
    ["p-seconds", "持续时间", "0.4"],
  ]) {
    await page
      .locator(`.block-workspace-host [data-id="${id}"] .blocklyText`)
      .click();
    const dialog = page.getByRole("dialog", { name: label! });
    await dialog.locator("input").fill(value!);
    const button = dialog.getByRole("button", { name: "确定", exact: true });
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await button.click();
    await expect(page.locator(".blocklyDragging")).toHaveCount(0);
  }
  await page
    .locator('.block-workspace-host [data-id="p-scene"] .blocklyText')
    .filter({ hasText: "阳光森林" })
    .click();
  const dialog = page.getByRole("dialog", { name: "选择场景" });
  await expect(dialog.locator("img")).toHaveCount(2);
  await dialog.getByRole("button", { name: "第二个场景", exact: true }).click();
  await dialog.getByRole("button", { name: "确定", exact: true }).click();
  await expect(page.locator(".save-state")).toContainText("已保存");
  await page.reload();
  await expect(page.locator(".block-workspace-host .blocklySvg")).toBeVisible();
  const saved = await page.evaluate(async () => {
    const { useEditorStore } = await import(
      "/KidsCode/src/features/preview/" + "pilot-store.ts"
    );
    return JSON.stringify(useEditorStore.getState().project.workspaceStates);
  });
  for (const value of [
    "135",
    "-15",
    "0.7",
    "0.4",
    "我有新的想法",
    "scn_parameter_second",
  ])
    expect(saved).toContain(value);
});

test("edits a repeat picker to a legal custom number without dragging, and keeps it after reload", async ({
  page,
}, info) => {
  await openPilot(page, "repeat");
  await page.evaluate(async () => {
    const { useEditorStore } = await import(
      "/KidsCode/src/features/preview/" + "pilot-store.ts"
    );
    const state = useEditorStore.getState();
    const project = structuredClone(state.project);
    const workspace = project.workspaceStates[project.course.bindings.actor];
    workspace.blocks.blocks[0].next.block.inputs.TIMES = {
      shadow: {
        type: "kids_repeat_picker",
        id: "repeat-value",
        fields: { VALUE: "2" },
      },
    };
    state.applyProjectUpdate(project);
  });
  const field = page.locator(
    '.block-workspace-host [data-id="repeat-value"] .blocklyText',
  );
  await expect(field).toBeVisible();
  if (info.project.name === "ipad-landscape") await field.tap();
  else await field.click();
  const dialog = page.getByRole("dialog", { name: "重复次数" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("spinbutton").fill("7");
  await dialog.getByRole("button", { name: "确定", exact: true }).click();
  await expect(page.locator(".blocklyDragging")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { useEditorStore } = await import(
          "/KidsCode/src/features/preview/" + "pilot-store.ts"
        );
        const project = useEditorStore.getState().project;
        return Number(
          project.workspaceStates[project.course.bindings.actor].blocks
            .blocks[0].next.block.inputs.TIMES.shadow.fields.NUM,
        );
      }),
    )
    .toBe(7);
  await page.getByRole("button", { name: "撤销编辑", exact: true }).click();
  await expect(
    page.locator('.block-workspace-host [data-id="repeat-value"] .blocklyText'),
  ).toHaveText("2");
  await page.getByRole("button", { name: "重做编辑", exact: true }).click();
  await expect(
    page
      .locator(".block-workspace-host .blocklyText")
      .filter({ hasText: /^7$/ }),
  ).toBeVisible();
  await expect(page.locator(".save-state")).toContainText("已保存");
  await page.reload();
  await expect(
    page
      .locator(".block-workspace-host .blocklyText")
      .filter({ hasText: /^7$/ }),
  ).toBeVisible();
  await runPilot(page, true);
  await page.getByRole("button", { name: "留在这里" }).click();
  const seven = page
    .locator(".block-workspace-host .blocklyText")
    .filter({ hasText: /^7$/ });
  await seven.click();
  await page
    .getByRole("dialog", { name: "重复次数" })
    .getByRole("button", { name: "3 次", exact: true })
    .click();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(seven).toBeVisible();
  await expect(page.locator(".blocklyDragging")).toHaveCount(0);
});

test("opens all tools without losing code and validates variable names in an accessible dialog", async ({
  page,
}) => {
  await openPilot(page, "repeat");
  await expect(page.locator(".category-rail .category-button")).toHaveCount(4);
  await expect(page.locator(".asset-tray")).toBeHidden();
  await page.getByRole("button", { name: "展开完整工具" }).click();
  await expect(page.locator(".category-rail .category-button")).toHaveCount(8);
  await expect(page.locator(".asset-tray")).toBeVisible();
  await page
    .getByRole("navigation", { name: "积木分类" })
    .getByRole("button", { name: /变量/ })
    .click();
  await page.locator(".kids-create-variable-button").click();
  const dialog = page.getByRole("dialog", { name: "创建变量" });
  await dialog.getByRole("button", { name: "创建", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("先输入");
  await dialog.getByRole("textbox").fill("计数");
  await dialog.getByRole("textbox").press("Enter");
  await expect(dialog).toHaveCount(0);
  await page.locator(".kids-create-variable-button").click();
  await dialog.getByRole("textbox").fill("计数");
  await dialog.getByRole("button", { name: "创建", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("已经有");
  await dialog.getByRole("button", { name: "取消", exact: true }).click();
  await expect(page.getByLabel("积木脚本工作区")).toBeFocused();
  await page.getByRole("button", { name: "返回本课工具" }).click();
  await runPilot(page, true);
});

test("uses real target thumbnails, skips and replays the guide, and keeps full rewards after all hints", async ({
  page,
}) => {
  await openPilot(page, "collision");
  const targetId = await page.evaluate(async () => {
    const { useEditorStore } = await import(
      "/KidsCode/src/features/preview/" + "pilot-store.ts"
    );
    const state = useEditorStore.getState();
    return state.project.workspaceStates[state.project.course.bindings.actor]
      .blocks.blocks[0].next.block.next.block.id;
  });
  await page
    .locator(`.block-workspace-host [data-id="${targetId}"] .blocklyText`)
    .filter({ hasText: /^宝箱$/ })
    .click();
  const dialog = page.getByRole("dialog", { name: "选择角色" });
  await expect(
    dialog.getByRole("button", { name: "宝箱", exact: true }).locator("img"),
  ).toHaveAttribute("src", /story-ip\/treasure-chest-v1.webp/);
  await dialog.getByRole("button", { name: "取消", exact: true }).click();
  await page.getByRole("button", { name: "暂时跳过" }).click();
  await expect(page.getByRole("button", { name: "重看引导" })).toBeVisible();
  await page.getByRole("button", { name: "重看引导" }).click();
  await page.getByRole("button", { name: "打开创作任务" }).click();
  await page.getByRole("button", { name: "给我一个提示", exact: true }).click();
  await page.getByRole("button", { name: "再提示一点", exact: true }).click();
  await page.getByRole("button", { name: "再提示一点", exact: true }).click();
  await expect(page.locator(".real-block-guide .blocklySvg")).toBeVisible();
  await page.getByRole("button", { name: "关闭任务" }).click();
  await runPilot(page, true);
  await expect(page.getByLabel("3 星", { exact: true })).toBeVisible();
  const support = await page.evaluate(() =>
    Object.entries(localStorage)
      .filter(([key]) => key.startsWith("kids-code:learning-support:"))
      .map(([, value]) => JSON.parse(value)),
  );
  expect(support).toContainEqual({
    usedHints: true,
    maxHintLevel: 3,
    completed: true,
  });
});
