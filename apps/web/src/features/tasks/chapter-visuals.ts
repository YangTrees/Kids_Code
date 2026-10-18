import type { TaskChapter } from "./task-types";
import { assetUrl } from "../../shared/base-url";
const chapterFiles: Record<TaskChapter, string> = {
  基础入门: "basics",
  互动游戏: "interaction",
  程序思维: "thinking",
  进阶创作: "creation",
  路线挑战: "route",
  云岛远征: "sky",
  数据小侦探: "data",
  规律与模式: "patterns",
  会判断的程序: "decisions",
  "AI 小创客": "makers",
};
export const chapterImage = (chapter: TaskChapter) =>
  assetUrl(`ui/story-ip/unit-${chapterFiles[chapter]}-v1.webp`);
