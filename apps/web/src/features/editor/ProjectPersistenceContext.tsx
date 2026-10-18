import {
  createDefaultProject,
  projectSchema,
  upgradeProjectGeometry,
} from "@kids-code/domain";
import { IndexedDbProjectRepository } from "@kids-code/persistence";
import { registerLocalAssetUrl } from "@kids-code/stage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useParams } from "react-router";
import { useEditorStore } from "./editor-store";
import { EditorLoadScreen } from "./EditorLoadStatus";
import { pinAssignedTaskVersion } from "../tasks/task-catalog";
import type {
  BackgroundLibraryAsset,
  SpriteLibraryAsset,
} from "./asset-catalog";
import { localUploadProvenance } from "./asset-catalog";
import {
  createProjectPackage,
  readProjectPackageContents,
} from "./project-package";

interface ProjectPersistenceContextValue {
  isReady: boolean;
  exportProject: () => Promise<void>;
  importProject: (file: File) => Promise<void>;
  retrySave: () => void;
  saveNow: () => Promise<void>;
  saveThumbnail: (blob: Blob) => Promise<void>;
  importLocalImage: (
    file: File,
    kind: "sprite" | "background",
  ) => Promise<SpriteLibraryAsset | BackgroundLibraryAsset>;
  /** 把一段音频（录音或上传文件）存入作品，返回可在积木里引用的音效。 */
  importLocalAudio: (
    blob: Blob,
    name: string,
    source: "recording" | "upload",
  ) => Promise<{ assetId: string; name: string; path: string }>;
}

const ProjectPersistenceContext =
  createContext<ProjectPersistenceContextValue | null>(null);

const AUTO_SAVE_DELAY_MS = 2_000;
const PROJECT_READ_TIMEOUT_MS = 10_000;
const draftKey = (projectId: string) => `kids-code:draft:${projectId}`;

function readRecoveryDraft(projectId: string) {
  try {
    const value = localStorage.getItem(draftKey(projectId));
    return value
      ? upgradeProjectGeometry(projectSchema.parse(JSON.parse(value)))
      : undefined;
  } catch {
    return undefined;
  }
}

function writeRecoveryDraft(projectId: string, project: unknown): void {
  try {
    localStorage.setItem(draftKey(projectId), JSON.stringify(project));
  } catch (error) {
    console.error("Failed to write recovery draft", error);
  }
}

