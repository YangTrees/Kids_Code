import {
  BlockWorkspaceAdapter,
  type WorkspaceToolboxContext,
  type BlockParameter,
} from "@kids-code/block-adapter";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { countWorkspaceBlocks, useEditorStore } from "./editor-store";
import { useEditorRuntime } from "./EditorRuntimeContext";
import {
  getAssignedTaskId,
  getAssignedCreationTask,
} from "../tasks/task-catalog";
import { getLessonConfig } from "../tasks/lesson-config";
import { getGridDimensions } from "@kids-code/domain";
import {
  ParameterDialog,
  ParameterListDialog,
  VariableNameDialog,
} from "./LearningDialogs";
import { BlockContextMenu, type BlockMenuTarget } from "./BlockContextMenu";

import { builtInSoundNames } from "./asset-catalog";
import { EditorSurfaceStatus } from "./EditorLoadStatus";
import { useTranslate } from "../../shared/use-translate";

export function BlockWorkspaceHost({
  fullTools = false,
}: {
  fullTools?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<BlockWorkspaceAdapter | null>(null);
  const selectedSpriteId = useEditorStore((state) => state.selectedSpriteId);
  const selectedCategory = useEditorStore((state) => state.selectedCategory);
  const projectId = useEditorStore((state) => state.project.projectId);
  const project = useEditorStore((state) => state.project);
  const lesson = getLessonConfig(getAssignedCreationTask(project));
  const { columns, rows } = getGridDimensions(project);
  const [parameter, setParameter] = useState<BlockParameter | null>(null);
  const [parameterChoices, setParameterChoices] = useState<
    BlockParameter[] | null
  >(null);
  const [variableOpen, setVariableOpen] = useState(false);
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
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const t = useTranslate();
  const { registerWorkspace, stop } = useEditorRuntime();
  const createVariable = useCallback(() => {
    adapterRef.current?.cancelGesture();
    setVariableOpen(true);
  }, []);
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
      ...(!fullTools && lesson
        ? { allowedBlockTypes: lesson.allowedBlockTypes }
        : {}),
      coordinateGrid: { columns, rows },
    }),
    [
      assets,
      createVariable,
      messages,
      scenes,
      selectedSpriteId,
      sprites,
      variables,
      fullTools,
      lesson,
      columns,
      rows,
    ],
  );

  useEffect(() => {
    const host = hostRef.current;
    // A fresh workspace (sprite switch, undo restore) invalidates the menu.
    setMenuTarget(null);
    if (!host || !isHydrated) return;
    let active = true;
    setWorkspaceReady(false);
    setLoadError(false);
    registerWorkspace(null);
    const adapter = new BlockWorkspaceAdapter();
    const fail = () => {
      if (!active) return;
      console.warn("[kids-code][load] workspace-restore-failed");
      registerWorkspace(null);
      adapterRef.current = null;
      adapter.destroy();
      setWorkspaceReady(false);
      setLoadError(true);
    };
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
        (nextWorkspaceState) => {
          if (!active || adapterRef.current !== adapter) return;
          const previous =
            useEditorStore.getState().project.workspaceStates[selectedSpriteId];
          if (JSON.stringify(previous) === JSON.stringify(nextWorkspaceState))
            return;
          if (lesson) stop();
          setWorkspaceState(selectedSpriteId, nextWorkspaceState);
        },
        workspaceState && typeof workspaceState === "object"
          ? workspaceState
          : undefined,
        !getAssignedTaskId(currentProject),
        {
          ...toolboxContext,
          maxBlocks: Math.max(0, 1_000 - otherBlockCount),
        },
        {
          onReady: () => {
            if (!active) return;
            setWorkspaceReady(true);
            registerWorkspace(adapter);
          },
          onError: fail,
        },
      );
      adapterRef.current = adapter;
      adapter.selectCategory(useEditorStore.getState().selectedCategory);
      setLoadError(false);
    } catch {
      fail();
    }
    const observer = new ResizeObserver(() => adapter.resize());
    observer.observe(host);
    return () => {
      active = false;
      observer.disconnect();
      registerWorkspace(null);
      adapterRef.current = null;
      adapter.destroy();
    };
  }, [
    historyRevision,
    loadAttempt,
    isHydrated,
    projectId,
    registerWorkspace,
    selectedSpriteId,
    setWorkspaceState,
    toolboxContext,
    lesson,
    stop,
  ]);

  useEffect(() => {
    adapterRef.current?.selectCategory(selectedCategory);
  }, [selectedCategory]);

  return (
    <div
      className="block-workspace-shell"
      onContextMenu={handleContextMenu}
      onPointerDownCapture={(event) => {
        if (!lesson) return;
        const target = adapterRef.current?.parameterAt(event.target);
        if (!target) return;
        event.preventDefault();
        event.stopPropagation();
        adapterRef.current?.cancelGesture();
        setParameter(target);
      }}
      onMouseDownCapture={(event) => {
        if (lesson && adapterRef.current?.parameterAt(event.target)) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <div
        ref={hostRef}
        className="block-workspace-host"
        aria-label="积木脚本工作区"
        tabIndex={0}
      />
      {lesson && workspaceReady && (
        <button
          type="button"
          className="workspace-parameter-trigger"
          aria-label="打开积木参数列表"
          onClick={() => {
            adapterRef.current?.cancelGesture();
            setParameterChoices(adapterRef.current?.listParameters() ?? []);
          }}
        >
          修改参数
        </button>
      )}
      {parameterChoices && (
        <ParameterListDialog
          parameters={parameterChoices}
          onChoose={(choice) => {
            setParameterChoices(null);
            setParameter(choice);
          }}
          onClose={() => setParameterChoices(null)}
        />
      )}
      {parameter && (
        <ParameterDialog
          parameter={parameter}
          project={project}
          onSave={(value) => {
            stop();
            const edited =
              adapterRef.current?.editParameter(parameter, value) ?? false;
            const snapshot = edited ? adapterRef.current?.save() : undefined;
            if (snapshot) setWorkspaceState(selectedSpriteId, snapshot);
            return edited;
          }}
          onClose={() => {
            adapterRef.current?.cancelGesture();
            setParameter(null);
            hostRef.current?.focus();
          }}
        />
      )}
      {variableOpen && (
        <VariableNameDialog
          existingNames={variables.map((item) => item.name)}
          onCreate={addVariable}
          onClose={() => {
            setVariableOpen(false);
            hostRef.current?.focus();
          }}
        />
      )}
      {!workspaceReady && (
        <EditorSurfaceStatus
          title={t(
            loadError ? "editor.load.workspaceError" : "editor.load.workspace",
          )}
          {...(loadError
            ? {
                message: t("editor.load.surfaceHint"),
                onRetry: () => setLoadAttempt((attempt) => attempt + 1),
              }
            : {})}
        />
      )}
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
