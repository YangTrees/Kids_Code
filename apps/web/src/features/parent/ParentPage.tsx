import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { IndexedDbProjectRepository } from "@kids-code/persistence";
import { useSettingsStore } from "../../shared/settings-store";
import { useTranslate } from "../../shared/use-translate";
import {
  captureScopedStorage,
  clearAppStorage,
  createLocalBackup,
  readLocalBackup,
  restoreScopedStorage,
} from "./local-backup";

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
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const busy = exporting || restoring || deleting;

  const exportAllProjects = async () => {
    setExporting(true);
    setNotice(null);
    try {
      const snapshot = await repository.snapshotAll();
      const blob = createLocalBackup({
        snapshot,
        storage: captureScopedStorage(),
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `我的全部作品-${new Date().toISOString().slice(0, 10)}.kidbackup`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setNotice(
        `已生成完整备份：${snapshot.projects.length} 个作品、${snapshot.trash.length} 个回收站作品及本地素材。请确认文件已下载。`,
      );
    } catch (error) {
      console.error("Failed to export local backup", error);
      setNotice("备份失败，请检查浏览器存储空间后重试。");
    } finally {
      setExporting(false);
    }
  };

  const restoreAllProjects = async (file: File) => {
    setRestoring(true);
    setNotice(null);
    try {
      const backup = await readLocalBackup(file);
      if (
        !window.confirm(
          `将用备份中的 ${backup.snapshot.projects.length} 个作品替换这台设备当前的全部作品、回收站、素材和课程进度。当前数据会被覆盖，建议先导出一份现有备份。确定恢复吗？`,
        )
      )
        return;
      await repository.replaceAll(backup.snapshot);
      restoreScopedStorage(backup.storage);
      useSettingsStore.getState().reloadSettings();
      window.dispatchEvent(new Event("kids-code:task-change"));
      setNotice("完整备份已恢复。返回首页即可查看作品和课程进度。");
    } catch (error) {
      console.error("Failed to restore local backup", error);
      setNotice(
        "恢复失败：备份文件不完整、格式不支持或存储空间不足。原有作品不会因文件校验失败而被清除。",
      );
    } finally {
      setRestoring(false);
    }
  };

  const deleteEverything = async () => {
    if (
      !window.confirm(
        "这会删掉这台设备上的全部作品、回收站、素材和课程进度。建议先下载并确认完整备份。确定要继续吗？",
      )
    )
      return;
    if (!window.confirm("请再确认一次：真的删除全部本机数据？")) return;
    setDeleting(true);
    setNotice(null);
    try {
      await repository.clearAll();
      useSettingsStore.getState().resetSettings();
      clearAppStorage();
      window.dispatchEvent(new Event("kids-code:task-change"));
      setNotice("本机作品、素材、草稿和课程进度已删除。");
    } catch (error) {
      console.error("Failed to delete local data", error);
      setNotice("删除失败，请重试；部分本机数据可能仍然存在。");
    } finally {
      setDeleting(false);
    }
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
          <button disabled={busy} onClick={() => void exportAllProjects()}>
            {exporting ? "正在备份…" : "导出完整备份"}
          </button>
          <input
            ref={backupInputRef}
            type="file"
            accept=".kidbackup,application/zip"
            aria-label="选择完整备份文件"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void restoreAllProjects(file);
            }}
          />
          <button
            disabled={busy}
            onClick={() => backupInputRef.current?.click()}
          >
            {restoring ? "正在恢复…" : "恢复完整备份"}
          </button>
          <button
            className="parent-danger"
            disabled={busy}
            onClick={() => void deleteEverything()}
          >
            {deleting ? "正在删除…" : "删除本机全部数据"}
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
