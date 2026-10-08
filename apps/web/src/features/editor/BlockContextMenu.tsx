import { useEffect, useRef } from "react";

export interface BlockMenuTarget {
  /** Position inside the workspace shell, in pixels. */
  x: number;
  y: number;
  /** Null when the click landed on empty workspace space. */
  blockId: string | null;
  /** How many blocks the block menu acts on. */
  stackSize: number;
}

interface BlockContextMenuProps {
  target: BlockMenuTarget;
  onDuplicate: () => void;
  onDelete: () => void;
  onCleanUp: () => void;
  onClose: () => void;
}

export function BlockContextMenu({
  target,
  onDuplicate,
  onDelete,
  onCleanUp,
  onClose,
}: BlockContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      // Clicks inside the menu run its own actions, they must not close it.
      if (menuRef.current?.contains(event.target as Node)) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const { blockId, stackSize } = target;
  const isStack = stackSize > 1;

  return (
    <div
      ref={menuRef}
      className="block-context-menu"
      role="menu"
      aria-label={blockId ? "积木操作菜单" : "积木区菜单"}
      style={{ left: target.x, top: target.y }}
    >
      {blockId ? (
        <>
          <p className="block-context-menu-title">
            {isStack ? `这段积木（${stackSize} 块）` : "这块积木"}
          </p>
          <button type="button" role="menuitem" onClick={onDuplicate}>
            复制{isStack ? `这 ${stackSize} 块` : "这块"}
          </button>
          <button
            type="button"
            role="menuitem"
            className="block-context-menu-danger"
            onClick={onDelete}
          >
            删除{isStack ? `这 ${stackSize} 块` : "这块"}
          </button>
          <p className="block-context-menu-hint">
            删错了？点上面的「撤销」就能找回。
          </p>
        </>
      ) : (
        <>
          <p className="block-context-menu-title">积木区</p>
          <button type="button" role="menuitem" onClick={onCleanUp}>
            整理积木
          </button>
          <p className="block-context-menu-hint">把散落的积木排整齐。</p>
        </>
      )}
    </div>
  );
}
