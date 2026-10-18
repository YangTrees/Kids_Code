import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";
import { createDefaultProject, type Project } from "@kids-code/domain";
import { IndexedDbProjectRepository } from "@kids-code/persistence";
import { ProjectPersistenceProvider } from "./ProjectPersistenceContext";
import { useEditorStore } from "./editor-store";

vi.mock("@kids-code/stage", () => ({ registerLocalAssetUrl: vi.fn() }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function project(id: string) {
  return { ...createDefaultProject(), projectId: id, name: id };
}
function Navigation() {
  const navigate = useNavigate();
  return <button onClick={() => navigate("/editor/prj_second")}>换作品</button>;
}
function open() {
  return render(
    <MemoryRouter initialEntries={["/editor/prj_first"]}>
      <Navigation />
      <Routes>
        <Route
          path="/editor/:projectId"
          element={
            <ProjectPersistenceProvider>
              <p>交互式编辑器</p>
            </ProjectPersistenceProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useEditorStore.setState({
    project: project("prj_initial"),
    isHydrated: false,
    saveStatus: "saved",
  });
  vi.spyOn(IndexedDbProjectRepository.prototype, "save").mockResolvedValue();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("project loading boundary", () => {
  it("does not expose the default or previous editor before the requested project is read", async () => {
    const pending = deferred<Project | undefined>();
    vi.spyOn(IndexedDbProjectRepository.prototype, "get").mockReturnValue(
      pending.promise,
    );
    open();
    expect(screen.queryByText("交互式编辑器")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("读取");
    await act(async () => pending.resolve(project("prj_first")));
    expect(screen.getByText("交互式编辑器")).toBeInTheDocument();
    expect(useEditorStore.getState().project.projectId).toBe("prj_first");
  });

  it("offers a safe retry after a failed read, without saving a placeholder", async () => {
    const get = vi
      .spyOn(IndexedDbProjectRepository.prototype, "get")
      .mockRejectedValueOnce(new Error("read failed"))
      .mockResolvedValue(project("prj_first"));
    open();
    expect(await screen.findByRole("alert")).toHaveTextContent("读取");
    expect(screen.queryByText("交互式编辑器")).not.toBeInTheDocument();
    expect(IndexedDbProjectRepository.prototype.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "重试读取作品" }));
    expect(await screen.findByText("交互式编辑器")).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
    expect(useEditorStore.getState().project.projectId).toBe("prj_first");
  });

  it("times out a hung read and ignores it even if it finishes after a successful retry", async () => {
    vi.useFakeTimers();
    const old = deferred<Project | undefined>();
    vi.spyOn(IndexedDbProjectRepository.prototype, "get")
      .mockReturnValueOnce(old.promise)
      .mockResolvedValue(project("prj_first"));
    open();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_001);
    });
    expect(screen.getByRole("alert")).toHaveTextContent("读取");
    expect(screen.queryByText("交互式编辑器")).not.toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "重试读取作品" }));
    });
    expect(screen.getByText("交互式编辑器")).toBeInTheDocument();
    await act(async () =>
      old.resolve({ ...project("prj_first"), name: "过期结果" }),
    );
    expect(useEditorStore.getState().project.name).toBe("prj_first");
    expect(IndexedDbProjectRepository.prototype.save).not.toHaveBeenCalled();
  });

  it("ignores a previous route's late read", async () => {
    const old = deferred<Project | undefined>();
    vi.spyOn(IndexedDbProjectRepository.prototype, "get").mockImplementation(
      (id) =>
        id === "prj_first"
          ? old.promise
          : Promise.resolve(project("prj_second")),
    );
    open();
    fireEvent.click(screen.getByRole("button", { name: "换作品" }));
    expect(await screen.findByText("交互式编辑器")).toBeInTheDocument();
    await act(async () => old.resolve(project("prj_first")));
    expect(useEditorStore.getState().project.projectId).toBe("prj_second");
  });

  it("keeps a newer recovery draft and does not clear it while loading", async () => {
    const original = {
      ...project("prj_first"),
      updatedAt: "2026-10-17T00:00:00.000Z",
    };
    const draft = {
      ...original,
      name: "恢复的作品",
      updatedAt: "2026-10-18T00:00:00.000Z",
    };
    localStorage.setItem("kids-code:draft:prj_first", JSON.stringify(draft));
    vi.spyOn(IndexedDbProjectRepository.prototype, "get").mockResolvedValue(
      original,
    );
    open();
    expect(await screen.findByText("交互式编辑器")).toBeInTheDocument();
    expect(useEditorStore.getState().project.name).toBe("恢复的作品");
    expect(localStorage.getItem("kids-code:draft:prj_first")).not.toBeNull();
  });

  it("rejects invalid persisted data without replacing it with a new project", async () => {
    vi.spyOn(IndexedDbProjectRepository.prototype, "get").mockResolvedValue({
      projectId: "prj_first",
    } as Project);
    open();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("交互式编辑器")).not.toBeInTheDocument();
    expect(IndexedDbProjectRepository.prototype.save).not.toHaveBeenCalled();
  });
});
