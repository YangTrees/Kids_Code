import { projectSchema, type Project } from "@kids-code/domain";
import {
  IndexedDbProjectRepository,
  type TrashRecord,
} from "@kids-code/persistence";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { createTaskProject } from "../tasks/task-project";
import {
  createProjectForMode,
  duplicateProject,
  type ProjectMode,
} from "./project-factory";
import {
  createProjectPackage,
  readProjectPackageContents,
} from "../editor/project-package";
import {
  creationTasks,
  getCompletedTaskIds,
  getTaskProgress,
  isTaskUnlocked,
  setAssignedTaskId,
  type CreationTask,
} from "../tasks/task-catalog";

const repository = new IndexedDbProjectRepository();

const taskArtwork: Record<CreationTask["taskId"], string> = {
  speak: "/assets/ui/home-dialogue.png",
  move: "/assets/ui/home-treasure.png",
  turn: "/assets/ui/home-blocks.png",
  repeat: "/assets/ui/home-blocks.png",
  collision: "/assets/ui/home-treasure.png",
  collect: "/assets/ui/home-coin.png",
  score: "/assets/ui/home-coin.png",
  scene: "/assets/ui/home-treasure.png",
  variable: "/assets/ui/home-blocks.png",
  logic: "/assets/ui/home-blocks.png",
  keyboard: "/assets/ui/home-treasure.png",
  sound: "/assets/ui/home-dialogue.png",
  magic: "/assets/ui/home-dialogue.png",
  broadcast: "/assets/ui/home-dialogue.png",
  finale: "/assets/ui/home-treasure.png",
};

function relativeUpdatedAt(value: string): string {
  const elapsed = Math.max(0, Date.now() - Date.parse(value));
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(value).toLocaleDateString("zh-CN");
}

