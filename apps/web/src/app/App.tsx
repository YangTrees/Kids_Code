import {
  Component,
  lazy,
  Suspense,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { Navigate, Route, Routes } from "react-router";
import { ProjectsPage } from "../features/projects/ProjectsPage";

const EditorRoute = lazy(() => import("../features/editor/EditorRoute"));

function EditorLoading() {
  return (
    <main className="editor-loading" role="status" aria-live="polite">
      <div className="editor-loading-mark">🧩</div>
      <strong>正在准备创作空间…</strong>
      <span>加载积木和舞台，请稍等一下</span>
      <div className="editor-loading-bar" />
    </main>
  );
}

class EditorChunkBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Editor bundle failed to load", error, info);
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="editor-loading editor-load-error" role="alert">
        <div className="editor-loading-mark">📦</div>
        <strong>编辑器资源没有加载完整</strong>
        <span>请检查网络后重试，已保存的作品不会丢失。</span>
        <button onClick={() => window.location.reload()}>重新加载</button>
        <button onClick={() => window.location.assign("/")}>
          返回作品首页
        </button>
      </main>
    );
  }
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectsPage />} />
      <Route
        path="/editor/:projectId"
        element={
          <EditorChunkBoundary>
            <Suspense fallback={<EditorLoading />}>
              <EditorRoute />
            </Suspense>
          </EditorChunkBoundary>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
