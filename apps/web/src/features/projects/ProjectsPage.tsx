import { projectSchema, type Project } from "@kids-code/domain";
import {
  IndexedDbProjectRepository,
  type TrashRecord,
} from "@kids-code/persistence";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  createProjectForMode,
  duplicateProject,
  type ProjectMode,
} from "./project-factory";
import {
  createProjectPackage,
  readProjectPackageContents,
} from "../editor/project-package";
import { HelpDialog } from "../help/HelpDialog";
import { useTranslate } from "../../shared/use-translate";
import {
  courseChapters,
  creationTasks,
  getChapterAnchor,
  getCompletedTaskIds,
  getCurrentChapter,
  type TaskChapter,
} from "../tasks/task-catalog";

const repository = new IndexedDbProjectRepository();

const chapterCards: Record<
  TaskChapter,
  { image: string; description: string }
> = {
  基础入门: {
    image: "/assets/ui/home-blocks.png",
    description: "事件、移动、转向和重复，迈出编程第一步。",
  },
  互动游戏: {
    image: "/assets/ui/home-treasure.png",
    description: "让角色碰撞、收集金币，做出胜利反馈。",
  },
  程序思维: {
    image: "/assets/ui/home-coin.png",
    description: "用场景、变量和条件，让程序自己判断。",
  },
  进阶创作: {
    image: "/assets/ui/home-dialogue.png",
    description: "加入键盘、声音与故事，完成冒险小游戏。",
  },
  路线挑战: {
    image: "/assets/ui/home-route.png",
    description: "看地图写程序，沿固定道路逐格走到终点。",
  },
  云岛远征: {
    image: "/assets/ui/home-sky-island.png",
    description: "经过路标、收集星石，并在限定步数内找到捷径。",
  },
  数据小侦探: {
    image: "/assets/ui/home-coin.png",
    description: "记录、显示和比较数据，认识人工智能的燃料。",
  },
  规律与模式: {
    image: "/assets/ui/home-blocks.png",
    description: "用循环表达节拍、形状和节奏里重复的规律。",
  },
  会判断的程序: {
    image: "/assets/ui/home-dialogue.png",
    description: "看特征、定分界线，搭出“如果…那么”的决策模型。",
  },
  "AI 小创客": {
    image: "/assets/ui/home-treasure.png",
    description: "做出会提醒、会回答的小助手，也看看它何时出错。",
  },
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
  const [helpOpen, setHelpOpen] = useState(false);
  const t = useTranslate();
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
            <strong>{t("brand.title")}</strong>
            <small>{t("brand.subtitle")}</small>
          </span>
        </div>
        <nav className="projects-nav-links" aria-label="首页导航">
          <a href="/learn">{t("home.nav.learn")}</a>
          <a href="#templates">{t("home.nav.templates")}</a>
          <a href="#challenges">{t("home.nav.challenges")}</a>
          <a href="#works">{t("home.nav.works")}</a>
          <button type="button" onClick={() => setHelpOpen(true)}>
            {t("home.nav.help")}
          </button>
          <a href="/parent">{t("home.nav.parent")}</a>
        </nav>
        <div className="projects-local-status">
          <span /> {t("home.localStatus")}
        </div>
      </header>
      <section className="projects-hero">
        <div className="projects-hero-copy">
          <span className="projects-eyebrow">{t("home.hero.eyebrow")}</span>
          <h1>
            {t("home.hero.titleLead")}
            <em>{t("home.hero.titleEm")}</em>
          </h1>
          <p>{t("home.hero.desc")}</p>
          <div className="hero-actions">
            <button
              className="create-project"
              onClick={() => navigate("/learn")}
            >
              {t("home.hero.startLearning")}
            </button>
            <button
              className="import-project"
              onClick={() => void openNew("blank")}
            >
              {t("home.hero.startBlank")}
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
            <h2>课程挑战</h2>
            <p>六个单元，从第一块积木走到云岛路线挑战。</p>
          </div>
          <button
            className="import-project"
            onClick={() =>
              navigate(
                `/learn#${getChapterAnchor(getCurrentChapter(completedTasks))}`,
              )
            }
          >
            查看课程地图 · 已完成 {completedTasks.length} /{" "}
            {creationTasks.length} →
          </button>
        </header>
        <div>
          {courseChapters.map((chapter, index) => {
            const tasks = creationTasks.filter(
              (task) => task.chapter === chapter,
            );
            const finished = tasks.filter((task) =>
              completedTasks.includes(task.taskId),
            ).length;
            return (
              <button
                key={chapter}
                onClick={() => navigate(`/learn#${getChapterAnchor(chapter)}`)}
              >
                <img
                  className="task-art"
                  src={chapterCards[chapter].image}
                  alt=""
                />
                <small>
                  第 {index + 1} 单元 · {tasks.length} 关
                </small>
                <strong>{chapter}</strong>
                <p>{chapterCards[chapter].description}</p>
                <b>
                  {finished}/{tasks.length} 已完成 · 查看课程 →
                </b>
              </button>
            );
          })}
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
      {helpOpen ? <HelpDialog onClose={() => setHelpOpen(false)} /> : null}
    </main>
  );
}
