import { TIERS, type Role, type ServiceId, type TierDef } from '../balance';

/**
 * Géométrie logique d'un établissement. Repère : X vers la droite, Z vers la caméra (sud).
 * Hall au sud (z 0..LD), couloir central vers le nord, chambres de part et d'autre,
 * services autour (A est, B ouest, C nord, D nord-est, E nord-ouest).
 */
export interface V2 {
  x: number;
  z: number;
}
export interface Box {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export const L = {
  CW: 1.6, // demi-largeur du couloir
  RW: 4.2, // largeur d'une chambre
  RD: 4.2, // profondeur d'une rangée
  LD: 7.5, // profondeur du hall
  HX: 5.8, // demi-largeur du bâtiment
  WT: 0.3, // épaisseur des murs
  WH: 1.2, // hauteur des murs (coupe "maison de poupée")
  DOOR: 1.5,
};

export interface RoomSlot {
  idx: number;
  side: -1 | 1;
  row: number;
  cx: number;
  cz: number;
  bed: V2; // centre du lit
  sleep: { x: number; z: number; yaw: number }; // pose du dormeur (pieds)
  stand: V2; // où le client se tient avant/après
  zone: V2; // cercle de nettoyage
  pile: V2; // cash laissé
  tile: V2; // dalle d'achat
}

export interface ServiceSlot {
  id: ServiceId;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  tile: V2;
  pile: V2;
  visits: V2[];
  entry: V2[]; // épine -> entrée de la zone
  colliders: Box[];
  swim: boolean;
}

export interface Layout {
  tier: TierDef;
  rows: number;
  zN: number; // z du bout nord du couloir
  rooms: RoomSlot[];
  walls: Box[];
  furniture: Box[]; // colliders fixes (comptoir, étagère)
  eastDoor: boolean;
  westDoor: boolean;
  northDoor: boolean;
  desk: V2;
  checkin: V2;
  queue: V2[];
  closetShelf: V2;
  closetZone: V2;
  entrance: V2;
  services: Partial<Record<ServiceId, ServiceSlot>>;
  hireTile: Record<Role, V2>;
  roomUpTile: V2;
  nextTile: V2;
  sign: V2;
  bounds: Box;
}

const wallH = (z: number, xa: number, xb: number): Box => ({ x0: xa, x1: xb, z0: z - L.WT / 2, z1: z + L.WT / 2 });
const wallV = (x: number, za: number, zb: number): Box => ({ x0: x - L.WT / 2, x1: x + L.WT / 2, z0: Math.min(za, zb), z1: Math.max(za, zb) });
const box = (cx: number, cz: number, w: number, d: number): Box => ({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 });

export function tierServices(tier: TierDef): ServiceId[] {
  const out: ServiceId[] = [];
  for (const c of tier.chain) if (c.kind === 'service') out.push(c.service);
  return out;
}

export function makeLayout(tierIndex: number): Layout {
  const tier = TIERS[tierIndex];
  const { CW, RD, LD, HX } = L;
  const rows = Math.ceil(tier.maxRooms / 2);
  const zN = -rows * RD;
  const svcIds = tierServices(tier);
  const has = (s: ServiceId): boolean => svcIds.includes(s);
  const eastDoor = has('cafe') || has('restaurant') || has('casino');
  const westDoor = has('spa') || has('heliport');
  const northDoor = has('pool');

  // ---- murs
  const walls: Box[] = [];
  walls.push(wallH(LD, -HX, -1.3), wallH(LD, 1.3, HX));
  if (eastDoor) walls.push(wallV(HX, 0, 4.6), wallV(HX, 6.6, LD));
  else walls.push(wallV(HX, 0, LD));
  if (westDoor) walls.push(wallV(-HX, 0, 4.6), wallV(-HX, 6.6, LD));
  else walls.push(wallV(-HX, 0, LD));
  walls.push(wallH(0, -HX, -CW), wallH(0, CW, HX));
  for (let r = 0; r < rows; r++) {
    const z0 = -r * RD;
    const z1 = -(r + 1) * RD;
    const cz = (z0 + z1) / 2;
    for (const s of [-1, 1]) {
      walls.push(wallV(s * CW, z1, cz - L.DOOR / 2), wallV(s * CW, cz + L.DOOR / 2, z0));
      walls.push(wallV(s * HX, z1, z0));
    }
    walls.push(wallH(z1, CW, HX), wallH(z1, -HX, -CW));
  }
  if (!northDoor) walls.push(wallH(zN, -CW, CW));

  // ---- chambres
  const rooms: RoomSlot[] = [];
  for (let i = 0; i < tier.maxRooms; i++) {
    const side = (i % 2 === 0 ? -1 : 1) as -1 | 1;
    const row = Math.floor(i / 2);
    const cz = -(row + 0.5) * RD;
    const cx = side * (CW + L.RW / 2);
    rooms.push({
      idx: i,
      side,
      row,
      cx,
      cz,
      bed: { x: side * 4.45, z: cz - 1.1 },
      sleep: { x: side * 3.9, z: cz - 1.1, yaw: side > 0 ? -Math.PI / 2 : Math.PI / 2 },
      stand: { x: side * 3.4, z: cz + 0.15 },
      zone: { x: side * 3.5, z: cz + 0.75 },
      pile: { x: side * 2.45, z: cz - 1.35 },
      tile: { x: cx, z: cz + 0.1 },
    });
  }

  // ---- hall
  const desk = { x: 3.2, z: 3.0 };
  const checkin = { x: 3.2, z: 1.75 };
  const queue: V2[] = [
    { x: 3.2, z: 4.15 },
    { x: 3.2, z: 5.05 },
    { x: 3.2, z: 5.95 },
    { x: 2.3, z: 6.5 },
    { x: 1.4, z: 6.6 },
    { x: 0.5, z: 6.7 },
    { x: -0.4, z: 6.7 },
    { x: -1.2, z: 6.5 },
    { x: -1.9, z: 6.0 },
    { x: -2.4, z: 5.3 },
  ];
  const closetShelf = { x: -5.1, z: 1.4 };
  const closetZone = { x: -3.7, z: 1.4 };
  const furniture: Box[] = [box(desk.x, desk.z, 3.0, 0.85), box(closetShelf.x, closetShelf.z, 0.9, 2.5)];

  // ---- services
  const services: Partial<Record<ServiceId, ServiceSlot>> = {};
  const entryA: V2[] = [
    { x: 0, z: 5.6 },
    { x: 5.8, z: 5.6 },
    { x: 7.0, z: 5.6 },
  ];
  const entryB: V2[] = entryA.map((p) => ({ x: -p.x, z: p.z }));
  if (has('vending')) {
    services.vending = {
      id: 'vending',
      x0: -5.6,
      z0: 5.6,
      x1: -3.2,
      z1: 7.35,
      tile: { x: -4.5, z: 5.1 },
      pile: { x: -3.5, z: 6.75 },
      visits: [
        { x: -4.9, z: 6.0 },
        { x: -4.2, z: 6.15 },
      ],
      entry: [{ x: 0, z: 5.9 }],
      colliders: [box(-4.9, 6.95, 1.0, 0.75)],
      swim: false,
    };
  }
  if (has('parking')) {
    services.parking = {
      id: 'parking',
      x0: 1.5,
      z0: 8.6,
      x1: 13,
      z1: 12.6,
      tile: { x: 3.4, z: 10.3 },
      pile: { x: 2.6, z: 8.75 },
      visits: [],
      entry: [
        { x: 0, z: 7.5 },
        { x: 0, z: 8.5 },
      ],
      colliders: [box(4.3, 8.55, 0.9, 0.9)],
      swim: false,
    };
  }
  const foodId: ServiceId | null = has('restaurant') ? 'restaurant' : has('cafe') ? 'cafe' : null;
  if (foodId) {
    const tables: V2[] = [
      { x: 8.6, z: 2.0 },
      { x: 11.6, z: 2.0 },
      { x: 9.4, z: 4.9 },
      { x: 12.2, z: 5.1 },
    ];
    services[foodId] = {
      id: foodId,
      x0: 6.4,
      z0: 0.3,
      x1: 13.8,
      z1: 7.3,
      tile: { x: 10.2, z: 3.6 },
      pile: { x: 7.3, z: 6.75 },
      visits: tables.map((t) => ({ x: t.x - 0.95, z: t.z + 0.1 })),
      entry: entryA,
      colliders: tables.map((t) => box(t.x, t.z, 1.0, 1.0)),
      swim: false,
    };
  }
  if (has('spa')) {
    services.spa = {
      id: 'spa',
      x0: -13.8,
      z0: 0.3,
      x1: -6.4,
      z1: 7.3,
      tile: { x: -10.2, z: 3.6 },
      pile: { x: -7.3, z: 6.75 },
      visits: [
        { x: -10.6, z: 2.6 },
        { x: -9.6, z: 3.3 },
        { x: -11.3, z: 3.4 },
        { x: -10.3, z: 3.9 },
      ],
      entry: entryB,
      colliders: [box(-10.4, 3.3, 3.3, 3.3)],
      swim: true,
    };
  }
  if (has('pool')) {
    services.pool = {
      id: 'pool',
      x0: -5.6,
      z0: zN - 9.6,
      x1: 5.6,
      z1: zN - 0.6,
      tile: { x: 0, z: zN - 5.6 },
      pile: { x: 2.4, z: zN - 1.5 },
      visits: [
        { x: -2.2, z: zN - 4.8 },
        { x: 1.6, z: zN - 5.2 },
        { x: -0.6, z: zN - 6.6 },
        { x: 2.5, z: zN - 7.0 },
        { x: -2.6, z: zN - 7.2 },
      ],
      entry: [
        { x: 0, z: zN },
        { x: 0, z: zN - 2.0 },
      ],
      colliders: [box(0, zN - 5.9, 7.7, 5.1)],
      swim: true,
    };
  }
  if (has('casino')) {
    services.casino = {
      id: 'casino',
      x0: 6.4,
      z0: -8.8,
      x1: 13.8,
      z1: -0.5,
      tile: { x: 10.2, z: -4.6 },
      pile: { x: 7.4, z: -1.3 },
      visits: [
        { x: 8.4, z: -4.9 },
        { x: 10.2, z: -4.9 },
        { x: 12.0, z: -4.9 },
        { x: 10.2, z: -2.6 },
      ],
      entry: [...entryA, { x: 7.6, z: 1.2 }, { x: 8.2, z: -1.4 }],
      colliders: [box(10.2, -6.6, 5.0, 1.0)],
      swim: false,
    };
  }
  if (has('heliport')) {
    services.heliport = {
      id: 'heliport',
      x0: -13.8,
      z0: -8.8,
      x1: -6.4,
      z1: -0.5,
      tile: { x: -10.2, z: -4.6 },
      pile: { x: -7.4, z: -1.3 },
      visits: [],
      entry: [...entryB, { x: -7.6, z: 1.2 }, { x: -8.2, z: -1.4 }],
      colliders: [box(-10.4, -5.0, 2.6, 2.6)],
      swim: false,
    };
  }

  const sideSvc = eastDoor || westDoor;
  return {
    tier,
    rows,
    zN,
    rooms,
    walls,
    furniture,
    eastDoor,
    westDoor,
    northDoor,
    desk,
    checkin,
    queue,
    closetShelf,
    closetZone,
    entrance: { x: 0, z: LD },
    services,
    hireTile: {
      receptionist: { x: 4.9, z: 1.0 },
      housekeeper: { x: -4.2, z: 3.85 },
      bellhop: { x: -1.7, z: 5.9 },
    },
    roomUpTile: { x: -1.9, z: 3.3 },
    nextTile: { x: -3.0, z: 11.2 },
    sign: { x: -2.8, z: 9.45 },
    bounds: { x0: sideSvc ? -14.4 : -9.5, x1: sideSvc ? 14.4 : 13.5, z0: northDoor ? zN - 10.2 : zN - 1.2, z1: 12.8 },
  };
}

// ------------------------------------------------------------------ navigation
/** Une "place" = chemin depuis l'épine du couloir (x=0) jusqu'au point final. */
export type Approach = V2[];

export const places = {
  room(l: Layout, i: number, end: V2): Approach {
    const r = l.rooms[i];
    return [{ x: 0, z: r.cz }, { x: r.side * (L.CW + 0.7), z: r.cz }, end];
  },
  queue(l: Layout, k: number): Approach {
    return [{ x: 0, z: 6.9 }, l.queue[Math.min(k, l.queue.length - 1)]];
  },
  exit(l: Layout, side: number): Approach {
    return [{ x: 0, z: L.LD }, { x: 0, z: 8.45 }, { x: side * (l.bounds.x1 + 4), z: 8.45 + (side > 0 ? 0 : 0.5) }];
  },
  desk(l: Layout, i: number): Approach {
    return [{ x: 0, z: 1.2 }, { x: 2.0, z: 1.2 }, { x: l.checkin.x + (i === 0 ? 0 : (i % 2 ? 0.75 : -0.75)), z: l.checkin.z - 0.05 }];
  },
  closet(l: Layout): Approach {
    return [{ x: 0, z: 1.5 }, { x: l.closetZone.x + 0.2, z: l.closetZone.z + 0.1 }];
  },
  hkIdle(_l: Layout, i: number): Approach {
    return [{ x: 0, z: 2.7 }, { x: -2.3 - 0.75 * i, z: 2.7 }];
  },
  bhIdle(_l: Layout, i: number): Approach {
    return [{ x: 0, z: 6.2 }, { x: -1.0 - 0.8 * i, z: 6.85 }];
  },
  service(s: ServiceSlot, end: V2): Approach {
    return [...s.entry, end];
  },
  free(p: V2): Approach {
    return [{ x: 0, z: p.z }, p];
  },
};

const same = (a: V2, b: V2): boolean => Math.abs(a.x - b.x) < 0.01 && Math.abs(a.z - b.z) < 0.01;

/** Chemin d'une place à une autre, en remontant jusqu'au dernier point commun. */
export function route(from: Approach, to: Approach): V2[] {
  let c = 0;
  while (c < from.length - 1 && c < to.length - 1 && same(from[c], to[c])) c++;
  const out: V2[] = [];
  for (let i = from.length - 2; i >= c; i--) out.push(from[i]);
  if (c > 0 && out.length === 0) out.push(from[c - 1]);
  for (let i = c; i < to.length; i++) out.push(to[i]);
  return out;
}