export function ProjectPersistenceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { projectId = "prj_demo_001" } = useParams();
  const project = useEditorStore((state) => state.project);
  const isHydrated = useEditorStore((state) => state.isHydrated);
  const saveStatus = useEditorStore((state) => state.saveStatus);
  const hydrateProject = useEditorStore((state) => state.hydrateProject);
  const replaceProject = useEditorStore((state) => state.replaceProject);
  const setSaveStatus = useEditorStore((state) => state.setSaveStatus);
  const repositoryRef = useRef(new IndexedDbProjectRepository());
  const projectRef = useRef(project);
  const revisionRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadState, setLoadState] = useState<{
    projectId: string;
    attempt: number;
    phase: "loading" | "ready" | "error";
    error: "failed" | "timeout" | null;
  }>({ projectId, attempt: 0, phase: "loading", error: null });
  const isReady =
    loadState.projectId === projectId &&
    loadState.attempt === loadAttempt &&
    loadState.phase === "ready" &&
    isHydrated &&
    project.projectId === projectId;

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  useEffect(() => {
    if (!isReady) return;
    let active = true;
    void Promise.all(
      project.assets
        .filter((asset) => asset.path.startsWith("uploads/"))
        .map(async (asset) => {
          const blob = await repositoryRef.current.getAsset(asset.path);
          if (active && blob)
            registerLocalAssetUrl(asset.path, URL.createObjectURL(blob));
        }),
    ).catch(() => {
      console.warn("[kids-code][load] local-asset-read-failed");
    });
    return () => {
      active = false;
    };
  }, [isReady, project.assets]);

  useEffect(() => {
    let active = true;
    let completed = false;
    const repository = new IndexedDbProjectRepository();
    repositoryRef.current = repository;
    setLoadState({
      projectId,
      attempt: loadAttempt,
      phase: "loading",
      error: null,
    });
    const timeout = window.setTimeout(() => {
      active = false;
      repository.close();
      setLoadState({
        projectId,
        attempt: loadAttempt,
        phase: "error",
        error: "timeout",
      });
    }, PROJECT_READ_TIMEOUT_MS);
    void (async () => {
      const storedProject = await repository.get(projectId);
      if (!active) return;
      const recoveryDraft = readRecoveryDraft(projectId);
      const loadedProject = upgradeProjectGeometry(
        recoveryDraft &&
          (!storedProject || recoveryDraft.updatedAt > storedProject.updatedAt)
          ? recoveryDraft
          : projectSchema.parse(storedProject ?? createDefaultProject()),
      );
      const nextProject = pinAssignedTaskVersion(loadedProject);
      await Promise.all(
        nextProject.assets
          .filter((asset) => asset.path.startsWith("uploads/"))
          .map(async (asset) => {
            const blob = await repository.getAsset(asset.path);
            if (active && blob)
              registerLocalAssetUrl(asset.path, URL.createObjectURL(blob));
          }),
      );
      if (!active) return;
      hydrateProject(
        nextProject.projectId === projectId
          ? nextProject
          : { ...nextProject, projectId },
      );
      window.clearTimeout(timeout);
      completed = true;
      if (nextProject !== loadedProject) useEditorStore.getState().markDirty();
      setLoadState({
        projectId,
        attempt: loadAttempt,
        phase: "ready",
        error: null,
      });
    })().catch(() => {
      if (!active) return;
      active = false;
      window.clearTimeout(timeout);
      repository.close();
      console.warn("[kids-code][load] project-read-failed");
      setLoadState({
        projectId,
        attempt: loadAttempt,
        phase: "error",
        error: "failed",
      });
    });
    return () => {
      active = false;
      window.clearTimeout(timeout);
      if (!completed) repository.close();
    };
  }, [hydrateProject, projectId, loadAttempt]);

  useEffect(() => {
    if (!isReady || project.projectId !== projectId || saveStatus !== "dirty")
      return;
    writeRecoveryDraft(projectId, project);
  }, [isReady, project, projectId, saveStatus]);

  const flush = useCallback(async () => {
    if (
      !isReady ||
      projectRef.current.projectId !== projectId ||
      saveStatus === "saved"
    )
      return;
    const revision = (revisionRef.current = Math.max(
      Date.now(),
      revisionRef.current + 1,
    ));
    const projectToSave = projectRef.current;
    setSaveStatus("saving");
    try {
      await repositoryRef.current.save(projectToSave, revision);
      if (
        revision === revisionRef.current &&
        projectRef.current.projectId === projectToSave.projectId
      ) {
        localStorage.removeItem(draftKey(projectId));
        setSaveStatus(projectRef.current === projectToSave ? "saved" : "dirty");
      }
    } catch (error) {
      console.error("Failed to save project", error);
      if (
        revision === revisionRef.current &&
        projectRef.current.projectId === projectToSave.projectId
      )
        setSaveStatus("error");
    }
  }, [isReady, projectId, saveStatus, setSaveStatus]);

  const retrySave = useCallback(() => {
    setSaveStatus("dirty");
  }, [setSaveStatus]);

  const saveNow = useCallback(async () => {
    if (!isReady || useEditorStore.getState().project.projectId !== projectId)
      throw new Error("PROJECT_NOT_READY");
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    const revision = (revisionRef.current = Math.max(
      Date.now(),
      revisionRef.current + 1,
    ));
    const snapshot = useEditorStore.getState().project;
    await repositoryRef.current.save(snapshot, revision);
    localStorage.removeItem(draftKey(snapshot.projectId));
    if (useEditorStore.getState().project.projectId === snapshot.projectId) {
      setSaveStatus(
        useEditorStore.getState().project === snapshot ? "saved" : "dirty",
      );
    }
  }, [isReady, projectId, setSaveStatus]);

  const saveThumbnail = useCallback(
    (blob: Blob) => repositoryRef.current.saveThumbnail(projectId, blob),
    [projectId],
  );

  useEffect(() => {
    if (!isReady || saveStatus !== "dirty") return;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void flush();
    }, AUTO_SAVE_DELAY_MS);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [flush, isReady, saveStatus]);

  useEffect(() => {
    const handlePageHide = () => {
      void flush();
    };
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [flush]);

  const exportProject = useCallback(async () => {
    const thumbnail = await repositoryRef.current.getThumbnail(projectId);
    const blob = await createProjectPackage(
      projectRef.current,
      thumbnail?.blob,
      (path) => repositoryRef.current.getAsset(path),
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeName = projectRef.current.name.replace(/[<>:"/\\|?*]/g, "_");
    link.download = `${safeName}.kidgame`;
    link.click();
    URL.revokeObjectURL(url);
  }, [projectId]);

  const importProject = useCallback(
    async (file: File) => {
      let rawProject;
      if (file.name.toLowerCase().endsWith(".kidgame")) {
        const contents = await readProjectPackageContents(file);
        rawProject = contents.project;
        for (const asset of rawProject.assets) {
          if (!asset.path.startsWith("uploads/")) continue;
          const blob = contents.assets.get(asset.path);
          if (!blob) continue;
          await repositoryRef.current.saveAsset(asset.path, blob);
          registerLocalAssetUrl(asset.path, URL.createObjectURL(blob));
        }
      } else {
        rawProject = projectSchema.parse(JSON.parse(await file.text()));
      }
      const parsed = upgradeProjectGeometry(rawProject);
      replaceProject({
        ...parsed,
        projectId,
        updatedAt: new Date().toISOString(),
      });
    },
    [projectId, replaceProject],
  );

  const importLocalImage = useCallback(
    async (
      file: File,
      kind: "sprite" | "background",
    ): Promise<SpriteLibraryAsset | BackgroundLibraryAsset> => {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
        throw new Error("UNSUPPORTED_IMAGE_TYPE");
      if (file.size > 10 * 1024 * 1024) throw new Error("IMAGE_TOO_LARGE");
      const extension =
        file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "jpg";
      const suffix = crypto.randomUUID();
      const path = `uploads/${suffix}.${extension}`;
      await repositoryRef.current.saveAsset(path, file);
      registerLocalAssetUrl(path, URL.createObjectURL(file));
      const name =
        file.name
          .replace(/\.[^.]+$/, "")
          .trim()
          .slice(0, 20) || "我的图片";
      const common = {
        assetId: `upload_${kind}_${suffix}`,
        name,
        path,
        provenance: localUploadProvenance(path),
      };
      return kind === "sprite" ? { ...common, scale: 1 } : common;
    },
    [],
  );

  const importLocalAudio = useCallback(
    async (
      blob: Blob,
      name: string,
      source: "recording" | "upload",
    ): Promise<{ assetId: string; name: string; path: string }> => {
      if (blob.size > 5 * 1024 * 1024) throw new Error("AUDIO_TOO_LARGE");
      const suffix = crypto.randomUUID();
      const extension =
        blob.type.includes("mp4") || blob.type.includes("m4a")
          ? "m4a"
          : blob.type.includes("ogg")
            ? "ogg"
            : blob.type.includes("mpeg") || blob.type.includes("mp3")
              ? "mp3"
              : blob.type.includes("wav")
                ? "wav"
                : "webm";
      const path = `uploads/${suffix}.${extension}`;
      await repositoryRef.current.saveAsset(path, blob);
      registerLocalAssetUrl(path, URL.createObjectURL(blob));
      return {
        assetId: `sfx_${source === "recording" ? "custom" : "upload"}_${suffix}`,
        name: name.trim().slice(0, 20) || "我的声音",
        path,
      };
    },
    [],
  );

  const value = useMemo(
    () => ({
      isReady,
      exportProject,
      importProject,
      retrySave,
      saveNow,
      saveThumbnail,
      importLocalImage,
      importLocalAudio,
    }),
    [
      exportProject,
      importLocalAudio,
      importLocalImage,
      importProject,
      isReady,
      retrySave,
      saveNow,
      saveThumbnail,
    ],
  );

  return (
    <ProjectPersistenceContext.Provider value={value}>
      {isReady ? (
        children
      ) : (
        <EditorLoadScreen
          error={
            loadState.projectId === projectId &&
            loadState.attempt === loadAttempt
              ? loadState.error
              : null
          }
          onRetry={() => setLoadAttempt((attempt) => attempt + 1)}
        />
      )}
    </ProjectPersistenceContext.Provider>
  );
}

export function useProjectPersistence(): ProjectPersistenceContextValue {
  const context = useContext(ProjectPersistenceContext);
  if (!context) throw new Error("ProjectPersistenceProvider is missing");
  return context;
}
