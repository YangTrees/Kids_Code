import { setMediaBaseUrl } from "@kids-code/block-adapter";
import { setAssetBaseUrl } from "@kids-code/stage";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./app/App";
import { APP_BASE_URL, ROUTER_BASENAME } from "./shared/base-url";
import { useSettingsStore } from "./shared/settings-store";
import "./styles/global.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element is missing");

/** 把全局偏好同步到 <html>，供 CSS 与浏览器读取。 */
function syncDocumentPreferences(): void {
  const apply = (settings: { reduceMotion: boolean; locale: string }): void => {
    document.documentElement.dataset.reduceMotion = String(
      settings.reduceMotion,
    );
    document.documentElement.lang = settings.locale;
  };
  apply(useSettingsStore.getState());
  useSettingsStore.subscribe((state) =>
    apply({ reduceMotion: state.reduceMotion, locale: state.locale }),
  );
}

// 站点部署在子路径（/KidsCode/）时，素材与积木媒体也要跟着走同一前缀。
setAssetBaseUrl(APP_BASE_URL);
setMediaBaseUrl(APP_BASE_URL);

/** PWA 清单与图标用站点前缀动态注入（index.html 中写会遭遇 vite 的二次前缀）。 */
function injectHeadLinks(): void {
  const links: Array<[string, string, string?]> = [
    ["manifest", `${APP_BASE_URL}manifest.webmanifest`],
    ["icon", `${APP_BASE_URL}assets/icons/green-flag.svg`, "image/svg+xml"],
    ["apple-touch-icon", `${APP_BASE_URL}assets/objects/star-coin.png`],
  ];
  for (const [rel, href, type] of links) {
    const link = document.createElement("link");
    link.rel = rel;
    link.href = href;
    if (type) link.type = type;
    document.head.append(link);
  }
}
injectHeadLinks();

syncDocumentPreferences();

createRoot(root).render(
  <StrictMode>
    <BrowserRouter basename={ROUTER_BASENAME}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register(`${APP_BASE_URL}sw.js`)
      .catch((error: unknown) => {
        console.error("Offline support failed to initialize", error);
      });
  });
}
