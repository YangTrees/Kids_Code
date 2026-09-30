import { useState } from "react";
import { useTranslate } from "../../shared/use-translate";
import { useSettingsStore } from "../../shared/settings-store";

/**
 * 帮助中心（设计说明书 5.1：简版）。
 * 内容分三块：积木图标怎么认、三步做出会动的东西、安全提示。
 */

interface HelpContent {
  categories: Array<{
    icon: string;
    color: string;
    label: string;
    meaning: string;
    examples: string;
  }>;
  steps: Array<{ title: string; body: string }>;
  safety: string[];
  lead: string;
  closing: string;
}

const content: Record<"zh-CN" | "en", HelpContent> = {
  "zh-CN": {
    lead: "积木按颜色分成六类，看到颜色就知道它是干什么的。",
    closing: "做完这三步，你就做出了第一个会动的作品，记得等它自己“已保存”。",
    categories: [
      {
        icon: "⚑",
        color: "#f4c542",
        label: "事件",
        meaning: "黄色＝什么时候开始",
        examples: "点击绿旗、点一下角色、碰到别人、收到消息",
      },
      {
        icon: "➜",
        color: "#4a90e2",
        label: "动作",
        meaning: "蓝色＝怎么动",
        examples: "向上/下/左/右走、转身、回到起点",
      },
      {
        icon: "✦",
        color: "#8e63ce",
        label: "外观",
        meaning: "紫色＝长什么样",
        examples: "说话气泡、变大变小、显示隐藏、换造型",
      },
      {
        icon: "♪",
        color: "#d65db1",
        label: "声音",
        meaning: "粉色＝发出声音",
        examples: "播放音效、播放我的录音、停下所有声音",
      },
      {
        icon: "⟳",
        color: "#f59e42",
        label: "控制",
        meaning: "橙色＝重复和判断",
        examples: "等一下、重复几次、一直重复、如果…那么",
      },
      {
        icon: "🎮",
        color: "#2cb67d",
        label: "游戏",
        meaning: "绿色＝计分和输赢",
        examples: "加分、设定得分、成功/失败、换场景",
      },
    ],
    steps: [
      {
        title: "第一步：点绿旗",
        body: "从黄色“事件”里拖出“当 🚩 被点击”，放在空白的地方。没有它，后面的积木不会跑。",
      },
      {
        title: "第二步：让它动起来",
        body: "接上蓝色的“移动”积木，选一个方向，再点一下点阵选走几格。",
      },
      {
        title: "第三步：按绿旗看结果",
        body: "点舞台上面的绿旗。积木会一块一块亮起来，角色照着你摆的顺序动。",
      },
    ],
    safety: [
      "作品只保存在这台设备上，不会自己传到网上。",
      "录音和上传图片都可以让家长关掉，去“家长区”设置。",
      "不要把自己的名字、学校、家庭住址和电话号码写进作品里。",
      "想删掉全部作品，可以在家长区一键删除本机数据。",
      "做错了不用怕，点“撤销”就能回到上一步。",
    ],
  },
  en: {
    lead: "Blocks come in six colours — the colour tells you what it does.",
    closing:
      "Those three steps are your first moving project. Wait until it says “Saved”.",
    categories: [
      {
        icon: "⚑",
        color: "#f4c542",
        label: "Events",
        meaning: "Yellow = when to start",
        examples:
          "Green flag, click a sprite, touch something, receive a message",
      },
      {
        icon: "➜",
        color: "#4a90e2",
        label: "Motion",
        meaning: "Blue = how to move",
        examples: "Walk up/down/left/right, turn, go back to start",
      },
      {
        icon: "✦",
        color: "#8e63ce",
        label: "Looks",
        meaning: "Purple = how it looks",
        examples: "Speech bubble, grow/shrink, show/hide, switch costume",
      },
      {
        icon: "♪",
        color: "#d65db1",
        label: "Sound",
        meaning: "Pink = make a sound",
        examples: "Play a sound, play my recording, stop all sounds",
      },
      {
        icon: "⟳",
        color: "#f59e42",
        label: "Control",
        meaning: "Orange = repeat and decide",
        examples: "Wait, repeat, forever, if…then",
      },
      {
        icon: "🎮",
        color: "#2cb67d",
        label: "Game",
        meaning: "Green = score and win/lose",
        examples: "Add score, set score, success/failure, switch scene",
      },
    ],
    steps: [
      {
        title: "Step 1: the green flag",
        body: "Drag “when 🚩 clicked” out of the yellow Events drawer. Without it nothing runs.",
      },
      {
        title: "Step 2: make it move",
        body: "Snap on a blue “move” block, pick a direction, then choose how many steps.",
      },
      {
        title: "Step 3: press the flag",
        body: "Press the flag above the stage. Blocks light up one by one and the sprite follows your order.",
      },
    ],
    safety: [
      "Projects stay on this device — nothing is uploaded automatically.",
      "Recording and image uploads can be turned off by a parent.",
      "Never put your real name, school, home address or phone number in a project.",
      "You can delete all local data from the Parents page.",
      "Mistakes are fine — press Undo to go back one step.",
    ],
  },
};

export function HelpDialog({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"blocks" | "start" | "safety">("blocks");
  const t = useTranslate();
  const locale = useSettingsStore((state) => state.locale);
  const copy = content[locale === "en" ? "en" : "zh-CN"];

  return (
    <div className="manager-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="manager-dialog help-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="帮助中心"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <strong>{t("help.title")}</strong>
            <small>{t("help.subtitle")}</small>
          </div>
          <button className="manager-close" aria-label="关闭" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="help-tabs" role="tablist" aria-label="帮助内容">
          {(
            [
              ["blocks", t("help.tab.blocks")],
              ["start", t("help.tab.start")],
              ["safety", t("help.tab.safety")],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              className="help-tab"
              data-active={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "blocks" ? (
          <div className="help-body">
            <p className="help-lead">{copy.lead}</p>
            <ul className="help-category-list">
              {copy.categories.map((category) => (
                <li key={category.label}>
                  <span
                    className="help-category-badge"
                    style={{ background: category.color }}
                    aria-hidden="true"
                  >
                    {category.icon}
                  </span>
                  <div>
                    <strong>{category.label}</strong>
                    <span>{category.meaning}</span>
                    <small>{category.examples}</small>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {tab === "start" ? (
          <div className="help-body">
            <ol className="help-steps">
              {copy.steps.map((step, index) => (
                <li key={step.title}>
                  <span className="help-step-index" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="help-lead">{copy.closing}</p>
          </div>
        ) : null}

        {tab === "safety" ? (
          <div className="help-body">
            <ul className="help-safety-list">
              {copy.safety.map((tip) => (
                <li key={tip}>
                  <span aria-hidden="true">🛡</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
