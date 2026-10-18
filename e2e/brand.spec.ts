import { expect, test, type Page } from "@playwright/test";
const brand = "团团点点的好奇编程乐园";

async function checkHome(page: Page) {
  await page.goto("./");
  await expect(page).toHaveTitle(brand);
  await expect(page.locator(".projects-brand strong")).toHaveText(brand);
  await expect(page.locator(".projects-brand-mark")).toHaveText("团");
  const header = page.locator(".projects-nav");
  expect(
    await header.evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1,
    ),
  ).toBe(true);
  const label = (await page.locator(".projects-brand").boundingBox())!;
  const links = (await page.locator(".projects-nav-links").boundingBox())!;
  expect(label.x + label.width).toBeLessThanOrEqual(links.x + 1);
}
test("uses the new brand on home, courses and installation metadata", async ({
  page,
}, info) => {
  await checkHome(page);
  await page.screenshot({
    path: `artifacts/branding/home-${info.project.name}.png`,
  });
  const response = await page.request.get("./manifest.webmanifest");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toMatchObject({
    name: brand,
    short_name: "团团点点编程",
  });
  await expect(
    page.locator('meta[name="apple-mobile-web-app-title"]'),
  ).toHaveAttribute("content", "团团点点编程");
  await page.goto("./learn");
  await expect(page).toHaveTitle(brand);
  await expect(page.locator(".course-brand strong")).toHaveText(brand);
  await expect(page.locator(".course-brand > span")).toHaveText("团");
  await page.screenshot({
    path: `artifacts/branding/course-${info.project.name}.png`,
  });
});
test("keeps the full new name readable without overlapping narrow-screen navigation", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await checkHome(page);
  await page.screenshot({
    path: `artifacts/branding/narrow-${info.project.name}.png`,
  });
});
