import { CONFIG } from '../config';
import { defaultState, type GameState } from './store';

/** Fusion profonde : les clés absentes de la sauvegarde prennent la valeur par défaut. */
function merge<T>(base: T, saved: unknown): T {
  if (saved === null || saved === undefined) return base;
  if (Array.isArray(base)) return (Array.isArray(saved) ? saved : base) as T;
  if (typeof base === 'object' && base !== null) {
    if (typeof saved !== 'object') return base;
    const out: Record<string, unknown> = { ...(saved as Record<string, unknown>) };
    for (const k of Object.keys(base as object)) {
      out[k] = merge((base as Record<string, unknown>)[k], (saved as Record<string, unknown>)[k]);
    }
    return out as T;
  }
  return (typeof saved === typeof base ? saved : base) as T;
}

/** Migrations de version : ajouter un cas par changement de format. */
function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  const v = typeof raw.v === 'number' ? raw.v : 0;
  // if (v < 2) { ... }
  void v;
  raw.v = CONFIG.saveVersion;
  return raw;
}

export function loadState(): { state: GameState; fresh: boolean } {
  try {
    const txt = localStorage.getItem(CONFIG.saveKey);
    if (!txt) return { state: defaultState(), fresh: true };
    const raw = migrate(JSON.parse(txt));
    return { state: merge(defaultState(), raw), fresh: false };
  } catch {
    return { state: defaultState(), fresh: true };
  }
}

export function saveState(s: GameState): void {
  try {
    s.lastSeen = Date.now();
    localStorage.setItem(CONFIG.saveKey, JSON.stringify(s));
  } catch {
    /* stockage indisponible (navigation privée) : on joue sans sauvegarde */
  }
}

export function wipeSave(): void {
  try {
    localStorage.removeItem(CONFIG.saveKey);
  } catch {
    /* ignore */
  }
}
