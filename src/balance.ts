/**
 * BALANCE — fichier unique de toute l'économie et du rythme du jeu.
 * Documenté dans docs/GDD.md. Toute valeur chiffrée du gameplay vit ici.
 */

export type Role = 'receptionist' | 'housekeeper' | 'bellhop';
export type ServiceId = 'vending' | 'parking' | 'cafe' | 'restaurant' | 'pool' | 'spa' | 'casino' | 'heliport';
export type Feature = 'staff' | 'upgrades' | 'boosts' | 'quests' | 'prestige';

export type ChainItem =
  | { kind: 'room'; n: number; w: number } // achète la n-ième chambre
  | { kind: 'roomUp'; n: number; w: number } // passe les chambres au niveau n
  | { kind: 'service'; service: ServiceId; w: number }
  | { kind: 'hire'; role: Role; n: number; w: number } // porte l'effectif du rôle à n
  | { kind: 'next'; w: number }; // palier suivant (ou nouvelle ville au Palace)

export interface TierDef {
  id: 'motel' | 'inn' | 'city' | 'resort' | 'palace';
  /** Cash laissé par un client standard, chambre niveau 1. */
  rate: number;
  /** Multiplicateur appliqué aux poids `w` de la chaîne d'achats. */
  costBase: number;
  startRooms: number;
  maxRooms: number;
  chain: ChainItem[];
}

const room = (n: number, w: number): ChainItem => ({ kind: 'room', n, w });
const up = (n: number, w: number): ChainItem => ({ kind: 'roomUp', n, w });
const svc = (service: ServiceId, w: number): ChainItem => ({ kind: 'service', service, w });
const hire = (role: Role, n: number, w: number): ChainItem => ({ kind: 'hire', role, n, w });
const next = (w: number): ChainItem => ({ kind: 'next', w });

/** Les 5 paliers d'un établissement. Coût d'un achat = w × costBase × multiplicateur de ville. */
export const TIERS: TierDef[] = [
  {
    id: 'motel',
    rate: 10,
    costBase: 1,
    startRooms: 2,
    maxRooms: 6,
    // Début volontairement nerveux : un achat toutes les ~30 s pendant les premières minutes.
    chain: [
      room(3, 15), // payé d'entrée avec la pile de bienvenue
      room(4, 35),
      up(2, 60),
      svc('vending', 90),
      room(5, 120),
      hire('receptionist', 1, 150),
      room(6, 190),
      hire('housekeeper', 1, 230),
      up(3, 300),
      hire('bellhop', 1, 280),
      next(700),
    ],
  },
  {
    id: 'inn',
    rate: 60,
    costBase: 18,
    startRooms: 3,
    maxRooms: 8,
    chain: [
      room(4, 40),
      room(5, 60),
      svc('parking', 80),
      up(2, 110),
      room(6, 130),
      hire('housekeeper', 2, 160),
      svc('cafe', 200),
      room(7, 230),
      room(8, 280),
      up(3, 350),
      next(700),
    ],
  },
  {
    id: 'city',
    rate: 380,
    costBase: 250,
    startRooms: 4,
    maxRooms: 10,
    chain: [
      room(5, 40),
      room(6, 55),
      svc('parking', 70),
      up(2, 100),
      room(7, 120),
      svc('restaurant', 160),
      room(8, 180),
      hire('housekeeper', 3, 200),
      room(9, 230),
      room(10, 270),
      hire('bellhop', 2, 300),
      up(3, 340),
      next(750),
    ],
  },
  {
    id: 'resort',
    rate: 2400,
    costBase: 2400,
    startRooms: 4,
    maxRooms: 12,
    chain: [
      room(5, 40),
      room(6, 50),
      svc('parking', 60),
      room(7, 65),
      up(2, 100),
      room(8, 80),
      svc('restaurant', 110),
      room(9, 100),
      svc('pool', 170),
      room(10, 125),
      hire('housekeeper', 4, 220),
      room(11, 155),
      svc('spa', 230),
      room(12, 190),
      up(3, 320),
      next(800),
    ],
  },
  {
    id: 'palace',
    rate: 15000,
    costBase: 20000,
    startRooms: 5,
    maxRooms: 14,
    chain: [
      room(6, 40),
      svc('parking', 50),
      room(7, 50),
      room(8, 60),
      svc('restaurant', 90),
      up(2, 100),
      room(9, 75),
      svc('pool', 140),
      room(10, 90),
      hire('housekeeper', 5, 240),
      room(11, 110),
      svc('spa', 190),
      room(12, 135),
      svc('casino', 260),
      room(13, 165),
      room(14, 200),
      svc('heliport', 330),
      up(3, 320),
      next(1200),
    ],
  },
];

/** Villes : la 1re est "Centre-ville", puis les 5 thèmes tournent sans fin. */
export const CITY_THEMES = ['town', 'beach', 'mountain', 'desert', 'mega', 'undersea'] as const;
export type ThemeId = (typeof CITY_THEMES)[number];

