import { expect, test, type Page } from "@playwright/test";
import type { Project } from "@kids-code/domain";

const number = (value: number) => ({
  shadow: { type: "math_number", fields: { NUM: value } },
});
const legacyProgram = {
  blocks: {
    blocks: [
      {
        type: "event_whenflagclicked",
        id: "legacy-flag",
        x: 40,
        y: 40,
        next: {
          block: {
            type: "control_repeat",
            id: "legacy-repeat",
            inputs: {
              TIMES: {
                shadow: { type: "kids_repeat_picker", fields: { VALUE: "3" } },
              },
              SUBSTACK: {
                block: {
                  type: "kids_score_change",
                  id: "legacy-score",
                  inputs: { DELTA: number(1) },
                },
              },
            },
            next: {
              block: {
                type: "kids_if",
                id: "legacy-if",
                inputs: {
                  CONDITION: {
                    block: {
                      type: "kids_score_compare",
                      id: "legacy-compare",
                      fields: { OP: "gt" },
                      inputs: { RIGHT: number(2) },
                    },
                  },
                  SUBSTACK: {
                    block: {
                      type: "sound_play",
                      id: "legacy-sound",
                      inputs: {
                        SOUND_MENU: {
                          shadow: {
                            type: "kids_sound_menu",
                            fields: { SOUND_MENU: "sfx_ui_click" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    ],
  },
};
const speakingProgram = {
  blocks: {
    blocks: [
      {
        type: "event_whenflagclicked",
        id: "p0-flag",
        x: 40,
        y: 40,
        next: {
          block: {
            type: "looks_sayforsecs",
            id: "p0-say",
            inputs: {
              MESSAGE: {
                shadow: { type: "text", fields: { TEXT: "我有自己的故事" } },
              },
              SECS: number(0.5),
            },
          },
        },
      },
    ],
  },
};

const collisionProgram = {
  blocks: {
    blocks: [
      {
        type: "event_whenflagclicked",
        id: "collision-flag",
        x: 40,
        y: 40,
        next: {
          block: {
            type: "motion_movesteps",
            id: "collision-move",
            inputs: { STEPS: number(3) },
          },
        },
      },
      {
        type: "kids_when_touching",
        id: "collision-hat",
        fields: { TARGET: "spr_box" },
        x: 40,
        y: 160,
        next: {
          block: {
            type: "looks_sayforsecs",
            id: "collision-say",
            inputs: {
              MESSAGE: {
                shadow: { type: "text", fields: { TEXT: "碰到宝箱了" } },
              },
              SECS: number(0.5),
            },
          },
        },
      },
    ],
  },
};

async function editStoredWork(
  page: Page,
  action: "legacy" | "layout" | "collision",
) {
  const projectId = page.url().split("/").at(-1)!;
  await page.evaluate(
    async ({ id, action, legacy, speaking, collision }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("kids-code-studio");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const transaction = db.transaction("projects", "readwrite");
      const store = transaction.objectStore("projects");
      const record = await new Promise<{
        project: Project;
        revision: number;
        updatedAt: string;
      }>((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      if (action === "legacy") {
        delete record.project.course;
        record.project.workspaceStates = { spr_liji: legacy };
        localStorage.setItem("kids-code:task:" + id, "ai_helper");
      } else if (action === "layout") {
        record.project.workspaceStates = {
          [record.project.course!.bindings.actor]: speaking,
        };
        record.project.settings.movementStep = 10;
        record.project.scenes[0]!.instances[0]!.transform.x += 40;
      } else {
        record.project.workspaceStates = {
          [record.project.course!.bindings.actor]: collision,
        };
      }
      record.project.updatedAt = new Date().toISOString();
      record.updatedAt = record.project.updatedAt;
      record.revision = Date.now();
      store.put(record);
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      db.close();
    },
    {
      id: projectId,
      action,
      legacy: legacyProgram,
      speaking: speakingProgram,
      collision: collisionProgram,
    },
  );
  await page.reload();
  await expect(page.locator(".blocklySvg")).toBeVisible();
  return projectId;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("kids-code-tutorial-step", "3"),
  );
});

test("shows the five-observation objective and a collapsible consistent checklist", async ({
  page,
}) => {
  await page.goto("./learn");
  await page.locator("#chapter-10 .course-level").first().click();
  const card = page.getByLabel("当前挑战");
  const objective = page.getByLabel("本关目标", { exact: true });
  await expect(objective).toBeInViewport({ ratio: 1 });
  await expect(objective).toContainText("5 分");
  await expect(card.locator("details")).not.toHaveAttribute("open", "");
  await card.getByText("查看全部检查项", { exact: false }).click();
  await expect(card).toContainText("连续观察五次");
  await expect(card).not.toContainText("连续记录三次");
  await expect(card).not.toContainText("记录完做一次判断");
  await page.getByRole("button", { name: "打开创作任务" }).click();
  await expect(page.locator(".task-detail")).toContainText(
    "每次加分后立刻判断",
  );
});

test("restores the task layout while keeping the child's connected blocks", async ({
  page,
}) => {
  await page.goto("./learn");
  await page.getByRole("button", { name: "开始第一关" }).click();
  await expect(page.locator(".blocklySvg")).toBeVisible();
  await editStoredWork(page, "layout");
  await expect(page.getByLabel("任务版本与布局")).toContainText("40 像素");
  await page.getByRole("button", { name: "恢复任务布局", exact: true }).click();
  await expect(page.getByLabel("任务版本与布局")).toHaveCount(0);
  await expect(
    page.locator(".blocklyBlockCanvas").filter({ hasText: "我有自己的故事" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "运行作品" }).first().click();
  await expect(page.getByRole("dialog", { name: "任务完成！" })).toBeVisible();
});

test("keeps the lesson after refresh even without the browser assignment key", async ({
  page,
}) => {
  await page.goto("./learn");
  await page.getByRole("button", { name: "开始第一关" }).click();
  await expect(page.locator(".blocklySvg")).toBeVisible();
  await page.evaluate(() => {
    const projectId = location.pathname.split("/").at(-1)!;
    localStorage.removeItem("kids-code:task:" + projectId);
  });
  await page.reload();
  await expect(page.getByLabel("当前挑战")).toContainText("让团团说话");
  await expect(
    page.getByRole("button", { name: "返回课程地图" }),
  ).toBeVisible();
});

test("finishes the collision lesson with the real stage and its three-cell approach", async ({
  page,
}) => {
  await page.goto("./learn");
  await page.locator("#chapter-2 .course-level").first().click();
  await expect(page.locator(".blocklySvg")).toBeVisible();
  await editStoredWork(page, "collision");
  await page.getByRole("button", { name: "运行作品" }).first().click();
  await expect(page.getByRole("dialog", { name: "任务完成！" })).toBeVisible();
});

test("uses the deployment prefix for learning and parent navigation", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("navigation", { name: "首页导航" })
    .getByRole("link", { name: "学习课程" })
    .click();
  await expect(page).toHaveURL(/\/KidsCode\/learn$/);
  await page.goto("./");
  await page
    .getByRole("navigation", { name: "首页导航" })
    .getByRole("link", { name: "家长区" })
    .click();
  await expect(page).toHaveURL(/\/KidsCode\/parent$/);
});
