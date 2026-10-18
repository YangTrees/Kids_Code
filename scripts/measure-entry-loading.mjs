/* global console, localStorage, navigator, performance, URL, process */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import { startProductionTestServer } from "./production-test-server.mjs";

const label = process.argv.includes("--baseline") ? "before" : "after";
const server = await startProductionTestServer(4185);
let browser;
const samples = [];
const round = (ms) => Math.round(ms);
const heavy = (urls) =>
  urls.filter((url) => /\/(scratch-blocks|pixi)-[^/]+\.js/.test(url));
try {
  browser = await chromium.launch();
  for (let sample = 1; sample <= 3; sample++) {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    });
    const page = await context.newPage();
    const loadedJS = new Set();
    page.on("response", (response) => {
      if (/\.js(?:\?|$)/.test(response.url())) loadedJS.add(response.url());
    });
    await page.addInitScript(() =>
      localStorage.setItem("kids-code-tutorial-step", "3"),
    );
    await page.goto(server.baseURL, { waitUntil: "load" });
    await expect(page.locator(".projects-page")).toBeVisible();
    const home = await page.evaluate(() => ({
      observedReadyMs: performance.now(),
      fcpMs:
        performance.getEntriesByName("first-contentful-paint")[0]?.startTime ??
        null,
      jsDecodedBytes: performance
        .getEntriesByType("resource")
        .filter((resource) => /\.js(?:\?|$)/.test(resource.name))
        .reduce((sum, resource) => sum + resource.decodedBodySize, 0),
    }));
    const homeHeavyChunks = heavy([...loadedJS]).map(
      (url) => new URL(url).pathname,
    );
    await page.goto(server.baseURL + "learn");
    await expect(page.locator(".course-level")).toHaveCount(64);
    const learnHeavyChunks = heavy([...loadedJS]).map(
      (url) => new URL(url).pathname,
    );
    const editorStartedAt = await page.evaluate(() => performance.now());
    await page.getByRole("button", { name: "开始第一关" }).click();
    await expect(
      page.locator(".block-workspace-host .blocklySvg"),
    ).toBeVisible();
    await expect(page.locator(".pixi-stage-canvas")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "运行作品", exact: true }).first(),
    ).toBeEnabled();
    const firstEditorObservedMs =
      (await page.evaluate(() => performance.now())) - editorStartedAt;
    const editorHeavyChunks = heavy([...loadedJS]).map(
      (url) => new URL(url).pathname,
    );
    await page.waitForFunction(() =>
      Boolean(navigator.serviceWorker.controller),
    );
    await page.reload();
    await expect(
      page.locator(".block-workspace-host .blocklySvg"),
    ).toBeVisible();
    await expect(page.locator(".pixi-stage-canvas")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "运行作品", exact: true }).first(),
    ).toBeEnabled();
    const warmEditorObservedMs = await page.evaluate(() => performance.now());
    samples.push({
      sample,
      home: {
        ...home,
        observedReadyMs: round(home.observedReadyMs),
        fcpMs: home.fcpMs === null ? null : round(home.fcpMs),
        heavyChunks: homeHeavyChunks,
      },
      learnHeavyChunks,
      firstEditorObservedMs: round(firstEditorObservedMs),
      warmEditorObservedMs: round(warmEditorObservedMs),
      editorHeavyChunks,
    });
    await context.close();
  }
  const report = {
    generatedAt: new Date().toISOString(),
    label,
    browser: browser.version(),
    environment: `${process.platform}/${process.arch}; local production server; no network or CPU throttling`,
    scope:
      "Three disposable profiles, real production UI. First editor starts after home/learn. Warm reload uses the same profile and service worker. Timings include automation observation/dispatch overhead; not real-device, network or child testing.",
    samples,
  };
  await mkdir("artifacts/performance", { recursive: true });
  await writeFile(
    `artifacts/performance/entry-${label}.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  if (label === "after") {
    assert.ok(
      samples.every(
        (sample) =>
          sample.home.heavyChunks.length === 0 &&
          sample.learnHeavyChunks.length === 0,
      ),
      "Home/learn must not eagerly request Scratch/Pixi chunks",
    );
    assert.ok(
      samples.every(
        (sample) =>
          sample.editorHeavyChunks.some((url) =>
            url.includes("scratch-blocks-"),
          ) && sample.editorHeavyChunks.some((url) => url.includes("pixi-")),
      ),
      "Editor must still load both real engines",
    );
  }
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  await server.close();
}
