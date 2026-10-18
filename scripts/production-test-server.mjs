/* global URL */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Isolated, local-only server for acceptance scripts, never the user's preview. */
export async function startProductionTestServer(port) {
  const root = fileURLToPath(new URL("../apps/web/dist/", import.meta.url));
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
      const resolvedRoot = path.resolve(root);
      if (file !== resolvedRoot && !file.startsWith(resolvedRoot + path.sep)) {
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
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return {
    baseURL: `http://127.0.0.1:${port}/KidsCode/`,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}
