import type { Project } from "@kids-code/domain";
import type { RuntimeReport } from "@kids-code/runtime";
export function getComparisonDisplay(
  project: Project,
  report?: RuntimeReport | null,
) {
  let dataId = project.course?.bindings.data ?? "var_1";
  let threshold = 3;
  let operator = ">";
  let configured = false;
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object" || configured) return;
    const node = value as {
      type?: string;
      disabled?: boolean;
      fields?: Record<string, unknown>;
      inputs?: Record<string, { block?: unknown; shadow?: unknown }>;
      next?: { block?: unknown };
      blocks?: { blocks?: unknown[] };
    };
    if (node.disabled) return;
    if (node.type === "kids_variable_compare") {
      if (
        typeof node.fields?.VARIABLE === "string" &&
        project.variables.some(
          (variable) => variable.variableId === node.fields?.VARIABLE,
        )
      )
        dataId = node.fields.VARIABLE;
      const input = node.inputs?.RIGHT;
      const operand = (input?.block ?? input?.shadow) as
        { fields?: { NUM?: unknown; VALUE?: unknown } } | undefined;
      const number = Number(operand?.fields?.NUM ?? operand?.fields?.VALUE);
      if (Number.isFinite(number)) {
        threshold = number;
        configured = true;
      }
      operator =
        ({ gt: ">", lt: "<", eq: "=" } as Record<string, string>)[
          String(node.fields?.OP)
        ] ?? ">";
    }
    node.blocks?.blocks?.forEach(visit);
    Object.values(node.inputs ?? {}).forEach((input) =>
      visit(input.block ?? input.shadow),
    );
    visit(node.next?.block);
  };
  Object.values(project.workspaceStates).forEach(visit);
  const variable = project.variables.find((item) => item.variableId === dataId);
  const currentRun =
    report?.projectId === project.projectId &&
    report.taskVersion === project.course?.contentVersion;
  return {
    value: currentRun
      ? (report.variables[dataId] ?? variable?.initialValue ?? 0)
      : (variable?.initialValue ?? 0),
    threshold,
    operator,
    configured,
    ran: Boolean(currentRun),
    name: variable?.name ?? "数据",
  };
}
