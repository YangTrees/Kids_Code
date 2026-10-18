import { Link } from "react-router";
import { useTranslate } from "../../shared/use-translate";
import "../../styles/editor-loading.css";

export function EditorLoadScreen({
  error,
  onRetry,
}: {
  error: "failed" | "timeout" | null;
  onRetry: () => void;
}) {
  const t = useTranslate();
  return (
    <main className="editor-project-loading">
      <section
        className="editor-load-card"
        role={error ? "alert" : "status"}
        aria-live="polite"
      >
        <div className="editor-load-blocks" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <h1>{t(error ? "editor.load.failed" : "editor.load.reading")}</h1>
        <p>
          {t(
            error === "timeout"
              ? "editor.load.timeout"
              : error
                ? "editor.load.errorHint"
                : "editor.load.readHint",
          )}
        </p>
        {error && (
          <div className="editor-load-actions">
            <button type="button" onClick={onRetry}>
              {t("editor.load.retry")}
            </button>
            <Link to="/">{t("editor.load.back")}</Link>
          </div>
        )}
      </section>
    </main>
  );
}

export function EditorSurfaceStatus({
  title,
  message,
  onRetry,
}: {
  title: string;
  message?: string;
  onRetry?: () => void;
}) {
  const t = useTranslate();
  return (
    <div className="editor-surface-status" role={onRetry ? "alert" : "status"}>
      <strong>{title}</strong>
      {message && <span>{message}</span>}
      {onRetry && (
        <button type="button" onClick={onRetry}>
          {t("editor.load.retrySurface")}
        </button>
      )}
    </div>
  );
}
