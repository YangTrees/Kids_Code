import {
  backgroundLibrary,
  spriteLibrary,
  type BackgroundLibraryAsset,
  type SpriteLibraryAsset,
} from "./asset-catalog";
import { useRef, useState } from "react";
import { DrawingCanvasDialog } from "./DrawingCanvasDialog";
import { useSettingsStore } from "../../shared/settings-store";
import { assetUrl } from "../../shared/base-url";

interface AssetLibraryDialogProps {
  kind: "sprite" | "background";
  title: string;
  onSelect: (asset: SpriteLibraryAsset | BackgroundLibraryAsset) => void;
  onUpload: (
    file: File,
  ) => Promise<SpriteLibraryAsset | BackgroundLibraryAsset>;
  onClose: () => void;
}

export function AssetLibraryDialog({
  kind,
  title,
  onSelect,
  onUpload,
  onClose,
}: AssetLibraryDialogProps) {
  const assets = kind === "sprite" ? spriteLibrary : backgroundLibrary;
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [drawingOpen, setDrawingOpen] = useState(false);
  const allowUploads = useSettingsStore((state) => state.allowUploads);

  const saveLocalImage = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      onSelect(await onUpload(file));
    } catch {
      setUploadError("导入失败，请选择不超过 10MB 的 PNG、JPG 或 WebP 图片。");
    } finally {
      setUploading(false);
    }
  };

  if (drawingOpen)
    return (
      <div className="manager-backdrop" role="presentation">
        <DrawingCanvasDialog
          kind={kind}
          onSave={async (file) => {
            await saveLocalImage(file);
            setDrawingOpen(false);
          }}
          onClose={() => setDrawingOpen(false)}
        />
      </div>
    );

  return (
    <div className="manager-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="manager-dialog asset-library-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <strong>{title}</strong>
            <small>点击喜欢的素材即可使用</small>
          </div>
          <button className="manager-close" aria-label="关闭" onClick={onClose}>
            ×
          </button>
        </header>
        {allowUploads ? (
          <div className="library-upload-row">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (!file) return;
                void saveLocalImage(file);
              }}
            />
            <button
              className="library-upload-button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading
                ? "正在导入…"
                : `＋ 上传${kind === "sprite" ? "角色" : "背景"}图片`}
            </button>
            <button
              className="library-draw-button"
              disabled={uploading}
              onClick={() => setDrawingOpen(true)}
            >
              ✎ 直接绘制
            </button>
            <small>支持 PNG、JPG、WebP，最大 10MB</small>
          </div>
        ) : (
          <p className="library-upload-error" role="status">
            家长已关闭图片上传，可以在家长区重新打开。
          </p>
        )}
        {uploadError ? (
          <p className="library-upload-error" role="alert">
            {uploadError}
          </p>
        ) : null}
        <div className="library-grid">
          {assets.map((asset) => (
            <button
              key={asset.assetId}
              className="library-card"
              onClick={() => onSelect(asset)}
            >
              <img src={assetUrl(asset.path)} alt="" />
              <span>{asset.name}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
