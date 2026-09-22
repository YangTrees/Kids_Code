import { Component, type ErrorInfo, type ReactNode } from "react";
import { EditorPage } from "./EditorPage";
import { EditorRuntimeProvider } from "./EditorRuntimeContext";
import { ProjectPersistenceProvider } from "./ProjectPersistenceContext";

class EditorLoadBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Editor failed to load", error, info);
  }

  override render() {
    if (this.state.failed) {
      return (
        <main className="editor-loading editor-load-error" role="alert">
          <div className="editor-loading-mark">🛠️</div>
          <strong>创作空间没有加载完整</strong>
          <span>作品仍保存在本机，可以安全地重新加载。</span>
          <button onClick={() => window.location.reload()}>重新加载</button>
          <button onClick={() => window.location.assign("/")}>
            返回作品首页
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

export default function EditorRoute() {
  return (
    <EditorLoadBoundary>
      <ProjectPersistenceProvider>
        <EditorRuntimeProvider>
          <EditorPage />
        </EditorRuntimeProvider>
      </ProjectPersistenceProvider>
    </EditorLoadBoundary>
  );
}
