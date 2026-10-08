import {
  getSpritePresentationProfile,
  getSpriteBaseScale,
  getMovementStep,
  snapStagePositionToGrid,
  pathCellKey,
  pathCellPosition,
  type Project,
  type SpritePresentationProfile,
} from "@kids-code/domain";
import type { StagePort } from "@kids-code/runtime";
import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
  type Ticker,
  type FederatedPointerEvent,
} from "pixi.js";
import {
  collisionShapesTouch,
  sweepSolidMotion,
  rotatedBounds,
  type CircleBounds,
  type RectBounds,
} from "./geometry";

export * from "./geometry";

const localAssetUrls = new Map<string, string>();

/**
 * 站点资源根目录前缀，部署到子路径（如 /KidsCode/）时由应用启动时注入。
 * 始终以 "/" 结尾，默认 "/" 表示部署在域名根。
 */
let assetBaseUrl = "/";

export function setAssetBaseUrl(base: string): void {
  const trimmed = base.trim();
  assetBaseUrl = trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

export function getAssetBaseUrl(): string {
  return assetBaseUrl;
}

export function registerLocalAssetUrl(path: string, url: string): void {
  const previous = localAssetUrls.get(path);
  if (previous && previous !== url) URL.revokeObjectURL(previous);
  localAssetUrls.set(path, url);
}

export function unregisterLocalAssetUrl(path: string): void {
  const url = localAssetUrls.get(path);
  if (url) URL.revokeObjectURL(url);
  localAssetUrls.delete(path);
}

export const resolveAssetUrl = (path: string): string =>
  localAssetUrls.get(path) ?? `${assetBaseUrl}assets/${path}`;
const builtInSoundPaths = new Map([
  ["sfx_ui_click", "sounds/ui-click.wav"],
  ["sfx_collect_coin", "sounds/collect-coin.wav"],
  ["sfx_game_success", "sounds/game-success.wav"],
]);
const ASSET_RETRY_DELAYS = [0, 180, 600] as const;

const waitForRetry = (duration: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, duration));