function safeFileName(value: string): string {
  return value.replace(/[<>:"/\\|?*]/g, "_").slice(0, 30) || "我的作品";
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [trashedProjects, setTrashedProjects] = useState<TrashRecord[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [exportingProjectId, setExportingProjectId] = useState<string | null>(
    null,
  );
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>(
    {},
  );
  const [completedTasks] = useState(getCompletedTaskIds);
  const [taskProgress] = useState(getTaskProgress);
  const importInputRef = useRef<HTMLInputElement>(null);
  const thumbnailUrlsRef = useRef<string[]>([]);
  const refresh = () => {
    void Promise.all([
      repository.list(),
      repository.listTrash(),
      repository.listThumbnails(),
    ]).then(([active, trash, thumbnails]) => {
      for (const url of thumbnailUrlsRef.current) URL.revokeObjectURL(url);
      const nextThumbnailUrls = Object.fromEntries(
        thumbnails.map((thumbnail) => [
          thumbnail.projectId,
          URL.createObjectURL(thumbnail.blob),
        ]),
      );
      thumbnailUrlsRef.current = Object.values(nextThumbnailUrls);
      setProjects(active);
      setTrashedProjects(trash);
      setThumbnailUrls(nextThumbnailUrls);
    });
  };
  useEffect(() => {
    refresh();
    return () => {
      for (const url of thumbnailUrlsRef.current) URL.revokeObjectURL(url);
    };
  }, []);
  const openNew = async (mode: ProjectMode) => {
    const project = createProjectForMode(mode);
    await repository.save(project, Date.now());
    navigate(`/editor/${project.projectId}`);
  };
  const importLocalProject = async (file: File) => {
    let parsed: Project;
    if (file.name.toLowerCase().endsWith(".kidgame")) {
      const contents = await readProjectPackageContents(file);
      parsed = contents.project;
      for (const asset of parsed.assets) {
        if (!asset.path.startsWith("uploads/")) continue;
        const blob = contents.assets.get(asset.path);
        if (blob) await repository.saveAsset(asset.path, blob);
      }
    } else {
      parsed = projectSchema.parse(JSON.parse(await file.text()));
    }
    const conflict = await repository.get(parsed.projectId);
    const nextProject = {
      ...parsed,
      projectId: conflict
        ? `prj_${crypto.randomUUID().slice(0, 8)}`
        : parsed.projectId,
      name: conflict ? `${parsed.name} 导入`.slice(0, 30) : parsed.name,
      updatedAt: new Date().toISOString(),
    };
    await repository.save(nextProject, Date.now());
    navigate(`/editor/${nextProject.projectId}`);
  };
  const openTask = async (task: CreationTask) => {
    const starterProject = createTaskProject(task);
    setAssignedTaskId(starterProject.projectId, task.taskId);
    await repository.save(starterProject, Date.now());
    navigate(`/editor/${starterProject.projectId}`);
  };
  const exportLocalProject = async (project: Project) => {
    setExportingProjectId(project.projectId);
    setImportError(null);
    try {
      const thumbnail = await repository.getThumbnail(project.projectId);
      const blob = await createProjectPackage(
        project,
        thumbnail?.blob,
        (path) => repository.getAsset(path),
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeFileName(project.name)}.kidgame`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      console.error("Failed to export project", error);
      setImportError("导出失败：有一个作品素材暂时无法读取，请稍后重试。");
    } finally {
      setExportingProjectId(null);
    }
  };
  return (
    <main className="projects-page">
      <header className="projects-nav">
        <div className="projects-brand">
          <span className="projects-brand-mark">栗</span>
          <span>
            <strong>栗奇编程乐园</strong>
            <small>儿童创意编程工作室</small>
          </span>
        </div>
        <nav className="projects-nav-links" aria-label="首页导航">
          <a href="#templates">灵感模板</a>
          <a href="#challenges">任务挑战</a>
          <a href="#works">我的作品</a>
        </nav>
        <div className="projects-local-status">
          <span /> 本地创作 · 自动保存
        </div>
      </header>
      <section className="projects-hero">
        <div className="projects-hero-copy">
          <span className="projects-eyebrow">CREATE · PLAY · LEARN</span>
          <h1>
            把想象，变成
            <em>会动的故事</em>
          </h1>
          <p>
            拖动积木、设计角色、搭建关卡，从第一个动作开始创造自己的小游戏。
          </p>
          <div className="hero-actions">
            <button
              className="create-project"
              onClick={() => void openNew("blank")}
            >
              ＋ 开始空白创作
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,application/zip,.json,.kidcode.json,.kidgame"
              hidden
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (!file) return;
                void importLocalProject(file).catch(() =>
                  setImportError(
                    "导入失败：作品文件缺失、损坏或格式不受支持。",
                  ),
                );
                event.currentTarget.value = "";
              }}
            />
            <button
              className="import-project"
              onClick={() => importInputRef.current?.click()}
            >
              ⇧ 导入作品
            </button>
          </div>
          <div className="hero-trust-row" aria-label="产品特点">
            <span>无需注册</span>
            <span>自动保存</span>
            <span>从零开始</span>
          </div>
        </div>
        <div className="hero-preview" aria-hidden="true">
          <span className="hero-preview-label">正在创作 · 森林寻宝</span>
          <img src="/assets/characters/liji/liji-idle.png" alt="" />
          <span className="hero-code-card hero-code-motion">向右移动 3 格</span>
          <span className="hero-code-card hero-code-looks">说 我找到啦！</span>
          <span className="hero-play-mark">▶</span>
        </div>
        <div className="hero-mini-card" aria-hidden="true">
          <img src="/assets/ui/home-blocks.png" alt="" />
          <span>
            <strong>拖一拖</strong>
            像拼积木一样简单
          </span>
        </div>
        <div className="hero-level-badge" aria-hidden="true">
          <strong>{creationTasks.length}</strong>
          <span>个创作任务</span>
        </div>
      </section>
      <section className="template-section" id="templates">
        <header>
          <div>
            <span>快速开始</span>
            <h2>从一个灵感模板出发</h2>
          </div>
          <p>所有模板都可以自由拆解和修改</p>
        </header>
        <section className="projects-actions">
          <button
            className="template-project"
            onClick={() => void openNew("treasure-template")}
          >
            <img
              className="template-icon"
              src="/assets/ui/home-treasure.png"
              alt=""
            />
            <span className="template-copy">
              <strong>寻找宝箱</strong>
              <small>方向键移动，碰到宝箱即获胜</small>
            </span>
          </button>
          <button
            className="template-project coin-template"
            onClick={() => void openNew("coin-template")}
          >
            <img
              className="template-icon"
              src="/assets/ui/home-coin.png"
              alt=""
            />
            <span className="template-copy">
              <strong>收集金币</strong>
              <small>点击、声音与成功结果</small>
            </span>
          </button>
          <button
            className="template-project dialogue-template"
            onClick={() => void openNew("dialogue-template")}
          >
            <img
              className="template-icon"
              src="/assets/ui/home-dialogue.png"
              alt=""
            />
            <span className="template-copy">
              <strong>对话故事</strong>
              <small>角色对话与广播消息</small>
            </span>
          </button>
        </section>
      </section>
      {importError ? (
        <div className="projects-import-error" role="alert">
          {importError}
          <button
            onClick={() => setImportError(null)}
            aria-label="关闭导入错误"
          >
            ×
          </button>
        </div>
      ) : null}
      <section className="task-challenges" id="challenges">
        <header>
          <div>
            <h2>任务挑战</h2>
            <p>跟着目标认识积木，也可以随时回到自由创作。</p>
          </div>
          <span>
            已完成 {completedTasks.length} / {creationTasks.length}
          </span>
        </header>
        <div>
          {creationTasks.map((task, index) => (
            <button
              key={task.taskId}
              data-locked={!isTaskUnlocked(task.taskId, completedTasks)}
              disabled={!isTaskUnlocked(task.taskId, completedTasks)}
              onClick={() => void openTask(task)}
            >
              <img className="task-art" src={taskArtwork[task.taskId]} alt="" />
              <small>任务 {index + 1}</small>
              <strong>{task.title}</strong>
              <p>{task.description}</p>
              <b>
                {completedTasks.includes(task.taskId)
                  ? `${taskProgress.find((item) => item.taskId === task.taskId)?.stars ?? 1} 星 · 再玩一次`
                  : isTaskUnlocked(task.taskId, completedTasks)
                    ? "开始挑战 →"
                    : "完成上一关后解锁"}
              </b>
            </button>
          ))}
        </div>
      </section>
      <section className="projects-list" id="works">
        <header className="projects-list-heading">
          <div>
            <span>继续创作</span>
            <h2>最近作品</h2>
          </div>
          <p>所有内容都安全保存在当前设备</p>
        </header>
        {projects.length === 0 ? (
          <p className="projects-empty">还没有作品，点击上方按钮开始创作吧！</p>
        ) : (
          projects.map((project) => {
            const scene = project.scenes.find(
              (item) => item.sceneId === project.currentSceneId,
            );
            const backdrop = project.assets.find(
              (asset) => asset.assetId === scene?.backdropAssetId,
            );
            return (
              <article key={project.projectId} className="project-card">
                <img
                  src={
                    thumbnailUrls[project.projectId] ??
                    `/assets/${backdrop?.path ?? "backgrounds/forest-960x720.webp"}`
                  }
                  alt="作品舞台缩略图"
                />
                <div>
                  <strong>{project.name}</strong>
                  <span>上次编辑：{relativeUpdatedAt(project.updatedAt)}</span>
                </div>
                <button
                  onClick={() => navigate(`/editor/${project.projectId}`)}
                >
                  打开
                </button>
                <button
                  className="duplicate-project"
                  onClick={() => {
                    const copy = duplicateProject(project);
                    void repository.save(copy, Date.now()).then(refresh);
                  }}
                >
                  复制
                </button>
                <button
                  className="export-project"
                  disabled={exportingProjectId === project.projectId}
                  onClick={() => void exportLocalProject(project)}
                >
                  {exportingProjectId === project.projectId ? "导出中" : "导出"}
                </button>
                <button
                  className="delete-project"
                  onClick={() => {
                    if (window.confirm(`删除作品“${project.name}”？`))
                      void repository.remove(project.projectId).then(refresh);
                  }}
                >
                  删除
                </button>
              </article>
            );
          })
        )}
      </section>
      {trashedProjects.length > 0 ? (
        <section className="projects-list trash-list">
          <h2>最近删除</h2>
          {trashedProjects.map(({ project, deletedAt, expiresAt }) => (
            <article key={project.projectId} className="project-card">
              <div>
                <strong>{project.name}</strong>
                <span>
                  删除时间：{new Date(deletedAt).toLocaleString("zh-CN")}
                </span>
                <span>
                  {expiresAt
                    ? `保留至：${new Date(expiresAt).toLocaleDateString("zh-CN")}`
                    : "至少保留7天"}
                </span>
              </div>
              <button
                onClick={() =>
                  void repository.restore(project.projectId).then(refresh)
                }
              >
                恢复
              </button>
              <button
                className="delete-project"
                onClick={() => {
                  if (
                    window.confirm(
                      `永久删除作品“${project.name}”？此操作无法撤销。`,
                    )
                  )
                    void repository.purge(project.projectId).then(refresh);
                }}
              >
                永久删除
              </button>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
