import {
  BlockWorkspaceAdapter,
  type WorkspaceToolboxContext,
} from "@kids-code/block-adapter";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { countWorkspaceBlocks, useEditorStore } from "./editor-store";
import { useEditorRuntime } from "./EditorRuntimeContext";
import { getAssignedTaskId } from "../tasks/task-catalog";
import { BlockContextMenu, type BlockMenuTarget } from "./BlockContextMenu";

import { builtInSoundNames } from "./asset-catalog";

export function BlockWorkspaceHost() {
  const hostRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<BlockWorkspaceAdapter | null>(null);
  const selectedSpriteId = useEditorStore((state) => state.selectedSpriteId);
  const selectedCategory = useEditorStore((state) => state.selectedCategory);
  const projectId = useEditorStore((state) => state.project.projectId);
  const isHydrated = useEditorStore((state) => state.isHydrated);
  const sprites = useEditorStore((state) => state.project.sprites);
  const scenes = useEditorStore((state) => state.project.scenes);
  const assets = useEditorStore((state) => state.project.assets);
  const messages = useEditorStore((state) => state.project.messages);
  const variables = useEditorStore((state) => state.project.variables);
  const addVariable = useEditorStore((state) => state.addVariable);
  const historyRevision = useEditorStore((state) => state.historyRevision);
  const setWorkspaceState = useEditorStore((state) => state.setWorkspaceState);
  const [loadError, setLoadError] = useState(false);
  const { registerWorkspace } = useEditorRuntime();
  const createVariable = useCallback(() => {
    const name = window.prompt("给变量起个名字（最多12个字）", "变量1");
    if (name?.trim()) addVariable(name);
  }, [addVariable]);
  const [menuTarget, setMenuTarget] = useState<BlockMenuTarget | null>(null);
  const closeMenu = useCallback(() => setMenuTarget(null), []);
  const handleContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const adapter = adapterRef.current;
      if (!adapter) return;
      // Keep the browser menu out of the way; kids get our own menu instead.
      event.preventDefault();
      const blockId = adapter.getBlockIdFromEventTarget(event.target);
      const bounds = event.currentTarget.getBoundingClientRect();
      setMenuTarget({
        x: Math.max(
          0,
          Math.min(event.clientX - bounds.left, bounds.width - 190),
        ),
        y: Math.max(
          0,
          Math.min(event.clientY - bounds.top, bounds.height - 140),
        ),
        blockId,
        stackSize: blockId ? adapter.getBlockStackSize(blockId) : 0,
      });
    },
    [],
  );
  const duplicateFromMenu = useCallback(() => {
    const blockId = menuTarget?.blockId;
    setMenuTarget(null);
    if (blockId) adapterRef.current?.duplicateBlock(blockId);
  }, [menuTarget]);
  const deleteFromMenu = useCallback(() => {
    const blockId = menuTarget?.blockId;
    setMenuTarget(null);
    if (blockId) adapterRef.current?.deleteBlock(blockId);
  }, [menuTarget]);
  const cleanUpFromMenu = useCallback(() => {
    setMenuTarget(null);
    adapterRef.current?.cleanUpBlocks();
  }, []);
  const toolboxContext = useMemo<WorkspaceToolboxContext>(
    () => ({
      selectedSpriteId,
      sprites: sprites.map(({ spriteId, name }) => ({ spriteId, name })),
      scenes: scenes.map(({ sceneId, name }) => ({ sceneId, name })),
      spriteAssets: assets
        .filter((asset) => asset.type === "sprite")
        .map((asset) => ({
          assetId: asset.assetId,
          name:
            sprites.find((sprite) => sprite.costumeAssetId === asset.assetId)
              ?.name ?? asset.assetId,
        })),
      sounds: assets
        .filter((asset) => asset.type === "audio")
        .map((asset) => ({
          assetId: asset.assetId,
          name: asset.name ?? builtInSoundNames[asset.assetId] ?? asset.assetId,
        })),
      messages,
      variables: variables.map(({ variableId, name }) => ({
        variableId,
        name,
      })),
      onCreateVariable: createVariable,
    }),
    [
      assets,
      createVariable,
      messages,
      scenes,
      selectedSpriteId,
      sprites,
      variables,
    ],
  );

  useEffect(() => {
    const host = hostRef.current;
    // A fresh workspace (sprite switch, undo restore) invalidates the menu.
    setMenuTarget(null);
    if (!host || !isHydrated) return;
    const adapter = new BlockWorkspaceAdapter();
    const workspaceState =
      useEditorStore.getState().project.workspaceStates[selectedSpriteId];
    try {
      const currentProject = useEditorStore.getState().project;
      const otherBlockCount = Object.entries(
        currentProject.workspaceStates,
      ).reduce(
        (total, [spriteId, state]) =>
          spriteId === selectedSpriteId
            ? total
            : total + countWorkspaceBlocks(state),
        0,
      );
      adapter.mount(
        host,
        (nextWorkspaceState) =>
          setWorkspaceState(selectedSpriteId, nextWorkspaceState),
        workspaceState && typeof workspaceState === "object"
          ? workspaceState
          : undefined,
        !getAssignedTaskId(projectId),
        {
          ...toolboxContext,
          maxBlocks: Math.max(0, 1_000 - otherBlockCount),
        },
      );
      adapterRef.current = adapter;
      adapter.selectCategory(useEditorStore.getState().selectedCategory);
      setLoadError(false);
      registerWorkspace(adapter);
    } catch (error) {
      console.error("Failed to mount the block workspace", error);
      setLoadError(true);
      return;
    }
    const observer = new ResizeObserver(() => adapter.resize());
    observer.observe(host);
    return () => {
      observer.disconnect();
      registerWorkspace(null);
      adapterRef.current = null;
      adapter.destroy();
    };
  }, [
    historyRevision,
    isHydrated,
    projectId,
    registerWorkspace,
    selectedSpriteId,
    setWorkspaceState,
    toolboxContext,
  ]);

  useEffect(() => {
    adapterRef.current?.selectCategory(selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="block-workspace-shell" onContextMenu={handleContextMenu}>
      <div
        ref={hostRef}
        className="block-workspace-host"
        aria-label="积木脚本工作区"
      />
      {loadError ? (
        <div className="workspace-error" role="alert">
          积木工作区暂时没有加载成功，请刷新后再试。
        </div>
      ) : null}
      {menuTarget ? (
        <BlockContextMenu
          target={menuTarget}
          onDuplicate={duplicateFromMenu}
          onDelete={deleteFromMenu}
          onCleanUp={cleanUpFromMenu}
          onClose={closeMenu}
        />
      ) : null}
    </div>
  );
}
