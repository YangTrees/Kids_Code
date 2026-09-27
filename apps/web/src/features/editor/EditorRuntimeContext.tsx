import {
  compileSerializedWorkspace,
  type BlockWorkspaceAdapter,
} from "@kids-code/block-adapter";
import {
  RuntimeSession,
  type DebugPort,
  type RuntimeReport,
  type RuntimeStatus,
  type StagePort,
} from "@kids-code/runtime";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { BrowserRuntimeClock } from "./browser-clock";
import { useEditorStore } from "./editor-store";
import { getAssignedTaskId } from "../tasks/task-catalog";

interface EditorRuntimeContextValue {
  status: RuntimeStatus;
  ready: boolean;
  errorMessage: string | null;
  registerStage: (stage: StagePort | null) => void;
  registerWorkspace: (workspace: BlockWorkspaceAdapter | null) => void;
  run: () => void;
  step: () => void;
  pauseOrResume: () => void;
  stop: () => void;
  triggerKey: (key: string) => void;
  muted: boolean;
  toggleMuted: () => void;
  lastRunReport: RuntimeReport | null;
  runId: number;
}

const EditorRuntimeContext = createContext<EditorRuntimeContextValue | null>(
  null,
);

export function EditorRuntimeProvider({ children }: { children: ReactNode }) {
  const project = useEditorStore((state) => state.project);
  const selectedSpriteId = useEditorStore((state) => state.selectedSpriteId);
  const stageRef = useRef<StagePort | null>(null);
  const workspaceRef = useRef<BlockWorkspaceAdapter | null>(null);
  const sessionRef = useRef<RuntimeSession | null>(null);
  const stepModeRef = useRef(false);
  const stepCountRef = useRef(0);
  const [status, setStatus] = useState<RuntimeStatus>("IDLE");
  const [ready, setReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [lastRunReport, setLastRunReport] = useState<RuntimeReport | null>(
    null,
  );
  const mutedRef = useRef(false);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    sessionRef.current?.stop(false);
    sessionRef.current = null;
    stepModeRef.current = false;
    setStatus("IDLE");
    setLastRunReport(null);
    setErrorMessage(null);
    return () => {
      sessionRef.current?.stop(false);
      sessionRef.current = null;
    };
  }, [project.projectId]);

  const registerStage = useCallback((stage: StagePort | null) => {
    if (!stage) {
      sessionRef.current?.stop(false);
      sessionRef.current = null;
      setLastRunReport(null);
      setStatus("IDLE");
    }
    stageRef.current?.setSpriteClickHandler(null);
    stageRef.current = stage;
    setReady(Boolean(stageRef.current && workspaceRef.current));
    stage?.setMuted?.(mutedRef.current);
    stage?.setSpriteClickHandler((spriteId) => {
      void sessionRef.current?.triggerSpriteClick(spriteId);
    });
  }, []);

  const triggerKey = useCallback((key: string) => {
    void sessionRef.current?.triggerKey(key);
  }, []);

  const toggleMuted = useCallback(() => {
    setMuted((value) => {
      const next = !value;
      mutedRef.current = next;
      stageRef.current?.setMuted?.(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      if (
        event.target instanceof HTMLElement &&
        (event.target.matches("input, textarea, select") ||
          event.target.isContentEditable)
      )
        return;
      const keyByBrowserValue: Record<string, string> = {
        " ": "space",
        ArrowUp: "up arrow",
        ArrowDown: "down arrow",
        ArrowLeft: "left arrow",
        ArrowRight: "right arrow",
      };
      const key = keyByBrowserValue[event.key] ?? event.key.toLowerCase();
      if (sessionRef.current && keyByBrowserValue[event.key])
        event.preventDefault();
      void sessionRef.current?.triggerKey(key);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const registerWorkspace = useCallback(
    (workspace: BlockWorkspaceAdapter | null) => {
      workspaceRef.current = workspace;
      setReady(Boolean(stageRef.current && workspaceRef.current));
    },
    [],
  );

  const stop = useCallback(() => {
    stepModeRef.current = false;
    sessionRef.current?.stop();
    sessionRef.current = null;
    setErrorMessage(null);
  }, []);

  const pauseOrResume = useCallback(() => {
    if (status === "RUNNING") sessionRef.current?.pause();
    if (status === "PAUSED") {
      stepModeRef.current = false;
      sessionRef.current?.resume();
    }
  }, [status]);

  const runInternal = useCallback(
    (singleStep: boolean) => {
      const stage = stageRef.current;
      const workspace = workspaceRef.current;
      if (!stage || !workspace) {
        setErrorMessage("编辑器还在准备，请稍等一下再运行。");
        return;
      }

      try {
        stepModeRef.current = singleStep;
        stepCountRef.current = 0;
        setLastRunReport(null);
        const scripts = workspace.compile(selectedSpriteId);
        for (const sprite of project.sprites) {
          if (sprite.spriteId === selectedSpriteId) continue;
          const workspaceState = project.workspaceStates[sprite.spriteId];
          if (workspaceState && typeof workspaceState === "object") {
            scripts.push(
              ...compileSerializedWorkspace(sprite.spriteId, workspaceState),
            );
          }
        }
        if (scripts.length === 0) {
          setErrorMessage("先放入一个“点击开始”积木吧！");
          return;
        }
        // Green-flag runs always begin from the saved editor snapshot. Event
        // scripts triggered during the same run keep their live positions.
        sessionRef.current?.stop();
        setRunId((id) => id + 1);
        setErrorMessage(null);
        const debug: DebugPort = {
          highlightBlock: (blockId) => workspace.highlightBlock(blockId),
          reportError: () =>
            setErrorMessage(
              "有一块积木没有运行成功，工作区已经标出出错位置，请检查它的设置。",
            ),
        };
        const taskId = getAssignedTaskId(project.projectId);
        const session = new RuntimeSession(
          project,
          stage,
          debug,
          new BrowserRuntimeClock(),
          (_status, report) => {
            setStatus(_status);
            setLastRunReport(taskId ? { ...report, taskId } : report);
            const executed = Object.values(
              report.executedBlockCounts ?? {},
            ).reduce((total, count) => total + count, 0);
            if (
              stepModeRef.current &&
              _status === "RUNNING" &&
              executed > stepCountRef.current
            ) {
              stepCountRef.current = executed;
              sessionRef.current?.pause();
            }
          },
        );
        sessionRef.current = session;
        void session.start(scripts);
      } catch (error) {
        stepModeRef.current = false;
        console.error("Failed to compile the workspace", error);
        setStatus("ERROR");
        setErrorMessage("积木还没有连接好，请查看工作区中的提示位置后再运行。");
      }
    },
    [project, selectedSpriteId],
  );

  const run = useCallback(() => runInternal(false), [runInternal]);
  const step = useCallback(() => {
    if (status === "PAUSED") {
      stepModeRef.current = true;
      sessionRef.current?.resume();
    } else if (
      status === "IDLE" ||
      status === "STOPPED" ||
      status === "COMPLETED"
    ) {
      runInternal(true);
    }
  }, [runInternal, status]);

  const value = useMemo(
    () => ({
      status,
      ready,
      errorMessage,
      registerStage,
      registerWorkspace,
      run,
      step,
      pauseOrResume,
      stop,
      triggerKey,
      muted,
      toggleMuted,
      lastRunReport,
      runId,
    }),
    [
      errorMessage,
      pauseOrResume,
      registerStage,
      registerWorkspace,
      run,
      step,
      status,
      ready,
      stop,
      triggerKey,
      muted,
      lastRunReport,
      runId,
      toggleMuted,
    ],
  );

  return (
    <EditorRuntimeContext.Provider value={value}>
      {children}
    </EditorRuntimeContext.Provider>
  );
}

export function useEditorRuntime(): EditorRuntimeContextValue {
  const context = useContext(EditorRuntimeContext);
  if (!context) throw new Error("EditorRuntimeProvider is missing");
  return context;
}
