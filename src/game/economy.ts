import { B, CITY_THEMES, TIERS, type ChainItem, type Role, type ServiceId, type StarId, type ThemeId, type UpgradeId } from '../balance';
import type { GameState } from '../core/store';

/** Formules dérivées de balance.ts. Aucune constante magique ici : tout vient de `B`. */

export const cityIncome = (city: number): number => Math.pow(B.city.incomeMult, city);
export const cityCost = (city: number): number => Math.pow(B.city.costMult, city);

export function themeOf(city: number): ThemeId {
  return city === 0 ? 'town' : CITY_THEMES[1 + ((city - 1) % (CITY_THEMES.length - 1))];
}

export const boostOn = (s: GameState, k: 'income' | 'speed'): boolean => s.boosts[k] > 0;

export function achievementCount(s: GameState): number {
  let n = 0;
  for (const k in s.achievements) n += s.achievements[k];
  return n;
}

/** Multiplicateur global de revenus (améliorations, étoiles, succès, boost pub). */
export function incomeMult(s: GameState): number {
  return (
    (1 + s.up.pIncome * B.upgrades.pIncome.per) *
    (1 + s.starTree.income * B.stars.income.per) *
    (1 + achievementCount(s) * B.achievementBonus) *
    (boostOn(s, 'income') ? B.boosts.income.mult : 1)
  );
}

/** Cash laissé par un client standard dans l'état courant. */
export function roomRate(s: GameState): number {
  return TIERS[s.tier].rate * cityIncome(s.city) * B.roomLevelMult[s.roomLevel - 1] * incomeMult(s);
}

export function chainId(c: ChainItem): string {
  switch (c.kind) {
    case 'room':
      return `room:${c.n}`;
    case 'roomUp':
      return `up:${c.n}`;
    case 'service':
      return `svc:${c.service}`;
    case 'hire':
      return `hire:${c.role}:${c.n}`;
    case 'next':
      return 'next';
  }
}

export function chainCost(s: GameState, c: ChainItem): number {
  return Math.round(c.w * TIERS[s.tier].costBase * cityCost(s.city));
}

export function chainDone(s: GameState, c: ChainItem): boolean {
  switch (c.kind) {
    case 'room':
      return s.rooms >= c.n;
    case 'roomUp':
      return s.roomLevel >= c.n;
    case 'service':
      return s.services.includes(c.service);
    case 'hire':
      return s.staff[c.role] >= c.n;
    case 'next':
      return false;
  }
}

/** Les (2 max) prochains achats proposés au sol : toujours un objectif visible. */
export function visibleChain(s: GameState, max = 2): ChainItem[] {
  const chain = TIERS[s.tier].chain;
  const out: ChainItem[] = [];
  let pending = 0;
  for (const c of chain) {
    if (c.kind === 'next' || chainDone(s, c)) continue;
    pending++;
    if (c.kind === 'hire' && !s.features.staff) continue;
    if (out.length < max) out.push(c);
  }
  if (pending === 0) {
    const nx = chain.find((c) => c.kind === 'next');
    if (nx) out.push(nx);
  }
  return out;
}

export function chainProgress(s: GameState): { done: number; total: number } {
  const chain = TIERS[s.tier].chain;
  let done = 0;
  for (const c of chain) if (chainDone(s, c)) done++;
  return { done, total: chain.length };
}

export const SERVICE_ICON: Record<ServiceId, string> = {
  vending: 'vending',
  parking: 'parking',
  cafe: 'food',
  restaurant: 'food',
  pool: 'pool',
  spa: 'spa',
  casino: 'casino',
  heliport: 'heli',
};
export const ROLE_ICON: Record<Role, string> = { receptionist: 'bell', housekeeper: 'broom', bellhop: 'bag' };

export function chainIcon(s: GameState, c: ChainItem): string {
  switch (c.kind) {
    case 'room':
      return 'bed';
    case 'roomUp':
      return 'sparkle';
    case 'service':
      return SERVICE_ICON[c.service];
    case 'hire':
      return ROLE_ICON[c.role];
    case 'next':
      return s.tier >= TIERS.length - 1 ? 'plane' : 'hotel';
  }
}

// ------------------------------------------------------------------ joueur
const starSpeed = (s: GameState): number => 1 + s.starTree.speed * B.stars.speed.per;

