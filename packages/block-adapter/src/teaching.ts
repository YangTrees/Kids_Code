/** Shared semantic colors; illustration colors never override block meaning. */
export const BLOCK_PALETTE = {
  event: "#F4B41A",
  motion: "#428EF4",
  looks: "#8A55E8",
  sound: "#E34D91",
  control: "#F58A25",
  game: "#45B531",
  variable: "#FF8C1A",
  condition: "#F58A25",
  operator: "#59C059",
} as const;

export type ToolboxCategory =
  | "event"
  | "motion"
  | "looks"
  | "sound"
  | "control"
  | "game"
  | "variable"
  | "operator";
export interface ToolboxItem {
  kind: string;
  type?: string;
  contents?: ToolboxItem[];
  [key: string]: unknown;
}
export function filterTeachingToolbox<T extends ToolboxItem>(
  toolbox: T,
  allowed?: readonly string[],
): T {
  if (!allowed) return structuredClone(toolbox);
  const whitelist = new Set(allowed);
  const variables = allowed.some((type) => type.startsWith("kids_variable_"));
  return {
    ...structuredClone(toolbox),
    contents: toolbox.contents?.map((category) => ({
      ...structuredClone(category),
      // Empty categories remain in position: existing category navigation stays stable.
      contents: category.contents?.filter((item) =>
        item.kind === "button" ? variables : whitelist.has(item.type ?? ""),
      ),
    })),
  };
}
