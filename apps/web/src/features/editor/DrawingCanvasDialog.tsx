import { useEffect, useRef, useState, type PointerEvent } from "react";

interface DrawingCanvasDialogProps {
  kind: "sprite" | "background";
  onSave: (file: File) => Promise<void>;
  onClose: () => void;
}

export function DrawingCanvasDialog({
  kind,
  onSave,
  onClose,
}: DrawingCanvasDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const previousRef = useRef({ x: 0, y: 0 });
  const [color, setColor] = useState("#398df5");
  const [brushSize, setBrushSize] = useState(12);
  const [eraser, setEraser] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (kind !== "background") return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 480, 360);
  }, [kind]);

  const pointFromEvent = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const drawTo = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = pointFromEvent(event);
    context.save();
    context.globalCompositeOperation = eraser
      ? "destination-out"
      : "source-over";
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(previousRef.current.x, previousRef.current.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    context.restore();
    previousRef.current = point;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (kind === "background") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) =>
            value ? resolve(value) : reject(new Error("DRAWING_EXPORT_FAILED")),
          "image/png",
        ),
      );
      await onSave(
        new File([blob], kind === "sprite" ? "我的角色.png" : "我的背景.png", {
          type: "image/png",
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="manager-dialog drawing-editor"
      role="dialog"
      aria-modal="true"
      aria-label="简易绘图编辑器"
    >
      <header>
        <div>
          <strong>画一个{kind === "sprite" ? "角色" : "背景"}</strong>
          <small>用鼠标、触控笔或手指自由绘制</small>
        </div>
        <button
          className="manager-close"
          aria-label="关闭绘图"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <div className="drawing-toolbar">
        <label>
          颜色
          <input
            type="color"
            value={color}
            disabled={eraser}
            onChange={(event) => setColor(event.target.value)}
          />
        </label>
        <label>
          笔画 {brushSize}
          <input
            type="range"
            min={3}
            max={36}
            value={brushSize}
            onChange={(event) => setBrushSize(Number(event.target.value))}
          />
        </label>
        <button
          data-active={eraser}
          onClick={() => setEraser((value) => !value)}
        >
          {eraser ? "✓ 橡皮擦" : "橡皮擦"}
        </button>
        <button onClick={clear}>清空</button>
      </div>
      <canvas
        ref={canvasRef}
        width={480}
        height={360}
        aria-label="绘图画布"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drawingRef.current = true;
          previousRef.current = pointFromEvent(event);
          drawTo(event);
        }}
        onPointerMove={drawTo}
        onPointerUp={() => {
          drawingRef.current = false;
        }}
        onPointerCancel={() => {
          drawingRef.current = false;
        }}
      />
      <footer>
        <button onClick={onClose}>取消</button>
        <button
          className="drawing-save"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "正在保存…" : "使用这幅画"}
        </button>
      </footer>
    </section>
  );
}
