import { useState } from "react";
import {
  getGridDimensions,
  gridPositionToStage,
  stagePositionToGrid,
} from "@kids-code/domain";
import {
  countSpriteReferences,
  countWorkspaceBlocks,
  useEditorStore,
} from "./editor-store";

interface AssetManagerDialogProps {
  kind: "sprite" | "scene";
  entityId: string;
  onClose: () => void;
}

export function AssetManagerDialog({
  kind,
  entityId,
  onClose,
}: AssetManagerDialogProps) {
  const project = useEditorStore((state) => state.project);
  const renameSprite = useEditorStore((state) => state.renameSprite);
  const duplicateSprite = useEditorStore((state) => state.duplicateSprite);
  const deleteSprite = useEditorStore((state) => state.deleteSprite);
  const renameScene = useEditorStore((state) => state.renameScene);
  const deleteScene = useEditorStore((state) => state.deleteScene);
  const moveScene = useEditorStore((state) => state.moveScene);
  const updateSpriteProperties = useEditorStore(
    (state) => state.updateSpriteProperties,
  );
  const moveSpriteLayer = useEditorStore((state) => state.moveSpriteLayer);
  const entity =
    kind === "sprite"
      ? project.sprites.find((item) => item.spriteId === entityId)
      : project.scenes.find((item) => item.sceneId === entityId);
  const [name, setName] = useState(entity?.name ?? "");
  const spriteInstance =
    kind === "sprite"
      ? project.scenes
          .find((scene) => scene.sceneId === project.currentSceneId)
          ?.instances.find((instance) => instance.spriteId === entityId)
      : undefined;
  const initialCell = stagePositionToGrid(
    project,
    spriteInstance?.transform.x ?? 240,
    spriteInstance?.transform.y ?? 180,
  );
  const { columns, rows } = getGridDimensions(project);
  const [x, setX] = useState(initialCell.x);
  const [y, setY] = useState(initialCell.y);
  const [rotation, setRotation] = useState(
    spriteInstance?.transform.rotation ?? 0,
  );
  const [scalePercent, setScalePercent] = useState(
    Math.round((spriteInstance?.transform.scaleX ?? 1) * 100),
  );
  const [visible, setVisible] = useState(spriteInstance?.visible ?? true);

  if (!entity) return null;

  const entityLabel = kind === "sprite" ? "角色" : "场景";
  const canDelete =
    kind === "sprite" ? project.sprites.length > 1 : project.scenes.length > 1;
  const sceneIndex = project.scenes.findIndex(
    (scene) => scene.sceneId === entityId,
  );

  const saveName = () => {
    if (!name.trim()) return;
    if (kind === "sprite") renameSprite(entityId, name);
    else renameScene(entityId, name);
    if (kind === "sprite" && spriteInstance) {
      updateSpriteProperties(entityId, {
        ...gridPositionToStage(project, x, y),
        rotation,
        scale: scalePercent / 100,
        visible,
      });
    }
    onClose();
  };

  const remove = () => {
    if (!canDelete) return;
    if (kind === "sprite") {
      const referenceCount = countSpriteReferences(project, entityId);
      if (referenceCount > 0) {
        window.alert(
          `暂时不能删除“${entity.name}”：其他角色的 ${referenceCount} 个积木正在引用它。请先删除相关碰撞或判断积木。`,
        );
        return;
      }
      const blockCount =
        countWorkspaceBlocks(project.workspaceStates[entityId]) +
        project.scripts
          .filter((script) => script.ownerSpriteId === entityId)
          .reduce((total, script) => total + script.blocks.length, 0);
      if (
        !window.confirm(
          `删除角色“${entity.name}”？${blockCount > 0 ? `\n该角色包含 ${blockCount} 个积木，相关脚本会一起删除。` : ""}\n删除后可点击“撤销”恢复。`,
        )
      )
        return;
      deleteSprite(entityId);
    } else {
      if (!window.confirm(`删除场景“${entity.name}”？删除后可点击“撤销”恢复。`))
        return;
      deleteScene(entityId);
    }
    onClose();
  };

  return (
    <div className="manager-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="manager-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`管理${entityLabel}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <strong>管理{entityLabel}</strong>
          <button className="manager-close" aria-label="关闭" onClick={onClose}>
            ×
          </button>
        </header>
        <label>
          名称
          <input
            value={name}
            maxLength={20}
            autoFocus
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") saveName();
              if (event.key === "Escape") onClose();
            }}
          />
        </label>
        {kind === "sprite" && spriteInstance ? (
          <div className="sprite-property-grid">
            <label>
              X 列（0–{columns - 1}）
              <input
                type="number"
                min={0}
                max={columns - 1}
                step={1}
                value={x}
                onChange={(event) => setX(Number(event.target.value))}
              />
            </label>
            <label>
              Y 行（0–{rows - 1}）
              <input
                type="number"
                min={0}
                max={rows - 1}
                step={1}
                value={y}
                onChange={(event) => setY(Number(event.target.value))}
              />
            </label>
            <label>
              旋转角度
              <input
                type="number"
                min={-180}
                max={180}
                value={rotation}
                onChange={(event) => setRotation(Number(event.target.value))}
              />
            </label>
            <label>
              大小（%）
              <input
                type="number"
                min={1}
                max={300}
                value={scalePercent}
                onChange={(event) =>
                  setScalePercent(Number(event.target.value))
                }
              />
            </label>
            <label className="visibility-toggle">
              <input
                type="checkbox"
                checked={visible}
                onChange={(event) => setVisible(event.target.checked)}
              />
              在舞台上显示
            </label>
          </div>
        ) : null}
        <div className="manager-actions">
          <button
            className="manager-save"
            disabled={!name.trim()}
            onClick={saveName}
          >
            保存名称
          </button>
          {kind === "sprite" ? (
            <>
              <button
                onClick={() => {
                  duplicateSprite(entityId);
                  onClose();
                }}
              >
                复制角色
              </button>
              {spriteInstance ? (
                <>
                  <button onClick={() => moveSpriteLayer(entityId, "front")}>
                    移到最前
                  </button>
                  <button onClick={() => moveSpriteLayer(entityId, "back")}>
                    移到最后
                  </button>
                </>
              ) : null}
            </>
          ) : (
            <>
              <button
                disabled={sceneIndex <= 0}
                onClick={() => moveScene(entityId, "previous")}
              >
                向前移动
              </button>
              <button
                disabled={
                  sceneIndex < 0 || sceneIndex >= project.scenes.length - 1
                }
                onClick={() => moveScene(entityId, "next")}
              >
                向后移动
              </button>
            </>
          )}
          <button
            className="manager-delete"
            disabled={!canDelete}
            onClick={remove}
          >
            {canDelete ? `删除${entityLabel}` : `至少保留一个${entityLabel}`}
          </button>
        </div>
      </section>
    </div>
  );
}
