import {
  createDefaultProject,
  getMovementStep,
  snapStagePositionToGrid,
  upgradeProjectCoordinates,
  type Project,
} from "@kids-code/domain";
import { create } from "zustand";
import type {
  BackgroundLibraryAsset,
  SpriteLibraryAsset,
} from "./asset-catalog";

export type BlockCategory =
  "event" | "motion" | "looks" | "sound" | "control" | "game";
export type SaveStatus = "saved" | "dirty" | "saving" | "error";

interface EditorSnapshot {
  project: Project;
  selectedSpriteId: string;
}

let applyingHistory = false;
let lastTransformHistoryAt = 0;

const getNewScenePosition = (project: Project, index: number) =>
  snapStagePositionToGrid(
    project,
    80 + (index % 5) * 80,
    280 - Math.floor(index / 5) * 40,
  );

interface EditorState {
  project: Project;
  selectedSpriteId: string;
  selectedCategory: BlockCategory;
  saveStatus: SaveStatus;
  isHydrated: boolean;
  workspaceHistory: Record<string, object[]>;
  workspaceFuture: Record<string, object[]>;
  projectHistory: EditorSnapshot[];
  projectFuture: EditorSnapshot[];
  historyRevision: number;
  selectSprite: (spriteId: string) => void;
  selectCategory: (category: BlockCategory) => void;
  hydrateProject: (project: Project) => void;
  replaceProject: (project: Project) => void;
  setWorkspaceState: (spriteId: string, workspaceState: object) => void;
  undoWorkspace: (spriteId: string) => void;
  redoWorkspace: (spriteId: string) => void;
  undoProject: () => void;
  redoProject: () => void;
  addVariable: (name: string) => void;
  addMessage: (name: string) => void;
  removeMessage: (messageId: string) => void;
  addSoundAsset: (sound: {
    assetId: string;
    name: string;
    path: string;
  }) => void;
  renameSoundAsset: (assetId: string, name: string) => void;
  removeSoundAsset: (assetId: string) => void;
  addSprite: () => void;
  addSpriteFromLibrary: (asset: SpriteLibraryAsset) => void;
  duplicateSprite: (spriteId: string) => void;
  deleteSprite: (spriteId: string) => void;
  renameSprite: (spriteId: string, name: string) => void;
  selectScene: (sceneId: string) => void;
  addScene: () => void;
  addSceneFromLibrary: (asset: BackgroundLibraryAsset) => void;
  updateSceneBackdrop: (sceneId: string, asset: BackgroundLibraryAsset) => void;
  renameScene: (sceneId: string, name: string) => void;
  deleteScene: (sceneId: string) => void;
  moveScene: (sceneId: string, direction: "previous" | "next") => void;
  updateSpritePosition: (spriteId: string, x: number, y: number) => void;
  updateSpriteProperties: (
    spriteId: string,
    properties: {
      x: number;
      y: number;
      rotation: number;
      scale: number;
      visible: boolean;
    },
  ) => void;
  moveSpriteLayer: (spriteId: string, direction: "front" | "back") => void;
  updateProjectSettings: (
    name: string,
    locale: string,
    movementStep?: 10 | 40,
  ) => void;
  setSaveStatus: (status: SaveStatus) => void;
  markDirty: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  project: createDefaultProject(new Date("2026-08-07T12:00:00.000Z")),
  selectedSpriteId: "spr_liji",
  selectedCategory: "event",
  saveStatus: "saved",
  isHydrated: false,
  workspaceHistory: {},
  workspaceFuture: {},
  projectHistory: [],
  projectFuture: [],
  historyRevision: 0,
  selectSprite: (spriteId) => set({ selectedSpriteId: spriteId }),
  selectCategory: (selectedCategory) => set({ selectedCategory }),
  hydrateProject: (project) =>
    set({
      project: upgradeProjectCoordinates(project),
      selectedSpriteId: project.sprites[0]?.spriteId ?? "",
      saveStatus: "saved",
      isHydrated: true,
      workspaceHistory: {},
      workspaceFuture: {},
      projectHistory: [],
      projectFuture: [],
      historyRevision: 0,
    }),
  replaceProject: (project) =>
    set({
      project: upgradeProjectCoordinates(project),
      selectedSpriteId: project.sprites[0]?.spriteId ?? "",
      saveStatus: "dirty",
      isHydrated: true,
      workspaceHistory: {},
      workspaceFuture: {},
      projectHistory: [],
      projectFuture: [],
      historyRevision: 0,
    }),
  setWorkspaceState: (spriteId, workspaceState) =>
    set((state) => {
      const previous = state.project.workspaceStates[spriteId];
      return {
        project: {
          ...state.project,
          updatedAt: new Date().toISOString(),
          workspaceStates: {
            ...state.project.workspaceStates,
            [spriteId]: workspaceState,
          },
        },
        saveStatus: "dirty",
        workspaceHistory: previous
          ? {
              ...state.workspaceHistory,
              [spriteId]: [
                ...(state.workspaceHistory[spriteId] ?? []),
                previous,
              ].slice(-30),
            }
          : state.workspaceHistory,
        workspaceFuture: { ...state.workspaceFuture, [spriteId]: [] },
      };
    }),
  undoWorkspace: (spriteId) =>
    set((state) => {
      const history = state.workspaceHistory[spriteId] ?? [];
      const current = state.project.workspaceStates[spriteId];
      const previous = history.at(-1);
      if (!previous || !current) return state;
      return {
        project: {
          ...state.project,
          updatedAt: new Date().toISOString(),
          workspaceStates: {
            ...state.project.workspaceStates,
            [spriteId]: previous,
          },
        },
        saveStatus: "dirty",
        workspaceHistory: {
          ...state.workspaceHistory,
          [spriteId]: history.slice(0, -1),
        },
        workspaceFuture: {
          ...state.workspaceFuture,
          [spriteId]: [
            ...(state.workspaceFuture[spriteId] ?? []),
            current,
          ].slice(-30),
        },
      };
    }),
  redoWorkspace: (spriteId) =>
    set((state) => {
      const future = state.workspaceFuture[spriteId] ?? [];
      const current = state.project.workspaceStates[spriteId];
      const next = future.at(-1);
      if (!next || !current) return state;
      return {
        project: {
          ...state.project,
          updatedAt: new Date().toISOString(),
          workspaceStates: {
            ...state.project.workspaceStates,
            [spriteId]: next,
          },
        },
        saveStatus: "dirty",
        workspaceHistory: {
          ...state.workspaceHistory,
          [spriteId]: [
            ...(state.workspaceHistory[spriteId] ?? []),
            current,
          ].slice(-30),
        },
        workspaceFuture: {
          ...state.workspaceFuture,
          [spriteId]: future.slice(0, -1),
        },
      };
    }),
  undoProject: () => {
    applyingHistory = true;
    set((state) => {
      const previous = state.projectHistory.at(-1);
      if (!previous) return state;
      return {
        project: { ...previous.project, updatedAt: new Date().toISOString() },
        selectedSpriteId: previous.project.sprites.some(
          (sprite) => sprite.spriteId === previous.selectedSpriteId,
        )
          ? previous.selectedSpriteId
          : (previous.project.sprites[0]?.spriteId ?? ""),
        projectHistory: state.projectHistory.slice(0, -1),
        projectFuture: [
          ...state.projectFuture,
          { project: state.project, selectedSpriteId: state.selectedSpriteId },
        ].slice(-30),
        historyRevision: state.historyRevision + 1,
        saveStatus: "dirty",
      };
    });
    applyingHistory = false;
  },
  redoProject: () => {
    applyingHistory = true;
    set((state) => {
      const next = state.projectFuture.at(-1);
      if (!next) return state;
      return {
        project: { ...next.project, updatedAt: new Date().toISOString() },
        selectedSpriteId: next.project.sprites.some(
          (sprite) => sprite.spriteId === next.selectedSpriteId,
        )
          ? next.selectedSpriteId
          : (next.project.sprites[0]?.spriteId ?? ""),
        projectHistory: [
          ...state.projectHistory,
          { project: state.project, selectedSpriteId: state.selectedSpriteId },
        ].slice(-30),
        projectFuture: state.projectFuture.slice(0, -1),
        historyRevision: state.historyRevision + 1,
        saveStatus: "dirty",
      };
    });
    applyingHistory = false;
  },
  addVariable: (name) =>
    set((state) => {
      const normalized = name.trim().slice(0, 12);
      if (
        !normalized ||
        state.project.variables.length >= 20 ||
        state.project.variables.some((variable) => variable.name === normalized)
      )
        return state;
      return {
        project: {
          ...state.project,
          updatedAt: new Date().toISOString(),
          variables: [
            ...state.project.variables,
            {
              variableId: `var_${crypto.randomUUID().slice(0, 8)}`,
              name: normalized,
              initialValue: 0,
              visible: true,
            },
          ],
        },
        projectHistory: [
          ...state.projectHistory,
          { project: state.project, selectedSpriteId: state.selectedSpriteId },
        ].slice(-30),
        projectFuture: [],
        historyRevision: state.historyRevision + 1,
        saveStatus: "dirty" as const,
      };
    }),
  addMessage: (name) =>
    set((state) => {
      const normalized = name.trim().slice(0, 16);
      if (
        !normalized ||
        state.project.messages.length >= 20 ||
        state.project.messages.some((message) => message.name === normalized)
      )
        return state;
      return {
        project: {
          ...state.project,
          updatedAt: new Date().toISOString(),
          messages: [
            ...state.project.messages,
            {
              messageId: `msg_${crypto.randomUUID().slice(0, 8)}`,
              name: normalized,
            },
          ],
        },
        projectHistory: [
          ...state.projectHistory,
          { project: state.project, selectedSpriteId: state.selectedSpriteId },
        ].slice(-30),
        projectFuture: [],
        historyRevision: state.historyRevision + 1,
        saveStatus: "dirty" as const,
      };
    }),
  removeMessage: (messageId) =>
    set((state) => {
      const message = state.project.messages.find(
        (item) => item.messageId === messageId,
      );
      if (!message) return state;
      // 7.2：被脚本引用的消息不能直接删除。
      if (messageIsReferenced(state.project, message.name)) return state;
      return {
        project: {
          ...state.project,
          updatedAt: new Date().toISOString(),
          messages: state.project.messages.filter(
            (item) => item.messageId !== messageId,
          ),
        },
        projectHistory: [
          ...state.projectHistory,
          { project: state.project, selectedSpriteId: state.selectedSpriteId },
        ].slice(-30),
        projectFuture: [],
        historyRevision: state.historyRevision + 1,
        saveStatus: "dirty" as const,
      };
    }),
  addSoundAsset: (sound) =>
    set((state) => {
      const name = sound.name.trim().slice(0, 20) || "我的声音";
      if (state.project.assets.some((item) => item.assetId === sound.assetId))
        return {
          project: {
            ...state.project,
            updatedAt: new Date().toISOString(),
            assets: state.project.assets.map((item) =>
              item.assetId === sound.assetId ? { ...item, name } : item,
            ),
          },
          saveStatus: "dirty" as const,
        };
      return {
        project: {
          ...state.project,
          updatedAt: new Date().toISOString(),
          assets: [
            ...state.project.assets,
            {
              assetId: sound.assetId,
              type: "audio" as const,
              path: sound.path,
              name,
            },
          ],
        },
        projectHistory: [
          ...state.projectHistory,
          { project: state.project, selectedSpriteId: state.selectedSpriteId },
        ].slice(-30),
        projectFuture: [],
        historyRevision: state.historyRevision + 1,
        saveStatus: "dirty" as const,
      };
    }),
  renameSoundAsset: (assetId, name) =>
    set((state) => {
      const normalized = name.trim().slice(0, 20);
      if (!normalized) return state;
      return {
        project: {
          ...state.project,
          updatedAt: new Date().toISOString(),
          assets: state.project.assets.map((item) =>
            item.assetId === assetId ? { ...item, name: normalized } : item,
          ),
        },
        saveStatus: "dirty" as const,
      };
    }),
  removeSoundAsset: (assetId) =>
    set((state) => {
      if (
        !assetId.startsWith("sfx_custom_") &&
        !assetId.startsWith("sfx_upload_")
      )
        return state;
      return {
        project: {
          ...state.project,
          updatedAt: new Date().toISOString(),
          assets: state.project.assets.filter(
            (item) => item.assetId !== assetId,
          ),
        },
        projectHistory: [
          ...state.projectHistory,
          { project: state.project, selectedSpriteId: state.selectedSpriteId },
        ].slice(-30),
        projectFuture: [],
        historyRevision: state.historyRevision + 1,
        saveStatus: "dirty" as const,
      };
    }),
  addSprite: () =>
    set((state) => {
      if (state.project.sprites.length >= 20) return state;
      const source = state.project.sprites[0];
      const scene = state.project.scenes.find(
        (item) => item.sceneId === state.project.currentSceneId,
      );
      if (!source || !scene) return state;
      const suffix = crypto.randomUUID().slice(0, 8);
      const spriteId = `spr_${suffix}`;
      const name = `新角色${state.project.sprites.length + 1}`;
      const step = getMovementStep(state.project);
      return {
        project: {
          ...state.project,
          updatedAt: new Date().toISOString(),
          sprites: [...state.project.sprites, { ...source, spriteId, name }],
          scenes: state.project.scenes.map((item) =>
            item.sceneId === scene.sceneId
              ? {
                  ...item,
                  instances: [
                    ...item.instances,
                    {
                      instanceId: `ins_${suffix}`,
                      spriteId,
                      transform: {
                        ...snapStagePositionToGrid(
                          state.project,
                          240,
                          step === 40 ? 200 : 180,
                        ),
                        rotation: 0,
                        scaleX: 1,
                        scaleY: 1,
                      },
                      zIndex: item.instances.length + 1,
                      visible: true,
                    },
                  ],
                }
              : item,
          ),
        },
        selectedSpriteId: spriteId,
        saveStatus: "dirty",
      };
    }),
  addSpriteFromLibrary: (asset) =>
    set((state) => {
      if (state.project.sprites.length >= 20) return state;
      const scene = state.project.scenes.find(
        (item) => item.sceneId === state.project.currentSceneId,
      );
      if (!scene) return state;
      const suffix = crypto.randomUUID().slice(0, 8);
      const spriteId = `spr_${suffix}`;
      const matchingCount = state.project.sprites.filter(
        (sprite) => sprite.costumeAssetId === asset.assetId,
      ).length;
      const name =
        matchingCount > 0 ? `${asset.name}${matchingCount + 1}` : asset.name;
      const step = getMovementStep(state.project);
      const hasAsset = state.project.assets.some(
        (item) => item.assetId === asset.assetId,
      );
      return {
        project: {
          ...state.project,
          updatedAt: new Date().toISOString(),
          assets: hasAsset
            ? state.project.assets
            : [
                ...state.project.assets,
                {
                  assetId: asset.assetId,
                  type: "sprite" as const,
                  path: asset.path,
                },
              ],
          sprites: [
            ...state.project.sprites,
            { spriteId, name, costumeAssetId: asset.assetId },
          ],
          scenes: state.project.scenes.map((item) =>
            item.sceneId === scene.sceneId
              ? {
                  ...item,
                  instances: [
                    ...item.instances,
                    {
                      instanceId: `ins_${suffix}`,
                      spriteId,
                      transform: {
                        ...snapStagePositionToGrid(
                          state.project,
                          240,
                          step === 40 ? 200 : 180,
                        ),
                        rotation: 0,
                        scaleX: asset.scale,
                        scaleY: asset.scale,
                      },
                      zIndex: item.instances.length + 1,
                      visible: true,
                    },
                  ],
                }
              : item,
          ),
        },
        selectedSpriteId: spriteId,
        saveStatus: "dirty",
      };
    }),
  duplicateSprite: (spriteId) =>
    set((state) => {
      if (state.project.sprites.length >= 20) return state;
      const source = state.project.sprites.find(
        (item) => item.spriteId === spriteId,
      );
      const scene = state.project.scenes.find(
        (item) => item.sceneId === state.project.currentSceneId,
      );
      const sourceInstance = scene?.instances.find(
        (item) => item.spriteId === spriteId,
      );
      if (!source || !scene || !sourceInstance) return state;
      const suffix = crypto.randomUUID().slice(0, 8);
      const copyId = `spr_${suffix}`;
      const offset = Math.max(40, getMovementStep(state.project));
      return {
        project: {
          ...state.project,
          updatedAt: new Date().toISOString(),
          sprites: [
            ...state.project.sprites,
            { ...source, spriteId: copyId, name: `${source.name}副本` },
          ],
          scenes: state.project.scenes.map((item) =>
            item.sceneId === scene.sceneId
              ? {
                  ...item,
                  instances: [
                    ...item.instances,
                    {
                      ...sourceInstance,
                      instanceId: `ins_${suffix}`,
                      spriteId: copyId,
                      transform: {
                        ...sourceInstance.transform,
                        ...snapStagePositionToGrid(
                          state.project,
                          Math.min(
                            state.project.settings.stageWidth - offset,
                            sourceInstance.transform.x + offset,
                          ),
                          Math.min(
                            state.project.settings.stageHeight - offset,
                            sourceInstance.transform.y + offset,
                          ),
                        ),
                      },
                    },
                  ],
                }
              : item,
          ),
          workspaceStates: state.project.workspaceStates[spriteId]
            ? {
                ...state.project.workspaceStates,
                [copyId]: state.project.workspaceStates[spriteId],
              }
            : state.project.workspaceStates,
        },
        selectedSpriteId: copyId,
        saveStatus: "dirty",
      };
    }),
  deleteSprite: (spriteId) =>
    set((state) => {
      if (state.project.sprites.length <= 1) return state;
      const remaining = state.project.sprites.filter(
        (item) => item.spriteId !== spriteId,
      );
      const workspaceStates = { ...state.project.workspaceStates };
      delete workspaceStates[spriteId];
      return {
        project: {
          ...state.project,
          updatedAt: new Date().toISOString(),
          sprites: remaining,
          scenes: state.project.scenes.map((scene) => ({
            ...scene,
            instances: scene.instances.filter(
              (item) => item.spriteId !== spriteId,
            ),
          })),
          scripts: state.project.scripts.filter(
            (script) => script.ownerSpriteId !== spriteId,
          ),
          workspaceStates,
        },
        selectedSpriteId:
          state.selectedSpriteId === spriteId
            ? (remaining[0]?.spriteId ?? "")
            : state.selectedSpriteId,
        saveStatus: "dirty",
      };
    }),
  renameSprite: (spriteId, name) =>
    set((state) => ({
      project: {
        ...state.project,
        updatedAt: new Date().toISOString(),
        sprites: state.project.sprites.map((sprite) =>
          sprite.spriteId === spriteId
            ? { ...sprite, name: name.trim().slice(0, 20) || sprite.name }
            : sprite,
        ),
      },
      saveStatus: "dirty",
    })),
  selectScene: (sceneId) =>
    set((state) => ({
      project: {
        ...state.project,
        currentSceneId: sceneId,
        updatedAt: new Date().toISOString(),
      },
      saveStatus: "dirty",
    })),
  addScene: () =>
    set((state) => {
      if (state.project.scenes.length >= 5) return state;
      const suffix = crypto.randomUUID().slice(0, 8);
      const sceneId = `scn_${suffix}`;
      return {
        project: {
          ...state.project,
          updatedAt: new Date().toISOString(),
          currentSceneId: sceneId,
          scenes: [
            ...state.project.scenes,
            {
              sceneId,
              name: `新场景${state.project.scenes.length + 1}`,
              backdropAssetId: "bg_classroom_01",
              instances: state.project.sprites.map((sprite, index) => ({
                instanceId: `ins_${suffix}_${index}`,
                spriteId: sprite.spriteId,
                transform: {
                  ...getNewScenePosition(state.project, index),
                  rotation: 0,
                  scaleX: 1,
                  scaleY: 1,
                },
                zIndex: index + 1,
                visible: true,
              })),
            },
          ],
        },
        saveStatus: "dirty",
      };
    }),
  addSceneFromLibrary: (asset) =>
    set((state) => {
      if (state.project.scenes.length >= 5) return state;
      const suffix = crypto.randomUUID().slice(0, 8);
      const sceneId = `scn_${suffix}`;
      const hasAsset = state.project.assets.some(
        (item) => item.assetId === asset.assetId,
      );
      return {
        project: {
          ...state.project,
          updatedAt: new Date().toISOString(),
          currentSceneId: sceneId,
          assets: hasAsset
            ? state.project.assets
            : [
                ...state.project.assets,
                {
                  assetId: asset.assetId,
                  type: "background" as const,
                  path: asset.path,
                },
              ],
          scenes: [
            ...state.project.scenes,
            {
              sceneId,
              name: asset.name,
              backdropAssetId: asset.assetId,
              instances: state.project.sprites.map((sprite, index) => ({
                instanceId: `ins_${suffix}_${index}`,
                spriteId: sprite.spriteId,
                transform: {
                  ...getNewScenePosition(state.project, index),
                  rotation: 0,
                  scaleX: 1,
                  scaleY: 1,
                },
                zIndex: index + 1,
                visible: true,
              })),
            },
          ],
        },
        saveStatus: "dirty",
      };
    }),
  updateSceneBackdrop: (sceneId, asset) =>
    set((state) => {
      const hasAsset = state.project.assets.some(
        (item) => item.assetId === asset.assetId,
      );
      return {
        project: {
          ...state.project,
          updatedAt: new Date().toISOString(),
          assets: hasAsset
            ? state.project.assets
            : [
                ...state.project.assets,
                {
                  assetId: asset.assetId,
                  type: "background" as const,
                  path: asset.path,
                },
              ],
          scenes: state.project.scenes.map((scene) =>
            scene.sceneId === sceneId
              ? { ...scene, backdropAssetId: asset.assetId }
              : scene,
          ),
        },
        saveStatus: "dirty",
      };
    }),
  renameScene: (sceneId, name) =>
    set((state) => ({
      project: {
        ...state.project,
        updatedAt: new Date().toISOString(),
        scenes: state.project.scenes.map((scene) =>
          scene.sceneId === sceneId
            ? { ...scene, name: name.trim().slice(0, 20) || scene.name }
            : scene,
        ),
      },
      saveStatus: "dirty",
    })),
  deleteScene: (sceneId) =>
    set((state) => {
      if (state.project.scenes.length <= 1) return state;
      const scenes = state.project.scenes.filter(
        (scene) => scene.sceneId !== sceneId,
      );
      return {
        project: {
          ...state.project,
          updatedAt: new Date().toISOString(),
          currentSceneId:
            state.project.currentSceneId === sceneId
              ? (scenes[0]?.sceneId ?? state.project.currentSceneId)
              : state.project.currentSceneId,
          scenes,
        },
        saveStatus: "dirty",
      };
    }),
  moveScene: (sceneId, direction) =>
    set((state) => {
      const scenes = [...state.project.scenes];
      const index = scenes.findIndex((scene) => scene.sceneId === sceneId);
      const targetIndex = direction === "previous" ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= scenes.length)
        return state;
      const [scene] = scenes.splice(index, 1);
      if (!scene) return state;
      scenes.splice(targetIndex, 0, scene);
      return {
        project: {
          ...state.project,
          scenes,
          updatedAt: new Date().toISOString(),
        },
        saveStatus: "dirty",
      };
    }),
  updateSpritePosition: (spriteId, x, y) =>
    set((state) => ({
      project: {
        ...state.project,
        updatedAt: new Date().toISOString(),
        scenes: state.project.scenes.map((scene) =>
          scene.sceneId === state.project.currentSceneId
            ? {
                ...scene,
                instances: scene.instances.map((instance) =>
                  instance.spriteId === spriteId
                    ? {
                        ...instance,
                        transform: {
                          ...instance.transform,
                          ...snapStagePositionToGrid(state.project, x, y),
                        },
                      }
                    : instance,
                ),
              }
            : scene,
        ),
      },
      selectedSpriteId: spriteId,
      saveStatus: "dirty",
    })),
  updateSpriteProperties: (spriteId, properties) =>
    set((state) => ({
      project: {
        ...state.project,
        updatedAt: new Date().toISOString(),
        scenes: state.project.scenes.map((scene) =>
          scene.sceneId === state.project.currentSceneId
            ? {
                ...scene,
                instances: scene.instances.map((instance) =>
                  instance.spriteId === spriteId
                    ? {
                        ...instance,
                        visible: properties.visible,
                        transform: {
                          ...instance.transform,
                          ...snapStagePositionToGrid(
                            state.project,
                            properties.x,
                            properties.y,
                          ),
                          rotation: Math.max(
                            -180,
                            Math.min(180, properties.rotation),
                          ),
                          scaleX: Math.max(0.01, Math.min(3, properties.scale)),
                          scaleY: Math.max(0.01, Math.min(3, properties.scale)),
                        },
                      }
                    : instance,
                ),
              }
            : scene,
        ),
      },
      saveStatus: "dirty",
    })),
  moveSpriteLayer: (spriteId, direction) =>
    set((state) => ({
      project: {
        ...state.project,
        updatedAt: new Date().toISOString(),
        scenes: state.project.scenes.map((scene) => {
          if (scene.sceneId !== state.project.currentSceneId) return scene;
          const ordered = [...scene.instances].sort(
            (a, b) => a.zIndex - b.zIndex,
          );
          const targetIndex = ordered.findIndex(
            (instance) => instance.spriteId === spriteId,
          );
          if (targetIndex < 0) return scene;
          const [target] = ordered.splice(targetIndex, 1);
          if (!target) return scene;
          if (direction === "front") ordered.push(target);
          else ordered.unshift(target);
          const zIndexById = new Map(
            ordered.map((instance, index) => [instance.instanceId, index + 1]),
          );
          return {
            ...scene,
            instances: scene.instances.map((instance) => ({
              ...instance,
              zIndex: zIndexById.get(instance.instanceId) ?? instance.zIndex,
            })),
          };
        }),
      },
      saveStatus: "dirty",
    })),
  updateProjectSettings: (name, locale, movementStep) =>
    set((state) => ({
      project: {
        ...state.project,
        name: name.trim().slice(0, 30) || state.project.name,
        updatedAt: new Date().toISOString(),
        settings: {
          ...state.project.settings,
          locale,
          movementStep: movementStep ?? state.project.settings.movementStep,
        },
      },
      saveStatus: "dirty",
    })),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  markDirty: () => set({ saveStatus: "dirty" }),
}));