async function loadTextureWithRetry(path: string): Promise<Texture> {
  let lastError: unknown;
  for (const delay of ASSET_RETRY_DELAYS) {
    if (delay > 0) await waitForRetry(delay);
    try {
      return await Assets.load<Texture>(resolveAssetUrl(path));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function createMissingTexture(): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#edf4fb";
    context.fillRect(0, 0, 256, 256);
    context.strokeStyle = "#7ba3cc";
    context.lineWidth = 12;
    context.strokeRect(8, 8, 240, 240);
    context.fillStyle = "#55799e";
    context.font = "bold 128px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("?", 128, 134);
  }
  return Texture.from(canvas);
}

export class StageController implements StagePort {
  readonly #application = new Application();
  readonly #world = new Container();
  readonly #sprites = new Map<string, Sprite>();
  readonly #costumes = new Map<string, string>();
  readonly #profiles = new Map<string, SpritePresentationProfile>();
  readonly #speechBubbles = new Map<string, Container>();
  readonly #initialTransforms = new Map<
    string,
    {
      x: number;
      y: number;
      rotation: number;
      scaleX: number;
      scaleY: number;
      visible: boolean;
      costumeAssetId: string;
    }
  >();
  readonly #soundPaths = new Map<string, string>();
  readonly #activeAudio = new Set<HTMLAudioElement>();
  readonly #effects = new Map<Graphics, (ticker: Ticker) => void>();
  readonly #lastPlayClickAt = new Map<string, number>();
  readonly #variableValues = new Map<
    string,
    { name: string; value: number; visible: boolean }
  >();
  #scoreText: Text | null = null;
  #gridVisible = true;
  #variablePanel: Graphics | null = null;
  #variableText: Text | null = null;
  #movementGrid: Container | null = null;
  #resultOverlay: Container | null = null;
  #alignmentGuides: Graphics | null = null;
  #spriteClickHandler: ((spriteId: string) => void) | null = null;
  #project: Project | null = null;
  #currentSceneId: string | null = null;
  #editingEnabled = true;
  #playInputEnabled = false;
  #muted = false;
  #volume = 1;
  #effectsEnabled = true;
  #lowFpsMs = 0;
  #onPerformanceWarning?: (code: string) => void;
  #onSpriteMoved:
    ((spriteId: string, x: number, y: number) => void) | undefined;
  #onSpriteSelected: ((spriteId: string) => void) | undefined;
  #initialized = false;
  #mounted = false;

  async mount(
    host: HTMLElement,
    project: Project,
    onSpriteMoved?: (spriteId: string, x: number, y: number) => void,
    onSpriteSelected?: (spriteId: string) => void,
    signal?: AbortSignal,
  ): Promise<boolean> {
    if (this.#mounted) return true;
    this.#project = project;
    this.#currentSceneId = project.currentSceneId;
    this.#onSpriteMoved = onSpriteMoved;
    this.#onSpriteSelected = onSpriteSelected;
    await this.#application.init({
      width: project.settings.stageWidth,
      height: project.settings.stageHeight,
      preference: "webgl",
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio, 2),
      backgroundColor: 0xf4f8ed,
    });
    this.#initialized = true;
    if (signal?.aborted) {
      this.destroy();
      return false;
    }
    this.#application.canvas.className = "pixi-stage-canvas";
    this.#world.sortableChildren = true;
    this.#application.stage.addChild(this.#world);
    this.#application.ticker.add(this.#watchFrameRate);
    await this.renderProject(project, onSpriteMoved, onSpriteSelected);
    if (signal?.aborted) {
      this.destroy();
      return false;
    }
    host.replaceChildren(this.#application.canvas);
    this.#mounted = true;
    return true;
  }

  async renderProject(
    project: Project,
    onSpriteMoved?: (spriteId: string, x: number, y: number) => void,
    onSpriteSelected?: (spriteId: string) => void,
  ): Promise<void> {
    this.#clearEffects();
    this.#world.removeChildren();
    this.#sprites.clear();
    this.#costumes.clear();
    this.#profiles.clear();
    this.#speechBubbles.clear();
    this.#scoreText = null;
    this.#variablePanel = null;
    this.#variableText = null;
    this.#variableValues.clear();
    this.#movementGrid = null;
    this.#resultOverlay = null;
    this.#alignmentGuides = null;
    this.#initialTransforms.clear();
    this.#soundPaths.clear();
    for (const [soundId, path] of builtInSoundPaths) {
      this.#soundPaths.set(soundId, path);
    }
    for (const asset of project.assets) {
      if (asset.type === "audio")
        this.#soundPaths.set(asset.assetId, asset.path);
    }
    const scene = project.scenes.find(
      (item) => item.sceneId === project.currentSceneId,
    );
    if (!scene) return;
    this.#currentSceneId = scene.sceneId;

    const backdrop = project.assets.find(
      (item) => item.assetId === scene.backdropAssetId,
    );
    if (backdrop) {
      try {
        const texture = await loadTextureWithRetry(backdrop.path);
        const sprite = new Sprite(texture);
        sprite.width = project.settings.stageWidth;
        sprite.height = project.settings.stageHeight;
        sprite.zIndex = 0;
        this.#world.addChild(sprite);
      } catch (error) {
        console.error("Backdrop failed to load after retries", error);
      }
    }

    this.#movementGrid = this.#createMovementGrid(
      project.settings.stageWidth,
      project.settings.stageHeight,
    );
    this.#world.addChild(this.#movementGrid);
    this.#movementGrid.visible = this.#gridVisible;
    if (project.pathMap) this.#world.addChild(this.#createPathMap(project));

    this.#alignmentGuides = new Graphics();
    this.#alignmentGuides.label = "sprite-alignment-guides";
    this.#alignmentGuides.zIndex = 9_999;
    this.#alignmentGuides.eventMode = "none";
    this.#world.addChild(this.#alignmentGuides);

    const ordered = [...scene.instances].sort((a, b) => a.zIndex - b.zIndex);
    for (const instance of ordered) {
      const definition = project.sprites.find(
        (item) => item.spriteId === instance.spriteId,
      );
      const asset = project.assets.find(
        (item) => item.assetId === definition?.costumeAssetId,
      );
      if (!definition || !asset) continue;
      let texture: Texture;
      try {
        texture = await loadTextureWithRetry(asset.path);
      } catch (error) {
        console.error("Sprite failed to load after retries", error);
        texture = createMissingTexture();
      }
      const sprite = new Sprite(texture);
      const profile = getSpritePresentationProfile(asset.assetId);
      sprite.label = instance.spriteId;
      sprite.anchor.set(
        profile.anchorX,
        project.settings.coordinateVersion === 2 ? 0.5 : profile.anchorY,
      );
      sprite.position.set(instance.transform.x, instance.transform.y);
      sprite.rotation = (instance.transform.rotation * Math.PI) / 180;
      sprite.scale.set(
        getSpriteBaseScale(asset.assetId, texture.height) *
          instance.transform.scaleX,
        getSpriteBaseScale(asset.assetId, texture.height) *
          instance.transform.scaleY,
      );
      sprite.visible = instance.visible;
      sprite.zIndex = instance.zIndex;
      if (onSpriteMoved) {
        sprite.eventMode = "static";
        sprite.cursor = "grab";
        let dragging = false;
        let offset = { x: 0, y: 0 };
        const move = (event: FederatedPointerEvent) => {
          if (!dragging || !this.#editingEnabled) return;
          const position = event.getLocalPosition(this.#world);
          const aligned = this.#alignSpritePosition(
            instance.spriteId,
            position.x - offset.x,
            position.y - offset.y,
            project.settings.stageWidth,
            project.settings.stageHeight,
          );
          const { x, y } = this.#constrainToStage(sprite, aligned.x, aligned.y);
          sprite.position.set(x, y);
          onSpriteMoved(instance.spriteId, x, y);
        };
        sprite.on("pointerdown", (event: FederatedPointerEvent) => {
          if (!this.#editingEnabled) return;
          if (project.pathMap?.actorSpriteId === instance.spriteId) return;
          const position = event.getLocalPosition(this.#world);
          offset = { x: position.x - sprite.x, y: position.y - sprite.y };
          dragging = true;
          sprite.cursor = "grabbing";
        });
        sprite.on("globalpointermove", move);
        const end = () => {
          dragging = false;
          sprite.cursor = "grab";
          this.#alignmentGuides?.clear();
        };
        sprite.on("pointerup", end);
        sprite.on("pointerupoutside", end);
        sprite.on("pointertap", () => {
          if (this.#playInputEnabled) {
            const now = performance.now();
            const lastAt = this.#lastPlayClickAt.get(instance.spriteId) ?? 0;
            if (now - lastAt < 300) return;
            this.#lastPlayClickAt.set(instance.spriteId, now);
            this.#spriteClickHandler?.(instance.spriteId);
          } else if (this.#editingEnabled) {
            onSpriteSelected?.(instance.spriteId);
          }
        });
      }
      this.#world.addChild(sprite);
      this.#sprites.set(instance.spriteId, sprite);
      this.#costumes.set(instance.spriteId, asset.assetId);
      this.#profiles.set(instance.spriteId, profile);
      this.#initialTransforms.set(instance.spriteId, {
        x: instance.transform.x,
        y: instance.transform.y,
        rotation: instance.transform.rotation,
        scaleX: instance.transform.scaleX,
        scaleY: instance.transform.scaleY,
        visible: instance.visible,
        costumeAssetId: definition.costumeAssetId,
      });
    }

    const scorePanel = new Graphics()
      .roundRect(project.settings.stageWidth - 116, 12, 102, 40, 16)
      .fill({ color: 0xffffff, alpha: 0.9 })
      .stroke({ color: 0x69bb45, width: 2 });
    scorePanel.zIndex = 10_000;
    this.#scoreText = new Text({
      text: "得分 0",
      style: { fill: 0x39752c, fontSize: 17, fontWeight: "800" },
    });
    this.#scoreText.anchor.set(0.5);
    this.#scoreText.position.set(project.settings.stageWidth - 65, 32);
    this.#scoreText.zIndex = 10_001;
    this.#world.addChild(scorePanel, this.#scoreText);

    this.#variablePanel = new Graphics()
      .roundRect(12, 42, 142, 126, 14)
      .fill({ color: 0xffffff, alpha: 0.9 })
      .stroke({ color: 0xf58a25, width: 2 });
    this.#variablePanel.zIndex = 10_000;
    this.#variablePanel.visible = false;
    this.#variableText = new Text({
      text: "",
      style: {
        fill: 0x7a461d,
        fontSize: 14,
        fontWeight: "700",
        lineHeight: 19,
      },
    });
    this.#variableText.position.set(24, 53);
    this.#variableText.zIndex = 10_001;
    this.#variableText.visible = false;
    this.#world.addChild(this.#variablePanel, this.#variableText);
  }

  setSpritePosition(spriteId: string, x: number, y: number): void {
    const sprite = this.#sprites.get(spriteId);
    if (!sprite) return;
    sprite.position.set(x, y);
    const bubble = this.#speechBubbles.get(spriteId);
    if (bubble) this.#positionBubble(sprite, bubble);
  }

  getSpritePosition(spriteId: string): { x: number; y: number } | null {
    const sprite = this.#sprites.get(spriteId);
    return sprite ? { x: sprite.x, y: sprite.y } : null;
  }

  getCurrentSceneId(): string | null {
    return this.#currentSceneId;
  }

  #createMovementGrid(stageWidth: number, stageHeight: number): Container {
    const MOVEMENT_STEP_SIZE = this.#project
      ? getMovementStep(this.#project)
      : 40;
    const MAJOR_GRID_INTERVAL = MOVEMENT_STEP_SIZE === 10 ? 5 : 3;
    const grid = new Container();
    grid.label = "movement-step-grid";
    grid.zIndex = 0.5;
    grid.eventMode = "none";

    const checkerboard = new Graphics();
    const columns = Math.ceil(stageWidth / MOVEMENT_STEP_SIZE);
    const rows = Math.ceil(stageHeight / MOVEMENT_STEP_SIZE);
    const largeCells = MOVEMENT_STEP_SIZE === 40;
    if (largeCells)
      checkerboard
        .rect(0, 0, stageWidth, stageHeight)
        .fill({ color: 0x173a50, alpha: 0.06 });
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const oddCell = (row + column) % 2 !== 0;
        if (largeCells) {
          checkerboard
            .roundRect(
              column * MOVEMENT_STEP_SIZE + 2,
              row * MOVEMENT_STEP_SIZE + 2,
              MOVEMENT_STEP_SIZE - 4,
              MOVEMENT_STEP_SIZE - 4,
              6,
            )
            .fill({
              color: oddCell ? 0x173e55 : 0xffffff,
              alpha: oddCell ? 0.1 : 0.04,
            })
            .stroke({ color: 0xffffff, width: 1, alpha: 0.3 });
        } else if (oddCell) {
          checkerboard
            .rect(
              column * MOVEMENT_STEP_SIZE,
              row * MOVEMENT_STEP_SIZE,
              MOVEMENT_STEP_SIZE,
              MOVEMENT_STEP_SIZE,
            )
            .fill({ color: 0x244b72, alpha: 0.065 });
        }
      }
    }

    const minorLines = new Graphics();
    for (let x = MOVEMENT_STEP_SIZE; x < stageWidth; x += MOVEMENT_STEP_SIZE) {
      if (x % (MOVEMENT_STEP_SIZE * MAJOR_GRID_INTERVAL) === 0) continue;
      minorLines.moveTo(x, 0).lineTo(x, stageHeight);
    }
    for (let y = MOVEMENT_STEP_SIZE; y < stageHeight; y += MOVEMENT_STEP_SIZE) {
      if (y % (MOVEMENT_STEP_SIZE * MAJOR_GRID_INTERVAL) === 0) continue;
      minorLines.moveTo(0, y).lineTo(stageWidth, y);
    }
    if (!largeCells)
      minorLines.stroke({ color: 0xffffff, width: 0.5, alpha: 0.2 });

    const majorLines = new Graphics();
    for (
      let x = MOVEMENT_STEP_SIZE * MAJOR_GRID_INTERVAL;
      x < stageWidth;
      x += MOVEMENT_STEP_SIZE * MAJOR_GRID_INTERVAL
    ) {
      majorLines.moveTo(x, 0).lineTo(x, stageHeight);
    }
    for (
      let y = MOVEMENT_STEP_SIZE * MAJOR_GRID_INTERVAL;
      y < stageHeight;
      y += MOVEMENT_STEP_SIZE * MAJOR_GRID_INTERVAL
    ) {
      majorLines.moveTo(0, y).lineTo(stageWidth, y);
    }
    majorLines.stroke({
      color: 0xffffff,
      width: 1,
      alpha: largeCells ? 0.36 : 0.34,
    });

    grid.addChild(checkerboard, minorLines, majorLines);
    return grid;
  }

  #createPathMap(project: Project): Container {
    const map = project.pathMap!;
    const layer = new Container();
    layer.label = "fixed-path-map";
    layer.zIndex = 0.7;
    layer.eventMode = "none";
    const shade = new Graphics()
      .rect(0, 0, project.settings.stageWidth, project.settings.stageHeight)
      .fill({
        color: map.theme === "sky" ? 0x39749b : 0x183d3a,
        alpha: map.theme === "sky" ? 0.25 : 0.58,
      });
    layer.addChild(shade);
    const emptyCells = new Graphics();
    for (let row = 1; row < 8; row += 1) {
      for (let column = 1; column < 11; column += 1) {
        const { x, y } = pathCellPosition({ column, row });
        emptyCells
          .roundRect(x - 18, y - 18, 36, 36, 8)
          .fill({ color: 0x0e3433, alpha: 0.12 })
          .stroke({ color: 0xe8fff2, width: 1, alpha: 0.12 });
      }
    }
    layer.addChild(emptyCells);
    const tiles = new Graphics();
    for (const cell of map.tiles) {
      const { x, y } = pathCellPosition(cell);
      const key = pathCellKey(cell);
      const isStart = key === pathCellKey(map.start);
      const isGoal = key === pathCellKey(map.goal);
      const isCheckpoint = map.checkpoints?.some(
        (checkpoint) => pathCellKey(checkpoint) === key,
      );
      const isCollectible = map.collectibles?.some(
        (collectible) => pathCellKey(collectible) === key,
      );
      const color = isStart
        ? 0x9ce8c3
        : isGoal
          ? 0xffcf80
          : isCheckpoint
            ? 0xd7c5fa
            : isCollectible
              ? 0xffeca8
              : 0xfff3d9;
      tiles
        .roundRect(x - 18, y - 18, 36, 36, 8)
        .fill({ color, alpha: 0.96 })
        .stroke({ color: 0xffffff, width: 2, alpha: 0.9 });
    }
    layer.addChild(tiles);
    for (const [index, cell] of (map.checkpoints ?? []).entries()) {
      const { x, y } = pathCellPosition(cell);
      const marker = new Text({
        text: String(index + 1),
        style: { fill: 0x5b378b, fontSize: 17, fontWeight: "900" },
      });
      marker.anchor.set(0.5);
      marker.position.set(x, y);
      layer.addChild(marker);
    }
    for (const cell of map.collectibles ?? []) {
      const { x, y } = pathCellPosition(cell);
      const marker = new Text({
        text: "◆",
        style: { fill: 0x9a6715, fontSize: 19, fontWeight: "900" },
      });
      marker.anchor.set(0.5);
      marker.position.set(x, y);
      layer.addChild(marker);
    }
    for (const [label, cell] of [
      ["起点", map.start],
      ["终点", map.goal],
    ] as const) {
      const { x, y } = pathCellPosition(cell);
      const text = new Text({
        text: label,
        style: {
          fill: 0x174a46,
          fontSize: 11,
          fontWeight: "900",
        },
      });
      text.anchor.set(0.5);
      text.position.set(x, y + 10);
      layer.addChild(text);
    }
    return layer;
  }

  setSpriteRotation(spriteId: string, degrees: number): void {
    const sprite = this.#sprites.get(spriteId);
    if (sprite) sprite.rotation = (degrees * Math.PI) / 180;
  }

  setSpriteScale(spriteId: string, scale: number): void {
    const sprite = this.#sprites.get(spriteId);
    const profile = this.#profiles.get(spriteId);
    if (sprite && profile) {
      sprite.scale.set(
        getSpriteBaseScale(
          this.#costumes.get(spriteId) ?? "",
          sprite.texture.height,
        ) * scale,
      );
    }
  }

  async setSpriteCostume(
    spriteId: string,
    costumeAssetId: string,
  ): Promise<void> {
    const sprite = this.#sprites.get(spriteId);
    const asset = this.#project?.assets.find(
      (item) => item.assetId === costumeAssetId && item.type === "sprite",
    );
    if (!sprite || !asset) return;
    if (this.#costumes.get(spriteId) === costumeAssetId) return;
    const logicalScale =
      sprite.scale.x /
      getSpriteBaseScale(
        this.#costumes.get(spriteId) ?? "",
        sprite.texture.height,
      );
    let texture: Texture;
    try {
      texture = await loadTextureWithRetry(asset.path);
    } catch (error) {
      console.error("Costume failed to load after retries", error);
      texture = createMissingTexture();
    }
    if (this.#sprites.get(spriteId) !== sprite || sprite.destroyed) return;
    sprite.texture = texture;
    this.#costumes.set(spriteId, costumeAssetId);
    const profile = getSpritePresentationProfile(costumeAssetId);
    this.#profiles.set(spriteId, profile);
    sprite.anchor.set(profile.anchorX, profile.anchorY);
    sprite.scale.set(
      getSpriteBaseScale(costumeAssetId, sprite.texture.height) * logicalScale,
    );
  }

  resolveSpritePosition(
    spriteId: string,
    requestedX: number,
    requestedY: number,
  ): { x: number; y: number } {
    const sprite = this.#sprites.get(spriteId);
    if (!sprite) return { x: requestedX, y: requestedY };
    const originalX = sprite.x;
    const originalY = sprite.y;
    const requested = this.#constrainToStage(sprite, requestedX, requestedY);
    const obstacles: RectBounds[] = [];
    for (const [targetId, target] of this.#sprites) {
      if (targetId === spriteId || !target.visible) continue;
      const profile = this.#profiles.get(targetId);
      if (!profile?.solid) continue;
      const obstacle = this.#rectBounds(targetId);
      if (obstacle) obstacles.push(obstacle);
    }
    const moving = this.#rectBounds(spriteId);
    const delta = moving
      ? sweepSolidMotion(
          moving,
          obstacles,
          requested.x - originalX,
          requested.y - originalY,
        )
      : { x: requested.x - originalX, y: requested.y - originalY };
    const next = { x: originalX + delta.x, y: originalY + delta.y };
    sprite.position.set(next.x, next.y);
    return next;
  }

  setSpriteVisible(spriteId: string, visible: boolean): void {
    const sprite = this.#sprites.get(spriteId);
    if (sprite) sprite.visible = visible;
  }

  setSpriteZIndex(spriteId: string, zIndex: number): void {
    const sprite = this.#sprites.get(spriteId);
    if (sprite) sprite.zIndex = zIndex;
  }

  playSound(soundId: string): void {
    if (this.#muted) return;
    const path = this.#soundPaths.get(soundId);
    if (!path) return;
    const audio = new Audio(resolveAssetUrl(path));
    audio.volume = this.#volume;
    this.#activeAudio.add(audio);
    const release = () => this.#activeAudio.delete(audio);
    audio.addEventListener("ended", release, { once: true });
    audio.addEventListener("error", release, { once: true });
    void audio.play().catch(release);
  }

  pauseAllSounds(): void {
    for (const audio of this.#activeAudio) audio.pause();
  }

  resumeAllSounds(): void {
    if (this.#muted) return;
    for (const audio of this.#activeAudio) void audio.play().catch(() => null);
  }

  setMuted(muted: boolean): void {
    this.#muted = muted;
    for (const audio of this.#activeAudio) audio.muted = muted;
  }

  setVolume(volume: number): void {
    this.#volume = Math.min(1, Math.max(0, volume));
    for (const audio of this.#activeAudio) audio.volume = this.#volume;
  }

  /** 注册性能事件回调（9.4：帧率过低时上报，不采集作品内容）。 */
  setPerformanceWarningHandler(handler: (code: string) => void): void {
    this.#onPerformanceWarning = handler;
  }

  setEffectsEnabled(enabled: boolean): void {
    this.#effectsEnabled = enabled;
    if (!enabled) this.#clearEffects();
  }

  stopAllSounds(): void {
    for (const audio of this.#activeAudio) {
      audio.pause();
      audio.currentTime = 0;
    }
    this.#activeAudio.clear();
  }

  setScore(score: number): void {
    if (this.#scoreText) this.#scoreText.text = `得分 ${score}`;
  }

  setVariable(
    variableId: string,
    name: string,
    value: number,
    visible: boolean,
  ): void {
    this.#variableValues.set(variableId, { name, value, visible });
    const lines = [...this.#variableValues.values()]
      .filter((variable) => variable.visible)
      .slice(0, 6)
      .map((variable) => `${variable.name}  ${variable.value}`);
    if (this.#variableText) {
      this.#variableText.text = lines.join("\n");
      this.#variableText.visible = lines.length > 0;
    }
    if (this.#variablePanel) this.#variablePanel.visible = lines.length > 0;
  }

  setGridVisible(visible: boolean): void {
    this.#gridVisible = visible;
    if (this.#movementGrid) this.#movementGrid.visible = visible;
  }

  async captureThumbnail(): Promise<Blob | null> {
    if (!this.#initialized) return null;
    const canvas = this.#application.renderer.extract.canvas({
      target: this.#world,
      resolution: 0.5,
      antialias: true,
      clearColor: "#f4f8ed",
    });
    if ("convertToBlob" in canvas)
      return canvas.convertToBlob({ type: "image/png" });
    return new Promise((resolve) => {
      (canvas as HTMLCanvasElement).toBlob(resolve, "image/png");
    });
  }

  playCollisionEffect(spriteId: string, targetSpriteId: string): void {
    if (!this.#effectsEnabled) return;
    const sprite = this.#sprites.get(spriteId);
    const target = this.#sprites.get(targetSpriteId);
    if (!sprite || !target) return;
    this.#playRingEffect(
      (sprite.x + target.x) / 2,
      (sprite.y + target.y) / 2,
      0xffc928,
    );
  }

  playCollectEffect(spriteId: string): void {
    if (!this.#effectsEnabled) return;
    const sprite = this.#sprites.get(spriteId);
    if (!sprite) return;
    this.#playRingEffect(sprite.x, sprite.y, 0x75d84a);
  }

  showResult(result: "success" | "failure", message: string): void {
    this.clearResult();
    if (!this.#project) return;
    const { stageWidth, stageHeight } = this.#project.settings;
    const overlay = new Container();
    overlay.zIndex = 20_000;
    const shade = new Graphics()
      .rect(0, 0, stageWidth, stageHeight)
      .fill({ color: 0x17304c, alpha: 0.72 });
    const panel = new Graphics()
      .roundRect(stageWidth / 2 - 160, stageHeight / 2 - 88, 320, 176, 28)
      .fill({ color: result === "success" ? 0xf5ffe9 : 0xfff1ed })
      .stroke({ color: result === "success" ? 0x62bd3f : 0xe65b4f, width: 5 });
    const title = new Text({
      text: result === "success" ? "🏆 挑战成功" : "💪 再试一次",
      style: {
        fill: result === "success" ? 0x39752c : 0xa73b32,
        fontSize: 30,
        fontWeight: "900",
      },
    });
    title.anchor.set(0.5);
    title.position.set(stageWidth / 2, stageHeight / 2 - 34);
    const detail = new Text({
      text: message,
      style: {
        fill: 0x38547a,
        fontSize: 18,
        fontWeight: "700",
        align: "center",
        wordWrap: true,
        wordWrapWidth: 260,
      },
    });
    detail.anchor.set(0.5);
    detail.position.set(stageWidth / 2, stageHeight / 2 + 28);
    overlay.addChild(shade, panel, title, detail);
    this.#world.addChild(overlay);
    this.#resultOverlay = overlay;
  }

  clearResult(): void {
    if (!this.#resultOverlay) return;
    this.#resultOverlay.destroy({ children: true });
    this.#resultOverlay = null;
  }

  isTouching(spriteId: string, targetSpriteId: string): boolean {
    if (spriteId === targetSpriteId) return false;
    const sprite = this.#sprites.get(spriteId);
    const target = this.#sprites.get(targetSpriteId);
    if (!sprite || !target || !sprite.visible || !target.visible) return false;
    const a = this.#collisionShape(spriteId);
    const b = this.#collisionShape(targetSpriteId);
    if (!a || !b) return false;
    return collisionShapesTouch(a, b);
  }

  setSpriteClickHandler(handler: ((spriteId: string) => void) | null): void {
    this.#spriteClickHandler = handler;
  }

  setInteractionEnabled(enabled: boolean): void {
    this.setEditingEnabled(enabled);
  }

  setEditingEnabled(enabled: boolean): void {
    this.#editingEnabled = enabled;
    for (const sprite of this.#sprites.values()) {
      sprite.cursor = enabled ? "grab" : "default";
    }
  }

  setPlayInputEnabled(enabled: boolean): void {
    this.#playInputEnabled = enabled;
    if (!enabled) this.#lastPlayClickAt.clear();
  }

  async switchScene(sceneId: string): Promise<void> {
    if (!this.#project) return;
    const sceneExists = this.#project.scenes.some(
      (scene) => scene.sceneId === sceneId,
    );
    if (!sceneExists) return;
    await this.renderProject(
      { ...this.#project, currentSceneId: sceneId },
      this.#onSpriteMoved,
      this.#onSpriteSelected,
    );
  }

  showSpeech(spriteId: string, message: string): void {
    const sprite = this.#sprites.get(spriteId);
    if (!sprite) return;
    this.clearSpeech(spriteId);

    const bubble = new Container();
    const text = new Text({
      text: message,
      style: {
        fill: 0x2f4669,
        fontSize: 15,
        fontWeight: "700",
        wordWrap: true,
        wordWrapWidth: 160,
      },
    });
    const padding = 12;
    const background = new Graphics()
      .roundRect(0, 0, text.width + padding * 2, text.height + padding * 2, 16)
      .fill({ color: 0xffffff, alpha: 0.96 })
      .stroke({ color: 0xd8e4f0, width: 2 });
    text.position.set(padding, padding);
    bubble.addChild(background, text);
    this.#positionBubble(sprite, bubble);
    this.#world.addChild(bubble);
    this.#speechBubbles.set(spriteId, bubble);
  }

  clearSpeech(spriteId: string): void {
    const bubble = this.#speechBubbles.get(spriteId);
    if (!bubble) return;
    bubble.destroy({ children: true });
    this.#speechBubbles.delete(spriteId);
  }

  updateEditorSnapshot(project: Project): void {
    this.#project = project;
    const scene = project.scenes.find(
      (item) => item.sceneId === project.currentSceneId,
    );
    for (const instance of scene?.instances ?? []) {
      const initial = this.#initialTransforms.get(instance.spriteId);
      if (initial)
        Object.assign(initial, instance.transform, {
          visible: instance.visible,
        });
    }
  }

  reset(): void {
    this.clearResult();
    this.#clearEffects();
    if (
      this.#project &&
      this.#currentSceneId !== this.#project.currentSceneId
    ) {
      void this.switchScene(this.#project.currentSceneId);
      return;
    }
    for (const spriteId of this.#speechBubbles.keys())
      this.clearSpeech(spriteId);
    for (const [spriteId, transform] of this.#initialTransforms) {
      const sprite = this.#sprites.get(spriteId);
      if (!sprite) continue;
      sprite.position.set(transform.x, transform.y);
      sprite.rotation = (transform.rotation * Math.PI) / 180;
      const baseScale = getSpriteBaseScale(
        this.#costumes.get(spriteId) ?? "",
        sprite.texture.height,
      );
      sprite.scale.set(
        baseScale * transform.scaleX,
        baseScale * transform.scaleY,
      );
      sprite.visible = transform.visible;
      void this.setSpriteCostume(spriteId, transform.costumeAssetId).then(() =>
        this.setSpriteScale(spriteId, transform.scaleX),
      );
    }
    this.setScore(0);
    this.#variableValues.clear();
    if (this.#variableText) {
      this.#variableText.text = "";
      this.#variableText.visible = false;
    }
    if (this.#variablePanel) this.#variablePanel.visible = false;
  }

  #positionBubble(sprite: Sprite, bubble: Container): void {
    bubble.position.set(
      Math.min(470 - bubble.width, Math.max(8, sprite.x + 18)),
      Math.max(8, sprite.y - sprite.height * 0.85 - bubble.height),
    );
  }

  #alignSpritePosition(
    spriteId: string,
    requestedX: number,
    requestedY: number,
    stageWidth: number,
    stageHeight: number,
  ): { x: number; y: number } {
    if (this.#project?.settings.coordinateVersion === 2) {
      const snapped = snapStagePositionToGrid(
        this.#project,
        requestedX,
        requestedY,
      );
      const guides = this.#alignmentGuides;
      guides
        ?.clear()
        .moveTo(snapped.x, 0)
        .lineTo(snapped.x, stageHeight)
        .moveTo(0, snapped.y)
        .lineTo(stageWidth, snapped.y)
        .stroke({ color: 0x2f8cff, width: 1.5, alpha: 0.75 });
      return snapped;
    }
    const tolerance = 5;
    const step = this.#project ? getMovementStep(this.#project) : 40;
    const xCandidates = [Math.round(requestedX / step) * step, stageWidth / 2];
    const yCandidates = [Math.round(requestedY / step) * step, stageHeight / 2];
    for (const [otherId, other] of this.#sprites) {
      if (otherId === spriteId || !other.visible) continue;
      xCandidates.push(other.x);
      yCandidates.push(other.y);
    }
    const alignedX = xCandidates.find(
      (candidate) => Math.abs(candidate - requestedX) <= tolerance,
    );
    const alignedY = yCandidates.find(
      (candidate) => Math.abs(candidate - requestedY) <= tolerance,
    );
    const guides = this.#alignmentGuides;
    guides?.clear();
    if (guides && alignedX !== undefined)
      guides
        .moveTo(alignedX, 0)
        .lineTo(alignedX, stageHeight)
        .stroke({ color: 0x2f8cff, width: 1.5, alpha: 0.8 });
    if (guides && alignedY !== undefined)
      guides
        .moveTo(0, alignedY)
        .lineTo(stageWidth, alignedY)
        .stroke({ color: 0x2f8cff, width: 1.5, alpha: 0.8 });
    return {
      x: alignedX ?? requestedX,
      y: alignedY ?? requestedY,
    };
  }

  #constrainToStage(
    sprite: Sprite,
    requestedX: number,
    requestedY: number,
  ): { x: number; y: number } {
    if (!this.#project) return { x: requestedX, y: requestedY };
    if (this.#project.settings.coordinateVersion === 2) {
      const halfStep = getMovementStep(this.#project) / 2;
      return {
        x: Math.max(
          halfStep,
          Math.min(this.#project.settings.stageWidth - halfStep, requestedX),
        ),
        y: Math.max(
          halfStep,
          Math.min(this.#project.settings.stageHeight - halfStep, requestedY),
        ),
      };
    }
    const width = Math.abs(sprite.texture.width * sprite.scale.x);
    const height = Math.abs(sprite.texture.height * sprite.scale.y);
    const bounds = rotatedBounds(
      {
        kind: "rect",
        minX: -sprite.anchor.x * width,
        maxX: (1 - sprite.anchor.x) * width,
        minY: -sprite.anchor.y * height,
        maxY: (1 - sprite.anchor.y) * height,
      },
      0,
      0,
      sprite.rotation,
    );
    const minX = -bounds.minX;
    const maxX = this.#project.settings.stageWidth - bounds.maxX;
    const minY = -bounds.minY;
    const maxY = this.#project.settings.stageHeight - bounds.maxY;
    return {
      x:
        minX > maxX
          ? this.#project.settings.stageWidth / 2
          : Math.max(minX, Math.min(maxX, requestedX)),
      y:
        minY > maxY
          ? this.#project.settings.stageHeight / 2
          : Math.max(minY, Math.min(maxY, requestedY)),
    };
  }

  #rectBounds(spriteId: string): RectBounds | null {
    const shape = this.#collisionShape(spriteId);
    if (!shape) return null;
    if (shape.kind === "rect") return shape;
    return {
      kind: "rect",
      minX: shape.x - shape.radius,
      minY: shape.y - shape.radius,
      maxX: shape.x + shape.radius,
      maxY: shape.y + shape.radius,
    };
  }

  #collisionShape(spriteId: string): RectBounds | CircleBounds | null {
    const sprite = this.#sprites.get(spriteId);
    const profile = this.#profiles.get(spriteId);
    if (!sprite || !profile) return null;
    const width = Math.abs(sprite.texture.width * sprite.scale.x);
    const height = Math.abs(sprite.texture.height * sprite.scale.y);
    const left = sprite.x - sprite.anchor.x * width;
    const top = sprite.y - sprite.anchor.y * height;
    if (profile.collision.shape === "circle") {
      const center = rotatedBounds(
        {
          kind: "rect",
          minX: left + width / 2,
          maxX: left + width / 2,
          minY: top + height / 2,
          maxY: top + height / 2,
        },
        sprite.x,
        sprite.y,
        sprite.rotation,
      );
      return {
        kind: "circle",
        x: center.minX,
        y: center.minY,
        radius: (Math.min(width, height) * profile.collision.diameterRatio) / 2,
      };
    }
    return rotatedBounds(
      {
        kind: "rect",
        minX: left + width * profile.collision.insetLeft,
        maxX: left + width * (1 - profile.collision.insetRight),
        minY: top + height * profile.collision.insetTop,
        maxY: top + height * (1 - profile.collision.insetBottom),
      },
      sprite.x,
      sprite.y,
      sprite.rotation,
    );
  }

  #playRingEffect(x: number, y: number, color: number): void {
    const ring = new Graphics().circle(0, 0, 22).stroke({
      color,
      width: 6,
      alpha: 0.95,
    });
    ring.position.set(x, y);
    ring.zIndex = 15_000;
    this.#world.addChild(ring);
    let elapsed = 0;
    const animate = (ticker: Ticker) => {
      elapsed += ticker.deltaMS;
      const progress = Math.min(1, elapsed / 360);
      ring.scale.set(1 + progress * 1.4);
      ring.alpha = 1 - progress;
      if (progress < 1) return;
      this.#application.ticker.remove(animate);
      this.#effects.delete(ring);
      ring.destroy();
    };
    this.#effects.set(ring, animate);
    this.#application.ticker.add(animate);
  }

  /** 9.4：连续 3 秒低于 20FPS 时关闭装饰特效并上报一次性能事件。 */
  readonly #watchFrameRate = (ticker: Ticker): void => {
    const fps = ticker.FPS;
    if (!Number.isFinite(fps) || fps <= 0 || fps >= 20) {
      this.#lowFpsMs = 0;
      return;
    }
    this.#lowFpsMs += ticker.deltaMS;
    if (this.#lowFpsMs < 3_000) return;
    this.#lowFpsMs = 0;
    if (!this.#effectsEnabled) return;
    this.#effectsEnabled = false;
    this.#clearEffects();
    this.#onPerformanceWarning?.("LOW_FRAME_RATE");
  };

  #clearEffects(): void {
    for (const [effect, animate] of this.#effects) {
      this.#application.ticker.remove(animate);
      effect.destroy();
    }
    this.#effects.clear();
  }

  destroy(): void {
    if (!this.#initialized) return;
    this.stopAllSounds();
    this.#clearEffects();
    this.#application.ticker.remove(this.#watchFrameRate);
    this.#application.destroy({ removeView: true }, { children: true });
    this.#sprites.clear();
    this.#profiles.clear();
    this.#speechBubbles.clear();
    this.#scoreText = null;
    this.#variablePanel = null;
    this.#variableText = null;
    this.#variableValues.clear();
    this.#resultOverlay = null;
    this.#initialTransforms.clear();
    this.#soundPaths.clear();
    this.#spriteClickHandler = null;
    this.#lastPlayClickAt.clear();
    this.#project = null;
    this.#currentSceneId = null;
    this.#initialized = false;
    this.#onSpriteMoved = undefined;
    this.#onSpriteSelected = undefined;
    this.#mounted = false;
  }
}
