import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./app/App";
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

syncDocumentPreferences();

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.error("Offline support failed to initialize", error);
    });
  });
}
