import { expect, type Page } from "@playwright/test";
import type { TaskId } from "../apps/web/src/features/tasks/task-types";
import type { Project } from "@kids-code/domain";

export async function openPilot(page: Page, taskId: TaskId, wrong = false) {
  await page.addInitScript(() =>
    localStorage.setItem("kids-code-tutorial-step", "3"),
  );
  await page.goto("./learn");
  await page.getByRole("button", { name: "开始第一关" }).click();
  await expect(page.locator(".block-workspace-host .blocklySvg")).toBeVisible();
  const id = await page.evaluate(
    async ({ taskId, wrong }) => {
      const base = "/KidsCode/src/features/";
      const { creationTasks } = await import(base + "tasks/task-catalog.ts");
      const { createTaskProject } = await import(
        base + "tasks/task-project.ts"
      );
      const { lessonExample } = await import(base + "tasks/lesson-examples.ts");
      const project = createTaskProject(
        creationTasks.find(
          (task: { taskId: string }) => task.taskId === taskId,
        ),
      ) as Project;
      project.workspaceStates[project.course!.bindings.actor] = lessonExample(
        taskId,
        wrong,
      );
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("kids-code-studio");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const tx = db.transaction("projects", "readwrite");
      tx.objectStore("projects").put({
        projectId: project.projectId,
        project,
        revision: Date.now(),
        updatedAt: project.updatedAt,
      });
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
      return project.projectId;
    },
    { taskId, wrong },
  );
  await page.goto("./editor/" + id);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { useEditorStore } = await import(
          "/KidsCode/src/features/preview/" + "pilot-store.ts"
        );
        const project = useEditorStore.getState().project;
        return [project.projectId, project.course?.taskId];
      }),
    )
    .toEqual([id, taskId]);
  await expect(page.locator(".block-workspace-host .blocklySvg")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "运行作品", exact: true }).first(),
  ).toBeEnabled();
  return id;
}

export async function replacePilotProgram(
  page: Page,
  taskId: TaskId,
  wrong = false,
) {
  await page.evaluate(
    async ({ taskId, wrong }) => {
      const base = "/KidsCode/src/features/";
      const { useEditorStore } = await import(base + "preview/pilot-store.ts");
      const { lessonExample } = await import(base + "tasks/lesson-examples.ts");
      const state = useEditorStore.getState();
      state.applyProjectUpdate({
        ...state.project,
        workspaceStates: {
          [state.project.course.bindings.actor]: lessonExample(taskId, wrong),
        },
      });
    },
    { taskId, wrong },
  );
  await expect(
    page.getByRole("button", { name: "运行作品", exact: true }).first(),
  ).toBeEnabled();
}

export async function replaceAlternativeProgram(page: Page, taskId: TaskId) {
  await page.evaluate(async (taskId) => {
    const { useEditorStore } = await import(
      "/KidsCode/src/features/preview/" + "pilot-store.ts"
    );
    const { alternativeLessonProgram } = await import(
      "/KidsCode/src/features/preview/" + "lesson-alternatives.ts"
    );
    const state = useEditorStore.getState();
    state.applyProjectUpdate({
      ...state.project,
      workspaceStates: {
        [state.project.course.bindings.actor]: alternativeLessonProgram(
          taskId,
          state.project,
        ),
      },
    });
  }, taskId);
  await expect(
    page.getByRole("button", { name: "运行作品", exact: true }).first(),
  ).toBeEnabled();
}

export async function runPilot(page: Page, complete: boolean) {
  await page
    .getByRole("button", { name: "运行作品", exact: true })
    .first()
    .click();
  if (complete)
    await expect(
      page.getByRole("dialog", { name: "任务完成！" }),
    ).toBeVisible();
  else {
    await expect(page.locator(".runtime-status")).toHaveAttribute(
      "data-status",
      "COMPLETED",
    );
    await expect(page.getByRole("dialog", { name: "任务完成！" })).toHaveCount(
      0,
    );
    await expect(page.locator(".current-task-feedback")).toBeVisible();
  }
}