export function playerSpeed(s: GameState): number {
  return B.player.speed * (1 + s.up.pSpeed * B.upgrades.pSpeed.per) * starSpeed(s) * (boostOn(s, 'speed') ? B.boosts.speed.mult : 1);
}
export const playerCap = (s: GameState): number => B.player.capacity + s.up.pCap + s.starTree.capacity;
/** La vitesse du joueur accélère aussi ses actions (enregistrer, nettoyer). */
export const playerWork = (s: GameState): number => (1 + s.up.pSpeed * 0.04) * (boostOn(s, 'speed') ? 1.3 : 1);

// -------------------------------------------------------------------- staff
export const recCheckinTime = (s: GameState): number => B.staff.recCheckin / ((1 + s.up.recSpeed * B.upgrades.recSpeed.per * 1.5) * starSpeed(s));
export const queueCap = (s: GameState): number => B.guest.queueBase + s.up.recCap * B.staff.recQueuePerLv + Math.floor(s.rooms / 4);
export const hkSpeed = (s: GameState): number => B.staff.hkSpeed * (1 + s.up.hkSpeed * B.upgrades.hkSpeed.per) * starSpeed(s);
export const hkCleanTime = (s: GameState): number => B.staff.hkClean / (1 + s.up.hkSpeed * B.upgrades.hkSpeed.per);
export const hkCap = (s: GameState): number => B.staff.hkCap + s.up.hkCap + s.starTree.capacity;
export const bhSpeed = (s: GameState): number => B.staff.bhSpeed * (1 + s.up.bhSpeed * B.upgrades.bhSpeed.per) * starSpeed(s);
/** Bonus de pourboire quand un bagagiste est en poste. */
export const tipMult = (s: GameState): number => (s.staff.bellhop > 0 ? 1 + 0.1 + s.up.bhCap * B.upgrades.bhCap.per : 1);

// ------------------------------------------------------------ améliorations
export function upgradeCost(id: UpgradeId, level: number): number {
  const u = B.upgrades[id];
  return Math.round(u.base * Math.pow(u.growth, level));
}
export const upgradeMaxed = (s: GameState, id: UpgradeId): boolean => s.up[id] >= B.upgrades[id].max;

// ------------------------------------------------------------------ prestige
export function starsOnPrestige(s: GameState): number {
  return Math.floor(Math.sqrt(s.runCash / B.prestige.starDiv));
}
export const starCost = (id: StarId, level: number): number => B.stars[id].cost * (level + 1);
export function starAvailable(s: GameState, id: StarId): boolean {
  const req = B.stars[id].req as StarId | null;
  return !req || s.starTree[req] > 0;
}
export function startCash(s: GameState): number {
  const lv = s.starTree.startCash;
  return lv > 0 ? B.startCashBase * Math.pow(6, lv - 1) : 0;
}
export const vipInterval = (s: GameState): [number, number] => {
  const k = 1 / (1 + s.starTree.vip * B.stars.vip.per) / (s.services.includes('heliport') ? 1.6 : 1);
  return [B.guest.vipEvery[0] * k, B.guest.vipEvery[1] * k];
};

// ---------------------------------------------------------------- hors-ligne
export const offlineCap = (s: GameState): number => (B.offline.capHours + s.starTree.offlineCap * B.stars.offlineCap.per) * 3600;

/** Revenu automatisé estimé ($/s) : ce que le staff produit sans le joueur. */
export function autoIncome(s: GameState): number {
  const cycle = 22;
  const demand = s.rooms / cycle; // chambres à traiter par seconde
  const rec = s.staff.receptionist > 0 ? Math.min(1, 1 / recCheckinTime(s) / Math.max(demand, 0.001)) : 0;
  const hk = Math.min(1, (s.staff.housekeeper * 0.14 * (1 + s.up.hkSpeed * B.upgrades.hkSpeed.per)) / Math.max(demand, 0.001));
  const auto = Math.max(0.04, Math.min(rec, hk));
  const visitable = s.services.filter((x) => x !== 'parking' && x !== 'heliport').length > 0;
  const svc = 1 + (visitable ? B.guest.serviceChance * B.guest.servicePay : 0) + (s.services.includes('parking') ? B.guest.parkingPay : 0);
  return demand * roomRate(s) * svc * auto * tipMult(s);
}

export function offlineEarnings(s: GameState, seconds: number): number {
  const t = Math.min(seconds, offlineCap(s));
  const rate = B.offline.baseRate + s.starTree.offlineRate * B.stars.offlineRate.per;
  // le boost pub ne compte pas hors-ligne
  const base = autoIncome(s) / (boostOn(s, 'income') ? B.boosts.income.mult : 1);
  return Math.floor(base * rate * t);
}
