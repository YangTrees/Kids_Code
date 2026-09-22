import { useState } from "react";
import { useEditorStore } from "./editor-store";

interface ProjectSettingsDialogProps {
  onClose: () => void;
}

export function ProjectSettingsDialog({ onClose }: ProjectSettingsDialogProps) {
  const project = useEditorStore((state) => state.project);
  const updateProjectSettings = useEditorStore(
    (state) => state.updateProjectSettings,
  );
  const [name, setName] = useState(project.name);
  const [locale, setLocale] = useState(project.settings.locale);
  const [movementStep, setMovementStep] = useState<10 | 40>(
    project.settings.movementStep ?? 10,
  );

  const save = () => {
    if (!name.trim()) return;
    updateProjectSettings(name, locale, movementStep);
    onClose();
  };

  return (
    <div className="manager-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="manager-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="作品设置"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <strong>作品设置</strong>
          <button className="manager-close" aria-label="关闭" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="settings-fields">
          <label>
            作品名称
            <input
              value={name}
              maxLength={30}
              autoFocus
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") save();
                if (event.key === "Escape") onClose();
              }}
            />
          </label>
          <div className="locale-field">
            <strong>界面语言</strong>
            <div className="locale-options" role="group" aria-label="界面语言">
              <button
                type="button"
                data-selected={locale === "zh-CN"}
                onClick={() => setLocale("zh-CN")}
              >
                <span>中</span>
                简体中文
              </button>
              <button
                type="button"
                data-selected={locale === "en-US"}
                onClick={() => setLocale("en-US")}
              >
                <span>EN</span>
                English
              </button>
            </div>
          </div>
          <div className="settings-summary">
            <span>移动与网格</span>
            <div
              className="movement-options"
              role="group"
              aria-label="移动单位"
            >
              <button
                aria-pressed={movementStep === 40}
                onClick={() => setMovementStep(40)}
              >
                大格 · 40 像素
              </button>
              <button
                aria-pressed={movementStep === 10}
                onClick={() => setMovementStep(10)}
              >
                细格 · 10 像素
              </button>
              <small>
                积木中的 1 格等于舞台上的 1
                格。旧作品保留细格，切换后移动距离会改变。
              </small>
            </div>
            <span>舞台尺寸</span>
            <strong>
              {project.settings.stageWidth} × {project.settings.stageHeight}
            </strong>
            <span>运行帧率</span>
            <strong>{project.settings.fps} FPS</strong>
          </div>
        </div>
        <div className="manager-actions">
          <button
            className="manager-save"
            disabled={!name.trim()}
            onClick={save}
          >
            保存设置
          </button>
          <button onClick={onClose}>取消</button>
        </div>
      </section>
    </div>
  );
}
