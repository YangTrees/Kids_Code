import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import {
  openPilot,
  replacePilotProgram,
  replaceAlternativeProgram,
  runPilot,
} from "./teaching-helpers";
import { STORY_PILOT_TASK_IDS } from "../apps/web/src/features/tasks/task-release";

for (const taskId of STORY_PILOT_TASK_IDS) {
  test(`pilot ${taskId}: reference, equivalent, typical error and repaired program`, async ({
    page,
  }) => {
    const id = await openPilot(page, taskId);
    const records: unknown[] = [];
    for (const scenario of [
      "correct",
      "equivalent",
      "typical-error",
      "repaired",
    ] as const) {
      if (scenario === "equivalent")
        await replaceAlternativeProgram(page, taskId);
      else if (scenario !== "correct")
        await replacePilotProgram(page, taskId, scenario === "typical-error");
      await runPilot(page, scenario !== "typical-error");
      records.push(
        await page.evaluate(async (scenario) => {
          const base = "/KidsCode/src/features/";
          const { useEditorStore } = await import(
            base + "preview/pilot-store.ts"
          );
          const project = useEditorStore.getState().project;
          return {
            scenario,
            taskId: project.course.taskId,
            contentVersion: project.course.contentVersion,
            actor: project.course.bindings.actor,
            workspace: project.workspaceStates,
            feedback: document.querySelector(".current-task-next")?.textContent,
            completed: Boolean(document.querySelector(".task-complete-dialog")),
            screenshotViewport: { width: innerWidth, height: innerHeight },
          };
        }, scenario),
      );
      if (scenario !== "typical-error") {
        await expect(page.getByLabel("3 星", { exact: true })).toBeVisible();
        await page
          .getByRole("button", { name: "留在这里", exact: true })
          .click();
        const stop = page.getByRole("button", {
          name: "停止运行",
          exact: true,
        });
        if (await stop.isEnabled()) await stop.click();
      }
    }
    await page.reload();
    await expect(page.getByLabel("当前挑战")).toBeVisible();
    await expect(
      page.locator(".block-workspace-host .blocklyBlockCanvas [data-id]"),
    ).not.toHaveCount(0);
    await page.getByRole("button", { name: "打开创作任务" }).click();
    for (let hint = 0; hint < 3; hint++) {
      const button = page.getByRole("button", {
        name: hint === 0 ? "给我一个提示" : "再提示一点",
        exact: true,
      });
      if (await button.count()) await button.click();
    }
    await expect(page.locator(".real-block-guide .blocklySvg")).toBeVisible();
    await page.getByRole("button", { name: "关闭任务" }).click();
    await mkdir("artifacts/pilot-acceptance", { recursive: true });
    await writeFile(
      `artifacts/pilot-acceptance/${taskId}-${test.info().project.name}.json`,
      JSON.stringify({ projectId: id, records }, null, 2),
    );
    await page.screenshot({
      path: `artifacts/pilot-acceptance/${taskId}-${test.info().project.name}.png`,
    });
  });
}
