import type { CSSProperties, ReactNode } from "react";
import {
  BLOCK_PALETTE,
  type ToolboxCategory,
} from "@kids-code/block-adapter/teaching";
import "../styles/programming-blocks.css";

export const BLOCK_CATEGORY_LABELS: Record<ToolboxCategory, string> = {
  event: "事件",
  motion: "动作",
  looks: "外观",
  sound: "声音",
  control: "控制",
  game: "游戏",
  variable: "变量",
  operator: "运算",
};
export const BLOCK_CATEGORY_ORDER = Object.keys(
  BLOCK_CATEGORY_LABELS,
) as ToolboxCategory[];

const ink: Record<ToolboxCategory, string> = {
  event: "#48360c",
  motion: "#0b2344",
  looks: "#ffffff",
  sound: "#3d0b24",
  control: "#472b0b",
  game: "#183c10",
  variable: "#492605",
  operator: "#173b18",
};
export function blockCategoryStyle(category: ToolboxCategory): CSSProperties {
  return {
    "--block-color": BLOCK_PALETTE[category],
    "--block-ink": ink[category],
  } as CSSProperties;
}

export function BlockCategories({
  categories,
  compact = false,
  label = "积木类别",
}: {
  categories: readonly ToolboxCategory[];
  compact?: boolean;
  label?: string;
}) {
  return (
    <span
      className="program-categories"
      data-compact={compact}
      role="group"
      aria-label={label}
    >
      {categories.map((category) => (
        <span
          className="program-category"
          data-category={category}
          style={blockCategoryStyle(category)}
          key={category}
        >
          <i aria-hidden="true" />
          {BLOCK_CATEGORY_LABELS[category]}
        </span>
      ))}
    </span>
  );
}

function DisplayBlock({
  category,
  children,
  hat = false,
}: {
  category: ToolboxCategory;
  children: ReactNode;
  hat?: boolean;
}) {
  return (
    <span
      className="program-display-block"
      data-category={category}
      data-hat={hat}
      style={blockCategoryStyle(category)}
    >
      <svg
        className="program-block-shape"
        viewBox="0 0 240 56"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d={
            hat
              ? "M3 16C12 0 52 0 66 12H230Q237 12 237 19V42Q237 49 230 49H54C51 49 51 54 47 54H30C26 54 26 49 23 49H10Q3 49 3 42Z"
              : "M10 3H23C26 3 26 8 30 8H47C51 8 51 3 54 3H230Q237 3 237 10V42Q237 49 230 49H54C51 49 51 54 47 54H30C26 54 26 49 23 49H10Q3 49 3 42V10Q3 3 10 3Z"
          }
        />
      </svg>
      <span className="program-block-content">{children}</span>
    </span>
  );
}

export function ProgrammingExample({
  layout = "row",
}: {
  layout?: "row" | "stack";
}) {
  return (
    <div className="program-example" data-layout={layout}>
      <span className="program-example-label">
        积木示意 · 拼起来，让想法动起来
      </span>
      <div
        className="program-example-blocks"
        role="img"
        aria-label="编程积木示意，非可拖动工作区：当绿旗被点击，向右移动一格，说你好两秒。"
      >
        <DisplayBlock category="event" hat>
          当{" "}
          <svg
            className="program-green-flag"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M4 18V3m0 0c4-4 8 4 13 0v9c-5 4-9-4-13 0" />
          </svg>{" "}
          被点击
        </DisplayBlock>
        <DisplayBlock category="motion">
          向右移动 <b>1</b> 格
        </DisplayBlock>
        <DisplayBlock category="looks">
          说 <b>你好！</b> <b>2</b> 秒
        </DisplayBlock>
      </div>
    </div>
  );
}