export const B = {
  // ----- Joueur -----
  player: {
    speed: 5.6, // unités/s
    radius: 0.36,
    capacity: 4, // serviettes portées
    collectRadius: 1.7, // effet "aimant" sur le cash
    payPerSecMin: 30, // débit mini de paiement sur une dalle ($/s)
    payDuration: 1.0, // une dalle se paie en ~1 s si le cash est là
    starterCash: 20, // pile de bienvenue posée dans le hall au tout début d'un run
  },

  // ----- Clients -----
  guest: {
    speed: 4.0,
    sleep: 5.5, // durée du séjour (s) — courte : on n'attend jamais
    spawnEvery: 1.5, // s entre deux arrivées tant que la file n'est pas pleine
    queueBase: 4, // taille de file de base
    checkinTip: 0.3, // part du tarif payée tout de suite à l'enregistrement (récompense immédiate)
    vipEvery: [50, 90] as [number, number], // s entre deux VIP
    vipMult: 6, // un VIP paie ×6
    serviceChance: 0.65, // proba d'utiliser un service après le séjour
    serviceTime: 4.5,
    servicePay: 0.55, // part du tarif chambre laissée au service
    parkingPay: 0.2, // pourboire voiturier à l'enregistrement
  },

  // ----- Zones (cercles au sol) -----
  zone: {
    radius: 0.95,
    checkin: 0.6, // s pour enregistrer un client (joueur)
    clean: 0.9, // s pour nettoyer une chambre (joueur)
    decay: 2.5, // vitesse de vidage quand on sort
    closetEvery: 0.07, // s entre deux serviettes chargées
  },

  roomLevelMult: [1, 1.5, 2.25],

  // ----- Staff (valeurs de base, avant niveaux) -----
  staff: {
    recCheckin: 1.0, // s par enregistrement
    hkSpeed: 4.0,
    hkClean: 1.4,
    hkCap: 2,
    bhSpeed: 4.6,
    speedPerLv: 0.08, // +8 % par niveau de vitesse
    recQueuePerLv: 1, // +1 place en file par niveau de capacité réception
    hkCapPerLv: 1,
    bhTipPerLv: 0.1, // +10 % de pourboire par niveau "bagages"
  },

  // ----- Améliorations (coût = base × growth^niveau) -----
  upgrades: {
    pSpeed: { base: 120, growth: 2.5, max: 10, per: 0.06 },
    pCap: { base: 150, growth: 2.6, max: 12, per: 1 },
    pIncome: { base: 250, growth: 2.15, max: 999, per: 0.1 },
    recSpeed: { base: 300, growth: 2.5, max: 10, per: 0.08 },
    recCap: { base: 400, growth: 3.0, max: 6, per: 1 },
    hkSpeed: { base: 350, growth: 2.5, max: 10, per: 0.08 },
    hkCap: { base: 300, growth: 2.7, max: 8, per: 1 },
    bhSpeed: { base: 300, growth: 2.5, max: 10, per: 0.08 },
    bhCap: { base: 500, growth: 2.8, max: 10, per: 0.1 },
  },

  // ----- Déblocage progressif des systèmes -----
  unlock: {
    staffTime: 150, // 2 min 30 de boucle de base seule (10 min à l'origine : jugé trop long au test)
    staffRooms: 4,
    upgradesStaff: 2, // améliorations : dès 2 employés (ou palier 2)
    questsBought: 3, // quêtes : 3 achats dans le palier 2
  },

  // ----- Combo "Rush" : enchaîner les actions soi-même gonfle les gains (bonus, jamais de malus) -----
  combo: {
    window: 6, // s pour enchaîner l'action suivante
    per: 0.05, // +5 % de cash par cran
    max: 10, // plafond : ×1,5
    rushAt: 6, // à partir de ce cran : mode RUSH (vitesse +12 %, traînée d'étincelles)
    rushSpeed: 1.12,
  },

  // ----- Pourboires oubliés : pièces d'or qui apparaissent dans l'hôtel -----
  tips: {
    every: [12, 22] as [number, number], // s entre deux pièces
    max: 3, // pièces simultanées
    value: 1.2, // en séjours au tarif courant
  },

  // ----- Villes -----
  city: {
    incomeMult: 2500, // revenus ×2 500 par ville : le motel suivant rapporte plus que le palace quitté
    costMult: 7500, // coûts ×7 500 par ville : chaque ville est ~3× plus longue → c'est le prestige qui débloque la suite
  },

  // ----- Prestige -----
  prestige: {
    starDiv: 65000, // étoiles = floor(sqrt(cashDuRun / starDiv)) → ~11 en arrivant au Palace, ~35 Palace terminé
    minStars: 5,
  },
  /** Arbre d'étoiles. Coût du niveau n (1-indexé) = cost × n. */
  stars: {
    income: { cost: 3, max: 999, per: 0.5, req: null as string | null },
    speed: { cost: 2, max: 10, per: 0.05, req: 'income' },
    capacity: { cost: 2, max: 10, per: 1, req: 'income' },
    offlineCap: { cost: 2, max: 11, per: 1, req: 'speed' }, // +1 h par niveau
    offlineRate: { cost: 2, max: 5, per: 0.1, req: 'capacity' },
    vip: { cost: 3, max: 5, per: 0.12, req: 'offlineRate' }, // VIP plus fréquents
    startCash: { cost: 4, max: 6, per: 1, req: 'offlineCap' }, // cash de départ
  },
  startCashBase: 150, // × 6^(niveau-1)

  // ----- Hors-ligne -----
  offline: {
    capHours: 2,
    baseRate: 0.4, // part du revenu automatisé estimé
    minSeconds: 60,
  },

  // ----- Boosts (pubs factices) -----
  boosts: {
    income: { mult: 2, duration: 300 },
    speed: { mult: 1.5, duration: 180 },
  },

  // ----- Quêtes & succès -----
  quests: {
    slots: 3,
    rewardStays: 6, // récompense = 6 séjours au tarif courant (× difficulté)
  },
  achievementBonus: 0.01, // +1 % de revenus par succès validé
  achievementSteps: [10, 50, 250, 1000, 5000, 25000, 100000],
};

export type UpgradeId = keyof typeof B.upgrades;
export type StarId = keyof typeof B.stars;
