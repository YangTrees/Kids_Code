import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  validateParameter,
  type BlockParameter,
} from "@kids-code/block-adapter";
import { resolveAssetUrl } from "@kids-code/stage";
import type { Project } from "@kids-code/domain";

function EditorDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("input, button")?.focus();
    return () => {
      document
        .querySelector<HTMLElement>(".block-workspace-host")
        ?.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <div className="learning-dialog-backdrop">
      <section
        ref={ref}
        className="learning-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onPointerDown={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
          if (event.key !== "Tab") return;
          const controls = [
            ...event.currentTarget.querySelectorAll<HTMLElement>(
              "input, button:not(:disabled)",
            ),
          ];
          const first = controls[0],
            last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <h2>{title}</h2>
        {children}
      </section>
    </div>,
    document.body,
  );
}

export function ParameterListDialog({
  parameters,
  onChoose,
  onClose,
}: {
  parameters: BlockParameter[];
  onChoose: (parameter: BlockParameter) => void;
  onClose: () => void;
}) {
  return (
    <EditorDialog title="积木参数" onClose={onClose}>
      <p>选择要修改的参数，不会移动积木。</p>
      <div className="parameter-options">
        {parameters.map((parameter) => {
          const value =
            parameter.options?.find(
              (option) => option.value === parameter.value,
            )?.label ?? parameter.value;
          return (
            <button
              key={`${parameter.blockId}:${parameter.fieldName}`}
              type="button"
              onClick={() => onChoose(parameter)}
            >
              {parameter.label}：{value || "空白"}
            </button>
          );
        })}
      </div>
      {parameters.length === 0 && <p>先在工作区放入带参数的积木。</p>}
      <div className="learning-dialog-actions">
        <button type="button" onClick={onClose}>
          返回工作区
        </button>
      </div>
    </EditorDialog>
  );
}

export function ParameterDialog({
  parameter,
  project,
  onSave,
  onClose,
}: {
  parameter: BlockParameter;
  project: Project;
  onSave: (value: string) => boolean;
  onClose: () => void;
}) {
  const [value, setValue] = useState(parameter.value);
  const [error, setError] = useState("");
  const numeric = parameter.number;
  const imageFor = (id: string) => {
    const sprite = project.sprites.find((item) => item.spriteId === id);
    const scene = project.scenes.find((item) => item.sceneId === id);
    const asset = project.assets.find(
      (item) =>
        item.assetId ===
        (sprite?.costumeAssetId ?? scene?.backdropAssetId ?? id),
    );
    return asset && asset.type !== "audio"
      ? resolveAssetUrl(asset.path)
      : undefined;
  };
  return (
    <EditorDialog title={parameter.label} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const problem = numeric
            ? validateParameter(value, numeric)
            : parameter.kind === "text" && !value.trim()
              ? "请输入想说的话"
              : null;
          if (problem) {
            setError(problem);
            return;
          }
          if (!onSave(value)) {
            setError("这个积木已变化，请关闭后重新选择。");
            return;
          }
          onClose();
        }}
      >
        {parameter.kind === "select" ? (
          <div className="parameter-options">
            {parameter.options?.map((option) => (
              <button
                type="button"
                key={option.value}
                aria-pressed={value === option.value}
                onClick={() => setValue(option.value)}
              >
                {imageFor(option.value) && (
                  <img src={imageFor(option.value)} alt="" />
                )}
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <label className="parameter-input-label">
              {parameter.label} {numeric?.unit}
              <input
                aria-label={parameter.label}
                type={numeric ? "number" : "text"}
                value={value}
                min={numeric?.min}
                max={numeric?.max}
                step={numeric?.step}
                maxLength={numeric ? undefined : 160}
                onChange={(event) => {
                  setValue(event.target.value);
                  setError("");
                }}
              />
            </label>
            {numeric && (
              <>
                <p>
                  可输入 {numeric.min}–{numeric.max} {numeric.unit}
                </p>
                <div className="parameter-stepper">
                  {[-1, 1].map((direction) => (
                    <button
                      key={direction}
                      type="button"
                      aria-label={direction < 0 ? "减少数值" : "增加数值"}
                      onClick={() =>
                        setValue(
                          String(
                            Math.round(
                              Math.min(
                                numeric.max,
                                Math.max(
                                  numeric.min,
                                  (Number(value) || 0) +
                                    direction * numeric.step,
                                ),
                              ) * 10,
                            ) / 10,
                          ),
                        )
                      }
                    >
                      {direction < 0 ? "−" : "+"}
                    </button>
                  ))}
                </div>
                <div className="parameter-options">
                  {numeric.presets
                    .filter(
                      (item) => item >= numeric.min && item <= numeric.max,
                    )
                    .map((number) => (
                      <button
                        type="button"
                        key={number}
                        aria-pressed={Number(value) === number}
                        onClick={() => setValue(String(number))}
                      >
                        {number} {numeric.unit}
                      </button>
                    ))}
                </div>
              </>
            )}
          </>
        )}
        {error && <p role="alert">{error}</p>}
        <div className="learning-dialog-actions">
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button type="submit">确定</button>
        </div>
      </form>
    </EditorDialog>
  );
}

export function VariableNameDialog({
  existingNames,
  onCreate,
  onClose,
}: {
  existingNames: string[];
  onCreate: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  return (
    <EditorDialog title="创建变量" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const normalized = name.trim();
          if (!normalized) return setError("请先输入变量名字");
          if (normalized.length > 12) return setError("名字最多 12 个字");
          if (existingNames.includes(normalized))
            return setError("已经有这个名字，请换一个");
          if (existingNames.length >= 20)
            return setError("最多可以创建 20 个变量");
          onCreate(normalized);
          onClose();
        }}
      >
        <label>
          变量名字
          <input
            aria-label="变量名字"
            value={name}
            maxLength={12}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <div className="learning-dialog-actions">
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button type="submit">创建</button>
        </div>
      </form>
    </EditorDialog>
  );
}
