import { useState } from "react";
import { messageIsReferenced, useEditorStore } from "./editor-store";

interface ProjectSettingsDialogProps {
  onClose: () => void;
}

export function ProjectSettingsDialog({ onClose }: ProjectSettingsDialogProps) {
  const project = useEditorStore((state) => state.project);
  const updateProjectSettings = useEditorStore(
    (state) => state.updateProjectSettings,
  );
  const addMessage = useEditorStore((state) => state.addMessage);
  const removeMessage = useEditorStore((state) => state.removeMessage);
  const [name, setName] = useState(project.name);
  const [locale, setLocale] = useState(project.settings.locale);
  const [movementStep, setMovementStep] = useState<10 | 40>(
    project.settings.movementStep ?? 10,
  );
  const [messageName, setMessageName] = useState("");
  const [messageNotice, setMessageNotice] = useState<string | null>(null);

  const createMessage = () => {
    const trimmed = messageName.trim();
    if (!trimmed) return;
    if (project.messages.some((message) => message.name === trimmed)) {
      setMessageNotice(`消息“${trimmed}”已经有了，换一个名字吧。`);
      return;
    }
    if (project.messages.length >= 20) {
      setMessageNotice("消息最多 20 个，先删掉一些不用的。");
      return;
    }
    addMessage(trimmed);
    setMessageName("");
    setMessageNotice(null);
  };

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
          <div className="messages-field">
            <strong>广播消息</strong>
            <small>
              消息可以让一个角色喊话、其他角色一起行动。新建后在“发送消息”积木里就能选到它。
            </small>
            {project.messages.length > 0 ? (
              <ul className="message-list">
                {project.messages.map((message) => {
                  const used = messageIsReferenced(project, message.name);
                  return (
                    <li key={message.messageId}>
                      <span>{message.name}</span>
                      <button
                        type="button"
                        aria-label={`删除消息${message.name}`}
                        disabled={used}
                        title={
                          used
                            ? "还有积木在用这条消息，先删掉那些积木"
                            : "删除这条消息"
                        }
                        onClick={() => {
                          if (used) {
                            setMessageNotice(
                              `还有积木在用“${message.name}”，先把它们删掉。`,
                            );
                            return;
                          }
                          removeMessage(message.messageId);
                        }}
                      >
                        {used ? "使用中" : "删除"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="message-empty">还没有消息，下面新建一个吧。</p>
            )}
            <div className="message-create">
              <input
                value={messageName}
                maxLength={16}
                placeholder="例如：开始游戏"
                aria-label="新消息名称"
                onChange={(event) => setMessageName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    createMessage();
                  }
                }}
              />
              <button
                type="button"
                disabled={!messageName.trim() || project.messages.length >= 20}
                onClick={createMessage}
              >
                ＋ 新建消息
              </button>
            </div>
            {messageNotice ? (
              <p className="library-upload-error" role="status">
                {messageNotice}
              </p>
            ) : null}
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
