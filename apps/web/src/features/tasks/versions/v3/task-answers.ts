/** Whole-label equivalence only: negative labels must never match positive substrings. */
const groups = [
  ["大", "较大", "大堆", "放进大堆", "放入大堆", "分到大堆"],
  ["小", "较小", "小堆", "放进小堆", "放入小堆", "分到小堆"],
  ["达标", "已达标", "合格"],
  ["未达标", "不达标", "不合格"],
  ["通过", "可以通过"],
  ["不通过", "不能通过"],
  ["完美", "两个条件都满足"],
  ["条件不足", "条件不满足"],
  ["A", "答案A", "答案是A"],
  ["B", "答案B", "答案是B"],
  ["C", "答案C", "答案是C"],
] as const;
const clean = (text: string) =>
  text.replace(/[\s。，！？,.!?]/g, "").toUpperCase();
const meanings = new Map<string, string>();
groups.forEach((group) =>
  group.forEach((label) => meanings.set(clean(label), clean(group[0]))),
);
export const normalizeTaskAnswer = (text: string) =>
  meanings.get(clean(text)) ?? clean(text);
export const sameTaskAnswer = (actual: string, expected: string) =>
  normalizeTaskAnswer(actual) === normalizeTaskAnswer(expected);
