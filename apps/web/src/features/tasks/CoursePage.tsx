import { IndexedDbProjectRepository } from "@kids-code/persistence";
import type { Project } from "@kids-code/domain";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  courseChapters,
  creationTasks,
  getAssignedTaskId,
  getChapterAnchor,
  getCompletedTaskIds,
  getCurrentChapter,
  getTaskProgress,
  isTaskUnlocked,
  setAssignedTaskId,
  type CreationTask,
  type TaskChapter,
} from "./task-catalog";
import { createTaskProject } from "./task-project";
import "../../styles/course.css";
import { assetUrl } from "../../shared/base-url";

const repository = new IndexedDbProjectRepository();

const chapterDetails: Record<
  TaskChapter,
  { number: string; description: string; image: string }
> = {
  基础入门: {
    number: "01",
    description: "认识事件、移动和重复，让角色听懂你的第一条指令。",
    image: assetUrl("ui/home-blocks.png"),
  },
  互动游戏: {
    number: "02",
    description: "用碰撞、点击和得分，把舞台变成可以玩的游戏。",
    image: assetUrl("ui/home-treasure.png"),
  },
  程序思维: {
    number: "03",
    description: "切换场景、记录数值，并让程序自己做判断。",
    image: assetUrl("ui/home-coin.png"),
  },
  进阶创作: {
    number: "04",
    description: "加入按键、声音和消息，完成自己的森林冒险。",
    image: assetUrl("ui/home-dialogue.png"),
  },
  路线挑战: {
    number: "05",
    description: "沿着固定道路写出路线，用顺序和循环抵达终点。可以直接开始。",
    image: assetUrl("ui/home-route.png"),
  },
  云岛远征: {
    number: "06",
    description: "在专属云岛地图上找路标、收星石、选捷径，挑战更聪明的程序。",
    image: assetUrl("ui/home-sky-island.png"),
  },
  数据小侦探: {
    number: "07",
    description:
      "用变量把发生的事情记下来、显示出来、比一比，认识人工智能的燃料：数据。",
    image: assetUrl("ui/home-coin.png"),
  },
  规律与模式: {
    number: "08",
    description: "把重复的东西交给循环，找出节拍、形状和节奏里藏着的规律。",
    image: assetUrl("ui/home-blocks.png"),
  },
  会判断的程序: {
    number: "09",
    description:
      "看特征、定分界线、做判断，亲手搭出“如果…那么”这样的小小决策模型。",
    image: assetUrl("ui/home-dialogue.png"),
  },
  "AI 小创客": {
    number: "10",
    description:
      "做出会提醒、会回答、会作曲的小助手，也看看人工智能什么时候会出错。",
    image: assetUrl("ui/home-treasure.png"),
  },
};

