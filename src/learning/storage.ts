/**
 * The only impure module of the learning layer: localStorage access guarded by try/catch.
 * Private tabs, disabled storage or quota errors fall back to an in-memory map.
 */
const PREFIX = 'gta:v1:';
const memory = new Map<string, string>();

function store(): Storage | null {
  try {
    const s = globalThis.localStorage;
    return s ?? null;
  } catch {
    return null;
  }
}

export function loadJSON<T>(key: string, fallback: T, validate?: (x: unknown) => x is T): T {
  let raw: string | null = null;
  try {
    raw = store()?.getItem(PREFIX + key) ?? null;
  } catch {
    raw = null;
  }
  raw ??= memory.get(PREFIX + key) ?? null;
  if (raw === null) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (validate && !validate(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

/** Returns false if the value could only be kept in memory. */
export function saveJSON(key: string, value: unknown): boolean {
  const raw = JSON.stringify(value);
  memory.set(PREFIX + key, raw);
  try {
    const s = store();
    if (!s) return false;
    s.setItem(PREFIX + key, raw);
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  memory.delete(PREFIX + key);
  try {
    store()?.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}
