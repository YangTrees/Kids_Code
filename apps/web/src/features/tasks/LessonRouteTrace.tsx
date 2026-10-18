import { pathCellKey } from "@kids-code/domain";
import { useEditorStore } from "../editor/editor-store";
import { useEditorRuntime } from "../editor/EditorRuntimeContext";

export function LessonRouteTrace() {
  const project = useEditorStore((state) => state.project);
  const { lastRunReport } = useEditorRuntime();
  const map = project.pathMap;
  if (project.course?.contentVersion !== "4" || !map) return null;
  const trace =
    lastRunReport?.projectId === project.projectId
      ? (lastRunReport.pathTrace ?? [])
      : [];
  const visited = new Set(trace);
  const repeating = project.course.taskId === "path_repeat";
  return (
    <section className="lesson-route-trace" aria-label="路线过程观察">
      <strong>{repeating ? "找出重复的路段" : "观察路线拐点"}</strong>
      <svg
        viewBox="0 0 288 216"
        role="img"
        aria-label="与舞台同源的道路，圆点表示实际经过的格子"
      >
        {map.tiles.map((cell, index) => (
          <g key={pathCellKey(cell)}>
            <rect
              x={cell.column * 24 + 1}
              y={cell.row * 24 + 1}
              width="22"
              height="22"
              rx="5"
              fill={repeating && index > 4 ? "#eee5fb" : "#e2f2e1"}
              stroke={repeating && index > 4 ? "#8a55e8" : "#5c9360"}
            />
            {visited.has(pathCellKey(cell)) && (
              <circle
                cx={cell.column * 24 + 12}
                cy={cell.row * 24 + 12}
                r="4"
                fill="#254f72"
              />
            )}
          </g>
        ))}
        <text
          x={map.start.column * 24 + 12}
          y={map.start.row * 24 + 16}
          textAnchor="middle"
          fontSize="11"
          fontWeight="bold"
        >
          起
        </text>
        <text
          x={map.goal.column * 24 + 12}
          y={map.goal.row * 24 + 16}
          textAnchor="middle"
          fontSize="11"
          fontWeight="bold"
        >
          终
        </text>
      </svg>
      <p>
        {repeating
          ? "绿色第一段、紫色第二段：观察是否都是“向右，再向上”。分段是地图示意，圆点才是本次实际轨迹。"
          : "转动改变朝向，不改变所在的格子。圆点记录本次实际经过的路。"}{" "}
        已走 {Math.max(0, trace.length - 1)} 格。
      </p>
    </section>
  );
}
