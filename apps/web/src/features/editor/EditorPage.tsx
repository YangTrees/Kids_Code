import type { BlockCategory } from "./editor-store";
import { BlockWorkspaceHost } from "./BlockWorkspaceHost";
import { StageHost } from "./StageHost";
import {
  countSpriteReferences,
  countWorkspaceBlocks,
  useEditorStore,
} from "./editor-store";
import { useEditorRuntime } from "./EditorRuntimeContext";
import { useProjectPersistence } from "./ProjectPersistenceContext";
import { useEffect, useRef, useState } from "react";
import { TutorialOverlay } from "./TutorialOverlay";
import { AssetManagerDialog } from "./AssetManagerDialog";
import { AssetLibraryDialog } from "./AssetLibraryDialog";
import { ProjectSettingsDialog } from "./ProjectSettingsDialog";
import { useNavigate } from "react-router";
import { TaskPanel } from "../tasks/TaskPanel";
import { TaskCompletionDialog } from "../tasks/TaskCompletionDialog";
import { resolveAssetUrl } from "@kids-code/stage";
import {
  getGridDimensions,
  getMovementStep,
  snapStagePositionToGrid,
  stagePositionToGrid,
} from "@kids-code/domain";
import { CurrentTaskCard } from "../tasks/CurrentTaskCard";
import { getAssignedTaskId } from "../tasks/task-catalog";
import "../../styles/editor-experience.css";

const assetPathBySprite: Record<string, string> = {
  spr_liji: "/assets/characters/liji/liji-idle.png",
  spr_box: "/assets/objects/treasure-chest.png",
  spr_coin: "/assets/objects/star-coin.png",
};

const categoryItems: Array<{ id: BlockCategory; icon: string; label: string }> =
  [
    { id: "event", icon: "⚑", label: "事件" },
    { id: "motion", icon: "➜", label: "动作" },
    { id: "looks", icon: "✦", label: "外观" },
    { id: "sound", icon: "♪", label: "声音" },
    { id: "control", icon: "⟳", label: "控制" },
    { id: "game", icon: "🎮", label: "游戏" },
  ];

const commonShortcuts: Array<{
  category: BlockCategory;
  icon: string;
  label: string;
}> = [
  { category: "event", icon: "⚑", label: "开始" },
  { category: "motion", icon: "➜", label: "移动" },
  { category: "looks", icon: "💬", label: "说话" },
  { category: "control", icon: "◇", label: "判断" },
  { category: "game", icon: "⭐", label: "得分" },
];

function GreenFlagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 21V3"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M6 4.5c3-1.8 5.1 1.7 8 .1 2.2-1.2 3.9-.9 5 .2v10c-1.1-1.1-2.8-1.4-5-.2-2.9 1.6-5-1.9-8-.1v-10Z"
        fill="currentColor"
      />
    </svg>
  );
}

function StepIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 5 10 7L5 19V5Z" fill="currentColor" />
      <path
        d="M19 5v14"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EditorPage() {
  const navigate = useNavigate();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [playMode, setPlayMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [taskPanelOpen, setTaskPanelOpen] = useState(false);
  const [gridVisible, setGridVisible] = useState(true);
  const [assetPicker, setAssetPicker] = useState<{
    kind: "sprite" | "background";
    mode: "add" | "replace";
  } | null>(null);
  const [managedAsset, setManagedAsset] = useState<{
    kind: "sprite" | "scene";
    id: string;
  } | null>(null);
  const {
    project,
    selectedSpriteId,
    selectedCategory,
    saveStatus,
    selectSprite,
    selectCategory,
    projectHistory,
    projectFuture,
    undoProject,
    redoProject,
    updateProjectSettings,
    updateSpritePosition,
    addSpriteFromLibrary,
    deleteSprite,
    selectScene,
    addSceneFromLibrary,
    updateSceneBackdrop,
  } = useEditorStore();
  const {
    status,
    ready,
    errorMessage,
    run,
    step: stepRun,
    pauseOrResume,
    stop,
    triggerKey,
    muted,
    toggleMuted,
    lastRunReport,
  } = useEditorRuntime();
  const { exportProject, importProject, importLocalImage, retrySave } =
    useProjectPersistence();
  const running = status === "STARTING" || status === "RUNNING";
  const courseTaskId = getAssignedTaskId(project.projectId);
  const step = getMovementStep(project);
  const selectedSprite = project.sprites.find(
    (sprite) => sprite.spriteId === selectedSpriteId,
  );
  const livePosition =
    status !== "IDLE" &&
    status !== "STOPPED" &&
    lastRunReport?.projectId === project.projectId
      ? lastRunReport.spritePositions[selectedSpriteId]
      : undefined;
  const statusLabel = {
    IDLE: "编辑中",
    STARTING: "准备运行",
    RUNNING: "运行中",
    PAUSED: "已暂停",
    COMPLETED: "运行完成",
    STOPPED: "已回到起点",
    ERROR: "请检查积木",
  }[status];
  const currentScene = project.scenes.find(
    (scene) => scene.sceneId === project.currentSceneId,
  );
  const selectedInstance = currentScene?.instances.find(
    (instance) => instance.spriteId === selectedSpriteId,
  );
  const selectedGridCenter = selectedInstance
    ? snapStagePositionToGrid(
        project,
        selectedInstance.transform.x,
        selectedInstance.transform.y,
      )
    : null;
  const needsGridAlignment =
    selectedInstance &&
    selectedGridCenter &&
    (selectedInstance.transform.x !== selectedGridCenter.x ||
      selectedInstance.transform.y !== selectedGridCenter.y);
  const gridSize = getGridDimensions(project);
  const currentCell = stagePositionToGrid(
    project,
    livePosition?.x ?? selectedInstance?.transform.x ?? 0,
    livePosition?.y ?? selectedInstance?.transform.y ?? 0,
  );
  const selectedBlockCount = countWorkspaceBlocks(
    project.workspaceStates[selectedSpriteId],
  );
  const totalBlockCount = Object.values(project.workspaceStates).reduce<number>(
    (total, workspace) => total + countWorkspaceBlocks(workspace),
    0,
  );

  useEffect(() => {
    const handleHistoryShortcut = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      if (
        event.target instanceof HTMLElement &&
        (event.target.matches("input, textarea, select") ||
          event.target.isContentEditable)
      )
        return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey && projectHistory.length > 0) {
        event.preventDefault();
        undoProject();
      } else if (
        (key === "y" || (key === "z" && event.shiftKey)) &&
        projectFuture.length > 0
      ) {
        event.preventDefault();
        redoProject();
      }
    };
    window.addEventListener("keydown", handleHistoryShortcut);
    return () => window.removeEventListener("keydown", handleHistoryShortcut);
  }, [projectFuture.length, projectHistory.length, redoProject, undoProject]);

  return (
    <main className="editor-page" data-play-mode={playMode}>
      <header className="topbar">
        <button
          className="round-button home-button toolbar-icon-button"
          aria-label={courseTaskId ? "返回课程地图" : "返回首页"}
          data-hover-label={courseTaskId ? "课程" : "首页"}
          onClick={() => navigate(courseTaskId ? "/learn" : "/")}
        >
          <span className="toolbar-glyph">⌂</span>
        </button>
        <button
          className="project-title"
          aria-label="编辑作品名称"
          onClick={() => setSettingsOpen(true)}
        >
          <img
            className="project-emoji"
            src="/assets/ui/home-blocks.png"
            alt=""
          />
          <span className="project-title-copy">
            <small>当前作品</small>
            <strong>{project.name}</strong>
          </span>
          <span className="edit-pencil" aria-hidden="true">
            ✎
          </span>
        </button>
        <div className="toolbar-group toolbar-file-tools">
          <button
            className="round-button toolbar-icon-button"
            aria-label="导出作品"
            data-hover-label="导出"
            onClick={() => void exportProject()}
          >
            <span className="toolbar-glyph">⇩</span>
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,application/zip,.json,.kidcode.json,.kidgame"
            hidden
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (!file) return;
              void importProject(file)
                .then(() => setImportError(null))
                .catch(() =>
                  setImportError(
                    "导入失败：请选择完整有效的 .kidgame 或 JSON 作品文件。",
                  ),
                );
              event.currentTarget.value = "";
            }}
          />
          <button
            className="round-button toolbar-icon-button"
            aria-label="导入作品"
            data-hover-label="导入"
            onClick={() => importInputRef.current?.click()}
          >
            <span className="toolbar-glyph">⇧</span>
          </button>
        </div>
        <div className="save-state" data-state={saveStatus}>
          <span>{saveStatus === "error" ? "!" : "✓"}</span>
          {saveStatus === "saved"
            ? "已保存"
            : saveStatus === "error"
              ? "保存失败"
              : saveStatus === "dirty"
                ? "待保存"
                : "保存中…"}
          {saveStatus === "error" ? (
            <button type="button" onClick={retrySave}>
              重试
            </button>
          ) : null}
        </div>
        <div className="toolbar-group toolbar-history-tools">
          <button
            className="round-button toolbar-icon-button"
            aria-label="撤销编辑"
            data-hover-label="撤销"
            onClick={undoProject}
            disabled={projectHistory.length === 0}
          >
            <span className="toolbar-glyph">↶</span>
          </button>
          <button
            className="round-button toolbar-icon-button"
            aria-label="重做编辑"
            data-hover-label="重做"
            onClick={redoProject}
            disabled={projectFuture.length === 0}
          >
            <span className="toolbar-glyph">↷</span>
          </button>
        </div>
        <div className="toolbar-group toolbar-play-tools">
          <button
            className="run-button"
            aria-label="绿旗运行"
            title="从起点运行绿旗积木"
            onClick={run}
            disabled={!ready || running}
          >
            <span className="play-action-icon flag-icon">
              <GreenFlagIcon />
            </span>
            <span>运行</span>
          </button>
          <button
            className="step-button"
            aria-label="单步运行"
            title="每次执行一步，观察角色如何移动"
            onClick={stepRun}
            disabled={
              !ready ||
              (status !== "IDLE" &&
                status !== "STOPPED" &&
                status !== "COMPLETED" &&
                status !== "PAUSED")
            }
          >
            <span className="play-action-icon">
              <StepIcon />
            </span>
            <span>单步</span>
          </button>
          {status === "RUNNING" || status === "PAUSED" ? (
            <button
              className="pause-button"
              aria-label={status === "PAUSED" ? "继续运行" : "暂停运行"}
              onClick={pauseOrResume}
            >
              <span className="play-action-icon" aria-hidden="true">
                {status === "PAUSED" ? "▶" : "❚❚"}
              </span>
              <span>{status === "PAUSED" ? "继续" : "暂停"}</span>
            </button>
          ) : null}
          <button
            className="stop-button"
            aria-label="停止运行"
            onClick={stop}
            disabled={status === "IDLE" || status === "STOPPED"}
          >
            <span className="play-action-icon" aria-hidden="true">
              ■
            </span>
            <span>停止</span>
          </button>
        </div>
        <button
          className="task-button"
          aria-label="打开创作任务"
          onClick={() => setTaskPanelOpen(true)}
        >
          <span aria-hidden="true">★</span> 任务
        </button>
      </header>

      <section className="editor-main">
        <section className="stage-panel">
          <div className="stage-heading">
            <div>
              <small>看见你的创作</small>
              <strong>作品舞台</strong>
            </div>
            <span className="runtime-status" data-status={status} role="status">
              {statusLabel}
            </span>
          </div>
          <div className="stage-actions">
            <button
              className="stage-run"
              aria-label="运行作品"
              onClick={run}
              disabled={!ready || running}
            >
              <GreenFlagIcon /> 运行
            </button>
            <button
              onClick={() => setGridVisible((value) => !value)}
              aria-label={gridVisible ? "隐藏舞台网格" : "显示舞台网格"}
              aria-pressed={gridVisible}
            >
              网格
            </button>
            <button
              onClick={() =>
                setAssetPicker({ kind: "background", mode: "replace" })
              }
              aria-label="选择背景"
            >
              换背景
            </button>
            <button onClick={() => setPlayMode(true)} aria-label="全屏试玩">
              全屏试玩 ↗
            </button>
          </div>
          <div className="stage-frame">
            <StageHost gridVisible={gridVisible} />
            <button
              className="stage-tool stage-expand"
              aria-label="退出舞台试玩"
              onClick={() => setPlayMode((value) => !value)}
            >
              {playMode ? "×" : "⌗"}
            </button>
            <button
              className="stage-tool stage-image"
              aria-label="舞台背景"
              onClick={() =>
                setAssetPicker({ kind: "background", mode: "replace" })
              }
            >
              ▧
            </button>
            <button
              className="stage-tool stage-grid"
              aria-label="舞台网格"
              data-active={gridVisible}
              onClick={() => setGridVisible((value) => !value)}
            >
              #
            </button>
            <div className="play-toolbar" aria-label="试玩控制">
              <button onClick={run} aria-label="开始或重玩">
                ↻
              </button>
              <button
                onClick={pauseOrResume}
                disabled={status !== "RUNNING" && status !== "PAUSED"}
                aria-label={status === "PAUSED" ? "继续试玩" : "暂停试玩"}
              >
                {status === "PAUSED" ? "▶" : "Ⅱ"}
              </button>
              <button onClick={stop} aria-label="停止试玩">
                ■
              </button>
              <button
                onClick={toggleMuted}
                aria-label={muted ? "打开声音" : "关闭声音"}
              >
                {muted ? "🔇" : "🔊"}
              </button>
              <button onClick={() => setPlayMode(false)} aria-label="退出试玩">
                ×
              </button>
            </div>
            <div className="touch-controls" aria-label="方向控制">
              <button onClick={() => triggerKey("up arrow")} aria-label="向上">
                ↑
              </button>
              <button
                onClick={() => triggerKey("left arrow")}
                aria-label="向左"
              >
                ←
              </button>
              <button
                onClick={() => triggerKey("down arrow")}
                aria-label="向下"
              >
                ↓
              </button>
              <button
                onClick={() => triggerKey("right arrow")}
                aria-label="向右"
              >
                →
              </button>
            </div>
          </div>
          <div className="stage-ruler">
            <span className="ruler-cell" aria-hidden="true" />
            <strong>{step === 40 ? "大格模式" : "旧版细格"}</strong>
            <span>1 格 = {step} 像素</span>
            <span>
              {gridSize.columns} × {gridSize.rows} 格 · 从 0 开始
            </span>
            {step === 10 ? (
              <button
                className="ruler-upgrade"
                title="切换后，移动积木每一格的距离会变大"
                onClick={() =>
                  updateProjectSettings(
                    project.name,
                    project.settings.locale,
                    40,
                  )
                }
              >
                切换大格
              </button>
            ) : (
              <button onClick={() => setSettingsOpen(true)}>调整</button>
            )}
            {needsGridAlignment && !running ? (
              <button
                className="ruler-align"
                title="将当前选中的角色移动到最近的格子中心"
                onClick={() =>
                  updateSpritePosition(
                    selectedSpriteId,
                    selectedInstance.transform.x,
                    selectedInstance.transform.y,
                  )
                }
              >
                对齐格心
              </button>
            ) : null}
          </div>
          <p className="stage-interaction-note">
            {running
              ? "碰到宝箱会停下；金币可穿过并触发接触事件。"
              : `拖动角色会吸附到格子中心；X 为 0–${gridSize.columns - 1} 列，Y 为 0–${gridSize.rows - 1} 行。`}
          </p>
          <CurrentTaskCard onOpen={() => setTaskPanelOpen(true)} />
        </section>

        <section className="workspace-panel">
          <div className="workspace-heading">
            <div>
              <small>正在给谁编程？</small>
              <strong>{selectedSprite?.name}</strong>
            </div>
            <span>先选事件，再接动作</span>
          </div>
          <nav className="category-rail" aria-label="积木分类">
            {categoryItems.map((item) => (
              <button
                key={item.id}
                className={`category-button category-${item.id}`}
                data-active={selectedCategory === item.id}
                aria-pressed={selectedCategory === item.id}
                onClick={() => selectCategory(item.id)}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
          <BlockWorkspaceHost />
          <div className="common-blocks" aria-label="常用积木入口">
            {commonShortcuts.map((item) => (
              <button
                key={item.label}
                className={`common-shortcut category-${item.category}`}
                onClick={() => selectCategory(item.category)}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
          <div className="workspace-badge" aria-label="工作区状态">
            <strong>
              {
                categoryItems.find((item) => item.id === selectedCategory)
                  ?.label
              }
              积木
            </strong>
            <span>
              X {currentCell.x} · Y {currentCell.y}
            </span>
            <span>
              当前 {selectedBlockCount} · 全部 {totalBlockCount}/1000
            </span>
          </div>
          {project.workspaceStates[selectedSpriteId] &&
          selectedBlockCount === 0 ? (
            <div className="workspace-empty" role="status">
              <span>🧩</span>
              <strong>从“点击开始”搭起第一段程序吧</strong>
              <p>先选事件，再连接动作；点击上方运行就能看到效果。</p>
              <div>
                <button onClick={() => selectCategory("event")}>
                  找开始积木
                </button>
                <button onClick={() => selectCategory("motion")}>
                  找动作积木
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </section>

      <footer className="asset-tray">
        <div className="tray-label">
          <span>♟</span>
          <strong>角色</strong>
        </div>
        <div className="asset-list">
          {project.sprites.map((sprite) => (
            <button
              key={sprite.spriteId}
              className="asset-card"
              data-selected={selectedSpriteId === sprite.spriteId}
              onClick={() => selectSprite(sprite.spriteId)}
              onDoubleClick={() =>
                setManagedAsset({ kind: "sprite", id: sprite.spriteId })
              }
              onContextMenu={(event) => {
                event.preventDefault();
                const referenceCount = countSpriteReferences(
                  project,
                  sprite.spriteId,
                );
                if (referenceCount > 0) {
                  window.alert(
                    `暂时不能删除“${sprite.name}”：其他角色的 ${referenceCount} 个积木正在引用它。请先删除相关碰撞或判断积木。`,
                  );
                  return;
                }
                const blockCount =
                  countWorkspaceBlocks(
                    project.workspaceStates[sprite.spriteId],
                  ) +
                  project.scripts
                    .filter(
                      (script) => script.ownerSpriteId === sprite.spriteId,
                    )
                    .reduce((total, script) => total + script.blocks.length, 0);
                if (
                  window.confirm(
                    `删除角色“${sprite.name}”？${blockCount > 0 ? `\n该角色包含 ${blockCount} 个积木，相关脚本会一起删除。` : ""}\n删除后可点击“撤销”恢复。`,
                  )
                ) {
                  deleteSprite(sprite.spriteId);
                }
              }}
            >
              <img
                src={
                  assetPathBySprite[sprite.spriteId] ??
                  resolveAssetUrl(
                    project.assets.find(
                      (asset) => asset.assetId === sprite.costumeAssetId,
                    )?.path ?? "characters/liji/liji-idle.png",
                  )
                }
                alt=""
              />
              <span>{sprite.name}</span>
            </button>
          ))}
          <button
            className="add-card manage-card"
            onClick={() =>
              setManagedAsset({ kind: "sprite", id: selectedSpriteId })
            }
          >
            <span>•••</span>管理角色
          </button>
          <button
            className="add-card"
            onClick={() => setAssetPicker({ kind: "sprite", mode: "add" })}
            disabled={project.sprites.length >= 20}
          >
            <span>＋</span>添加角色
          </button>
        </div>
        <div className="tray-divider" />
        <div className="tray-label">
          <span>▧</span>
          <strong>场景</strong>
        </div>
        <div className="scene-list">
          {project.scenes.map((scene) => {
            const backdrop = project.assets.find(
              (asset) => asset.assetId === scene.backdropAssetId,
            );
            return (
              <button
                key={scene.sceneId}
                className="scene-card"
                data-selected={project.currentSceneId === scene.sceneId}
                onClick={() => selectScene(scene.sceneId)}
                onDoubleClick={() =>
                  setManagedAsset({ kind: "scene", id: scene.sceneId })
                }
              >
                {backdrop ? (
                  <img src={resolveAssetUrl(backdrop.path)} alt="" />
                ) : null}
                <span>{scene.name}</span>
              </button>
            );
          })}
          <button
            className="add-card manage-card"
            onClick={() =>
              setManagedAsset({ kind: "scene", id: project.currentSceneId })
            }
          >
            <span>•••</span>管理场景
          </button>
          <button
            className="add-card"
            onClick={() => setAssetPicker({ kind: "background", mode: "add" })}
            disabled={project.scenes.length >= 5}
          >
            <span>＋</span>添加场景
          </button>
        </div>
      </footer>

      {errorMessage || importError ? (
        <div className="runtime-message" role="status">
          {errorMessage ?? importError}
        </div>
      ) : null}

      <aside className="portrait-warning">
        请将设备横屏使用，创作空间会更宽敞。
      </aside>
      <TutorialOverlay />
      {managedAsset ? (
        <AssetManagerDialog
          kind={managedAsset.kind}
          entityId={managedAsset.id}
          onClose={() => setManagedAsset(null)}
        />
      ) : null}
      {assetPicker ? (
        <AssetLibraryDialog
          kind={assetPicker.kind}
          title={
            assetPicker.kind === "sprite"
              ? "选择角色"
              : assetPicker.mode === "replace"
                ? "更换场景背景"
                : "选择新场景"
          }
          onSelect={(asset) => {
            if (assetPicker.kind === "sprite" && "scale" in asset) {
              addSpriteFromLibrary(asset);
            } else if (!("scale" in asset)) {
              if (assetPicker.mode === "replace") {
                updateSceneBackdrop(project.currentSceneId, asset);
              } else {
                addSceneFromLibrary(asset);
              }
            }
            setAssetPicker(null);
          }}
          onUpload={(file) => importLocalImage(file, assetPicker.kind)}
          onClose={() => setAssetPicker(null)}
        />
      ) : null}
      {settingsOpen ? (
        <ProjectSettingsDialog onClose={() => setSettingsOpen(false)} />
      ) : null}
      {taskPanelOpen ? (
        <TaskPanel onClose={() => setTaskPanelOpen(false)} />
      ) : null}
      <TaskCompletionDialog key={project.projectId} />
    </main>
  );
}
