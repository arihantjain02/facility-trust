// Minimal offline queue for evidence reports, backed by localStorage so it
// works in every browser the demo runs in. Reports captured while offline are
// replayed in order once connectivity returns.
export interface QueuedReport {
  id: string;
  payload: Record<string, unknown>;
  queued_at: string;
}

const KEY = "reliref.offline.evidence";

export function readQueue(): QueuedReport[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as QueuedReport[];
  } catch {
    return [];
  }
}

function write(items: QueuedReport[]) {
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("reliref-queue-change"));
}

export function enqueue(payload: Record<string, unknown>): QueuedReport {
  const item: QueuedReport = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    payload,
    queued_at: new Date().toISOString(),
  };
  write([...readQueue(), item]);
  return item;
}

export function remove(id: string) {
  write(readQueue().filter((i) => i.id !== id));
}

export function clearQueue() {
  write([]);
}
