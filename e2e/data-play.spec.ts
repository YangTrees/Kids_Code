import { expect, test } from "@playwright/test";

test("sorts number cards and opens the five-observation chart", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("kids-code-tutorial-step", "3");
    localStorage.setItem(
      "kids-code:completed-tasks",
      JSON.stringify(["data_label", "data_sort"]),
    );
  });
  await page.goto("./learn");
  const dataChapter = page.locator(".course-chapter").nth(6);
  await dataChapter.locator(".course-level").nth(6).click();
  await expect(page.getByLabel("分类实验台")).toBeVisible();
  await expect(page.getByLabel("当前挑战")).toContainText("把数据分成两堆");

  await page.getByRole("button", { name: "数字卡 4" }).click();
  await page.locator('.data-sort-bin[data-bin="small"] button').first().click();
  await expect(page.getByLabel("分类实验台")).toContainText("0/6 张已分类");
  await expect(page.getByLabel("分类实验台")).toContainText("再看一眼分界线");
  await page
    .getByRole("button", { name: "数字卡 4" })
    .dragTo(page.locator('.data-sort-bin[data-bin="large"]'));
  await expect(page.getByLabel("分类实验台")).toContainText("1/6 张已分类");
  await page.getByRole("button", { name: "数字卡 2" }).click();
  await page.locator('.data-sort-bin[data-bin="small"] button').first().click();
  await expect(page.getByLabel("分类实验台")).toContainText("2/6 张已分类");
  await page.reload();
  await expect(page.getByLabel("分类实验台")).toContainText("2/6 张已分类");
  for (const value of [1, 3]) {
    await page.getByRole("button", { name: `数字卡 ${value}` }).click();
    await page
      .locator('.data-sort-bin[data-bin="small"] button')
      .first()
      .click();
  }
  for (const value of [5, 6]) {
    await page.getByRole("button", { name: `数字卡 ${value}` }).click();
    await page
      .locator('.data-sort-bin[data-bin="large"] button')
      .first()
      .click();
  }
  await expect(page.getByLabel("分类实验台")).toContainText("6/6 张已分类");
  await expect(page.getByRole("dialog", { name: "任务完成！" })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("sort-board.png") });

  await page.getByRole("button", { name: "返回课程地图" }).click();
  const chartChapter = page.locator(".course-chapter").nth(6);
  await chartChapter.locator(".course-level").nth(7).click();
  await expect(page.getByLabel("观察柱状图")).toBeVisible();
  await expect(page.getByLabel("观察柱状图")).toBeInViewport({ ratio: 0.45 });
  await expect(page.getByLabel("当前挑战")).toContainText("画出五次观察");
  await expect(page.getByLabel("观察柱状图")).toContainText("0/5 次记录");
  await expect(page.locator(".data-chart-column")).toHaveCount(5);
  await page.screenshot({ path: testInfo.outputPath("chart-board.png") });
});

test("plots five coded observations and finishes after reading the chart", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("kids-code-tutorial-step", "3");
    localStorage.setItem(
      "kids-code:completed-tasks",
      JSON.stringify(["data_sort"]),
    );
  });
  await page.goto("./learn");
  await page
    .locator(".course-chapter")
    .nth(6)
    .locator(".course-level")
    .nth(7)
    .click();
  await expect(page).toHaveURL(/\/editor\/prj_/);
  await expect(page.getByLabel("当前挑战")).toContainText("画出五次观察");
  await expect(page.locator(".save-state")).toContainText("已保存");
  const projectId = page.url().split("/").at(-1)!;
  await expect(page.locator(".blocklySvg")).toBeVisible();

  await page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("kids-code-studio");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction("projects", "readwrite");
    const store = transaction.objectStore("projects");
    const record = await new Promise<Record<string, unknown>>(
      (resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      },
    );
    const project = record.project as Record<string, unknown>;
    const workspaceStates = project.workspaceStates as Record<string, unknown>;
    const actor = (project.course as { bindings: { actor: string } }).bindings
      .actor;
    workspaceStates[actor] = {
      blocks: {
        blocks: [
          {
            type: "event_whenflagclicked",
            id: "chart-flag",
            x: 40,
            y: 40,
            next: {
              block: {
                type: "kids_variable_show",
                id: "chart-show",
                fields: { VARIABLE: "var_1" },
                next: {
                  block: {
                    type: "control_repeat",
                    id: "chart-loop",
                    inputs: {
                      TIMES: {
                        shadow: {
                          type: "kids_repeat_picker",
                          fields: { VALUE: "5" },
                        },
                      },
                      SUBSTACK: {
                        block: {
                          type: "kids_variable_increase",
                          id: "chart-increase",
                          fields: { VARIABLE: "var_1" },
                          inputs: {
                            VALUE: {
                              shadow: {
                                type: "math_number",
                                fields: { NUM: 1 },
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
    project.updatedAt = new Date().toISOString();
    record.updatedAt = project.updatedAt;
    record.revision = Date.now() + 1_000;
    store.put(record);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }, projectId);

  await page.reload();
  await expect(page.locator(".blocklySvg")).toBeVisible();
  await page.getByRole("button", { name: "运行作品" }).first().click();
  await expect(page.getByLabel("观察柱状图")).toContainText("5/5 次记录");
  await page.getByRole("button", { name: "第 5 次，数据 5" }).click();
  await expect(page.getByRole("dialog", { name: "任务完成！" })).toBeVisible();
});
