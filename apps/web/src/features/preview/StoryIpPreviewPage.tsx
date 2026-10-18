import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import {
  pathCellAtPosition,
  pathCellKey,
  stagePositionToGrid,
} from "@kids-code/domain";
import { StageController } from "@kids-code/stage";
import { assetUrl } from "../../shared/base-url";
import { creationTasks } from "../tasks/task-catalog";
import type { TaskId } from "../tasks/task-types";
import {
  createStoryIpSample,
  STORY_ACTOR,
  STORY_FRONT,
  STORY_RIGHT,
} from "./story-ip-sample";
import "../../styles/story-ip-preview.css";
import manifest from "../../../public/assets/asset-manifest.json";

const imageNames: Record<string, string> = {
  ui_story_tuantuan_curious_v1: "团团 · 思考",
  ui_story_tuantuan_pointing_v1: "团团 · 指向",
  ui_story_tuantuan_happy_v1: "团团 · 庆祝",
  ui_story_diandian_default_v1: "点点 · 默认",
  ui_story_diandian_hint_v2: "点点 · 提示",
  ui_story_diandian_encourage_v1: "点点 · 鼓励",
  ui_story_home_hero_v1: "首页故事插画",
  ui_story_unit_basics_v1: "基础探索封面",
  ui_story_unit_route_v1: "路线挑战封面",
  ui_story_unit_data_v1: "数据工作台封面",
};

function SampleStage({ taskId }: { taskId: TaskId }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<StageController | null>(null);
  const project = useMemo(() => createStoryIpSample(taskId), [taskId]);
  const task = creationTasks.find((item) => item.taskId === taskId)!;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [grid, setGrid] = useState(true);
  const [right, setRight] = useState(false);
  const [position, setPosition] = useState(
    () =>
      project.scenes[0]!.instances.find(
        (instance) => instance.spriteId === STORY_ACTOR,
      )!.transform,
  );
  const [touching, setTouching] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new StageController();
    const abort = new AbortController();
    const host = hostRef.current!;
    // Defer initialization so StrictMode cleanup can abort before creating WebGL.
    const timer = window.setTimeout(() => {
      void controller
        .mount(
          host,
          project,
          (_id, x, y) => {
            setPosition((current) => ({ ...current, x, y }));
            setTouching(controller.isTouching(STORY_ACTOR, "spr_box"));
          },
          undefined,
          abort.signal,
        )
        .then((mounted) => {
          if (!mounted || abort.signal.aborted) return;
          controllerRef.current = controller;
          controller.setEffectsEnabled(false);
          setReady(true);
        })
        .catch(() => {
          if (!abort.signal.aborted) setError(true);
        });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      abort.abort();
      controllerRef.current = null;
      controller.destroy();
    };
  }, [project]);

  function move(dx: number, dy: number) {
    const controller = controllerRef.current;
    const start = controller?.getSpritePosition(STORY_ACTOR);
    if (!controller || !start) return;
    const next = { x: start.x + dx * 40, y: start.y + dy * 40 };
    if (project.pathMap) {
      const cell = pathCellAtPosition(next.x, next.y);
      if (
        !cell ||
        !project.pathMap.tiles.some(
          (tile) => pathCellKey(tile) === pathCellKey(cell),
        )
      ) {
        setNotice("这一步会离开道路，请换一个方向。");
        return;
      }
    }
    const resolved = controller.resolveSpritePosition(
      STORY_ACTOR,
      next.x,
      next.y,
    );
    setPosition((current) => ({ ...current, ...resolved }));
    const contact = controller.isTouching(STORY_ACTOR, "spr_box");
    setTouching(contact);
    setNotice(
      contact ? "到达宝箱边缘，角色与宝箱已接触。" : "已按实际舞台规则移动。",
    );
  }

  const cell = stagePositionToGrid(project, position.x, position.y);
  return (
    <article className="story-sample" aria-label={task.title}>
      <header>
        <span>第 {creationTasks.indexOf(task) + 1} 关 · 原布局样片</span>
        <h2>{task.title.replaceAll("栗奇", "团团")}</h2>
      </header>
      <div className="story-sample-stage" ref={hostRef} data-ready={ready} />
      {error ? <p role="alert">舞台加载失败，请刷新重试。</p> : null}
      <p className="story-sample-position" aria-live="polite">
        {ready
          ? `落点 ${position.x.toFixed(1)}, ${position.y.toFixed(1)} · 格坐标 (${cell.x}, ${cell.y})`
          : "正在加载舞台…"}
      </p>
      <div className="story-sample-controls">
        <button disabled={!ready} onClick={() => move(-1, 0)}>
          向左一格
        </button>
        <button disabled={!ready} onClick={() => move(1, 0)}>
          向右一格
        </button>
        <button disabled={!ready} onClick={() => move(0, -1)}>
          向上一格
        </button>
        <button disabled={!ready} onClick={() => move(0, 1)}>
          向下一格
        </button>
        <button
          disabled={!ready}
          aria-pressed={grid}
          onClick={() => {
            controllerRef.current?.setGridVisible(!grid);
            setGrid(!grid);
          }}
        >
          网格
        </button>
        <button
          disabled={!ready}
          aria-pressed={right}
          onClick={() => {
            void controllerRef.current
              ?.setSpriteCostume(STORY_ACTOR, right ? STORY_FRONT : STORY_RIGHT)
              .then(() => setRight(!right));
          }}
        >
          朝右姿态
        </button>
        <button
          disabled={!ready}
          onClick={() => {
            controllerRef.current?.reset();
            setPosition(
              project.scenes[0]!.instances.find(
                (instance) => instance.spriteId === STORY_ACTOR,
              )!.transform,
            );
            setRight(false);
            setTouching(false);
            setNotice("已恢复原关卡起点。");
          }}
        >
          重置
        </button>
      </div>
      <p
        className="story-sample-feedback"
        role="status"
        data-touching={touching}
      >
        {notice || "可拖动角色检查格心，或按方向按钮检查步长。"}
      </p>
    </article>
  );
}