function isTransformOnlyChange(previous: Project, next: Project): boolean {
  if (
    previous.scenes.length !== next.scenes.length ||
    previous.sprites !== next.sprites ||
    previous.assets !== next.assets ||
    previous.workspaceStates !== next.workspaceStates ||
    previous.scripts !== next.scripts ||
    previous.settings !== next.settings
  )
    return false;
  return previous.scenes.every((scene, index) => {
    const nextScene = next.scenes[index];
    return (
      nextScene?.sceneId === scene.sceneId &&
      nextScene.name === scene.name &&
      nextScene.backdropAssetId === scene.backdropAssetId &&
      nextScene.instances.length === scene.instances.length &&
      nextScene.instances.every(
        (instance, instanceIndex) =>
          instance.instanceId === scene.instances[instanceIndex]?.instanceId &&
          instance.spriteId === scene.instances[instanceIndex]?.spriteId,
      )
    );
  });
}

useEditorStore.subscribe((state, previous) => {
  if (
    applyingHistory ||
    state.project === previous.project ||
    !state.isHydrated ||
    state.saveStatus === "saved"
  )
    return;
  const transformOnly = isTransformOnlyChange(previous.project, state.project);
  const now = Date.now();
  if (transformOnly && now - lastTransformHistoryAt < 300) return;
  if (transformOnly) lastTransformHistoryAt = now;
  useEditorStore.setState({
    projectHistory: [
      ...state.projectHistory,
      {
        project: previous.project,
        selectedSpriteId: previous.selectedSpriteId,
      },
    ].slice(-30),
    projectFuture: [],
  });
});

