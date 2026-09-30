/**
 * 界面文案（设计说明书 17.4）。
 *
 * 规则：界面显示文本一律通过 key 取得，禁止在业务组件里硬编码；
 * 中文为首发语言，英文为预留翻译；数据（积木类型、资源 ID）不参与翻译。
 */

const zhCN = {
  "brand.title": "栗奇编程乐园",
  "brand.subtitle": "儿童创意编程工作室",
  "home.localStatus": "本地创作 · 自动保存",
  "home.nav.learn": "学习课程",
  "home.nav.templates": "灵感模板",
  "home.nav.challenges": "课程概览",
  "home.nav.works": "我的作品",
  "home.nav.help": "帮助",
  "home.nav.parent": "家长区",
  "home.hero.eyebrow": "CREATE · PLAY · LEARN",
  "home.hero.titleLead": "把想象，变成",
  "home.hero.titleEm": "会动的故事",
  "home.hero.desc":
    "拖动积木、设计角色、搭建关卡，从第一个动作开始创造自己的小游戏。",
  "home.hero.startLearning": "▶ 开始学习",
  "home.hero.startBlank": "＋ 开始空白创作",
  "editor.save.saved": "已保存",
  "editor.save.error": "保存失败",
  "editor.save.dirty": "待保存",
  "editor.save.saving": "保存中…",
  "editor.save.retry": "重试",
  "editor.status.IDLE": "编辑中",
  "editor.status.STARTING": "准备运行",
  "editor.status.RUNNING": "运行中",
  "editor.status.PAUSED": "已暂停",
  "editor.status.COMPLETED": "运行完成",
  "editor.status.STOPPED": "已回到起点",
  "editor.status.ERROR": "请检查积木",
  "editor.action.run": "运行",
  "editor.action.step": "单步",
  "editor.action.pause": "暂停",
  "editor.action.resume": "继续",
  "editor.action.stop": "停止",
  "editor.action.task": "任务",
  "editor.action.help": "帮助",
  "editor.portraitWarning": "请将设备横屏使用，创作空间会更宽敞。",
  "help.title": "帮助中心",
  "help.subtitle": "不会用？先看这里",
  "help.tab.blocks": "认积木",
  "help.tab.start": "三步上手",
  "help.tab.safety": "安全提示",
  "parent.title": "家长区",
  "parent.back": "‹ 返回",
  "parent.lead":
    "这个版本不需要登录，作品只保存在这台设备上。下面的开关只影响本机使用。",
  "parent.section.av": "声音与画面",
  "parent.section.privacy": "隐私开关",
  "parent.section.data": "数据",
  "parent.section.tips": "给家长的话",
} as const;

export type TranslationKey = keyof typeof zhCN;
export type Dictionary = Record<TranslationKey, string>;

const en: Dictionary = {
  "brand.title": "Liqi Code Studio",
  "brand.subtitle": "Creative coding for kids",
  "home.localStatus": "On-device · Auto saved",
  "home.nav.learn": "Courses",
  "home.nav.templates": "Templates",
  "home.nav.challenges": "Overview",
  "home.nav.works": "My projects",
  "home.nav.help": "Help",
  "home.nav.parent": "Parents",
  "home.hero.eyebrow": "CREATE · PLAY · LEARN",
  "home.hero.titleLead": "Turn ideas into",
  "home.hero.titleEm": "moving stories",
  "home.hero.desc":
    "Drag blocks, design characters and build levels — start with one move.",
  "home.hero.startLearning": "▶ Start learning",
  "home.hero.startBlank": "＋ Blank project",
  "editor.save.saved": "Saved",
  "editor.save.error": "Save failed",
  "editor.save.dirty": "Unsaved",
  "editor.save.saving": "Saving…",
  "editor.save.retry": "Retry",
  "editor.status.IDLE": "Editing",
  "editor.status.STARTING": "Starting",
  "editor.status.RUNNING": "Running",
  "editor.status.PAUSED": "Paused",
  "editor.status.COMPLETED": "Finished",
  "editor.status.STOPPED": "Back to start",
  "editor.status.ERROR": "Check blocks",
  "editor.action.run": "Run",
  "editor.action.step": "Step",
  "editor.action.pause": "Pause",
  "editor.action.resume": "Resume",
  "editor.action.stop": "Stop",
  "editor.action.task": "Tasks",
  "editor.action.help": "Help",
  "editor.portraitWarning": "Please rotate your device to landscape.",
  "help.title": "Help",
  "help.subtitle": "Not sure how? Start here",
  "help.tab.blocks": "Blocks",
  "help.tab.start": "First steps",
  "help.tab.safety": "Safety",
  "parent.title": "Parents",
  "parent.back": "‹ Back",
  "parent.lead":
    "This version needs no sign-in and keeps projects on this device only.",
  "parent.section.av": "Sound & motion",
  "parent.section.privacy": "Privacy switches",
  "parent.section.data": "Your data",
  "parent.section.tips": "Notes for parents",
};

const dictionaries: Record<string, Dictionary> = {
  "zh-CN": zhCN as unknown as Dictionary,
  en,
};

export const supportedLocales = ["zh-CN", "en"] as const;

export function translate(locale: string, key: TranslationKey): string {
  return dictionaries[locale]?.[key] ?? dictionaries["zh-CN"]![key] ?? key;
}

/**
 * 简单的占位替换：把 {name} 换成给定参数，避免拼接顺序问题。
 */
export function format(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, token: string) =>
    token in values ? String(values[token]) : match,
  );
}
