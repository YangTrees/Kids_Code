/* global console, URL, localStorage, navigator, location, indexedDB, caches, fetch */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

// Use only a production build and a disposable browser profile.
const root = path.resolve(
  fileURLToPath(new URL("../apps/web/dist/", import.meta.url)),
);
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".wav": "audio/wav",
};
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, "http://localhost").pathname;
    if (!pathname.startsWith("/KidsCode/")) {
      response.writeHead(404).end();
      return;
    }
    let file = path.resolve(root, decodeURIComponent(pathname.slice(10)));
    if (file !== root && !file.startsWith(root + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    const info = await stat(file).catch(() => null);
    if (!info?.isFile()) {
      if (path.extname(file)) {
        response.writeHead(404).end();
        return;
      }
      file = path.join(root, "index.html");
    }
    response.writeHead(200, {
      "Content-Type": mime[path.extname(file)] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(await readFile(file));
  } catch {
    response.writeHead(500).end();
  }
});
await new Promise((resolve) => server.listen(4184, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
  });
  const page = await context.newPage();
  await page.addInitScript(() =>
    localStorage.setItem("kids-code-tutorial-step", "3"),
  );
  await page.goto("http://127.0.0.1:4184/KidsCode/learn");
  await page.waitForFunction(
    () => Boolean(navigator.serviceWorker.controller),
    undefined,
    { timeout: 30000 },
  );
  await page.getByRole("button", { name: "开始第一关" }).click();
  await expect(page.getByLabel("当前挑战")).toContainText("让团团说话");
  await expect(page.locator(".pixi-stage-canvas")).toBeVisible();
  await expect(page.locator(".blocklySvg")).toBeVisible();
  await page.evaluate(async () => {
    const id = location.pathname.split("/").at(-1);
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("kids-code-studio");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction("projects", "readwrite");
    const store = tx.objectStore("projects");
    const record = await new Promise((resolve) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
    });
    record.project.workspaceStates[record.project.course.bindings.actor] = {
      blocks: {
        blocks: [
          {
            type: "event_whenflagclicked",
            id: "offline-flag",
            x: 40,
            y: 40,
            next: {
              block: {
                type: "looks_sayforsecs",
                id: "offline-say",
                inputs: {
                  MESSAGE: {
                    shadow: { type: "text", fields: { TEXT: "离线也能编程" } },
                  },
                  SECS: {
                    shadow: { type: "math_number", fields: { NUM: 0.5 } },
                  },
                },
              },
            },
          },
        ],
      },
    };
    record.revision = Date.now();
    store.put(record);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await expect(
    page.locator(".blocklyBlockCanvas").filter({ hasText: "离线也能编程" }),
  ).toBeVisible();
  const cached = await page.evaluate(async () => {
    const cache = await caches.open("kids-code-shell-v8-lesson-feedback");
    return (await cache.keys()).map((request) => new URL(request.url).pathname);
  });
  for (const resource of [
    "characters/story-ip/tuantuan-stage-front-v1.webp",
    "characters/story-ip/tuantuan-stage-right-v1.webp",
    "objects/story-ip/treasure-chest-v1.webp",
    "objects/story-ip/star-coin-v1.webp",
    "backgrounds/story-ip/garden-v1.webp",
    "backgrounds/story-ip/cloud-island-v1.webp",
    "backgrounds/story-ip/data-workshop-v1.webp",
    "ui/story-ip/diandian-hint-v2.webp",
    "ui/story-ip/tuantuan-curious-v1.webp",
    "ui/story-ip/tuantuan-happy-v1.webp",
    "ui/story-ip/unit-basics-v1.webp",
    "ui/story-ip/unit-interaction-v1.webp",
    "ui/story-ip/unit-thinking-v1.webp",
    "ui/story-ip/unit-creation-v1.webp",
    "ui/story-ip/unit-route-v1.webp",
    "ui/story-ip/unit-sky-v1.webp",
    "ui/story-ip/unit-data-v1.webp",
    "ui/story-ip/unit-patterns-v1.webp",
    "ui/story-ip/unit-decisions-v1.webp",
    "ui/story-ip/unit-makers-v1.webp",
    "sounds/bell.wav",
    "sounds/door-open.wav",
    "sounds/game-over.wav",
    "sounds/hello.wav",
    "sounds/hello-tuantuan.wav",
    "characters/liji/liji-idle.png",
  ])
    assert.ok(cached.includes("/KidsCode/assets/" + resource), resource);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel("当前挑战")).toContainText("让团团说话");
  await expect(page.locator(".pixi-stage-canvas")).toBeVisible();
  await expect(page.locator(".blocklySvg")).toBeVisible();
  const offlineVoices = await page.evaluate(async () => {
    return Promise.all(
      ["hello.wav", "hello-tuantuan.wav"].map(async (name) => {
        const response = await fetch("/KidsCode/assets/sounds/" + name);
        const bytes = new Uint8Array(await response.arrayBuffer());
        return {
          ok: response.ok,
          size: bytes.length,
          header: String.fromCharCode(...bytes.subarray(0, 4)),
        };
      }),
    );
  });
  for (const voice of offlineVoices) {
    assert.ok(
      voice.ok && voice.size > 10000 && voice.header === "RIFF",
      "Bundled Chinese voice must be available offline",
    );
  }
  const mentor = page.getByAltText("点点陪你完成挑战");
  await expect
    .poll(() => mentor.evaluate((image) => image.naturalWidth))
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "运行作品" }).first().click();
  await expect(page.getByRole("dialog", { name: "任务完成！" })).toBeVisible();
  await page.screenshot({ path: "artifacts/story-ip/offline-v4.png" });
  console.log(
    "Verified production offline v8: cached story assets and Chinese WAV voices, restored course and blocks, completed lesson.",
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
