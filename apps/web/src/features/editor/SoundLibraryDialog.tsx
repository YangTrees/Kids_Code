import { useEffect, useRef, useState } from "react";
import { resolveAssetUrl } from "@kids-code/stage";
import { soundLibrary } from "./asset-catalog";

export interface SoundAssetRef {
  assetId: string;
  name: string;
  path: string;
}

interface SoundLibraryDialogProps {
  onSelect: (sound: SoundAssetRef) => void;
  /** 把录好的声音存进作品，返回新的音效引用。 */
  onRecord: (blob: Blob, name: string) => Promise<SoundAssetRef>;
  /** 导入本地音频文件。 */
  onUpload: (file: File) => Promise<SoundAssetRef>;
  /** 家长控制：关闭后不显示录音入口。 */
  recordingEnabled: boolean;
  /** 家长控制：关闭后不显示上传入口。 */
  uploadEnabled: boolean;
  onClose: () => void;
}

const MAX_RECORD_SECONDS = 30;
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

const pickRecorderMimeType = (): string | undefined => {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
};

export function SoundLibraryDialog({
  onSelect,
  onRecord,
  onUpload,
  recordingEnabled,
  uploadEnabled,
  onClose,
}: SoundLibraryDialogProps) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const stopPreview = () => {
    previewAudioRef.current?.pause();
    previewAudioRef.current = null;
    setPreviewId(null);
  };

  const cleanupTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(
    () => () => {
      cleanupTimer();
      stopPreview();
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const previewSound = (assetId: string, path: string) => {
    stopPreview();
    const audio = new Audio(resolveAssetUrl(path));
    previewAudioRef.current = audio;
    setPreviewId(assetId);
    audio.addEventListener("ended", () => setPreviewId(null), { once: true });
    void audio.play().catch(() => setPreviewId(null));
  };

  const finishRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
  };

  const startRecording = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("这个浏览器不能录音，可以试试上传一个音频文件。");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("需要允许麦克风，才能录下声音。");
      return;
    }
    const mimeType = pickRecorderMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      setError("这个浏览器不能录音，可以试试上传一个音频文件。");
      return;
    }
    chunksRef.current = [];
    recorderRef.current = recorder;
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    });
    recorder.addEventListener("stop", () => {
      cleanupTimer();
      stream.getTracks().forEach((track) => track.stop());
      setRecording(false);
      const type = recorder.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      recorderRef.current = null;
      if (blob.size === 0) return;
      if (blob.size > MAX_AUDIO_BYTES) {
        setError("录的声音太大了，请录得短一点。");
        return;
      }
      setBusy(true);
      void onRecord(blob, "我的录音")
        .then((sound) => {
          onSelect(sound);
          onClose();
        })
        .catch(() => setError("录音没有保存成功，请再试一次。"))
        .finally(() => setBusy(false));
    });
    recorder.start();
    setRecording(true);
    setElapsed(0);
    timerRef.current = window.setInterval(() => {
      setElapsed((value) => {
        const next = value + 1;
        if (next >= MAX_RECORD_SECONDS) finishRecording();
        return next;
      });
    }, 1_000);
  };

  const importAudio = async (file: File) => {
    setError(null);
    if (file.size > MAX_AUDIO_BYTES) {
      setError("这个文件太大了，请换一个小一点的。");
      return;
    }
    setBusy(true);
    try {
      const sound = await onUpload(file);
      onSelect(sound);
      onClose();
    } catch {
      setError("导入失败，请选择不超过 5MB 的音频文件。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="manager-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="manager-dialog sound-library-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="选择声音"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <strong>选择声音</strong>
            <small>点“试听”先听一听，再点“使用”放进积木</small>
          </div>
          <button className="manager-close" aria-label="关闭" onClick={onClose}>
            ×
          </button>
        </header>

        {recordingEnabled || uploadEnabled ? (
          <div className="sound-toolbar">
            {recordingEnabled ? (
              <button
                className={recording ? "sound-record-stop" : "sound-record"}
                disabled={busy}
                onClick={() =>
                  recording ? finishRecording() : void startRecording()
                }
              >
                {recording ? `■ 停止（${elapsed}s）` : "● 录一段声音"}
              </button>
            ) : (
              <small className="sound-disabled-hint">
                家长已关闭录音，可以在家长区重新打开。
              </small>
            )}
            {uploadEnabled ? (
              <>
                <input
                  ref={inputRef}
                  type="file"
                  accept="audio/*"
                  hidden
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    if (file) void importAudio(file);
                  }}
                />
                <button
                  className="sound-upload"
                  disabled={busy || recording}
                  onClick={() => inputRef.current?.click()}
                >
                  ＋ 上传音频
                </button>
              </>
            ) : null}
            {recording ? (
              <small className="sound-record-timer">
                最长 {MAX_RECORD_SECONDS} 秒，到时间会自动停止
              </small>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="library-upload-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="sound-grid">
          {soundLibrary.map((sound) => (
            <div key={sound.assetId} className="sound-card">
              <span className="sound-card-name">{sound.name}</span>
              <small>{sound.group}</small>
              <div className="sound-card-actions">
                <button
                  className="sound-preview"
                  aria-label={`试听${sound.name}`}
                  onClick={() => previewSound(sound.assetId, sound.path)}
                >
                  {previewId === sound.assetId ? "播放中…" : "试听"}
                </button>
                <button
                  className="sound-use"
                  onClick={() => {
                    stopPreview();
                    onSelect({
                      assetId: sound.assetId,
                      name: sound.name,
                      path: sound.path,
                    });
                    onClose();
                  }}
                >
                  使用
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
