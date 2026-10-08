/**
 * 站点部署路径的统一入口。
 *
 * 应用目前部署在子路径 `/KidsCode/` 下（见 vite.config.ts 的 base）。
 * 所有静态资源、路由、Service Worker 都必须带上这个前缀，
 * 因此这里集中导出，避免各处硬编码 "/assets/..."。
 */

/** 站点基础路径，始终以 "/" 结尾，例如 "/KidsCode/"。 */
export const APP_BASE_URL: string = (import.meta.env.BASE_URL ?? "/") as string;

/** react-router 需要的 basename，不带结尾斜杠，例如 "/KidsCode"。 */
export const ROUTER_BASENAME: string = APP_BASE_URL.replace(/\/+$/, "");

/** 把素材的相对路径（如 "characters/liji/liji-idle.png"）拼成可访问的 URL。 */
export const assetUrl = (path: string): string =>
  `${APP_BASE_URL}assets/${path}`;
