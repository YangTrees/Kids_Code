import { chapterImage } from "./chapter-visuals";
import "../../styles/story-series.css";
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
  getTaskDifficultyLabel,
  isTaskUnlocked,
  setAssignedTaskId,
  type CreationTask,
  type TaskChapter,
} from "./task-catalog";
import { createTaskProject } from "./task-project";
import "../../styles/course.css";
import { useSettingsStore } from "../../shared/settings-store";
import { useTranslate } from "../../shared/use-translate";
import {
  BLOCK_CATEGORY_ORDER,
  BlockCategories,
  ProgrammingExample,
  blockCategoryStyle,
} from "../../shared/ProgrammingBlocks";
import { courseBlockCategories } from "./course-blocks";

const repository = new IndexedDbProjectRepository();

function CourseGlyph({
  name,
}: {
  name: "arrow" | "check" | "lock" | "flag" | "book" | "down" | "spark";
}) {
  const paths = {
    arrow: "M4 12h15m-6-6 6 6-6 6",
    check: "m5 12 4 4L19 6",
    lock: "M7 10V7a5 5 0 0 1 10 0v3M6 10h12v10H6zM12 14v2",
    flag: "M5 21V4m0 0c5-5 9 5 15 0v10c-6 5-10-5-15 0",
    book: "M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1m0-15c3-2 6-2 9-1v15c-3-1-6-1-9 1V5",
    down: "M12 4v15m-6-6 6 6 6-6",
    spark: "m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3",
  };
  return (
    <svg
      className="course-glyph"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}

const chapterDetails: Record<
  TaskChapter,
  { number: string; description: string; image: string }
> = {
  基础入门: {
    number: "01",
    description: "认识事件、移动和重复，让角色听懂你的第一条指令。",
    image: chapterImage("基础入门"),
  },
  互动游戏: {
    number: "02",
    description: "用碰撞、点击和得分，把舞台变成可以玩的游戏。",
    image: chapterImage("互动游戏"),
  },
  程序思维: {
    number: "03",
    description: "切换场景、记录数值，并让程序自己做判断。",
    image: chapterImage("程序思维"),
  },
  进阶创作: {
    number: "04",
    description: "加入按键、声音和消息，完成自己的森林冒险。",
    image: chapterImage("进阶创作"),
  },
  路线挑战: {
    number: "05",
    description: "沿着固定道路写出路线，用顺序和循环抵达终点。可以直接开始。",
    image: chapterImage("路线挑战"),
  },
  云岛远征: {
    number: "06",
    description: "在专属云岛地图上找路标、收星石、选捷径，挑战更聪明的程序。",
    image: chapterImage("云岛远征"),
  },
  数据小侦探: {
    number: "07",
    description: "用变量记录、比较和整理数据，再把五次观察画成柱状图。",
    image: chapterImage("数据小侦探"),
  },
  规律与模式: {
    number: "08",
    description: "从单层循环到状态切换、嵌套循环、随机分类和条件停止。",
    image: chapterImage("规律与模式"),
  },
  会判断的程序: {
    number: "09",
    description: "检查多份数据，测试边界、组合特征，再分类计数并验收结果。",
    image: chapterImage("会判断的程序"),
  },
  "AI 小创客": {
    number: "10",
    description:
      "逐步加入分支测试、消息协作、跨场景状态和综合验收。这些是规则程序，不是真实模型训练。",
    image: chapterImage("AI 小创客"),
  },
};

export function CoursePage() {
  const t = useTranslate();
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const completed = getCompletedTaskIds();
  const progress = getTaskProgress();
  const completedCount = creationTasks.filter((task) =>
    completed.includes(task.taskId),
  ).length;
  const chapters = courseChapters.map((chapter) => {
    const tasks = creationTasks.filter((task) => task.chapter === chapter);
    return {
      chapter,
      tasks,
      detail: chapterDetails[chapter],
      finished: tasks.filter((task) => completed.includes(task.taskId)).length,
    };
  });
  const completedChapters = chapters.filter(
    ({ tasks, finished }) => finished === tasks.length,
  ).length;
  const [activeChapter, setActiveChapter] = useState<TaskChapter>(() =>
    getCurrentChapter(),
  );
  const nextTask =
    creationTasks.find((task) => !completed.includes(task.taskId)) ??
    creationTasks[creationTasks.length - 1]!;
  const hasStartedNextTask = projects.some(
    (project) => getAssignedTaskId(project) === nextTask.taskId,
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
    element.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    setTargetChapter(chapter);
    const timer = window.setTimeout(() => setTargetChapter(null), 2600);
    return () => window.clearTimeout(timer);
  }, [hash, reduceMotion]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries
          .filter((item) => item.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0];
        const chapter = courseChapters.find(
          (item) => getChapterAnchor(item) === entry?.target.id,
        );
        if (chapter) setActiveChapter(chapter);
      },
      { rootMargin: "-12% 0px -55% 0px" },
    );
    courseChapters.forEach((chapter) => {
      const element = document.getElementById(getChapterAnchor(chapter));
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  const openTask = async (task: CreationTask, fresh = false) => {
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
          (project) =>
            getAssignedTaskId(project) === task.taskId &&
            project.course?.contentVersion === task.contentVersion,
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      if (existing && !fresh) {
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
    <main className="course-page" data-reduce-motion={reduceMotion}>
      <header className="course-topbar">
        <Link to="/" className="course-brand">
          <span aria-hidden="true">团</span>
          <strong>{t("brand.title")}</strong>
        </Link>
        <nav aria-label="课程导航">
          <Link to="/learn" aria-current="page">
            学习课程
          </Link>
          <Link to="/#templates">自由创作</Link>
          <Link to="/#works">我的作品</Link>
        </nav>
      </header>

      <section className="course-intro" aria-labelledby="course-title">
        <div className="course-intro-copy">
          <span className="course-eyebrow">
            <span aria-hidden="true" /> 好奇心探索手册
          </span>
          <h1 id="course-title">
            好奇心的<span>编程旅行</span>
          </h1>
          <p>和团团、点点一起，把一个个想法变成会动的小作品。</p>
          <ProgrammingExample />
          <div className="course-intro-actions">
            <button
              type="button"
              onClick={() => void openTask(nextTask)}
              disabled={!projectsLoaded || Boolean(busyTaskId)}
            >
              <CourseGlyph name="flag" />
              {completedCount === creationTasks.length
                ? "重玩最后一关"
                : completed.length === 0 && !hasStartedNextTask
                  ? "开始第一关"
                  : "继续学习"}
              <CourseGlyph name="arrow" />
            </button>
            <div className="course-next-lesson">
              <small>这一小步</small>
              <strong>
                第{" "}
                {String(creationTasks.indexOf(nextTask) + 1).padStart(2, "0")}{" "}
                关 · {nextTask.title}
              </strong>
            </div>
          </div>
          <section className="course-progress" aria-label="课程进度">
            <div>
              <span>
                已完成 <strong>{completedCount}</strong> /{" "}
                {creationTasks.length} 关
              </span>
              <span>
                {Math.round((completedCount / creationTasks.length) * 100)}%
              </span>
            </div>
            <progress
              aria-label="已完成关卡数量"
              value={completedCount}
              max={creationTasks.length}
            >
              {completedCount} / {creationTasks.length}
            </progress>
          </section>
        </div>
        <div className="course-hero-art" aria-hidden="true">
          <div className="course-postcard">
            <span className="course-postcard-stamp">
              <CourseGlyph name="spark" /> 下一站
            </span>
            <img src={chapterDetails[nextTask.chapter].image} alt="" />
            <div className="course-postcard-caption">
              <span>UNIT {chapterDetails[nextTask.chapter].number}</span>
              <strong>{nextTask.chapter}</strong>
              <small>和团团、点点一起发现新本领</small>
            </div>
          </div>
          <span className="course-postcard-note">每次尝试，都算数。</span>
        </div>
      </section>

      {error ? (
        <p className="course-error" role="alert">
          {error}
        </p>
      ) : null}

      <section
        className="course-explorer"
        aria-labelledby="course-explorer-title"
      >
        <div className="course-section-heading">
          <div>
            <span className="course-eyebrow">一步一步，把想法变成作品</span>
            <h2 id="course-explorer-title">你的探索路线</h2>
          </div>
          <div className="course-section-tools">
            <span className="course-unit-count">
              {completedChapters} / {courseChapters.length} 个单元已点亮
            </span>
            <BlockCategories
              categories={BLOCK_CATEGORY_ORDER}
              label="积木配色图例"
            />
          </div>
        </div>
        <div className="course-atlas">
          <aside className="course-unit-index">
            <div className="course-index-heading">
              <CourseGlyph name="book" />
              <strong>探索目录</strong>
              <span>{courseChapters.length} 单元</span>
            </div>
            <nav aria-label="单元导航">
              {chapters.map(({ chapter, tasks, detail, finished }) => (
                <Link
                  key={chapter}
                  to={"/learn#" + getChapterAnchor(chapter)}
                  data-unit={detail.number}
                  aria-current={
                    activeChapter === chapter ? "location" : undefined
                  }
                >
                  <span className="course-index-number">{detail.number}</span>
                  <span className="course-index-copy">
                    <strong>{chapter}</strong>
                    <small>
                      {finished} / {tasks.length} 关
                    </small>
                  </span>
                  {finished === tasks.length && <CourseGlyph name="check" />}
                </Link>
              ))}
            </nav>
            <p className="course-index-note">
              每个单元都能从第一关开始，单元内按顺序点亮新本领。
            </p>
          </aside>
          <div className="course-chapters">
            {chapters.map(({ chapter, tasks, detail, finished }) => {
              const direct = chapter === "路线挑战" || chapter === "云岛远征";
              return (
                <section
                  className={
                    targetChapter === chapter
                      ? "course-chapter course-chapter-target"
                      : "course-chapter"
                  }
                  key={chapter}
                  id={getChapterAnchor(chapter)}
                  data-unit={detail.number}
                  aria-labelledby={getChapterAnchor(chapter) + "-title"}
                >
                  <header>
                    <div className="course-chapter-art">
                      <img
                        src={detail.image}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                      />
                    </div>
                    <div className="course-chapter-copy">
                      <div className="course-chapter-meta">
                        <span className="course-chapter-number">
                          单元 {detail.number}
                        </span>
                        {direct && (
                          <span className="course-branch">地图挑战</span>
                        )}
                      </div>
                      <h2 id={getChapterAnchor(chapter) + "-title"}>
                        {chapter}
                      </h2>
                      <p>{detail.description}</p>
                      <BlockCategories
                        categories={courseBlockCategories(tasks)}
                        label={chapter + "涉及的积木"}
                      />
                      <div className="course-chapter-progress">
                        <span>
                          {finished} / {tasks.length} 关完成
                        </span>
                        <span
                          className="course-chapter-pips"
                          aria-hidden="true"
                        >
                          {tasks.map((task) => (
                            <i
                              key={task.taskId}
                              data-done={completed.includes(task.taskId)}
                            />
                          ))}
                        </span>
                      </div>
                    </div>
                  </header>
                  <ol className="course-levels">
                    {tasks.map((task) => {
                      const unlocked = isTaskUnlocked(task.taskId, completed);
                      const record = progress.find(
                        (item) => item.taskId === task.taskId,
                      );
                      const done = completed.includes(task.taskId);
                      const categories = courseBlockCategories([task]);
                      const primaryCategory =
                        categories.find((category) => category !== "event") ??
                        "event";
                      const isCurrent =
                        task.taskId === nextTask.taskId && !done;
                      const hasExisting = projects.some(
                        (project) => getAssignedTaskId(project) === task.taskId,
                      );
                      return (
                        <li key={task.taskId}>
                          <button
                            type="button"
                            className="course-level"
                            data-block-category={primaryCategory}
                            style={blockCategoryStyle(primaryCategory)}
                            data-state={
                              done
                                ? "done"
                                : isCurrent
                                  ? "current"
                                  : unlocked
                                    ? "open"
                                    : "locked"
                            }
                            disabled={
                              !projectsLoaded ||
                              !unlocked ||
                              Boolean(busyTaskId)
                            }
                            onClick={() => void openTask(task)}
                            title={task.description}
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
                              <span className="course-lesson-tags">
                                <span
                                  className="course-difficulty"
                                  data-difficulty={task.difficulty}
                                >
                                  {getTaskDifficultyLabel(task)}
                                </span>
                                <BlockCategories
                                  categories={categories
                                    .filter((category) => category !== "event")
                                    .slice(0, 2)}
                                  compact
                                  label="本关积木线索"
                                />
                              </span>
                            </span>
                            <span className="course-level-state">
                              {done
                                ? record
                                  ? record.stars + " 星 · 再试一次"
                                  : "已完成 · 再试一次"
                                : unlocked
                                  ? isCurrent
                                    ? "从这里继续"
                                    : "开始挑战"
                                  : "尚未解锁"}
                              <CourseGlyph
                                name={
                                  done
                                    ? "check"
                                    : unlocked
                                      ? isCurrent
                                        ? "flag"
                                        : "arrow"
                                      : "lock"
                                }
                              />
                            </span>
                          </button>
                          {hasExisting && unlocked ? (
                            <button
                              className="course-restart"
                              type="button"
                              disabled={!projectsLoaded || Boolean(busyTaskId)}
                              onClick={() => void openTask(task, true)}
                            >
                              新建本关 · 保留原作品
                            </button>
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                </section>
              );
            })}
          </div>
        </div>
      </section>
      <footer className="course-footer">
        <CourseGlyph name="lock" />
        <span>
          进度只保存在这台设备。想试试自己的点子？
          <Link to="/#templates">
            去自由创作 <CourseGlyph name="arrow" />
          </Link>
        </span>
      </footer>
    </main>
  );
}
