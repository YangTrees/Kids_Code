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
import { BlockWorkspaceHost } from "./BlockWorkspaceHost";

const mocks = vi.hoisted(() => ({
  mount: vi.fn(),
  destroy: vi.fn(),
  registerWorkspace: vi.fn(),
  stop: vi.fn(),
}));
vi.mock("@kids-code/block-adapter", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  BlockWorkspaceAdapter: class {
    mount = mocks.mount;
    destroy = mocks.destroy;
    selectCategory() {}
    resize() {}
    parameterAt() {
      return null;
    }
    cancelGesture() {}
  },
}));
vi.mock("./EditorRuntimeContext", () => ({
  useEditorRuntime: () => ({
    registerWorkspace: mocks.registerWorkspace,
    stop: mocks.stop,
  }),
}));
vi.mock("@kids-code/stage", () => ({
  resolveAssetUrl: (path: string) => path,
}));

type Lifecycle = { onReady: () => void; onError: (error: unknown) => void };
const lifecycle = () => mocks.mount.mock.lastCall![5] as Lifecycle;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.mount.mockReset();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  useEditorStore.getState().hydrateProject(createDefaultProject());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("workspace restore lifecycle", () => {
  it("does not register a workspace for running until its saved blocks are restored", () => {
    render(<BlockWorkspaceHost />);
    expect(screen.getByRole("status")).toHaveTextContent("积木");
    expect(mocks.registerWorkspace).toHaveBeenLastCalledWith(null);
    act(() => lifecycle().onReady());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(mocks.registerWorkspace.mock.lastCall?.[0]).not.toBeNull();
  });
  it("catches deferred restore errors and retries without saving a partial workspace", () => {
    const original = useEditorStore.getState().project;
    render(<BlockWorkspaceHost />);
    const emit = mocks.mount.mock.lastCall![1] as (state: object) => void;
    act(() => lifecycle().onError(new Error("deferred restore")));
    expect(screen.getByRole("alert")).toHaveTextContent("积木");
    act(() => emit({ blocks: { blocks: [] } }));
    expect(useEditorStore.getState().project).toBe(original);
    expect(mocks.destroy).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "重新加载" }));
    act(() => lifecycle().onReady());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mocks.mount).toHaveBeenCalledTimes(2);
    expect(useEditorStore.getState().project).toBe(original);
  });
  it("cleans a synchronously failed mount and shows a retry action", () => {
    mocks.mount.mockImplementationOnce(() => {
      throw new Error("inject failed");
    });
    render(<BlockWorkspaceHost />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(mocks.destroy).toHaveBeenCalled();
    expect(mocks.registerWorkspace).toHaveBeenLastCalledWith(null);
  });
  it("ignores a late restore callback after unmount", () => {
    const view = render(<BlockWorkspaceHost />);
    const old = lifecycle();
    view.unmount();
    act(() => old.onReady());
    expect(mocks.registerWorkspace).toHaveBeenLastCalledWith(null);
  });
});