/** Development-only proof: no saved projects, progress, or course versions written. */
export default function StoryIpPreviewPage() {
  return (
    <main className="story-ip-preview">
      <header className="story-ip-intro">
        <div>
          <Link to="/learn">返回课程</Link>
          <p>原系列 IP · 首批素材验收</p>
          <h1>团团与点点的绘本世界</h1>
          <span>
            复用实际舞台与第 1、7、26 关布局。每格 40，角色可见高度约
            36；课程版本接入前检查。
          </span>
        </div>
        <img
          src={assetUrl("ui/story-ip/diandian-hint-v2.webp")}
          alt="点点：白色云朵机器人，紫色天线，爱心胸屏"
        />
      </header>
      <section className="story-ip-portraits" aria-label="头像尺寸检查">
        <strong>小尺寸辨认</strong>
        {[44, 64].map((size) => (
          <img
            key={size}
            src={assetUrl("ui/story-ip/diandian-hint-v2.webp")}
            width={size}
            height={size}
            alt={`点点 ${size} 像素头像`}
          />
        ))}
        <span>44 / 64 CSS px · 提示人物在舞台外显示</span>
      </section>
      <div className="story-ip-samples">
        {(["speak", "collision", "path_turn"] as const).map((taskId) => (
          <SampleStage key={taskId} taskId={taskId} />
        ))}
      </div>
      <section className="story-ip-gallery" aria-label="完整最小素材包">
        <h2>角色表情与课程插画</h2>
        <div>
          {manifest.assets
            .filter((asset) => imageNames[asset.id])
            .map((asset) => (
              <figure key={asset.id}>
                <img src={assetUrl(asset.path)} alt={imageNames[asset.id]} />
                <figcaption>{imageNames[asset.id]}</figcaption>
              </figure>
            ))}
        </div>
        <h2>三类背景</h2>
        <div>
          {manifest.assets
            .filter((asset) => asset.id.startsWith("bg_story_"))
            .map((asset) => (
              <figure key={asset.id}>
                <img
                  src={assetUrl(asset.path)}
                  alt={
                    asset.id === "bg_story_garden_v1"
                      ? "花园空场景"
                      : asset.id === "bg_story_cloud_v1"
                        ? "云岛空场景"
                        : "数据工坊空场景"
                  }
                />
                <figcaption>
                  {asset.id === "bg_story_garden_v1"
                    ? "花园"
                    : asset.id === "bg_story_cloud_v1"
                      ? "云岛"
                      : "数据工坊"}
                </figcaption>
              </figure>
            ))}
        </div>
      </section>
    </main>
  );
}
