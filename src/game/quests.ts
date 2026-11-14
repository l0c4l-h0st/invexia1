import { B } from '../balance';
import type { GameState, Quest, Stats } from '../core/store';
import { roomRate } from './economy';

/** Quêtes simples tournantes + succès à paliers. */
type QType = Quest['type'];
const TYPES: { type: QType; base: number; step: number; diff: number }[] = [
  { type: 'checkin', base: 8, step: 4, diff: 1 },
  { type: 'clean', base: 6, step: 3, diff: 1 },
  { type: 'collect', base: 6, step: 3, diff: 0.9 },
  { type: 'earn', base: 12, step: 6, diff: 1.1 }, // en nombre de séjours
  { type: 'vip', base: 1, step: 1, diff: 1.6 },
  { type: 'buy', base: 2, step: 1, diff: 1.4 },
];

export const QUEST_ICON: Record<QType, string> = { checkin: 'bell', clean: 'broom', collect: 'cash', earn: 'coins', vip: 'crown', buy: 'up' };

function newQuest(s: GameState): Quest {
  const used = new Set(s.quests.map((q) => q.type));
  const pool = TYPES.filter((t) => !used.has(t.type));
  const def = pool[Math.floor(Math.random() * pool.length)] ?? TYPES[0];
  const lvl = Math.min(6, Math.floor(s.stats.quests / 3));
  const rate = roomRate(s);
  let target = def.base + def.step * lvl;
  if (def.type === 'earn') target = Math.round(target * rate);
  const reward = Math.round(rate * B.quests.rewardStays * def.diff * (1 + lvl * 0.25));
  return { id: ++s.questSeq, type: def.type, target, progress: 0, reward };
}

export function ensureQuests(s: GameState): void {
  if (!s.features.quests) return;
  while (s.quests.length < B.quests.slots) s.quests.push(newQuest(s));
}

export function questProgress(s: GameState, type: QType, amount: number): boolean {
  if (!s.features.quests) return false;
  let completed = false;
  for (const q of s.quests) {
    if (q.type !== type || q.progress >= q.target) continue;
    q.progress = Math.min(q.target, q.progress + amount);
    if (q.progress >= q.target) completed = true;
  }
  return completed;
}

/** Valide une quête terminée ; renvoie la récompense (0 si non terminée). */
export function claimQuest(s: GameState, id: number): number {
  const i = s.quests.findIndex((q) => q.id === id);
  if (i < 0 || s.quests[i].progress < s.quests[i].target) return 0;
  const reward = s.quests[i].reward;
  s.quests.splice(i, 1);
  s.stats.quests++;
  ensureQuests(s);
  return reward;
}

export const questsClaimable = (s: GameState): number => s.quests.filter((q) => q.progress >= q.target).length;

// -------------------------------------------------------------------- succès
export interface AchDef {
  id: string;
  stat: keyof Stats;
  icon: string;
  steps: number[];
}
const S = B.achievementSteps;
export const ACHIEVEMENTS: AchDef[] = [
  { id: 'guests', stat: 'guests', icon: 'bell', steps: S },
  { id: 'cleaned', stat: 'cleaned', icon: 'broom', steps: S },
  { id: 'vips', stat: 'vips', icon: 'crown', steps: [1, 5, 20, 75, 250, 1000] },
  { id: 'earned', stat: 'earned', icon: 'coins', steps: [1e3, 1e5, 1e7, 1e9, 1e12, 1e15, 1e18, 1e21, 1e24] },
  { id: 'bought', stat: 'bought', icon: 'up', steps: [5, 20, 50, 120, 300, 800] },
  { id: 'tier', stat: 'maxTier', icon: 'hotel', steps: [1, 2, 3, 4, 5, 10, 15, 20, 25, 30] },
  { id: 'quests', stat: 'quests', icon: 'quest', steps: [3, 10, 30, 100, 300] },
  { id: 'prestige', stat: 'prestiges', icon: 'star', steps: [1, 3, 10, 25, 50] },
];

export function achState(s: GameState, a: AchDef): { level: number; target: number; value: number; claimable: boolean; maxed: boolean } {
  const level = s.achievements[a.id] ?? 0;
  const maxed = level >= a.steps.length;
  const target = a.steps[Math.min(level, a.steps.length - 1)];
  const value = s.stats[a.stat];
  return { level, target, value, claimable: !maxed && value >= target, maxed };
}

export function claimAchievement(s: GameState, id: string): boolean {
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a || !achState(s, a).claimable) return false;
  s.achievements[id] = (s.achievements[id] ?? 0) + 1;
  return true;
}

export const achievementsClaimable = (s: GameState): number => ACHIEVEMENTS.filter((a) => achState(s, a).claimable).length;
