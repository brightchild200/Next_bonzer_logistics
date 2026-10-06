export const IDLE_SESSION_TIMEOUT_MS = 4 * 60 * 60 * 1000;

export const IDLE_SESSION_ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
] as const;
