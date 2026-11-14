import { CONFIG } from '../config';
import type { Feature, Role, ServiceId, StarId, UpgradeId } from '../balance';

export interface Quest {
  id: number;
  type: 'checkin' | 'clean' | 'earn' | 'vip' | 'buy' | 'collect';
  target: number;
  progress: number;
  reward: number;
}

export interface Stats {
  guests: number;
  cleaned: number;
  vips: number;
  bought: number;
  collected: number; // piles ramassées par le joueur
  earned: number; // cash gagné à vie
  playTime: number;
  prestiges: number;
  maxTier: number; // palier global max atteint (ville × 5 + palier)
  quests: number;
}

export interface GameState {
  v: number;
  cash: number;
  stars: number;
  starsSpent: number;
  runCash: number; // cash gagné pendant ce run (base du prestige)
  city: number;
  tier: number;
  rooms: number;
  roomLevel: number;
  services: ServiceId[];
  bought: Record<string, 1>; // ids de la chaîne achetés dans le palier courant
  paid: Record<string, number>; // paiements partiels sur les dalles
  staff: Record<Role, number>;
  up: Record<UpgradeId, number>;
  starTree: Record<StarId, number>;
  features: Record<Feature, boolean>;
  seen: Record<string, 1>; // boutons/panneaux déjà ouverts (pastille "nouveau")
  quests: Quest[];
  questSeq: number;
  achievements: Record<string, number>; // id -> nombre de paliers validés
  stats: Stats;
  boosts: { income: number; speed: number }; // secondes restantes
  pendingCash: number; // cash au sol non ramassé au moment de la sauvegarde
  tutorial: number; // 0 bouger, 1 accueillir, 2 nettoyer/ramasser/acheter, 3 terminé
  settings: { music: boolean; sfx: boolean; haptics: boolean; lang: 'fr' | 'en' };
  lastSeen: number;
}

export function defaultState(): GameState {
  return {
    v: CONFIG.saveVersion,
    cash: 0,
    stars: 0,
    starsSpent: 0,
    runCash: 0,
    city: 0,
    tier: 0,
    rooms: 1,
    roomLevel: 1,
    services: [],
    bought: {},
    paid: {},
    staff: { receptionist: 0, housekeeper: 0, bellhop: 0 },
    up: { pSpeed: 0, pCap: 0, pIncome: 0, recSpeed: 0, recCap: 0, hkSpeed: 0, hkCap: 0, bhSpeed: 0, bhCap: 0 },
    starTree: { income: 0, speed: 0, capacity: 0, offlineCap: 0, offlineRate: 0, vip: 0, startCash: 0 },
    features: { staff: false, upgrades: false, boosts: false, quests: false, prestige: false },
    seen: {},
    quests: [],
    questSeq: 0,
    achievements: {},
    stats: { guests: 0, cleaned: 0, vips: 0, bought: 0, collected: 0, earned: 0, playTime: 0, prestiges: 0, maxTier: 0, quests: 0 },
    boosts: { income: 0, speed: 0 },
    pendingCash: 0,
    tutorial: 0,
    settings: { music: true, sfx: true, haptics: true, lang: 'fr' },
    lastSeen: Date.now(),
  };
}

type Listener = (s: GameState) => void;

/**
 * Store minimal : un objet d'état mutable + notifications regroupées par frame.
 * Le jeu mute `state` puis appelle `touch()` ; l'UI s'abonne et se redessine au `flush()`.
 */
export class Store {
  state: GameState;
  private listeners = new Set<Listener>();
  private dirty = true;

  constructor(initial: GameState) {
    this.state = initial;
  }
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  touch(): void {
    this.dirty = true;
  }
  replace(s: GameState): void {
    this.state = s;
    this.dirty = true;
  }
  flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    for (const l of this.listeners) l(this.state);
  }
}
