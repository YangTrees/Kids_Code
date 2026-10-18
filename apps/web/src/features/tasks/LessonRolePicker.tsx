import { resolveAssetUrl } from "@kids-code/stage";
import { useEditorStore } from "../editor/editor-store";

/** Teaching still needs owner selection when management tools are folded away. */
export function LessonRolePicker() {
  const project = useEditorStore((state) => state.project);
  const selected = useEditorStore((state) => state.selectedSpriteId);
  const select = useEditorStore((state) => state.selectSprite);
  const visible = project.sprites.filter((sprite) =>
    project.scenes.some((scene) =>
      scene.instances.some((instance) => instance.spriteId === sprite.spriteId),
    ),
  );
  if (visible.length < 2) return null;
  return (
    <div className="lesson-role-picker" role="group" aria-label="选择编程角色">
      {visible.map((sprite) => {
        const asset = project.assets.find(
          (item) => item.assetId === sprite.costumeAssetId,
        );
        return (
          <button
            key={sprite.spriteId}
            type="button"
            aria-pressed={selected === sprite.spriteId}
            onClick={() => select(sprite.spriteId)}
          >
            {asset && <img src={resolveAssetUrl(asset.path)} alt="" />}
            <span>{sprite.name}</span>
          </button>
        );
      })}
    </div>
  );
}
