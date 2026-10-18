export interface NumberParameter {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  presets: number[];
}
export interface BlockParameter {
  blockId: string;
  fieldName: string;
  kind: "number" | "text" | "select";
  value: string;
  label: string;
  number?: NumberParameter;
  options?: Array<{ label: string; value: string }>;
}
export function numberParameter(
  type: string,
  input: string,
  grid = { columns: 12, rows: 9 },
): NumberParameter {
  if (input === "DELTA")
    return {
      label: "分数变化",
      unit: "分",
      min: -1000,
      max: 1000,
      step: 1,
      presets: [-10, -1, 1, 3, 5, 10],
    };
  if (input === "X" || input === "Y")
    return {
      label: input === "X" ? "X 列坐标" : "Y 行坐标",
      unit: "（从 0 开始）",
      min: 0,
      max: (input === "X" ? grid.columns : grid.rows) - 1,
      step: 1,
      presets: [0, 1, 2, 3, 4],
    };
  if (input === "DEGREES" || type === "kids_angle_picker")
    return {
      label: "转动角度",
      unit: "度",
      min: 1,
      max: 360,
      step: 1,
      presets: [15, 30, 45, 90, 180, 360],
    };
  if (input === "TIMES" || type === "kids_repeat_picker")
    return {
      label: "重复次数",
      unit: "次",
      min: 2,
      max: 10,
      step: 1,
      presets: [2, 3, 4, 5, 10],
    };
  if (["SECS", "DURATION"].includes(input) || type === "kids_duration_picker")
    return {
      label: "持续时间",
      unit: "秒",
      min: 0.1,
      max: 10,
      step: 0.1,
      presets: [0.5, 1, 2, 3, 5],
    };
  if (input === "STEPS" || type === "kids_step_picker")
    return {
      label: "移动格数",
      unit: "格",
      min: 1,
      max: 10,
      step: 1,
      presets: [1, 2, 3, 4, 5, 10],
    };
  if (input === "CHANGE" || type === "kids_size_picker")
    return {
      label: "大小变化",
      unit: "%",
      min: -80,
      max: 80,
      step: 1,
      presets: [-20, -10, 10, 20, 50],
    };
  return {
    label: input === "RIGHT" ? "比较的数字" : "数值",
    unit: "",
    min: type === "kids_score_set" ? 0 : -9999,
    max: 9999,
    step: 1,
    presets: [0, 1, 2, 3, 5, 10],
  };
}
export function validateParameter(
  value: string,
  config: NumberParameter,
): string | null {
  if (!value.trim() || !Number.isFinite(Number(value)))
    return "请输入一个有效数字";
  const number = Number(value);
  if (number < config.min || number > config.max)
    return `范围是 ${config.min} 到 ${config.max}`;
  if (config.step === 1 && !Number.isInteger(number)) return "这里需要整数";
  return null;
}
