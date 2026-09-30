import { useEffect, useState } from "react";
import { useEditorRuntime } from "./EditorRuntimeContext";

const directions: Array<{ key: string; glyph: string; label: string }> = [
  { key: "up arrow", glyph: "▲", label: "上" },
  { key: "left arrow", glyph: "◀", label: "左" },
  { key: "right arrow", glyph: "▶", label: "右" },
  { key: "down arrow", glyph: "▼", label: "下" },
];

/**
 * 屏幕方向键（设计说明书 7.4）。
 * 与键盘方向键走同一个输入事件，平板端自动显示。
 */
export function TouchDpad({ visible }: { visible: boolean }) {
  const { triggerKey } = useEditorRuntime();
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) setActive(null);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="touch-dpad" aria-label="屏幕方向键">
      {directions.map((direction) => (
        <button
          key={direction.key}
          type="button"
          className="touch-dpad-button"
          data-direction={direction.key.split(" ")[0]}
          data-active={active === direction.key}
          aria-label={direction.label}
          onPointerDown={(event) => {
            event.preventDefault();
            setActive(direction.key);
            triggerKey(direction.key);
          }}
          onPointerUp={() => setActive(null)}
          onPointerLeave={() => setActive(null)}
          onPointerCancel={() => setActive(null)}
        >
          <span aria-hidden="true">{direction.glyph}</span>
        </button>
      ))}
      <button
        type="button"
        className="touch-dpad-button touch-dpad-space"
        data-active={active === "space"}
        aria-label="空格"
        onPointerDown={(event) => {
          event.preventDefault();
          setActive("space");
          triggerKey("space");
        }}
        onPointerUp={() => setActive(null)}
        onPointerLeave={() => setActive(null)}
        onPointerCancel={() => setActive(null)}
      >
        <span aria-hidden="true">跳</span>
      </button>
    </div>
  );
}
