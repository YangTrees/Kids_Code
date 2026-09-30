import type {
  Project,
  RuntimeBlock,
  RuntimeCondition,
  RuntimeNumberExpression,
  RuntimeScript,
} from "@kids-code/domain";
import {
  getMovementStep,
  gridPositionToStage,
  pathCellAtPosition,
  pathCellKey,
  pathCellPosition,
} from "@kids-code/domain";

export type RuntimeStatus =
  | "IDLE"
  | "STARTING"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "STOPPED"
  | "ERROR";

export interface StagePort {
  setSpritePosition(spriteId: string, x: number, y: number): void;
  getSpritePosition?(spriteId: string): { x: number; y: number } | null;
  getCurrentSceneId?(): string | null;
  setSpriteRotation(spriteId: string, degrees: number): void;
  setSpriteScale(spriteId: string, scale: number): void;
  setSpriteCostume?(spriteId: string, costumeAssetId: string): Promise<void>;
  resolveSpritePosition?(
    spriteId: string,
    x: number,
    y: number,
  ): { x: number; y: number };
  setSpriteVisible(spriteId: string, visible: boolean): void;
  setSpriteZIndex(spriteId: string, zIndex: number): void;
  showSpeech(spriteId: string, text: string): void;
  clearSpeech(spriteId: string): void;
  playSound(soundId: string): void;
  pauseAllSounds?(): void;
  resumeAllSounds?(): void;
  setMuted?(muted: boolean): void;
  setVolume?(volume: number): void;
  stopAllSounds(): void;
  showResult?(result: "success" | "failure", message: string): void;
  clearResult?(): void;
  setScore(score: number): void;
  setVariable?(
    variableId: string,
    name: string,
    value: number,
    visible: boolean,
  ): void;
  setGridVisible?(visible: boolean): void;
  captureThumbnail?(): Promise<Blob | null>;
  isTouching(spriteId: string, targetSpriteId: string): boolean;
  playCollisionEffect?(spriteId: string, targetSpriteId: string): void;
  playCollectEffect?(spriteId: string): void;
  setSpriteClickHandler(handler: ((spriteId: string) => void) | null): void;
  setInteractionEnabled?(enabled: boolean): void;
  setEditingEnabled?(enabled: boolean): void;
  setPlayInputEnabled?(enabled: boolean): void;
  switchScene(sceneId: string): Promise<void>;
  reset(): void;
}

export interface DebugPort {
  highlightBlock(blockId: string | null): void;
  reportError(code: string, blockId?: string): void;
}
export interface RuntimeClock {
  wait(durationMs: number, cancellation: CancellationToken): Promise<void>;
  tween(
    durationMs: number,
    update: (progress: number) => void,
    cancellation: CancellationToken,
  ): Promise<void>;
  pause?(): void;
  resume?(): void;
}

export interface RuntimeLimits {
  maxSteps: number;
  maxConcurrentTasks: number;
  maxBroadcastDepth: number;
}

const DEFAULT_RUNTIME_LIMITS: RuntimeLimits = {
  maxSteps: 100_000,
  maxConcurrentTasks: 200,
  maxBroadcastDepth: 50,
};

export class RuntimeLimitError extends Error {
  constructor(readonly code: "STEP_LIMIT" | "TASK_LIMIT" | "BROADCAST_DEPTH") {
    super(`Runtime safety limit exceeded: ${code}`);
    this.name = "RuntimeLimitError";
  }
}

