import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createDefaultProject,
  pathCellPosition,
  type Project,
  type RuntimeScript,
} from "@kids-code/domain";
import type { BlockWorkspaceAdapter } from "@kids-code/block-adapter";
import type { StagePort } from "@kids-code/runtime";
import {
  EditorRuntimeProvider,
  useEditorRuntime,
} from "./EditorRuntimeContext";
import { useEditorStore } from "./editor-store";

vi.mock("@kids-code/block-adapter", () => ({
  compileSerializedWorkspace: () => [],
}));
vi.mock("@kids-code/stage", () => ({
  resolveAssetUrl: (path: string) => path,
}));
vi.mock("./browser-clock", () => ({
  BrowserRuntimeClock: class {
    async wait() {}
    async tween(_duration: number, update: (progress: number) => void) {
      update(1);
    }
  },
}));

let runtime: ReturnType<typeof useEditorRuntime>;
function Probe() {
  runtime = useEditorRuntime();
  return null;
}
afterEach(cleanup);

function routeProject() {
  const project = createDefaultProject();
  project.settings.movementStep = 40;
  project.pathMap = {
    actorSpriteId: "spr_liji",
    start: { column: 3, row: 6 },
    goal: { column: 5, row: 4 },
    tiles: [
      { column: 3, row: 6 },
      { column: 4, row: 6 },
      { column: 5, row: 6 },
      { column: 5, row: 5 },
      { column: 5, row: 4 },
    ],
  };
  Object.assign(
    project.scenes[0]!.instances[0]!.transform,
    pathCellPosition(project.pathMap.start),
  );
  return project;
}
function stageFor(project: Project) {
  const initial = new Map(
    project.scenes[0]!.instances.map((instance) => [
      instance.spriteId,
      { x: instance.transform.x, y: instance.transform.y },
    ]),
  );
  const positions = new Map(initial);
  const stage: StagePort = {
    getCurrentSceneId: () => project.currentSceneId,
    getSpritePosition: (id) => positions.get(id) ?? null,
    setSpritePosition: (id, x, y) => {
      positions.set(id, { x, y });
    },
    setSpriteRotation() {},
    setSpriteScale() {},
    setSpriteVisible() {},
    setSpriteZIndex() {},
    showSpeech() {},
    clearSpeech() {},
    playSound() {},
    stopAllSounds() {},
    setScore() {},
    isTouching: () => false,
    setSpriteClickHandler() {},
    async switchScene() {},
    reset: vi.fn(() => {
      for (const [id, position] of initial) positions.set(id, { ...position });
    }),
  };
  return stage;
}
function workspace(wrong = false) {
  const script: RuntimeScript = {
    scriptId: "route",
    ownerSpriteId: "spr_liji",
    blocks: [
      { id: "flag", sourceBlockId: "flag", type: "EVT_FLAG" },
      {
        id: "right",
        sourceBlockId: "right",
        type: "MOT_MOVE",
        direction: "right",
        steps: wrong ? 4 : 2,
      },
      {
        id: "up",
        sourceBlockId: "up",
        type: "MOT_MOVE",
        direction: "up",
        steps: 2,
      },
    ],
  };
  return {
    compile: () => [script],
    highlightBlock() {},
  } as unknown as BlockWorkspaceAdapter;
}
function open(wrong = false) {
  const project = routeProject(),
    stage = stageFor(project);
  useEditorStore.getState().hydrateProject(project);
  render(
    <EditorRuntimeProvider>
      <Probe />
    </EditorRuntimeProvider>,
  );
  act(() => {
    runtime.registerStage(stage);
    runtime.registerWorkspace(workspace(wrong));
  });
  return { project, stage };
}
async function run() {
  act(() => runtime.run());
  await waitFor(() => expect(runtime.status).toBe("COMPLETED"));
}

describe("runtime workspace replacement", () => {
  it("restores the saved start before releasing a workspace after a wrong route", async () => {
    const { project, stage } = open(true);
    await run();
    expect(runtime.lastRunReport?.pathViolation).toBe(true);
    act(() => runtime.registerWorkspace(null));
    expect(runtime.ready).toBe(false);
    expect(stage.getSpritePosition!("spr_liji")).toEqual(
      pathCellPosition(project.pathMap!.start),
    );
    act(() => runtime.registerWorkspace(workspace()));
    await run();
    expect(runtime.lastRunReport?.pathViolation).toBe(false);
    expect(runtime.lastRunReport?.pathReachedGoal).toBe(true);
    expect(useEditorStore.getState().project).toBe(project);
  });
  it("also restarts from the saved position after replacing a completed program", async () => {
    open();
    await run();
    expect(runtime.lastRunReport?.pathReachedGoal).toBe(true);
    act(() => {
      runtime.registerWorkspace(null);
      runtime.registerWorkspace(workspace());
    });
    await run();
    expect(runtime.lastRunReport?.pathViolation).toBe(false);
    expect(runtime.lastRunReport?.pathReachedGoal).toBe(true);
  });
  it("does not reset a stage that is already being destroyed", async () => {
    const { stage } = open();
    await run();
    vi.mocked(stage.reset).mockClear();
    act(() => {
      runtime.registerStage(null);
      runtime.registerWorkspace(null);
    });
    expect(stage.reset).not.toHaveBeenCalled();
    expect(runtime.ready).toBe(false);
  });
});
