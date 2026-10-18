import { expect, test } from "@playwright/test";

test("shows the revised 64-level progression and complexity labels", async ({
  page,
}) => {
  await page.goto("./learn");
  await expect(page.locator(".course-level")).toHaveCount(64);
  const patterns = page.locator("#chapter-8 .course-level");
  await expect(patterns.nth(1)).toContainText("转圈圈的秘密");
  await expect(patterns.nth(4)).toContainText("走出一个正方形");
  await expect(patterns.nth(5)).toContainText("有节奏的舞蹈");
  await expect(patterns.nth(5)).toContainText("进阶");
  const final = page.locator("#chapter-10 .course-level").last();
  await expect(final).toContainText("数据宝箱守卫");
  await expect(final).toContainText("综合");
});

test("creates a fresh course map while retaining the existing project", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("kids-code-tutorial-step", "3"),
  );
  await page.goto("./learn");
  await page.locator("#chapter-5 .course-level").first().click();
  await expect(page).toHaveURL(/\/editor\/prj_/);
  const oldId = page.url().split("/").at(-1)!;
  await expect(page.locator(".blocklySvg")).toBeVisible();
  await page.goto("./learn");
  const restart = page.locator("#chapter-5 .course-restart").first();
  await expect(restart).toContainText("保留原作品");
  await restart.click();
  await expect(page).toHaveURL(/\/editor\/prj_/);
  const newId = page.url().split("/").at(-1)!;
  expect(newId).not.toBe(oldId);
  await expect(page.locator(".blocklySvg")).toBeVisible();
  const retained = await page.evaluate(
    async (ids) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("kids-code-studio");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        return await Promise.all(
          ids.map(
            (id) =>
              new Promise<boolean>((resolve, reject) => {
                const request = db
                  .transaction("projects", "readonly")
                  .objectStore("projects")
                  .get(id);
                request.onsuccess = () => resolve(Boolean(request.result));
                request.onerror = () => reject(request.error);
              }),
          ),
        );
      } finally {
        db.close();
      }
    },
    [oldId, newId],
  );
  expect(retained).toEqual([true, true]);
});
