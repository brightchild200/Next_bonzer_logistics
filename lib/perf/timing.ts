export function generateTraceId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function nowMs(): number {
  return globalThis.performance?.now?.() ?? Date.now();
}

export function startTimer(): number {
  return nowMs();
}

export function endTimer(start: number): number {
  return Math.round(nowMs() - start);
}

export function logPerf(traceId: string, label: string, durationMs: number, metadata?: Record<string, string | number | boolean>): void {
  const meta = metadata ? ` ${JSON.stringify(metadata)}` : '';
  console.log(`[PERF][ENQUIRIES][${traceId}] ${label}: ${durationMs}ms${meta}`);
}

export function logPerfStart(traceId: string, label: string): void {
  console.log(`[PERF][ENQUIRIES][${traceId}] ${label}: START`);
}

export function logPerfEnd(traceId: string, label: string, start: number, metadata?: Record<string, string | number | boolean>): void {
  const duration = endTimer(start);
  logPerf(traceId, label, duration, metadata);
}
