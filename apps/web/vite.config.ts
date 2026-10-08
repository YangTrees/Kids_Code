import react from "@vitejs/plugin-react";
import fs from "node:fs/promises";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

/**
 * 站点部署的子路径（必须以 / 开头、以 / 结尾）。
 * 换部署目录时用环境变量覆盖即可，例如：VITE_BASE=/kids/ pnpm build
 */
const RAW_BASE = process.env.VITE_BASE ?? "/KidsCode/";
const BASE = `/${RAW_BASE.replace(/^\/+/, "").replace(/\/*$/, "")}/`;

/**
 * public/ 下的静态文件（manifest.webmanifest、sw.js）由 vite 原样复制，
 * 不会自动带上 base，这里用 %BASE_URL% 占位符在 dev/build 两处统一替换。
 */
function basePathPlugin(base: string): Plugin {
  const apply = (code: string): string => code.replaceAll("%BASE_URL%", base);
  const targets = ["manifest.webmanifest", "sw.js"];
  let outDir = "dist";

  return {
    name: "kids-code-base-path",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    transformIndexHtml: {
      order: "post",
      handler: (html) => apply(html),
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "").split("?")[0] ?? "";
        const name = targets.find((item) => url.endsWith(`/${item}`));
        if (!name) return next();
        void fs
          .readFile(path.resolve(process.cwd(), "public", name), "utf8")
          .then((content) => {
            res.setHeader(
              "Content-Type",
              name.endsWith(".js")
                ? "text/javascript; charset=utf-8"
                : "application/manifest+json; charset=utf-8",
            );
            res.end(apply(content));
          })
          .catch(() => next());
      });
    },
    async closeBundle() {
      await Promise.all(
        targets.map(async (name) => {
          const file = path.join(outDir, name);
          let content: string;
          try {
            content = await fs.readFile(file, "utf8");
          } catch {
            return;
          }
          if (!content.includes("%BASE_URL%")) return;
          await fs.writeFile(file, apply(content));
        }),
      );
    },
  };
}

export default defineConfig({
  base: BASE,
  plugins: [react(), basePathPlugin(BASE)],
  server: { host: "127.0.0.1", port: 4173 },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("scratch-blocks") || id.includes("/blockly@")) {
            return "scratch-blocks";
          }
          if (id.includes("pixi.js")) return "pixi";
          if (id.includes("react-dom") || id.includes("react-router")) {
            return "react";
          }
          return undefined;
        },
      },
    },
  },
  test: { environment: "jsdom", setupFiles: "./src/test/setup.ts" },
});
