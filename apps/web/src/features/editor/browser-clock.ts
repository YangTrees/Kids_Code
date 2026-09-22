import {
  RuntimeCancelledError,
  type CancellationToken,
  type RuntimeClock,
} from "@kids-code/runtime";

export class BrowserRuntimeClock implements RuntimeClock {
  #paused = false;

  pause(): void {
    this.#paused = true;
  }

  resume(): void {
    this.#paused = false;
  }

  wait(durationMs: number, cancellation: CancellationToken): Promise<void> {
    return new Promise((resolve, reject) => {
      cancellation.throwIfCancelled();
      let remaining = Math.max(0, durationMs);
      let lastAt = performance.now();
      let timer = 0;
      const unsubscribe = cancellation.onCancel(() => {
        window.clearTimeout(timer);
        reject(new RuntimeCancelledError());
      });
      const tick = () => {
        if (cancellation.cancelled) return;
        const now = performance.now();
        if (!this.#paused) remaining -= now - lastAt;
        lastAt = now;
        if (remaining <= 0) {
          unsubscribe();
          resolve();
          return;
        }
        timer = window.setTimeout(tick, Math.min(16, remaining));
      };
      timer = window.setTimeout(tick, Math.min(16, remaining));
    });
  }

  tween(
    durationMs: number,
    update: (progress: number) => void,
    cancellation: CancellationToken,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      cancellation.throwIfCancelled();
      let elapsed = 0;
      let lastAt = performance.now();
      let frameId = 0;
      const unsubscribe = cancellation.onCancel(() => {
        cancelAnimationFrame(frameId);
        reject(new RuntimeCancelledError());
      });

      const tick = (now: number) => {
        if (cancellation.cancelled) return;
        if (!this.#paused) elapsed += now - lastAt;
        lastAt = now;
        const progress = Math.min(1, elapsed / Math.max(1, durationMs));
        update(1 - (1 - progress) ** 3);
        if (progress < 1) {
          frameId = requestAnimationFrame(tick);
        } else {
          unsubscribe();
          resolve();
        }
      };
      frameId = requestAnimationFrame(tick);
    });
  }
}
