// Development fixtures must share the actual Vite module identity after HMR.
// A literal dynamic import of editor-store.ts can otherwise create a second
// singleton when the live application imported editor-store.ts?t=<timestamp>.
if (!import.meta.env.DEV) throw new Error("Development acceptance only");
export { useEditorStore } from "../editor/editor-store";
export { compileSerializedWorkspace } from "@kids-code/block-adapter";
export { blockSerialization } from "@kids-code/block-adapter/testing";
