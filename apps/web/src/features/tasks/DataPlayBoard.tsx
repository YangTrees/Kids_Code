import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "../editor/editor-store";
import { useEditorRuntime } from "../editor/EditorRuntimeContext";
import { getAssignedTaskId } from "./task-catalog";
import { resolveTaskBindings } from "./task-contract";
import { getComparisonDisplay } from "./comparison-display";
import {
  expectedSortBin,
  getChartValues,
  hasCorrectChartSeries,
  isSortComplete,
  placeSortCard,
  resetSortCards,
  selectChartBar,
  useDataPlayProgress,
  type SortBin,
} from "./data-play";

const cards = [1, 2, 3, 4, 5, 6];
interface CardDrag {
  value: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
}

export function DataPlayBoard() {
  const project = useEditorStore((state) => state.project);
  const projectId = project.projectId;
  const taskId = getAssignedTaskId(project);
  const { lastRunReport, runId } = useEditorRuntime();
  const progress = useDataPlayProgress(projectId);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [dragging, setDragging] = useState<CardDrag | null>(null);
  const dragRef = useRef<CardDrag | null>(null);
  const suppressClickRef = useRef(false);
  const report =
    resolveTaskBindings(
      project,
      lastRunReport?.taskId === taskId ? lastRunReport : null,
    ).report ?? null;

  useEffect(() => {
    setSelectedCard(null);
    setFeedback("");
    dragRef.current = null;
    setDragging(null);
  }, [projectId]);

  if (taskId === "data_compare" && project.course?.contentVersion === "4") {
    const display = getComparisonDisplay(project, lastRunReport);
    if (!display.configured)
      return (
        <section className="data-comparison-board" aria-label="数据比较工作台">
          <h3>数字比一比</h3>
          <p>
            先在变量比较积木里填一个数字。复杂表达式的瞬时值尚未单独记录，不展示推测的柱高。
          </p>
        </section>
      );
    const max = Math.max(
      1,
      Math.abs(display.value),
      Math.abs(display.threshold),
    );
    return (
      <section className="data-comparison-board" aria-label="数据比较工作台">
        <h3>数字比一比</h3>
        <p>
          {display.ran ? "本次运行的数据" : "还没运行，显示数据初值"} · 比较符号{" "}
          {display.operator}
        </p>
        <div className="comparison-columns">
          {[
            { label: display.name, value: display.value },
            { label: "比较数字", value: display.threshold },
          ].map((item) => (
            <div
              key={item.label}
              className="comparison-column"
              aria-label={`${item.label}：${item.value}`}
            >
              <div className="comparison-axis">
                <span
                  data-negative={item.value < 0}
                  style={{ height: (Math.abs(item.value) / max) * 70 + "px" }}
                />
              </div>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        <p>
          {display.configured
            ? "柱高与数字来自你的程序和运行结果，不靠颜色猜答案。"
            : "在变量比较积木中选择数字，运行后再观察。"}
        </p>
      </section>
    );
  }
  if (taskId !== "data_sort" && taskId !== "data_chart") return null;

  if (taskId === "data_chart") {
    const values = getChartValues(report);
    const maxValue = Math.max(5, ...values);
    const ready = report?.status === "COMPLETED";
    const correctSeries = hasCorrectChartSeries(report);
    const selectedIndex =
      progress.chartRunId === runId ? progress.chartSelection : null;
    return (
      <section
        className="data-play-board data-chart-board"
        aria-label="观察柱状图"
      >
        <header>
          <div>
            <small>数据实验 · 第 40 关</small>
            <h3>五次观察柱状图</h3>
          </div>
          <span>{values.length}/5 次记录</span>
        </header>
        <p>运行积木，让“数据”每次加 1；观察五根柱，再选最高的一根。</p>
        <div className="data-chart-plot" aria-label="五次数据记录">
          <div className="data-chart-scale" aria-hidden="true">
            {[5, 4, 3, 2, 1, 0].map((tick) => (
              <span key={tick}>{Math.round((tick * maxValue) / 5)}</span>
            ))}
          </div>
          <div className="data-chart-bars">
            {Array.from({ length: 5 }, (_, index) => {
              const value = values[index];
              const selected = selectedIndex === index;
              return (
                <button
                  key={index}
                  type="button"
                  className="data-chart-column"
                  disabled={!ready || value === undefined}
                  aria-label={
                    value === undefined
                      ? `第 ${index + 1} 次，尚未记录`
                      : `第 ${index + 1} 次，数据 ${value}`
                  }
                  aria-pressed={selected}
                  onClick={() => selectChartBar(projectId, index, runId)}
                >
                  <span className="data-chart-column-value">
                    {value ?? "—"}
                  </span>
                  <span className="data-chart-column-track">
                    <span
                      className="data-chart-column-fill"
                      style={{
                        height: `${value === undefined ? 0 : Math.max(0, Math.min(100, (value / maxValue) * 100))}%`,
                      }}
                    />
                  </span>
                  <span className="data-chart-column-label">
                    第 {index + 1} 次
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="data-play-feedback" role="status">
          {!report
            ? "先运行代码，图表会跟着记录长出来。"
            : values.length < 5
              ? `还差 ${5 - values.length} 次观察；检查重复次数和变量积木。`
              : !correctSeries
                ? "柱子已经画出，但记录应依次是 1、2、3、4、5。"
                : selectedIndex === null
                  ? "记录完成！哪一次的柱子最高？"
                  : selectedIndex === 4
                    ? "答对了：第 5 次的数值最大。"
                    : `第 ${selectedIndex + 1} 次不是最高的，再比一比柱子的高度。`}
        </p>
      </section>
    );
  }

  const assignments = progress.sortAssignments;
  const placedCount = Object.keys(assignments).length;
  const assign = (value: number, bin: SortBin) => {
    if (placeSortCard(projectId, value, bin)) {
      setFeedback(
        isSortComplete({ ...assignments, [String(value)]: bin })
          ? "六张卡都分好了！现在让积木按同一条规则判断。"
          : `${value} 已放进${bin === "small" ? "小堆" : "大堆"}。`,
      );
      setSelectedCard(null);
    } else {
      setFeedback(
        `${value} 暂时不能放进${bin === "small" ? "小堆" : "大堆"}，再看一眼分界线 3。`,
      );
    }
  };
  const cardButton = (value: number) => (
    <button
      key={value}
      type="button"
      className="data-sort-card"
      aria-label={`数字卡 ${value}`}
      aria-pressed={selectedCard === value}
      onClick={() => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        setSelectedCard(value);
        setFeedback(`选中了 ${value}，点下面的小堆或大堆。`);
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = {
          value,
          startX: event.clientX,
          startY: event.clientY,
          x: event.clientX,
          y: event.clientY,
          moved: false,
        };
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.value !== value) return;
        const moved =
          drag.moved ||
          Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >
            8;
        dragRef.current = {
          ...drag,
          x: event.clientX,
          y: event.clientY,
          moved,
        };
        if (moved) setDragging(dragRef.current);
      }}
      onPointerUp={(event) => {
        const drag = dragRef.current;
        dragRef.current = null;
        setDragging(null);
        if (!drag?.moved) return;
        suppressClickRef.current = true;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
        const element = document.elementFromPoint(event.clientX, event.clientY);
        const destination =
          element?.closest<HTMLElement>(".data-sort-bin")?.dataset.bin;
        if (destination === "small" || destination === "large")
          assign(value, destination);
        else setFeedback("把数字卡放在小堆或大堆的卡槽里。");
      }}
      onPointerCancel={() => {
        dragRef.current = null;
        setDragging(null);
      }}
    >
      {value}
    </button>
  );
  const bin = (id: SortBin, label: string) => (
    <div
      className="data-sort-bin"
      data-bin={id}
      role="group"
      aria-label={label}
      key={id}
    >
      <button
        type="button"
        className="data-sort-bin-target"
        onClick={() => {
          if (selectedCard === null) {
            setFeedback("先选一张数字卡，再选择要放入的堆。");
            return;
          }
          assign(selectedCard, id);
        }}
      >
        <strong>{label}</strong>
        <span>拖到这里，或选卡后点这里</span>
      </button>
      <div className="data-sort-bin-cards">
        {cards
          .filter((value) => assignments[String(value)] === id)
          .map(cardButton)}
      </div>
    </div>
  );
  return (
    <section
      className="data-play-board data-sort-board"
      aria-label="分类实验台"
    >
      <header>
        <div>
          <small>数据实验 · 第 39 关</small>
          <h3>把数字分成两堆</h3>
        </div>
        <span>{placedCount}/6 张已分类</span>
      </header>
      <p>分界线是 3：先自己分卡，再用积木让程序判断新数字。</p>
      <div className="data-sort-tray" aria-label="等待分类的数字卡">
        {cards.filter((value) => !assignments[String(value)]).map(cardButton)}
      </div>
      <div className="data-sort-bins">
        {bin("small", "小堆 · 1–3")}
        {bin("large", "大堆 · 4–6")}
      </div>
      {dragging?.moved ? (
        <span
          className="data-sort-drag-ghost"
          aria-hidden="true"
          style={{ left: dragging.x, top: dragging.y }}
        >
          {dragging.value}
        </span>
      ) : null}
      <div className="data-sort-footer">
        <p className="data-play-feedback" role="status">
          {feedback ||
            (isSortComplete(assignments)
              ? "分堆完成！点击舞台角色，让积木分类一份新数据。"
              : "拖动数字卡；在平板上也可以先选卡，再点目标堆。")}
        </p>
        <button
          type="button"
          onClick={() => {
            resetSortCards(projectId);
            setSelectedCard(null);
            setFeedback("已重新分堆，从第一张卡开始吧。");
          }}
        >
          重新分堆
        </button>
      </div>
      {report?.status === "COMPLETED" && isSortComplete(assignments) ? (
        <p className="data-sort-code-result" role="status">
          程序抽到 {report.variables.var_1 ?? "—"}，说“
          {report.spokenTexts?.at(-1) ?? "还没有回答"}”；正确分类应是
          {expectedSortBin(report.variables.var_1 ?? 0) === "large"
            ? "大堆"
            : "小堆"}
          。
        </p>
      ) : null}
    </section>
  );
}
