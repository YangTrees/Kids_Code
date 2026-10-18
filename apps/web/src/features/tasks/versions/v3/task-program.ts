import type { Project } from "@kids-code/domain";
import type { RuntimeReport } from "@kids-code/runtime";

interface Node {
  id?: string;
  type?: string;
  disabled?: boolean;
  fields?: Record<string, unknown>;
  next?: { block?: Node };
  inputs?: Record<string, { block?: Node; shadow?: Node }>;
}

export function hasExecutions(
  project: Project,
  report: RuntimeReport,
  type: string,
  minimum: number,
) {
  return programNodes(project).some(
    (node) =>
      node.type === type &&
      node.id &&
      (report.executedBlockCounts?.[node.id] ?? 0) >= minimum,
  );
}

export const inputNode = (node: Node, name: string) =>
  node.inputs?.[name]?.block ?? node.inputs?.[name]?.shadow;

function nodes(start?: Node): Node[] {
  if (!start || start.disabled) return [];
  return [
    start,
    ...Object.values(start.inputs ?? {}).flatMap((input) =>
      nodes(input.block ?? input.shadow),
    ),
    ...nodes(start.next?.block),
  ];
}

const hats = new Set([
  "event_whenflagclicked",
  "event_whenthisspriteclicked",
  "event_whenkeypressed",
  "kids_when_message",
  "kids_when_scene_starts",
  "kids_when_touching",
  "kids_when_touch_end",
]);

export function programNodes(project: Project): Node[] {
  return Object.values(project.workspaceStates).flatMap((workspace) => {
    const roots =
      (workspace as { blocks?: { blocks?: Node[] } } | null)?.blocks?.blocks ??
      [];
    return roots
      .filter((root) => hats.has(root.type ?? ""))
      .flatMap((root) => nodes(root));
  });
}

/** Checks containment, not just the presence of blocks elsewhere on the canvas. */
export function hasLoop(project: Project, types: string[], depth = 1): boolean {
  const matches = (node: Node, remaining: number): boolean => {
    if (node.type !== "control_repeat" && node.type !== "control_forever")
      return false;
    const body = nodes(inputNode(node, "SUBSTACK"));
    return remaining > 1
      ? body.some((child) => matches(child, remaining - 1))
      : types.every((type) => body.some((child) => child.type === type));
  };
  return programNodes(project).some((node) => matches(node, depth));
}

export function hasBranch(
  project: Project,
  conditionType: string,
  thenTypes: string[],
  elseTypes: string[] = [],
): boolean {
  return programNodes(project).some((node) => {
    if (node.type !== "kids_if" && node.type !== "kids_if_else") return false;
    if (elseTypes.length && node.type !== "kids_if_else") return false;
    if (inputNode(node, "CONDITION")?.type !== conditionType) return false;
    const contains = (name: string, types: string[]) => {
      const branch = nodes(inputNode(node, name));
      return types.every((type) => branch.some((child) => child.type === type));
    };
    return contains("SUBSTACK", thenTypes) && contains("SUBSTACK2", elseTypes);
  });
}

export function hasMessageResponse(project: Project, types: string[]): boolean {
  return programNodes(project).some((node) => {
    if (node.type !== "kids_when_message") return false;
    const body = nodes(node.next?.block);
    return types.every((type) => body.some((child) => child.type === type));
  });
}
