import { en } from './en';
import { fr, type Dict } from './fr';

export type Lang = 'fr' | 'en';
const dicts: Record<Lang, Dict> = { fr, en };
let current: Lang = 'fr';

export function setLang(l: Lang): void {
  current = l;
  document.documentElement.lang = l;
}
export const getLang = (): Lang => current;

/** Traduit une clé ; `{nom}` est remplacé par params.nom. Clé inconnue = renvoyée telle quelle. */
export function t(key: string, params?: Record<string, string | number>): string {
  let s = (dicts[current] as Record<string, string>)[key] ?? (fr as Record<string, string>)[key] ?? key;
  if (params) for (const k in params) s = s.replace('{' + k + '}', String(params[k]));
  return s;
}
