/** Asset paths are usable before the renderer is loaded. No Pixi dependency here. */
const localAssetUrls = new Map<string, string>();
let assetBaseUrl = "/";

export function setAssetBaseUrl(base: string): void {
  const trimmed = base.trim();
  assetBaseUrl = trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

export function getAssetBaseUrl(): string {
  return assetBaseUrl;
}

export function registerLocalAssetUrl(path: string, url: string): void {
  const previous = localAssetUrls.get(path);
  if (previous && previous !== url) URL.revokeObjectURL(previous);
  localAssetUrls.set(path, url);
}

export function unregisterLocalAssetUrl(path: string): void {
  const url = localAssetUrls.get(path);
  if (url) URL.revokeObjectURL(url);
  localAssetUrls.delete(path);
}

export const resolveAssetUrl = (path: string): string =>
  localAssetUrls.get(path) ?? `${assetBaseUrl}assets/${path}`;
