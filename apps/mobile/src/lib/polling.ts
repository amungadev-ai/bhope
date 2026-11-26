export function createPoller({
  task,
  intervalMs,
  maxAttempts = Infinity,
  onError,
  onLimit,
  schedule = setTimeout,
  cancel = clearTimeout,
}: {
  task: (signal: AbortSignal) => Promise<boolean | void>;
  intervalMs: number;
  maxAttempts?: number;
  onError?: (error: unknown) => void;
  onLimit?: () => void;
  schedule?: typeof setTimeout;
  cancel?: typeof clearTimeout;
}) {
  let running = false;
  let finished = false;
  let urgent = false;
  let attempts = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let request: AbortController | undefined;
  const clear = () => {
    if (timer !== undefined) cancel(timer);
    timer = undefined;
  };
  async function tick() {
    if (!running || finished || request) return;
    clear();
    if (attempts >= maxAttempts) {
      finished = true;
      onLimit?.();
      return;
    }
    urgent = false;
    const controller = new AbortController();
    request = controller;
    attempts++;
    try {
      const again = await task(controller.signal);
      if (!controller.signal.aborted && again === false) finished = true;
    } catch (error) {
      if (!controller.signal.aborted) onError?.(error);
    } finally {
      request = undefined;
      if (running && !finished) {
        if (attempts >= maxAttempts) {
          finished = true;
          onLimit?.();
        } else timer = schedule(() => void tick(), urgent ? 0 : intervalMs);
      }
    }
  }
  return {
    resume() {
      if (finished) return;
      running = true;
      urgent = true;
      void tick();
    },
    pause() {
      running = false;
      clear();
      request?.abort();
    },
    dispose() {
      finished = true;
      running = false;
      clear();
      request?.abort();
    },
  };
}
