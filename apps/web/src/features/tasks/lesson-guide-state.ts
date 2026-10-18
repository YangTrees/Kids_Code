import type { Project } from "@kids-code/domain";
import type { RuntimeReport } from "@kids-code/runtime";
import type { CreationTask } from "./task-types";
import { evaluateCreationTask } from "./task-catalog";
import { programNodes } from "./task-program";

export function getLessonGuideState(
  project: Project,
  task: CreationTask,
  report?: RuntimeReport | null,
) {
  const evaluation = evaluateCreationTask(project, task, report);
  const nodes = programNodes(project);
  const connected = new Set(nodes.map((node) => node.type));
  let prepared = [
    "event_whenflagclicked",
    "event_whenthisspriteclicked",
    "event_whenkeypressed",
    "kids_when_touching",
    "kids_when_touch_end",
    "kids_when_message",
    "kids_when_scene_starts",
  ].some((type) => connected.has(type));
  if (task.taskId === "variable" || task.taskId === "random")
    prepared &&= project.variables.length > 0;
  if (task.taskId === "data_compare")
    prepared &&= connected.has("kids_variable_set");
  if (task.taskId === "collision") {
    const actor = project.course?.bindings.actor,
      target = project.course?.bindings.target;
    prepared = Boolean(
      actor &&
      target &&
      Object.entries(project.workspaceStates).some(([owner, workspace]) =>
        programNodes({
          ...project,
          workspaceStates: { [owner]: workspace },
        }).some(
          (node) =>
            [
              "kids_when_touching",
              "kids_if_touching",
              "kids_touching_condition",
            ].includes(node.type ?? "") &&
            ((owner === actor && node.fields?.TARGET === target) ||
              (owner === target && node.fields?.TARGET === actor)),
        ),
      ),
    );
  }
  const codeReady =
    prepared &&
    task.rules.every((rule) =>
      rule.anyOf.some((type) => connected.has(type)),
    ) &&
    evaluation.rules
      .filter((rule) => rule.id === "connection" || rule.id === "program")
      .every((rule) => rule.complete);
  return {
    step: evaluation.complete ? 3 : codeReady ? 2 : prepared ? 1 : 0,
    complete: evaluation.complete,
  };
}
