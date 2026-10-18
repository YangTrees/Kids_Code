import { StageController } from "@kids-code/stage";
import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "./editor-store";
import { useEditorRuntime } from "./EditorRuntimeContext";
import { useProjectPersistence } from "./ProjectPersistenceContext";
import { EditorSurfaceStatus } from "./EditorLoadStatus";
import { useTranslate } from "../../shared/use-translate";

export function StageHost({ gridVisible = true }: { gridVisible?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<StageController | null>(null);
  const gridVisibleRef = useRef(gridVisible);
  const [stageReady, setStageReady] = useState(false);
  const [stageError, setStageError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const t = useTranslate();
  const [thumbnailReady, setThumbnailReady] = useState(false);
  const project = useEditorStore((state) => state.project);
  const isHydrated = useEditorStore((state) => state.isHydrated);
  const updateSpritePosition = useEditorStore(
    (state) => state.updateSpritePosition,
  );
  const selectSprite = useEditorStore((state) => state.selectSprite);
  const { registerStage } = useEditorRuntime();
  const { saveThumbnail } = useProjectPersistence();
  const currentScene = project.scenes.find(
    (scene) => scene.sceneId === project.currentSceneId,
  );
  const currentBackdrop = project.assets.find(
    (asset) => asset.assetId === currentScene?.backdropAssetId,
  );
  const costumeSignature = project.sprites
    .map((sprite) => sprite.costumeAssetId)
    .join(",");

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !isHydrated) return;
    const controller = new StageController();
    const abortController = new AbortController();
    let cancelled = false;
    setStageReady(false);
    setStageError(false);
    registerStage(null);
    const fail = () => {
      if (cancelled) return;
      cancelled = true;
      window.clearTimeout(timeout);
      abortController.abort();
      registerStage(null);
      controllerRef.current = null;
      setStageReady(false);
      setStageError(true);
      controller.destroy();
      console.warn("[kids-code][load] stage-mount-failed");
    };
    const timeout = window.setTimeout(fail, 15_000);
    const onContextLost = (event: Event) => {
      event.preventDefault();
      fail();
    };
    host.addEventListener("webglcontextlost", onContextLost, true);
    // 17.5：只记录性能事件代码，不采集作品内容。
    controller.setPerformanceWarningHandler((code) => {
      console.warn(`[kids-code][performance] ${code}`);
    });
    const mountTimer = window.setTimeout(() => {
      if (cancelled) return;
      void controller
        .mount(
          host,
          project,
          updateSpritePosition,
          selectSprite,
          abortController.signal,
        )
        .then((mounted) => {
          window.clearTimeout(timeout);
          if (cancelled) {
            controller.destroy();
          } else if (!mounted) {
            fail();
          } else {
            controllerRef.current = controller;
            setStageReady(true);
            controller.setGridVisible(gridVisibleRef.current);
            registerStage(controller);
          }
        })
        .catch(() => {
          window.clearTimeout(timeout);
          fail();
        });
    }, 0);
    return () => {
      cancelled = true;
      abortController.abort();
      window.clearTimeout(mountTimer);
      window.clearTimeout(timeout);
      host.removeEventListener("webglcontextlost", onContextLost, true);
      registerStage(null);
      controllerRef.current = null;
      setStageReady(false);
      controller.destroy();
    };
  }, [
    isHydrated,
    loadAttempt,
    project.currentSceneId,
    project.projectId,
    project.scenes.length,
    project.sprites.length,
    project.settings.movementStep,
    costumeSignature,
    currentBackdrop?.assetId,
    currentBackdrop?.path,
    registerStage,
    selectSprite,
    updateSpritePosition,
  ]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller || !currentScene) return;
    controller.updateEditorSnapshot(project);
    for (const instance of currentScene.instances) {
      controller.setSpritePosition(
        instance.spriteId,
        instance.transform.x,
        instance.transform.y,
      );
      controller.setSpriteRotation(
        instance.spriteId,
        instance.transform.rotation,
      );
      controller.setSpriteScale(instance.spriteId, instance.transform.scaleX);
      controller.setSpriteVisible(instance.spriteId, instance.visible);
      controller.setSpriteZIndex(instance.spriteId, instance.zIndex);
    }
  }, [currentScene]);

  useEffect(() => {
    gridVisibleRef.current = gridVisible;
    controllerRef.current?.setGridVisible(gridVisible);
  }, [gridVisible]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller || !isHydrated || !stageReady) return;
    let active = true;
    setThumbnailReady(false);
    const timer = window.setTimeout(() => {
      void controller
        .captureThumbnail()
        .then(async (blob) => {
          if (!blob) return;
          await saveThumbnail(blob);
          if (active) setThumbnailReady(true);
        })
        .catch((error: unknown) => {
          console.error("Failed to save the stage thumbnail", error);
        });
    }, 700);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [isHydrated, project.updatedAt, saveThumbnail, stageReady]);

  return (
    <div className="stage-surface-root">
      <div
        ref={hostRef}
        className="stage-canvas-host"
        aria-label="作品舞台"
        data-thumbnail-ready={thumbnailReady}
      />
      {!stageReady && (
        <EditorSurfaceStatus
          title={t(stageError ? "editor.load.stageError" : "editor.load.stage")}
          {...(stageError
            ? {
                message: t("editor.load.surfaceHint"),
                onRetry: () => setLoadAttempt((attempt) => attempt + 1),
              }
            : {})}
        />
      )}
    </div>
  );
}
