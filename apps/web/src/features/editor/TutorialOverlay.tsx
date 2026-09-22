import { useState } from "react";

const steps = [
  ["1", "选一个角色", "点击下方角色卡片，给每个角色编写不同的积木。"],
  [
    "2",
    "拼好积木",
    "从工作区顶部选择分类，再从积木抽屉拖出积木，连接到黄色开始积木下方。",
  ],
  ["3", "点击运行", "点绿色旗帜，看角色马上动起来。作品会自动保存。"],
] as const;

export function TutorialOverlay() {
  const [step, setStep] = useState(() =>
    Number(localStorage.getItem("kids-code-tutorial-step") ?? 0),
  );
  if (step >= steps.length) return null;
  const [number, title, description] = steps[step] ?? steps[0];
  const close = () => {
    localStorage.setItem("kids-code-tutorial-step", String(steps.length));
    setStep(steps.length);
  };
  return (
    <aside className="tutorial-overlay" role="dialog" aria-label="新手引导">
      <span className="tutorial-count">
        {number} / {steps.length}
      </span>
      <strong>{title}</strong>
      <p>{description}</p>
      <div>
        <button className="tutorial-skip" onClick={close}>
          跳过
        </button>
        <button
          className="tutorial-next"
          onClick={() => {
            const next = step + 1;
            localStorage.setItem("kids-code-tutorial-step", String(next));
            setStep(next);
          }}
        >
          {step + 1 === steps.length ? "开始创作" : "下一步"}
        </button>
      </div>
    </aside>
  );
}
