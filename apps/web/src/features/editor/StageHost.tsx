import { StageController } from "@kids-code/stage";
import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "./editor-store";
import { useEditorRuntime } from "./EditorRuntimeContext";
import { useProjectPersistence } from "./ProjectPersistenceContext";

export function StageHost({ gridVisible = true }: { gridVisible?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<StageController | null>(null);
  const gridVisibleRef = useRef(gridVisible);
  const [stageReady, setStageReady] = useState(false);
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
          if (cancelled || !mounted) {
            controller.destroy();
          } else {
            controllerRef.current = controller;
            setStageReady(true);
            controller.setGridVisible(gridVisibleRef.current);
            registerStage(controller);
          }
        })
        .catch((error: unknown) => {
          console.error("Failed to mount the stage", error);
        });
    }, 0);
    return () => {
      cancelled = true;
      abortController.abort();
      window.clearTimeout(mountTimer);
      registerStage(null);
      controllerRef.current = null;
      setStageReady(false);
      controller.destroy();
    };
  }, [
    isHydrated,
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
    <div
      ref={hostRef}
      className="stage-canvas-host"
      aria-label="作品舞台"
      data-thumbnail-ready={thumbnailReady}
    />
  );
}
