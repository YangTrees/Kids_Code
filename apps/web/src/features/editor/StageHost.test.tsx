import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultProject } from "@kids-code/domain";
import { useEditorStore } from "./editor-store";
import { StageHost } from "./StageHost";

const mocks = vi.hoisted(() => ({
  mount: vi.fn(),
  destroy: vi.fn(),
  registerStage: vi.fn(),
  saveThumbnail: vi.fn(),
}));
vi.mock("@kids-code/stage", () => ({
  StageController: class {
    mount = mocks.mount;
    destroy = mocks.destroy;
    setPerformanceWarningHandler() {}
    setGridVisible() {}
    updateEditorSnapshot() {}
    setSpritePosition() {}
    setSpriteRotation() {}
    setSpriteScale() {}
    setSpriteVisible() {}
    setSpriteZIndex() {}
    captureThumbnail() {
      return Promise.resolve(null);
    }
  },
}));
vi.mock("./EditorRuntimeContext", () => ({
  useEditorRuntime: () => ({ registerStage: mocks.registerStage }),
}));
vi.mock("./ProjectPersistenceContext", () => ({
  useProjectPersistence: () => ({ saveThumbnail: mocks.saveThumbnail }),
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.mount.mockReset().mockResolvedValue(true);
  useEditorStore.getState().hydrateProject(createDefaultProject());
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
async function advance(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("stage load recovery", () => {
  it("keeps React feedback outside the canvas container owned by Pixi", async () => {
    mocks.mount.mockImplementationOnce(async (host: HTMLElement) => {
      host.replaceChildren(document.createElement("canvas"));
      return true;
    });
    render(<StageHost />);
    expect(
      screen.getByLabelText("作品舞台").querySelector('[role="status"]'),
    ).toBeNull();
    await advance();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("作品舞台").querySelector("canvas"),
    ).not.toBeNull();
  });
  it("shows readiness only when the asynchronous renderer is mounted", async () => {
    render(<StageHost />);
    expect(screen.getByRole("status")).toHaveTextContent("舞台");
    expect(mocks.registerStage).toHaveBeenLastCalledWith(null);
    await advance();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(mocks.registerStage.mock.lastCall?.[0]).not.toBeNull();
  });
  it("offers local retry after renderer rejection without modifying project state", async () => {
    mocks.mount.mockRejectedValueOnce(new Error("renderer failed"));
    const original = useEditorStore.getState().project;
    render(<StageHost />);
    await advance();
    expect(screen.getByRole("alert")).toHaveTextContent("舞台");
    fireEvent.click(screen.getByRole("button", { name: "重新加载" }));
    await advance();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mocks.mount).toHaveBeenCalledTimes(2);
    expect(useEditorStore.getState().project).toBe(original);
  });
  it("times out a renderer that never completes", async () => {
    mocks.mount.mockReturnValueOnce(new Promise(() => {}));
    render(<StageHost />);
    await advance(15_001);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(mocks.registerStage).toHaveBeenLastCalledWith(null);
  });
  it("recovers WebGL context loss through a new renderer without clearing code", async () => {
    const original = useEditorStore.getState().project;
    render(<StageHost />);
    await advance();
    fireEvent(
      screen.getByLabelText("作品舞台"),
      new Event("webglcontextlost", { cancelable: true }),
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(mocks.registerStage).toHaveBeenLastCalledWith(null);
    fireEvent.click(screen.getByRole("button", { name: "重新加载" }));
    await advance();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(useEditorStore.getState().project).toBe(original);
  });
  it("cancels a renderer before unmount so it cannot register late", async () => {
    let finish!: (mounted: boolean) => void;
    mocks.mount.mockReturnValueOnce(
      new Promise<boolean>((resolve) => {
        finish = resolve;
      }),
    );
    const view = render(<StageHost />);
    await advance();
    view.unmount();
    await act(async () => finish(true));
    expect(mocks.registerStage).toHaveBeenLastCalledWith(null);
  });
});