export class RuntimeCancelledError extends Error {
  constructor() {
    super("Runtime task was cancelled");
    this.name = "RuntimeCancelledError";
  }
}
class ScriptStoppedError extends Error {}
export class CancellationToken {
  #cancelled = false;
  #listeners = new Set<() => void>();
  get cancelled(): boolean {
    return this.#cancelled;
  }
  throwIfCancelled(): void {
    if (this.#cancelled) throw new RuntimeCancelledError();
  }
  onCancel(listener: () => void): () => void {
    if (this.#cancelled) {
      listener();
      return () => undefined;
    }
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
  cancel(): void {
    if (this.#cancelled) return;
    this.#cancelled = true;
    for (const listener of this.#listeners) listener();
    this.#listeners.clear();
  }
}
export interface RuntimeReport {
  status: RuntimeStatus;
  score: number;
  result: "success" | "failure" | null;
  spritePositions: Record<string, { x: number; y: number }>;
  spriteRotations?: Record<string, number>;
  touchedPairs: string[];
  variables: Record<string, number>;
  projectId?: string;
  taskId?: string;
  executedBlockCounts?: Record<string, number>;
  executedBlockScenes?: Record<string, string[]>;
  sceneId?: string;
  sceneChanges?: number;
  pathVisited?: string[];
  pathTrace?: string[];
  pathSteps?: number;
  pathCheckpointCount?: number;
  pathCollectiblesCount?: number;
  pathObjectivesMet?: boolean;
  pathViolation?: boolean;
  pathReachedGoal?: boolean;
}

export type RuntimeStatusListener = (
  status: RuntimeStatus,
  report: RuntimeReport,
) => void;

export class RuntimeSession {
  readonly #stage: StagePort;
  readonly #debug: DebugPort;
  readonly #clock: RuntimeClock;
  readonly #project: Project;
  readonly #limits: RuntimeLimits;
  readonly #initial = new Map<
    string,
    { x: number; y: number; rotation: number; scale: number }
  >();
  readonly #state = new Map<
    string,
    { x: number; y: number; rotation: number; scale: number }
  >();
  #status: RuntimeStatus = "IDLE";
  #cancellation: CancellationToken | null = null;
  #listener: RuntimeStatusListener | undefined;
  #resumeWaiters = new Set<() => void>();
  #steps = 0;
  #activeTasks = 0;
  #score = 0;
  readonly #variables = new Map<string, number>();
  readonly #visibleVariables = new Set<string>();
  #result: "success" | "failure" | null = null;
  readonly #touchedPairs = new Set<string>();
  #scripts: RuntimeScript[] = [];
  #currentSceneId: string;
  readonly #executedBlockCounts = new Map<string, number>();
  readonly #executedBlockScenes = new Map<string, Set<string>>();
  #sceneChanges = 0;
  readonly #pathVisited = new Set<string>();
  readonly #pathTrace: string[] = [];
  #pathViolation = false;
  readonly #inputScripts = new Set<string>();
  constructor(
    project: Project,
    stage: StagePort,
    debug: DebugPort,
    clock: RuntimeClock,
    listener?: RuntimeStatusListener,
    limits: Partial<RuntimeLimits> = {},
  ) {
    this.#stage = stage;
    this.#debug = debug;
    this.#clock = clock;
    this.#project = project;
    this.#limits = { ...DEFAULT_RUNTIME_LIMITS, ...limits };
    this.#currentSceneId = project.currentSceneId;
    this.#listener = listener;
    this.#loadSceneState(project.currentSceneId);
  }
  get status(): RuntimeStatus {
    return this.#status;
  }
  get report(): RuntimeReport {
    const map = this.#project.pathMap;
    let checkpointCount = 0;
    for (const key of this.#pathTrace) {
      if (
        map?.checkpoints?.[checkpointCount] &&
        key === pathCellKey(map.checkpoints[checkpointCount]!)
      )
        checkpointCount += 1;
    }
    const collectibleCount = (map?.collectibles ?? []).filter((cell) =>
      this.#pathVisited.has(pathCellKey(cell)),
    ).length;
    const pathSteps = Math.max(0, this.#pathTrace.length - 1);
    return {
      status: this.#status,
      score: this.#score,
      result: this.#result,
      spritePositions: Object.fromEntries(
        [...this.#state].map(([spriteId, state]) => [
          spriteId,
          { x: state.x, y: state.y },
        ]),
      ),
      spriteRotations: Object.fromEntries(
        [...this.#state].map(([spriteId, state]) => [spriteId, state.rotation]),
      ),
      touchedPairs: [...this.#touchedPairs],
      variables: Object.fromEntries(this.#variables),
      projectId: this.#project.projectId,
      executedBlockCounts: Object.fromEntries(this.#executedBlockCounts),
      executedBlockScenes: Object.fromEntries(
        [...this.#executedBlockScenes].map(([blockId, scenes]) => [
          blockId,
          [...scenes],
        ]),
      ),
      sceneId: this.#currentSceneId,
      sceneChanges: this.#sceneChanges,
      pathVisited: [...this.#pathVisited],
      pathTrace: [...this.#pathTrace],
      pathSteps,
      pathCheckpointCount: checkpointCount,
      pathCollectiblesCount: collectibleCount,
      pathObjectivesMet: map
        ? checkpointCount === (map.checkpoints?.length ?? 0) &&
          collectibleCount === (map.collectibles?.length ?? 0) &&
          (!map.maxSteps || pathSteps <= map.maxSteps) &&
          (!map.noRevisit ||
            new Set(this.#pathTrace).size === this.#pathTrace.length)
        : false,
      pathViolation: this.#pathViolation,
      pathReachedGoal: Boolean(
        this.#project.pathMap &&
        (() => {
          const position = this.#state.get(
            this.#project.pathMap!.actorSpriteId,
          );
          const cell = position
            ? pathCellAtPosition(position.x, position.y)
            : null;
          return (
            cell &&
            pathCellKey(cell) === pathCellKey(this.#project.pathMap!.goal) &&
            this.#pathVisited.has(pathCellKey(cell))
          );
        })(),
      ),
    };
  }
  async start(scripts: RuntimeScript[]): Promise<void> {
    this.stop(false);
    this.#scripts = scripts;
    this.#currentSceneId = this.#project.currentSceneId;
    this.#loadSceneState(this.#currentSceneId);
    this.#stage.clearResult?.();
    if (this.#stage.getCurrentSceneId?.() === this.#currentSceneId) {
      for (const [spriteId, state] of this.#state) {
        const position = this.#stage.getSpritePosition?.(spriteId);
        if (position) this.#state.set(spriteId, { ...state, ...position });
      }
    } else {
      await this.#stage.switchScene(this.#currentSceneId);
    }
    this.#score = 0;
    this.#variables.clear();
    this.#visibleVariables.clear();
    for (const variable of this.#project.variables) {
      this.#variables.set(variable.variableId, variable.initialValue);
      if (variable.visible) this.#visibleVariables.add(variable.variableId);
      this.#syncVariable(variable.variableId);
    }
    this.#result = null;
    this.#touchedPairs.clear();
    this.#executedBlockCounts.clear();
    this.#executedBlockScenes.clear();
    this.#inputScripts.clear();
    this.#sceneChanges = 0;
    this.#pathVisited.clear();
    this.#pathTrace.length = 0;
    this.#pathViolation = false;
    if (this.#project.pathMap) {
      const position = this.#state.get(this.#project.pathMap.actorSpriteId);
      const startCell = position
        ? pathCellAtPosition(position.x, position.y)
        : null;
      if (
        !startCell ||
        pathCellKey(startCell) !== pathCellKey(this.#project.pathMap.start)
      )
        this.#pathViolation = true;
      else {
        this.#pathVisited.add(pathCellKey(startCell));
        this.#pathTrace.push(pathCellKey(startCell));
      }
    }
    this.#steps = 0;
    this.#activeTasks = 0;
    this.#stage.setScore(0);
    const cancellation = new CancellationToken();
    this.#cancellation = cancellation;
    this.#set("STARTING");
    try {
      const runnable = scripts.filter(
        (script) =>
          script.blocks[0]?.type === "EVT_FLAG" ||
          script.blocks[0]?.type === "EVT_SCENE_START" ||
          script.blocks[0]?.type === "EVT_TOUCH" ||
          script.blocks[0]?.type === "EVT_TOUCH_STAY" ||
          script.blocks[0]?.type === "EVT_TOUCH_EXIT",
      );
      this.#reserveTasks(runnable.length);
      this.#set("RUNNING");
      this.#setEditingEnabled(false);
      this.#stage.setPlayInputEnabled?.(true);
      try {
        await Promise.all(
          runnable.map((script) => this.#executeRoot(script, cancellation, 0)),
        );
      } finally {
        this.#activeTasks -= runnable.length;
      }
      cancellation.throwIfCancelled();
      this.#debug.highlightBlock(null);
      this.#set("COMPLETED");
    } catch (error) {
      if (error instanceof RuntimeCancelledError) return;
      cancellation.cancel();
      this.#debug.reportError(
        error instanceof RuntimeLimitError ? error.code : "RUNTIME_BLOCK_ERROR",
      );
      this.#set("ERROR");
      this.#setEditingEnabled(true);
      this.#stage.setPlayInputEnabled?.(false);
    } finally {
      if (this.#cancellation === cancellation) {
        this.#cancellation = null;
      }
    }
  }
  stop(resetStage = true): void {
    this.#cancellation?.cancel();
    this.#cancellation = null;
    this.#releaseResumeWaiters();
    this.#clock.resume?.();
    this.#debug.highlightBlock(null);
    this.#stage.stopAllSounds();
    this.#setEditingEnabled(true);
    this.#stage.setPlayInputEnabled?.(false);
    this.#scripts = [];
    if (resetStage) {
      this.#stage.reset();
      this.#currentSceneId = this.#project.currentSceneId;
      this.#loadSceneState(this.#currentSceneId);
    }
    this.#set("STOPPED");
  }
  pause(): void {
    if (this.#status !== "RUNNING") return;
    this.#clock.pause?.();
    this.#stage.pauseAllSounds?.();
    this.#set("PAUSED");
  }
  resume(): void {
    if (this.#status !== "PAUSED") return;
    this.#clock.resume?.();
    this.#stage.resumeAllSounds?.();
    this.#releaseResumeWaiters();
    this.#set("RUNNING");
  }
  async triggerKey(key: string): Promise<void> {
    const scripts = this.#scripts.filter((script) => {
      const event = script.blocks[0];
      return (
        event?.type === "EVT_KEY" && (event.key === key || event.key === "any")
      );
    });
    await this.#triggerInput(scripts);
  }
  async triggerSpriteClick(spriteId: string): Promise<void> {
    const scripts = this.#scripts.filter(
      (script) =>
        script.ownerSpriteId === spriteId &&
        script.blocks[0]?.type === "EVT_SPRITE_CLICK",
    );
    await this.#triggerInput(scripts);
  }
  async triggerMessage(message: string): Promise<void> {
    const scripts = this.#scripts.filter((script) => {
      const event = script.blocks[0];
      return event?.type === "EVT_MESSAGE" && event.message === message;
    });
    await this.#trigger(scripts, 0);
  }
  async #execute(
    script: RuntimeScript,
    cancellation: CancellationToken,
    broadcastDepth: number,
  ): Promise<void> {
    await this.#executeBlocks(
      script.ownerSpriteId,
      script.blocks,
      cancellation,
      broadcastDepth,
    );
  }
  async #executeRoot(
    script: RuntimeScript,
    cancellation: CancellationToken,
    broadcastDepth: number,
  ): Promise<void> {
    try {
      const event = script.blocks[0];
      if (
        event?.type !== "EVT_TOUCH" &&
        event?.type !== "EVT_TOUCH_STAY" &&
        event?.type !== "EVT_TOUCH_EXIT"
      ) {
        await this.#execute(script, cancellation, broadcastDepth);
        return;
      }
      this.#countStep();
      this.#debug.highlightBlock(event.sourceBlockId);
      let wasTouching = false;
      let busy = false;
      let pending = false;
      let handlerError: unknown;
      let cooldown = 0;
      while (!cancellation.cancelled) {
        await this.#awaitResume(cancellation);
        if (handlerError) throw handlerError;
        const touching =
          this.#state.has(script.ownerSpriteId) &&
          this.#state.has(event.targetSpriteId) &&
          this.#stage.isTouching(script.ownerSpriteId, event.targetSpriteId);
        const shouldRun =
          (event.type === "EVT_TOUCH" && touching && !wasTouching) ||
          (event.type === "EVT_TOUCH_STAY" && touching) ||
          (event.type === "EVT_TOUCH_EXIT" && !touching && wasTouching);
        if (shouldRun && event.type !== "EVT_TOUCH_STAY") pending = true;
        if (!busy && (pending || (shouldRun && cooldown <= 0))) {
          pending = false;
          busy = true;
          cooldown = 250;
          this.#recordBlock(event);
          this.#touchedPairs.add(
            `${script.ownerSpriteId}:${event.targetSpriteId}`,
          );
          if (touching && !wasTouching)
            this.#stage.playCollisionEffect?.(
              script.ownerSpriteId,
              event.targetSpriteId,
            );
          void this.#executeBlocks(
            script.ownerSpriteId,
            script.blocks.slice(1),
            cancellation,
            broadcastDepth,
          )
            .catch((error) => {
              if (!(error instanceof RuntimeCancelledError))
                handlerError = error;
            })
            .finally(() => {
              busy = false;
            });
        }
        wasTouching = touching;
        // Observe separation even while the previous response is still speaking.
        await this.#clock.wait(50, cancellation);
        cooldown -= 50;
      }
    } catch (error) {
      if (error instanceof ScriptStoppedError) return;
      throw error;
    }
  }
  async #executeBlocks(
    spriteId: string,
    blocks: RuntimeBlock[],
    cancellation: CancellationToken,
    broadcastDepth: number,
  ): Promise<void> {
    for (const block of blocks) {
      cancellation.throwIfCancelled();
      await this.#awaitResume(cancellation);
      this.#countStep();
      this.#debug.highlightBlock(block.sourceBlockId);
      await this.#block(spriteId, block, cancellation, broadcastDepth);
      this.#recordBlock(block);
    }
  }
  async #block(
    spriteId: string,
    block: RuntimeBlock,
    cancellation: CancellationToken,
    broadcastDepth: number,
  ): Promise<void> {
    const state = this.#state.get(spriteId);
    if (!state) throw new Error(`Unknown sprite: ${spriteId}`);
    switch (block.type) {
      case "EVT_FLAG":
      case "EVT_KEY":
      case "EVT_SPRITE_CLICK":
      case "EVT_TOUCH":
      case "EVT_TOUCH_STAY":
      case "EVT_TOUCH_EXIT":
      case "EVT_MESSAGE":
      case "EVT_SCENE_START":
        return;
      case "MOT_MOVE": {
        if (this.#project.pathMap?.actorSpriteId === spriteId) {
          const map = this.#project.pathMap;
          const allowed = new Set(map.tiles.map(pathCellKey));
          if (!Number.isInteger(block.steps)) {
            this.#pathViolation = true;
            return;
          }
          this.#stage.clearSpeech(spriteId);
          for (let step = 0; step < block.steps; step += 1) {
            const current = pathCellAtPosition(state.x, state.y);
            const next = current && {
              column:
                current.column +
                (block.direction === "right"
                  ? 1
                  : block.direction === "left"
                    ? -1
                    : 0),
              row:
                current.row +
                (block.direction === "down"
                  ? 1
                  : block.direction === "up"
                    ? -1
                    : 0),
            };
            if (!next || !allowed.has(pathCellKey(next))) {
              this.#pathViolation = true;
              this.#stage.showSpeech(spriteId, "前面没有路啦！换个方向试试。");
              return;
            }
            const from = { x: state.x, y: state.y };
            const target = pathCellPosition(next);
            await this.#clock.tween(
              260,
              (progress) => {
                const x = from.x + (target.x - from.x) * progress;
                const y = from.y + (target.y - from.y) * progress;
                this.#stage.setSpritePosition(spriteId, x, y);
                this.#state.set(spriteId, { ...state, x, y });
              },
              cancellation,
            );
            state.x = target.x;
            state.y = target.y;
            this.#pathVisited.add(pathCellKey(next));
            this.#pathTrace.push(pathCellKey(next));
          }
          return;
        }
        const movementStep = getMovementStep(this.#project);
        const delta = block.steps * movementStep;
        const margin =
          this.#project.settings.coordinateVersion === 2 ? movementStep / 2 : 0;
        const requested = {
          ...state,
          x: Math.max(
            margin,
            Math.min(
              this.#project.settings.stageWidth - margin,
              state.x +
                (block.direction === "right"
                  ? delta
                  : block.direction === "left"
                    ? -delta
                    : 0),
            ),
          ),
          y: Math.max(
            margin,
            Math.min(
              this.#project.settings.stageHeight - margin,
              state.y +
                (block.direction === "down"
                  ? delta
                  : block.direction === "up"
                    ? -delta
                    : 0),
            ),
          ),
        };
        let resolved = { x: state.x, y: state.y };
        await this.#clock.tween(
          Math.max(260, Math.min(1800, block.steps * 170)),
          (p) => {
            const x = state.x + (requested.x - state.x) * p;
            const y = state.y + (requested.y - state.y) * p;
            resolved = this.#stage.resolveSpritePosition?.(spriteId, x, y) ?? {
              x,
              y,
            };
            this.#stage.setSpritePosition(spriteId, resolved.x, resolved.y);
            this.#state.set(spriteId, { ...state, ...resolved });
          },
          cancellation,
        );
        this.#state.set(spriteId, { ...requested, ...resolved });
        return;
      }
      case "MOT_TURN":
        state.rotation += block.degrees;
        this.#stage.setSpriteRotation(spriteId, state.rotation);
        return;
      case "MOT_GOTO_START": {
        const initial = this.#initial.get(spriteId);
        if (!initial) return;
        if (
          this.#project.pathMap?.actorSpriteId === spriteId &&
          (state.x !== initial.x || state.y !== initial.y)
        ) {
          this.#pathViolation = true;
          return;
        }
        const start = { x: state.x, y: state.y };
        let resolved = start;
        await this.#clock.tween(
          300,
          (progress) => {
            const x = start.x + (initial.x - start.x) * progress;
            const y = start.y + (initial.y - start.y) * progress;
            resolved = this.#stage.resolveSpritePosition?.(spriteId, x, y) ?? {
              x,
              y,
            };
            this.#stage.setSpritePosition(spriteId, resolved.x, resolved.y);
            this.#state.set(spriteId, { ...state, ...resolved });
          },
          cancellation,
        );
        this.#state.set(spriteId, { ...initial, ...resolved });
        this.#stage.setSpriteRotation(spriteId, initial.rotation);
        return;
      }
      case "MOT_GOTO": {
        if (this.#project.pathMap?.actorSpriteId === spriteId) {
          this.#pathViolation = true;
          return;
        }
        if (this.#project.settings.coordinateVersion === 2) {
          const target = gridPositionToStage(this.#project, block.x, block.y);
          state.x = target.x;
          state.y = target.y;
          this.#stage.setSpritePosition(spriteId, target.x, target.y);
          return;
        }
        const resolved = this.#stage.resolveSpritePosition?.(
          spriteId,
          block.x,
          block.y,
        ) ?? { x: block.x, y: block.y };
        state.x = resolved.x;
        state.y = resolved.y;
        this.#stage.setSpritePosition(spriteId, resolved.x, resolved.y);
        return;
      }
      case "LOOK_SAY":
        this.#stage.showSpeech(spriteId, block.text);
        try {
          await this.#clock.wait(block.duration * 1000, cancellation);
        } finally {
          this.#stage.clearSpeech(spriteId);
        }
        return;
      case "LOOK_SHOW":
        this.#stage.setSpriteVisible(spriteId, true);
        return;
      case "LOOK_HIDE":
        this.#stage.setSpriteVisible(spriteId, false);
        return;
      case "LOOK_SIZE":
        state.scale = Math.max(
          0.2,
          Math.min(3, state.scale + block.delta / 100),
        );
        this.#stage.setSpriteScale(spriteId, state.scale);
        return;
      case "LOOK_COSTUME":
        await this.#stage.setSpriteCostume?.(spriteId, block.costumeAssetId);
        return;
      case "SND_PLAY":
        this.#stage.playSound(block.soundId);
        return;
      case "SND_STOP_ALL":
        this.#stage.stopAllSounds();
        return;
      case "CTL_STOP":
        if (block.scope === "all") {
          this.stop(false);
          return;
        }
        throw new ScriptStoppedError();
      case "EVT_BROADCAST":
        await this.#broadcast(block.message, cancellation, broadcastDepth + 1);
        return;
      case "SCENE_NEXT": {
        const currentIndex = this.#project.scenes.findIndex(
          (scene) => scene.sceneId === this.#currentSceneId,
        );
        const nextScene =
          this.#project.scenes[
            (currentIndex + 1) % this.#project.scenes.length
          ];
        if (!nextScene) return;
        await this.#switchToScene(nextScene.sceneId, broadcastDepth);
        return;
      }
      case "SCENE_SWITCH": {
        if (
          !this.#project.scenes.some((scene) => scene.sceneId === block.sceneId)
        )
          return;
        await this.#switchToScene(block.sceneId, broadcastDepth);
        return;
      }
      case "CTL_WAIT":
        await this.#clock.wait(block.duration * 1000, cancellation);
        return;
      case "CTL_REPEAT":
        for (let i = 0; i < block.count; i += 1)
          await this.#body(spriteId, block.body, cancellation, broadcastDepth);
        return;
      case "CTL_FOREVER":
        this.#recordBlock(block);
        while (!cancellation.cancelled) {
          await this.#body(spriteId, block.body, cancellation, broadcastDepth);
          await this.#clock.wait(16, cancellation);
        }
        return;
      case "CTL_IF":
        if (this.#condition(spriteId, block.condition))
          await this.#body(spriteId, block.body, cancellation, broadcastDepth);
        return;
      case "CTL_IF_ELSE":
        await this.#body(
          spriteId,
          this.#condition(spriteId, block.condition)
            ? block.thenBody
            : block.elseBody,
          cancellation,
          broadcastDepth,
        );
        return;
      case "GAME_SET_SCORE":
        this.#score = block.value;
        this.#stage.setScore(this.#score);
        return;
      case "GAME_CHANGE_SCORE":
        this.#score = Math.max(0, Math.min(9999, this.#score + block.delta));
        this.#stage.setScore(this.#score);
        if (block.delta > 0) this.#stage.playCollectEffect?.(spriteId);
        return;
      case "GAME_SET_VARIABLE":
        this.#variables.set(
          block.variableId,
          this.#clampVariable(this.#number(block.value)),
        );
        this.#syncVariable(block.variableId);
        return;
      case "GAME_CHANGE_VARIABLE": {
        const current = this.#variables.get(block.variableId) ?? 0;
        const delta = Math.abs(this.#number(block.delta));
        this.#variables.set(
          block.variableId,
          this.#clampVariable(
            block.direction === "decrease" ? current - delta : current + delta,
          ),
        );
        this.#syncVariable(block.variableId);
        return;
      }
      case "GAME_SHOW_VARIABLE":
        if (block.visible) this.#visibleVariables.add(block.variableId);
        else this.#visibleVariables.delete(block.variableId);
        this.#syncVariable(block.variableId);
        return;
      case "GAME_IF_TOUCHING":
        if (this.#stage.isTouching(spriteId, block.targetSpriteId)) {
          this.#touchedPairs.add(`${spriteId}:${block.targetSpriteId}`);
          this.#stage.playCollisionEffect?.(spriteId, block.targetSpriteId);
          await this.#body(spriteId, block.body, cancellation, broadcastDepth);
        }
        return;
      case "GAME_RESULT":
        this.#recordBlock(block);
        this.#result = block.result;
        this.#stage.showResult?.(block.result, block.message);
        this.#stage.setPlayInputEnabled?.(false);
        this.#set("COMPLETED");
        cancellation.cancel();
        cancellation.throwIfCancelled();
        return;
      case "UNSUPPORTED":
        throw new Error(`Unsupported block type: ${block.originalType}`);
    }
  }
  #number(expression: RuntimeNumberExpression): number {
    switch (expression.type) {
      case "NUMBER_LITERAL":
        return expression.value;
      case "NUMBER_SCORE":
        return this.#score;
      case "NUMBER_VARIABLE":
        return this.#variables.get(expression.variableId) ?? 0;
      case "NUMBER_RANDOM": {
        const from = Math.min(expression.from, expression.to);
        const to = Math.max(expression.from, expression.to);
        return Math.floor(Math.random() * (to - from + 1)) + from;
      }
    }
  }
  #condition(spriteId: string, condition: RuntimeCondition): boolean {
    switch (condition.type) {
      case "COND_BOOLEAN":
        return condition.value;
      case "COND_TOUCHING": {
        const touching = this.#stage.isTouching(
          spriteId,
          condition.targetSpriteId,
        );
        if (touching)
          this.#touchedPairs.add(`${spriteId}:${condition.targetSpriteId}`);
        return touching;
      }
      case "COND_COMPARE": {
        const left = this.#number(condition.left);
        const right = this.#number(condition.right);
        if (condition.operator === "gt") return left > right;
        if (condition.operator === "lt") return left < right;
        return left === right;
      }
      case "COND_AND":
        return (
          this.#condition(spriteId, condition.left) &&
          this.#condition(spriteId, condition.right)
        );
      case "COND_OR":
        return (
          this.#condition(spriteId, condition.left) ||
          this.#condition(spriteId, condition.right)
        );
      case "COND_NOT":
        return !this.#condition(spriteId, condition.operand);
    }
  }
  #clampVariable(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(-9999, Math.min(9999, Math.round(value)));
  }
  #syncVariable(variableId: string): void {
    const definition = this.#project.variables.find(
      (variable) => variable.variableId === variableId,
    );
    if (!definition) return;
    this.#stage.setVariable?.(
      variableId,
      definition.name,
      this.#variables.get(variableId) ?? 0,
      this.#visibleVariables.has(variableId),
    );
  }
  async #body(
    spriteId: string,
    blocks: RuntimeBlock[],
    cancellation: CancellationToken,
    broadcastDepth: number,
  ): Promise<void> {
    for (const child of blocks) {
      cancellation.throwIfCancelled();
      await this.#awaitResume(cancellation);
      this.#countStep();
      this.#debug.highlightBlock(child.sourceBlockId);
      await this.#block(spriteId, child, cancellation, broadcastDepth);
      this.#recordBlock(child);
    }
  }
  #recordBlock(block: RuntimeBlock): void {
    this.#executedBlockCounts.set(
      block.sourceBlockId,
      (this.#executedBlockCounts.get(block.sourceBlockId) ?? 0) + 1,
    );
    const scenes =
      this.#executedBlockScenes.get(block.sourceBlockId) ?? new Set<string>();
    scenes.add(this.#currentSceneId);
    this.#executedBlockScenes.set(block.sourceBlockId, scenes);
    this.#listener?.(this.#status, this.report);
  }
  async #triggerInput(scripts: RuntimeScript[]): Promise<void> {
    const busyOwners = new Set(
      this.#scripts
        .filter((script) => this.#inputScripts.has(script.scriptId))
        .map((script) => script.ownerSpriteId),
    );
    const available = scripts.filter(
      (script) =>
        !this.#inputScripts.has(script.scriptId) &&
        !busyOwners.has(script.ownerSpriteId),
    );
    for (const script of available) this.#inputScripts.add(script.scriptId);
    try {
      await this.#trigger(available);
    } finally {
      for (const script of available)
        this.#inputScripts.delete(script.scriptId);
    }
  }
  async #trigger(scripts: RuntimeScript[], broadcastDepth = 0): Promise<void> {
    if (
      scripts.length === 0 ||
      this.#status === "STOPPED" ||
      this.#status === "ERROR" ||
      this.#result !== null
    )
      return;
    if (broadcastDepth > this.#limits.maxBroadcastDepth)
      throw new RuntimeLimitError("BROADCAST_DEPTH");
    const activeCancellation = this.#cancellation;
    const cancellation = activeCancellation ?? new CancellationToken();
    const ownsCancellation = !activeCancellation;
    if (ownsCancellation) {
      this.#cancellation = cancellation;
      this.#set("RUNNING");
    }
    let reserved = false;
    try {
      this.#reserveTasks(scripts.length);
      reserved = true;
      await Promise.all(
        scripts.map((script) =>
          this.#executeRoot(script, cancellation, broadcastDepth),
        ),
      );
      cancellation.throwIfCancelled();
      if (ownsCancellation) {
        this.#debug.highlightBlock(null);
        this.#set("COMPLETED");
      }
    } catch (error) {
      if (error instanceof RuntimeCancelledError) return;
      this.#debug.reportError(
        error instanceof RuntimeLimitError ? error.code : "RUNTIME_EVENT_ERROR",
      );
      this.#set("ERROR");
      cancellation.cancel();
    } finally {
      if (reserved) this.#activeTasks -= scripts.length;
      if (ownsCancellation && this.#cancellation === cancellation) {
        this.#cancellation = null;
      }
    }
  }
  #loadSceneState(sceneId: string): void {
    this.#initial.clear();
    this.#state.clear();
    const scene = this.#project.scenes.find((item) => item.sceneId === sceneId);
    if (!scene) return;
    for (const instance of scene.instances) {
      const value = {
        x: instance.transform.x,
        y: instance.transform.y,
        rotation: instance.transform.rotation,
        scale: instance.transform.scaleX,
      };
      this.#initial.set(instance.spriteId, value);
      this.#state.set(instance.spriteId, { ...value });
    }
  }
  async #switchToScene(sceneId: string, broadcastDepth: number): Promise<void> {
    if (sceneId !== this.#currentSceneId) this.#sceneChanges += 1;
    this.#currentSceneId = sceneId;
    this.#loadSceneState(sceneId);
    await this.#stage.switchScene(sceneId);
    this.#stage.setScore(this.#score);
    for (const variableId of this.#variables.keys())
      this.#syncVariable(variableId);
    const sceneScripts = this.#scripts.filter(
      (script) =>
        script.blocks[0]?.type === "EVT_SCENE_START" &&
        this.#state.has(script.ownerSpriteId),
    );
    await this.#trigger(sceneScripts, broadcastDepth);
  }
  async #awaitResume(cancellation: CancellationToken): Promise<void> {
    if (this.#status !== "PAUSED") return;
    await new Promise<void>((resolve, reject) => {
      const off = cancellation.onCancel(() => {
        off();
        reject(new RuntimeCancelledError());
      });
      const resume = () => {
        off();
        this.#resumeWaiters.delete(resume);
        resolve();
      };
      this.#resumeWaiters.add(resume);
    });
  }
  async #broadcast(
    message: string,
    cancellation: CancellationToken,
    depth: number,
  ): Promise<void> {
    cancellation.throwIfCancelled();
    if (depth > this.#limits.maxBroadcastDepth)
      throw new RuntimeLimitError("BROADCAST_DEPTH");
    const scripts = this.#scripts.filter((script) => {
      const event = script.blocks[0];
      return event?.type === "EVT_MESSAGE" && event.message === message;
    });
    await this.#trigger(scripts, depth);
  }
  #countStep(): void {
    this.#steps += 1;
    if (this.#steps > this.#limits.maxSteps)
      throw new RuntimeLimitError("STEP_LIMIT");
  }
  #reserveTasks(count: number): void {
    if (this.#activeTasks + count > this.#limits.maxConcurrentTasks)
      throw new RuntimeLimitError("TASK_LIMIT");
    this.#activeTasks += count;
  }
  #releaseResumeWaiters(): void {
    for (const resume of [...this.#resumeWaiters]) resume();
    this.#resumeWaiters.clear();
  }
  #setEditingEnabled(enabled: boolean): void {
    if (this.#stage.setEditingEnabled) {
      this.#stage.setEditingEnabled(enabled);
      return;
    }
    this.#stage.setInteractionEnabled?.(enabled);
  }
  #set(status: RuntimeStatus): void {
    this.#status = status;
    this.#listener?.(status, this.report);
  }
}