export function CoursePage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const completed = getCompletedTaskIds();
  const progress = getTaskProgress();
  const nextTask =
    creationTasks.find((task) => !completed.includes(task.taskId)) ??
    creationTasks[creationTasks.length - 1]!;
  const hasStartedNextTask = projects.some(
    (project) => getAssignedTaskId(project.projectId) === nextTask.taskId,
  );
  const { hash } = useLocation();
  const [targetChapter, setTargetChapter] = useState<TaskChapter | null>(null);

  useEffect(() => {
    let active = true;
    void repository
      .list()
      .then((items) => {
        if (active) {
          setProjects(items);
          setProjectsLoaded(true);
        }
      })
      .catch(() => {
        if (active) setError("暂时无法读取本机作品，请刷新后重试。");
      });
    return () => {
      active = false;
    };
  }, []);

  // 从首页点进某个单元时，直接滚到那个单元并短暂高亮，别停在页面顶部。
  useEffect(() => {
    const anchor = hash.replace("#", "");
    if (!anchor) return;
    const chapter =
      anchor === "current"
        ? getCurrentChapter()
        : courseChapters.find((item) => getChapterAnchor(item) === anchor);
    if (!chapter) return;
    const element = document.getElementById(getChapterAnchor(chapter));
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    setTargetChapter(chapter);
    const timer = window.setTimeout(() => setTargetChapter(null), 2600);
    return () => window.clearTimeout(timer);
  }, [hash]);

  const openTask = async (task: CreationTask) => {
    if (
      !projectsLoaded ||
      busyTaskId ||
      !isTaskUnlocked(task.taskId, completed)
    )
      return;
    setBusyTaskId(task.taskId);
    setError(null);
    try {
      const existing = projects
        .filter(
          (project) => getAssignedTaskId(project.projectId) === task.taskId,
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      if (existing) {
        navigate("/editor/" + existing.projectId);
        return;
      }
      const starter = createTaskProject(task);
      await repository.save(starter, Date.now());
      setAssignedTaskId(starter.projectId, task.taskId);
      navigate("/editor/" + starter.projectId);
    } catch {
      setError("关卡暂时无法打开，请重试。已有作品仍保存在本机。");
      setBusyTaskId(null);
    }
  };

  return (
    <main className="course-page">
      <header className="course-topbar">
        <Link to="/" className="course-brand">
          <span>栗</span>
          <strong>栗奇编程乐园</strong>
        </Link>
        <nav aria-label="课程导航">
          <Link to="/learn" aria-current="page">
            学习课程
          </Link>
          <Link to="/#templates">自由创作</Link>
          <Link to="/#works">我的作品</Link>
        </nav>
      </header>

      <section className="course-intro">
        <div>
          <span className="course-eyebrow">从第一块积木开始</span>
          <h1>小小程序员的冒险地图</h1>
          <p>每关学一个新本领。运行、尝试、修改，最后做出自己的小游戏。</p>
          <div className="course-intro-actions">
            <button
              type="button"
              onClick={() => void openTask(nextTask)}
              disabled={!projectsLoaded || Boolean(busyTaskId)}
            >
              {completed.length === 0 && !hasStartedNextTask
                ? "开始第一关"
                : "继续学习"}
              <span aria-hidden="true">→</span>
            </button>
            <span>
              已完成 {completed.length} / {creationTasks.length} 关
            </span>
          </div>
        </div>
        <div className="course-hero-art" aria-hidden="true">
          <img src={assetUrl("characters/liji/liji-idle.png")} alt="" />
          <span>从这里出发！</span>
        </div>
      </section>

      <section className="course-progress" aria-label="课程进度">
        <div>
          <strong>学习进度</strong>
          <span>
            {Math.round((completed.length / creationTasks.length) * 100)}%
          </span>
        </div>
        <progress value={completed.length} max={creationTasks.length}>
          {completed.length} / {creationTasks.length}
        </progress>
      </section>

      {error ? (
        <p className="course-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="course-chapters">
        {courseChapters.map((chapter) => {
          const tasks = creationTasks.filter(
            (task) => task.chapter === chapter,
          );
          const finished = tasks.filter((task) =>
            completed.includes(task.taskId),
          ).length;
          const detail = chapterDetails[chapter];
          return (
            <section
              className={
                targetChapter === chapter
                  ? "course-chapter course-chapter-target"
                  : "course-chapter"
              }
              key={chapter}
              id={getChapterAnchor(chapter)}
            >
              <header>
                <span className="course-chapter-number">{detail.number}</span>
                <div>
                  <small>
                    第 {detail.number} 单元 · {finished}/{tasks.length} 关完成
                  </small>
                  <h2>{chapter}</h2>
                  <p>{detail.description}</p>
                </div>
                <img src={detail.image} alt="" aria-hidden="true" />
              </header>
              <ol className="course-levels">
                {tasks.map((task) => {
                  const unlocked = isTaskUnlocked(task.taskId, completed);
                  const record = progress.find(
                    (item) => item.taskId === task.taskId,
                  );
                  const isCurrent = task.taskId === nextTask.taskId && !record;
                  return (
                    <li key={task.taskId}>
                      <button
                        type="button"
                        className="course-level"
                        data-state={
                          record
                            ? "done"
                            : isCurrent
                              ? "current"
                              : unlocked
                                ? "open"
                                : "locked"
                        }
                        disabled={
                          !projectsLoaded || !unlocked || Boolean(busyTaskId)
                        }
                        onClick={() => void openTask(task)}
                      >
                        <span className="course-level-index">
                          {String(creationTasks.indexOf(task) + 1).padStart(
                            2,
                            "0",
                          )}
                        </span>
                        <span className="course-level-copy">
                          <strong>{task.title}</strong>
                          <small>{task.description}</small>
                        </span>
                        <span className="course-level-state">
                          {record
                            ? record.stars + " 星 · 再试一次"
                            : unlocked
                              ? isCurrent
                                ? "从这里继续 →"
                                : "开始挑战 →"
                              : "尚未解锁"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
      <footer className="course-footer">
        课程进度保存在当前浏览器。想自由设计作品，可以随时返回首页。
      </footer>
    </main>
  );
}
