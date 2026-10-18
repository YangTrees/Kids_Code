import { expect, test } from "@playwright/test";
import { openPilot } from "./teaching-helpers";

test("failed project reads have a safe retry and never expose the default editor", async ({
  page,
}, info) => {
  await page.addInitScript(() =>
    localStorage.setItem("kids-code-tutorial-step", "3"),
  );
  await page.goto("./learn");
  await expect(page.getByRole("button", { name: "开始第一关" })).toBeEnabled();
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.get;
    const flags = { fail: true };
    Object.assign(window, { editorReadTest: flags });
    IDBObjectStore.prototype.get = function (key) {
      if (
        flags.fail &&
        this.name === "projects" &&
        this.transaction.mode === "readonly"
      )
        throw new DOMException("Injected read failure", "UnknownError");
      return original.call(this, key);
    };
  });
  await page.getByRole("button", { name: "开始第一关" }).click();
  await expect(page.getByRole("alert")).toContainText("读取");
  await expect(page.locator(".editor-page")).toHaveCount(0);
  await page.screenshot({
    path: `artifacts/editor-loading/read-error-${info.project.name}.png`,
  });
  await page.evaluate(() => {
    (
      window as unknown as { editorReadTest: { fail: boolean } }
    ).editorReadTest.fail = false;
  });
  await page.getByRole("button", { name: "重试读取作品" }).click();
  await expect(page.getByLabel("当前挑战")).toContainText("让团团说话");
  await expect(page.locator(".blocklySvg").first()).toBeVisible();
  await expect(page.locator(".pixi-stage-canvas")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "运行作品", exact: true }).first(),
  ).toBeEnabled();
});

test("lost graphics context can be retried without clearing the program", async ({
  page,
}, info) => {
  await openPilot(page, "repeat");
  const read = () =>
    page.evaluate(async () => {
      const { useEditorStore } = await import(
        "/KidsCode/src/features/preview/" + "pilot-store.ts"
      );
      const p = useEditorStore.getState().project;
      return JSON.stringify({
        id: p.projectId,
        workspaces: p.workspaceStates,
        scenes: p.scenes,
      });
    });
  const original = await read();
  await page
    .locator(".pixi-stage-canvas")
    .evaluate((canvas) =>
      canvas.dispatchEvent(
        new Event("webglcontextlost", { cancelable: true, bubbles: true }),
      ),
    );
  const status = page.locator(".stage-surface-root").getByRole("alert");
  await expect(status).toContainText("舞台");
  await expect(
    page.getByRole("button", { name: "运行作品", exact: true }).first(),
  ).toBeDisabled();
  await page.screenshot({
    path: `artifacts/editor-loading/graphics-error-${info.project.name}.png`,
  });
  await status.getByRole("button", { name: "重新加载" }).click();
  await expect(
    page.getByRole("button", { name: "运行作品", exact: true }).first(),
  ).toBeEnabled();
  expect(await read()).toBe(original);
  await expect(page.locator(".blocklySvg").first()).toBeVisible();
});

test("deferred Blockly restore failure is caught and preserves the saved program on retry", async ({
  page,
}, info) => {
  await openPilot(page, "repeat");
  const read = () =>
    page.evaluate(async () => {
      const { useEditorStore } = await import(
        "/KidsCode/src/features/preview/" + "pilot-store.ts"
      );
      return JSON.stringify(useEditorStore.getState().project.workspaceStates);
    });
  const before = await read();
  await page.evaluate(async () => {
    const { useEditorStore, blockSerialization } = await import(
      "/KidsCode/src/features/preview/" + "pilot-store.ts"
    );
    const original = blockSerialization.workspaces.load;
    blockSerialization.workspaces.load = () => {
      blockSerialization.workspaces.load = original;
      throw new Error("Injected deferred Blockly restore failure");
    };
    useEditorStore.setState((state) => ({
      historyRevision: state.historyRevision + 1,
    }));
  });
  const error = page.locator(".block-workspace-shell").getByRole("alert");
  await expect(error).toContainText("积木");
  await expect(
    page.getByRole("button", { name: "运行作品", exact: true }).first(),
  ).toBeDisabled();
  expect(await read()).toBe(before);
  await page.screenshot({
    path: `artifacts/editor-loading/workspace-error-${info.project.name}.png`,
  });
  await error.getByRole("button", { name: "重新加载" }).click();
  await expect(
    page.getByRole("button", { name: "运行作品", exact: true }).first(),
  ).toBeEnabled();
  expect(await read()).toBe(before);
});

test("repeated course entry never displays the placeholder project or an empty ready editor", async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  await page.addInitScript(() =>
    localStorage.setItem("kids-code-tutorial-step", "3"),
  );
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.goto("./learn");
    await page.getByRole("button", { name: /开始第一关|继续学习/ }).click();
    await expect(page.getByLabel("当前挑战")).toContainText("让团团说话");
    await expect(page.locator(".blocklySvg").first()).toBeVisible();
    await expect(page.locator(".pixi-stage-canvas")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "运行作品", exact: true }).first(),
    ).toBeEnabled();
    await expect(page.locator(".editor-project-loading")).toHaveCount(0);
    await expect(page.locator(".project-title")).not.toContainText(
      "栗奇的森林寻宝",
    );
  }
  await page.screenshot({
    path: `artifacts/editor-loading/ready-${info.project.name}.png`,
  });
});
