import type { ThemeId } from '../balance';

/** Direction artistique : une palette par palier d'hôtel, une ambiance par ville. */
export interface TierStyle {
  wall: number;
  wallAlt: number; // plaques de peinture / panneaux
  trim: number; // couronnement des murs
  lobby: [number, number];
  lobbyPattern: 'plain' | 'planks' | 'checker';
  corridor: number;
  runner: number | null; // tapis de couloir
  runnerEdge: number;
  room: number;
  rug: number;
  locked: number;
  bedFrame: number;
  mattress: number;
  blanket: [number, number, number]; // par niveau de chambre
  pillow: number;
  wood: number;
  accent: number;
  metal: number;
  desk: number;
  deskTop: number;
  signText: string;
  signColor: string;
  signBg: number;
  dingy: boolean;
  luxe: number; // 0..3 : quantité de déco riche
}

export const TIER_STYLES: TierStyle[] = [
  {
    // Motel miteux : moutarde délavée, moquette verdâtre, néon rose fatigué
    wall: 0xd8c592,
    wallAlt: 0xb39f6e,
    trim: 0x8f5b45,
    lobby: [0xa98f70, 0x9a8062],
    lobbyPattern: 'plain',
    corridor: 0x86a070,
    runner: null,
    runnerEdge: 0,
    room: 0xb39c7c,
    rug: 0x9a6a55,
    locked: 0x77706a,
    bedFrame: 0x6f5440,
    mattress: 0xe2dbc6,
    blanket: [0x9bab6e, 0xc7705a, 0x5a96b8],
    pillow: 0xefe7d2,
    wood: 0x7c6045,
    accent: 0xff3d7f,
    metal: 0x9a9a9a,
    desk: 0x7a5c44,
    deskTop: 0xa3886a,
    signText: 'MOTEL',
    signColor: '#ff3d7f',
    signBg: 0x2a2433,
    dingy: true,
    luxe: 0,
  },
  {
    // Petit hôtel : crème et bleu, parquet clair
    wall: 0xf6eedd,
    wallAlt: 0xe9dcc2,
    trim: 0x3f86d6,
    lobby: [0xdcae74, 0xcf9d62],
    lobbyPattern: 'planks',
    corridor: 0xd3a56b,
    runner: 0x4f9be0,
    runnerEdge: 0xffffff,
    room: 0xe6cb9e,
    rug: 0x8fd0f2,
    locked: 0x9a9388,
    bedFrame: 0xa5703f,
    mattress: 0xffffff,
    blanket: [0x5fb3ee, 0x45d3b3, 0xff8f6b],
    pillow: 0xffffff,
    wood: 0xb07a45,
    accent: 0xffc94a,
    metal: 0xc9d2dc,
    desk: 0xb07a45,
    deskTop: 0xf3e2c4,
    signText: 'HOTEL',
    signColor: '#4fc3ff',
    signBg: 0x26456e,
    dingy: false,
    luxe: 1,
  },
  {
    // Hôtel de ville : pierre claire, marine et laiton, damier
    wall: 0xece6da,
    wallAlt: 0xd9d0c0,
    trim: 0x2c3f6b,
    lobby: [0xf4efe4, 0xaab4c8],
    lobbyPattern: 'checker',
    corridor: 0xcbb596,
    runner: 0xa9374b,
    runnerEdge: 0xe0b354,
    room: 0xcfa97c,
    rug: 0xa9374b,
    locked: 0x9a958c,
    bedFrame: 0x4a342a,
    mattress: 0xffffff,
    blanket: [0x3566b8, 0x8046ac, 0xc8384f],
    pillow: 0xfdfaf2,
    wood: 0x5e4032,
    accent: 0xe0b354,
    metal: 0xe0b354,
    desk: 0x4a342a,
    deskTop: 0xf1ede4,
    signText: 'GRAND HOTEL',
    signColor: '#ffd36b',
    signBg: 0x1f2a4a,
    dingy: false,
    luxe: 2,
  },
  {
    // Resort : blanc, turquoise et corail, bois blond
    wall: 0xfdf9f0,
    wallAlt: 0xf0e6d2,
    trim: 0x16b9b3,
    lobby: [0xf4e2c2, 0xe9d1a8],
    lobbyPattern: 'planks',
    corridor: 0xeed9b4,
    runner: 0x2cc7ba,
    runnerEdge: 0xffffff,
    room: 0xf2ddb6,
    rug: 0xff8f7a,
    locked: 0xb5ad9f,
    bedFrame: 0xe2b272,
    mattress: 0xffffff,
    blanket: [0xff7e67, 0xffc145, 0x35c9d6],
    pillow: 0xffffff,
    wood: 0xd9a35f,
    accent: 0xff5fa2,
    metal: 0xf4f4f4,
    desk: 0xd9a35f,
    deskTop: 0xffffff,
    signText: 'RESORT',
    signColor: '#5ff2e0',
    signBg: 0x0f5d6b,
    dingy: false,
    luxe: 2,
  },
  {
    // Palace : marbre, or et pourpre
    wall: 0xfffbf2,
    wallAlt: 0xf3e9d6,
    trim: 0xe9b93c,
    lobby: [0xfbf7f0, 0xd9bfd2],
    lobbyPattern: 'checker',
    corridor: 0xf1e7d6,
    runner: 0xb5173f,
    runnerEdge: 0xe9b93c,
    room: 0xeadcc6,
    rug: 0x6a3fb8,
    locked: 0xb8b0a4,
    bedFrame: 0xe9b93c,
    mattress: 0xffffff,
    blanket: [0x7b3fe4, 0xc2185b, 0x1e2f8f],
    pillow: 0xfff6dc,
    wood: 0x7a4a2e,
    accent: 0xffd54a,
    metal: 0xe9b93c,
    desk: 0xfffbf2,
    deskTop: 0xe9b93c,
    signText: 'PALACE',
    signColor: '#ffe27a',
    signBg: 0x3a1650,
    dingy: false,
    luxe: 3,
  },
];

