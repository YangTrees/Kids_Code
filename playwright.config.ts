import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Pixi and Blockly both initialize real canvas/SVG surfaces. Give slower
  // WebKit and compact CI viewports enough time without masking assertions.
  timeout: 60_000,
  workers: 1,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    // 应用部署在子路径下（见 apps/web/vite.config.ts 的 base）。
    baseURL: "http://127.0.0.1:4173/KidsCode/",
    trace: "retain-on-failure",
    ...(process.env.PLAYWRIGHT_CHANNEL
      ? { channel: process.env.PLAYWRIGHT_CHANNEL }
      : {}),
  },
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:4173/KidsCode/",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "desktop-1366",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1366, height: 768 },
      },
    },
    {
      name: "compact-1024",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1024, height: 768 },
      },
    },
    {
      name: "ipad-landscape",
      use: {
        ...devices["iPad Pro 11 landscape"],
        // A supplied Chromium channel is for viewport/touch emulation only.
        browserName: process.env.PLAYWRIGHT_CHANNEL ? "chromium" : "webkit",
        viewport: { width: 1194, height: 834 },
      },
    },
  ],
});
