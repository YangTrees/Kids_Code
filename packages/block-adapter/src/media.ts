/** Shared site prefix without importing Scratch Blocks during app startup. */
let mediaBaseUrl = "/";

export function setMediaBaseUrl(base: string): void {
  const trimmed = base.trim();
  mediaBaseUrl = trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

export function getMediaBaseUrl(): string {
  return mediaBaseUrl;
}
