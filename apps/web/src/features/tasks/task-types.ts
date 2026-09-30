import type { RuntimeReport } from "@kids-code/runtime";
import type { ProjectMode } from "../projects/project-factory";

export type TaskId =
  | "speak"
  | "move"
  | "sequence"
  | "turn"
  | "diagonal"
  | "repeat"
  | "collision"
  | "collision_sound"
  | "touch_end"
  | "collect"
  | "score"
  | "treasure_win"
  | "scene"
  | "variable"
  | "logic"
  | "compare_score"
  | "logic_or"
  | "random"
  | "keyboard"
  | "sound"
  | "magic"
  | "broadcast"
  | "scene_story"
  | "finale"
  | "path_straight"
  | "path_turn"
  | "path_zigzag"
  | "path_repeat"
  | "sky_waypoint"
  | "sky_collect"
  | "sky_shortcut"
  | "sky_master"
  | "data_count"
  | "data_show"
  | "data_record"
  | "data_compare"
  | "data_reset"
  | "data_label"
  | "data_sort"
  | "data_chart"
  | "pattern_beat"
  | "pattern_square"
  | "pattern_spin"
  | "pattern_grow"
  | "pattern_forever"
  | "pattern_tempo"
  | "pattern_swap"
  | "pattern_predict"
  | "think_feature"
  | "think_if"
  | "think_else"
  | "think_touch"
  | "think_two"
  | "think_or"
  | "think_threshold"
  | "think_train"
  | "think_check"
  | "ai_helper"
  | "ai_quiz"
  | "ai_sort"
  | "ai_music"
  | "ai_story"
  | "ai_limit"
  | "ai_fair"
  | "ai_final";

export type TaskChapter =
  | "基础入门"
  | "互动游戏"
  | "程序思维"
  | "进阶创作"
  | "路线挑战"
  | "云岛远征"
  | "数据小侦探"
  | "规律与模式"
  | "会判断的程序"
  | "AI 小创客";

export type TaskBlockCategory =
  | "event"
  | "motion"
  | "looks"
  | "sound"
  | "control"
  | "game"
  | "variable"
  | "condition"
  | "operator";

export interface TaskBlockGuide {
  label: string;
  category: TaskBlockCategory;
  shape?: "hat" | "stack" | "condition" | "loop";
}

export interface TaskProgress {
  taskId: TaskId;
  stars: 1 | 2 | 3;
  completedAt: string;
}

export interface TaskRule {
  id: string;
  label: string;
  anyOf: string[];
}

export interface CreationTask {
  taskId: TaskId;
  chapter: TaskChapter;
  title: string;
  description: string;
  projectMode: ProjectMode;
  blockGuide: TaskBlockGuide[];
  rules: TaskRule[];
  runtimeGoal: {
    label: string;
    check: (report: RuntimeReport) => boolean;
  };
  hints: [string, string, string];
}