/** 判断某个消息名是否正被积木引用（7.2：被引用时阻止删除）。 */
export function messageIsReferenced(project: Project, name: string): boolean {
  const visit = (value: unknown): boolean => {
    if (!value || typeof value !== "object") return false;
    if (Array.isArray(value)) return value.some(visit);
    const record = value as Record<string, unknown>;
    const fields = record.fields;
    if (fields && typeof fields === "object") {
      const message = (fields as Record<string, unknown>).MESSAGE;
      if (message === name) return true;
    }
    return Object.values(record).some(visit);
  };
  for (const workspace of Object.values(project.workspaceStates))
    if (visit(workspace)) return true;
  for (const script of project.scripts) {
    for (const block of script.blocks) {
      if ((block.params as Record<string, unknown>).message === name)
        return true;
    }
  }
  return false;
}

export function countWorkspaceBlocks(workspaceState: unknown): number {
  if (!workspaceState || typeof workspaceState !== "object") return 0;
  let count = 0;
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (
      "type" in value &&
      typeof (value as { type?: unknown }).type === "string"
    )
      count += 1;
    for (const child of Object.values(value)) visit(child);
  };
  visit(workspaceState);
  return count;
}

export function countSpriteReferences(
  project: Project,
  targetSpriteId: string,
): number {
  let count = 0;
  const visit = (value: unknown, key?: string): void => {
    if (typeof value === "string") {
      if (
        value === targetSpriteId &&
        (key === "TARGET" || key === "targetSpriteId")
      )
        count += 1;
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [childKey, child] of Object.entries(value)) {
      if (
        childKey === "TARGET" &&
        child &&
        typeof child === "object" &&
        "value" in child &&
        (child as { value?: unknown }).value === targetSpriteId
      ) {
        count += 1;
        continue;
      }
      visit(child, childKey);
    }
  };

  for (const [ownerSpriteId, workspaceState] of Object.entries(
    project.workspaceStates,
  )) {
    if (ownerSpriteId !== targetSpriteId) visit(workspaceState);
  }
  for (const script of project.scripts) {
    if (script.ownerSpriteId !== targetSpriteId) visit(script.blocks);
  }
  return count;
}
