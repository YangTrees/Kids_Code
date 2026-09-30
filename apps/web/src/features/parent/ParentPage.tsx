import { useState } from "react";
import { useNavigate } from "react-router";
import { IndexedDbProjectRepository } from "@kids-code/persistence";
import { useSettingsStore } from "../../shared/settings-store";
import { useTranslate } from "../../shared/use-translate";

/**
 * 家长区（设计说明书第 16 章）。
 *
 * 本地优先版本：所有开关只影响这台设备，不涉及账号、云同步与公开分享。
 */

const repository = new IndexedDbProjectRepository();

export function ParentPage() {
  const navigate = useNavigate();
  const {
    volume,
    reduceMotion,
    allowRecording,
    allowUploads,
    locale,
    setVolume,
    setReduceMotion,
    setAllowRecording,
    setAllowUploads,
    setLocale,
  } = useSettingsStore();
  const t = useTranslate();
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const exportAllProjects = async () => {
    setExporting(true);
    setNotice(null);
    try {
      const projects = await repository.list();
      const bundle = {
        kind: "kids-code-studio/export-all",
        schemaVersion: "1.0",
        exportedAt: new Date().toISOString(),
        projects,
      };
      const blob = new Blob([JSON.stringify(bundle, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `我的全部作品-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice(`已导出 ${projects.length} 个作品到下载文件夹。`);
    } catch {
      setNotice("导出失败，请稍后再试。");
    } finally {
      setExporting(false);
    }
  };

  const deleteEverything = async () => {
    if (
      !window.confirm(
        "这会删掉这台设备上的全部作品、回收站和素材，且无法恢复。\n建议先点“导出全部作品”。确定要继续吗？",
      )
    )
      return;
    if (!window.confirm("请再确认一次：真的删除全部数据？")) return;
    await repository.clearAll();
    window.localStorage.removeItem("kids-code:settings");
    setNotice("本机数据已删除。");
  };

  return (
    <main className="parent-page">
      <header className="parent-header">
        <button className="parent-back" onClick={() => navigate("/")}>
          {t("parent.back")}
        </button>
        <h1>{t("parent.title")}</h1>
        <p>{t("parent.lead")}</p>
      </header>

      <section className="parent-section">
        <h2>{t("parent.section.av")}</h2>
        <label className="parent-row">
          <span>
            <strong>音量</strong>
            <small>影响作品里的音效和录音播放</small>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(volume * 100)}
            aria-label="音量"
            onChange={(event) => setVolume(Number(event.target.value) / 100)}
          />
        </label>
        <label className="parent-row">
          <span>
            <strong>减少动画</strong>
            <small>关闭飘动、闪烁等装饰动画，画面更安静</small>
          </span>
          <input
            type="checkbox"
            checked={reduceMotion}
            onChange={(event) => setReduceMotion(event.target.checked)}
          />
        </label>
        <label className="parent-row">
          <span>
            <strong>界面语言</strong>
            <small>中文为首发语言，英文为进行中的翻译</small>
          </span>
          <select
            value={locale}
            aria-label="界面语言"
            onChange={(event) =>
              setLocale(event.target.value === "en" ? "en" : "zh-CN")
            }
          >
            <option value="zh-CN">简体中文</option>
            <option value="en">English</option>
          </select>
        </label>
      </section>

      <section className="parent-section">
        <h2>{t("parent.section.privacy")}</h2>
        <label className="parent-row">
          <span>
            <strong>允许录音</strong>
            <small>关闭后，编辑器里的录音按钮会隐藏</small>
          </span>
          <input
            type="checkbox"
            checked={allowRecording}
            onChange={(event) => setAllowRecording(event.target.checked)}
          />
        </label>
        <label className="parent-row">
          <span>
            <strong>允许上传图片和音频</strong>
            <small>关闭后只能使用内置素材和自己画的图</small>
          </span>
          <input
            type="checkbox"
            checked={allowUploads}
            onChange={(event) => setAllowUploads(event.target.checked)}
          />
        </label>
        <p className="parent-note">
          我们没有做公开分享、评论、私信和陌生人关注，作品默认只有本机能看到。
        </p>
      </section>

      <section className="parent-section">
        <h2>{t("parent.section.data")}</h2>
        <div className="parent-actions">
          <button disabled={exporting} onClick={() => void exportAllProjects()}>
            {exporting ? "正在导出…" : "导出全部作品"}
          </button>
          <button
            className="parent-danger"
            onClick={() => void deleteEverything()}
          >
            删除本机全部数据
          </button>
        </div>
        {notice ? (
          <p className="parent-notice" role="status">
            {notice}
          </p>
        ) : null}
      </section>

      <section className="parent-section">
        <h2>{t("parent.section.tips")}</h2>
        <ul className="parent-tips">
          <li>建议和孩子一起完成第一节课，之后再让他自己试。</li>
          <li>作品每 2 秒自动保存一次；保存失败时顶部会显示“重试”。</li>
          <li>提醒孩子不要把真实姓名、学校和住址写进作品文字里。</li>
        </ul>
      </section>
    </main>
  );
}
