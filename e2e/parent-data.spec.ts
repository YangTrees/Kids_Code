import { expect, test } from "@playwright/test";

test("exports a restorable full backup and removes all app-scoped data", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("kids-code-tutorial-step", "3"),
  );
  await page.goto("./learn");
  await page.locator(".course-level").first().click();
  await expect(page).toHaveURL(/\/editor\/prj_/);

  await page.goto("./parent");
  await page.evaluate(() => {
    localStorage.setItem("kids-code:completed-tasks", '["speak"]');
    localStorage.setItem("kids-code:draft:old", "draft");
    sessionStorage.setItem("kids-code:task-hints:old:speak", "2");
  });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出完整备份" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.kidbackup$/);
  const backupPath = await download.path();
  expect(backupPath).not.toBeNull();

  page.on("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "删除本机全部数据" }).click();
  await expect(page.getByRole("status")).toContainText("本机作品");
  expect(
    await page.evaluate(() => ({
      progress: localStorage.getItem("kids-code:completed-tasks"),
      draft: localStorage.getItem("kids-code:draft:old"),
      hints: sessionStorage.getItem("kids-code:task-hints:old:speak"),
    })),
  ).toEqual({ progress: null, draft: null, hints: null });
  await page.goto("./");
  await expect(page.locator(".project-card")).toHaveCount(0);

  await page.goto("./parent");
  await page.getByLabel("选择完整备份文件").setInputFiles(backupPath!);
  await expect(page.getByRole("status")).toContainText("完整备份已恢复");
  await page.goto("./");
  await expect(page.locator(".project-card")).toHaveCount(1);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("kids-code:completed-tasks"),
    ),
  ).toBe('["speak"]');
});
