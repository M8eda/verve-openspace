type FrameSubscriber = (time: number, delta: number) => void;

const subscribers = new Set<FrameSubscriber>();
let rafId = 0;
let lastTime = 0;

function stopLoop() {
  if (rafId === 0 || typeof window === "undefined") return;
  window.cancelAnimationFrame(rafId);
  rafId = 0;
  lastTime = 0;
}

function tick(time: number) {
  const delta = lastTime === 0 ? 0 : time - lastTime;
  lastTime = time;

  for (const subscriber of Array.from(subscribers)) {
    subscriber(time, delta);
  }

  if (subscribers.size > 0) {
    rafId = window.requestAnimationFrame(tick);
  } else {
    rafId = 0;
    lastTime = 0;
  }
}

function startLoop() {
  if (rafId !== 0 || typeof window === "undefined") return;
  rafId = window.requestAnimationFrame(tick);
}

export function subscribeFrame(subscriber: FrameSubscriber): () => void {
  if (typeof window === "undefined") return () => {};

  subscribers.add(subscriber);
  startLoop();

  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) stopLoop();
  };
}
