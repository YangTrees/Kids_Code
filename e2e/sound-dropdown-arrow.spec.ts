import { expect, test, type Page } from "@playwright/test";
import { openPilot } from "./teaching-helpers";

async function dragSoundIntoWorkspace(page: Page) {
  const placed = page.locator(
    ".block-workspace-host .blocklyBlockCanvas:not(.blocklyFlyout *) .sound_play",
  );
  const before = await placed.count();
  const source = page.locator(".blocklyFlyout .sound_play").first();
  // Category changes scroll the flyout. Wait for a stable source before
  // pressing, so this tests dragging the sound block rather than empty space.
  await source.scrollIntoViewIfNeeded();
  await source.hover({ position: { x: 24, y: 16 } });
  const area = (await page.locator(".block-workspace-host").boundingBox())!;
  await page.mouse.down();
  await page.mouse.move(area.x + area.width - 140, area.y + 220, { steps: 18 });
  await page.mouse.up();
  await expect(page.locator(".blocklyDragging")).toHaveCount(0);
  await expect(placed).toHaveCount(before + 1);
}

for (const location of ["workspace", "flyout"] as const) {
  test(`opens sound choices from the ${location} triangle and capsule rim without dragging`, async ({
    page,
  }, info) => {
    await openPilot(page, "sound");
    await page.locator(".category-button.category-sound").click();
    if (location === "workspace") await dragSoundIntoWorkspace(page);
    const scope =
      location === "workspace"
        ? page.locator(
            ".block-workspace-host .blocklyBlockCanvas:not(.blocklyFlyout *)",
          )
        : page.locator(".blocklyFlyout .blocklyBlockCanvas");
    // Click the triangle itself, not the field's text.
    const soundField = scope.locator(".kids_sound_menu.blocklyShadow").last();
    const arrow = soundField.locator("image[width]").first();
    if (info.project.use.hasTouch) await arrow.tap();
    else await arrow.click();
    const dialog = page.getByRole("dialog", { name: "选择声音", exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "铃铛", exact: true }).click();
    await dialog.getByRole("button", { name: "确定", exact: true }).click();
    // A slight hand movement on the capsule's padding must still edit the
    // dropdown, rather than start dragging its shadow or the parent sound block.
    const box = (await soundField.boundingBox())!;
    await page.mouse.move(box.x + 3, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 11, box.y + box.height / 2, { steps: 3 });
    await page.mouse.up();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "魔法", exact: true }).click();
    await dialog.getByRole("button", { name: "确定", exact: true }).click();
    await expect(soundField.locator(".blocklyText")).toHaveText("魔法");
    await expect(page.locator(".blocklyDragging")).toHaveCount(0);
    await dragSoundIntoWorkspace(page);
    await expect(
      page.getByRole("button", { name: "绿旗运行", exact: true }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "绿旗运行", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "停止运行", exact: true }),
    ).toBeEnabled();
  });
}