export interface Mood {
  fog: number; // couleur d'horizon (haut de l'écran)
  ground: number;
  ground2: number; // taches / variation du sol
  path: number; // trottoir
  road: number;
  hemiSky: number;
  hemiGround: number;
  hemi: number;
  sun: number;
  sunI: number;
  glow: number; // intensité des néons
  vignette: string;
}

/** Ambiance de la 1re ville, par palier : du crépuscule glauque à l'heure dorée. */
export const TOWN_MOODS: Mood[] = [
  { fog: 0x6a5a9a, ground: 0x7d8a66, ground2: 0x6f7c5a, path: 0xa39a8c, road: 0x55555f, hemiSky: 0xeadcff, hemiGround: 0xb08a72, hemi: 2.55, sun: 0xffc08a, sunI: 2.1, glow: 1, vignette: 'rgba(40,18,80,.42)' },
  { fog: 0xbfe8ff, ground: 0x8fd66b, ground2: 0x7fc95c, path: 0xe6dcc8, road: 0x6a6f7a, hemiSky: 0xffffff, hemiGround: 0xbfd9a0, hemi: 2.5, sun: 0xfff1d6, sunI: 2.0, glow: 0.6, vignette: 'rgba(20,60,110,.28)' },
  { fog: 0xa9d8ff, ground: 0xa8b0b8, ground2: 0x8fd66b, path: 0xe9e4da, road: 0x4f5560, hemiSky: 0xffffff, hemiGround: 0xc9c2b8, hemi: 2.5, sun: 0xffffff, sunI: 2.1, glow: 0.6, vignette: 'rgba(20,40,90,.3)' },
  { fog: 0x9ff0e8, ground: 0xf4dfa4, ground2: 0x8fdc6b, path: 0xfff3d6, road: 0xd9c08a, hemiSky: 0xffffff, hemiGround: 0xffe7b0, hemi: 2.6, sun: 0xfff6dc, sunI: 2.2, glow: 0.6, vignette: 'rgba(0,80,110,.25)' },
  { fog: 0xffd9a8, ground: 0x6fcf6f, ground2: 0x5fc05f, path: 0xfbf3e2, road: 0x8a7f8f, hemiSky: 0xfff4e0, hemiGround: 0xd9b6e0, hemi: 2.5, sun: 0xffe2a8, sunI: 2.3, glow: 0.8, vignette: 'rgba(90,30,90,.3)' },
];

export const THEME_MOODS: Record<Exclude<ThemeId, 'town'>, Mood> = {
  beach: { fog: 0x8fe3ff, ground: 0xf6e2a8, ground2: 0xefd592, path: 0xfff6dc, road: 0xe0c890, hemiSky: 0xffffff, hemiGround: 0xffe9b8, hemi: 2.7, sun: 0xfff3d0, sunI: 2.2, glow: 0.6, vignette: 'rgba(0,90,140,.25)' },
  mountain: { fog: 0xdcecff, ground: 0xf4f8ff, ground2: 0xdfe9f7, path: 0xcfd6e2, road: 0x7c8494, hemiSky: 0xffffff, hemiGround: 0xcfdcf0, hemi: 2.6, sun: 0xfff6ea, sunI: 2.0, glow: 0.7, vignette: 'rgba(40,70,130,.3)' },
  desert: { fog: 0xffc98a, ground: 0xeeb46a, ground2: 0xe0a258, path: 0xf6d9a8, road: 0xb98a5a, hemiSky: 0xfff0d6, hemiGround: 0xf2b070, hemi: 2.6, sun: 0xffe0a8, sunI: 2.3, glow: 0.6, vignette: 'rgba(130,50,10,.3)' },
  mega: { fog: 0x2a1f5c, ground: 0x3a3a52, ground2: 0x33334a, path: 0x5a5a78, road: 0x24243a, hemiSky: 0xc9b8ff, hemiGround: 0x5a4a8a, hemi: 2.2, sun: 0xff9ee0, sunI: 1.7, glow: 1.2, vignette: 'rgba(20,0,60,.55)' },
  undersea: { fog: 0x0f6fa8, ground: 0x4fb8c4, ground2: 0x3fa6b6, path: 0x8fe0e0, road: 0x2f8fa6, hemiSky: 0xbff4ff, hemiGround: 0x2f7fa8, hemi: 2.4, sun: 0xa8f0ff, sunI: 1.8, glow: 1.1, vignette: 'rgba(0,30,80,.5)' },
};

/** Teinte d'accent des murs par ville (remplace `trim`). */
export const THEME_TRIM: Record<ThemeId, number | null> = {
  town: null,
  beach: 0xff8a5c,
  mountain: 0x9a5f34,
  desert: 0xd9703a,
  mega: 0x8a5cff,
  undersea: 0x12c4d6,
};

export function moodFor(theme: ThemeId, tier: number): Mood {
  if (theme === 'town') return TOWN_MOODS[tier];
  const m = { ...THEME_MOODS[theme] };
  // le motel reste un peu plus terne, le palace un peu plus chaud
  if (tier === 0) m.hemi *= 0.88;
  return m;
}
