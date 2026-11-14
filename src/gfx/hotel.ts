import * as THREE from 'three';
import type { ServiceId, ThemeId } from '../balance';
import { L, type Layout, type RoomSlot } from '../game/layout';
import { Builder, disposeGroup } from './build';
import { glowMat, waterMat, waterTex } from './materials';
import * as P from './props';
import { moodFor, THEME_TRIM, TIER_STYLES, type Mood, type TierStyle } from './styles';

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Pop {
  o: THREE.Object3D;
  t: number;
  delay: number;
}

const CAR_COLORS = [0xff6b6b, 0x4ecdc4, 0xffd166, 0x5b8def, 0xf4f1de, 0xb983ff];

/** Tout le visuel d'un établissement : base, chambres, services, environnement, enseigne. */
export class HotelView {
  readonly root = new THREE.Group();
  readonly style: TierStyle;
  readonly mood: Mood;
  private rooms: (THREE.Group | null)[] = [];
  private mess: (THREE.Group | null)[] = [];
  private services: Partial<Record<ServiceId, THREE.Group>> = {};
  private cars: THREE.Group[] = [];
  private carsShown = 0;
  private pops: Pop[] = [];
  private anims: ((dt: number, t: number) => void)[] = [];
  private waters: THREE.Mesh[] = [];
  private disposables: { dispose(): void }[] = [];
  private roomLevel = 1;

  constructor(
    private scene: THREE.Scene,
    private layout: Layout,
    private tier: number,
    private theme: ThemeId,
  ) {
    const base = TIER_STYLES[tier];
    const trim = THEME_TRIM[theme];
    this.style = trim && !base.dingy ? { ...base, trim, runner: base.runner === null ? null : trim } : base;
    this.mood = moodFor(theme, tier);
    scene.add(this.root);
    this.buildGround();
    this.buildBase();
    this.buildEnvironment();
    this.buildSign();
    this.buildCars();
  }

  // ------------------------------------------------------------------ sol
  private buildGround(): void {
    const g = new THREE.PlaneGeometry(260, 260);
    g.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshLambertMaterial({ color: this.mood.ground });
    const m = new THREE.Mesh(g, mat);
    m.position.y = -0.03;
    m.matrixAutoUpdate = false;
    m.updateMatrix();
    this.root.add(m);
    this.disposables.push(g, mat);
  }

  // ------------------------------------------------------------------ base
  private buildBase(): void {
    const { layout: l, style: st, mood } = this;
    const { CW, HX, LD, WH } = L;
    const b = new Builder();
    const rnd = rng(1234 + this.tier * 17);

    // --- extérieur : trottoir, parking, route
    const ex = l.bounds.x1 + 6;
    b.slab(-ex, LD + 0.15, ex, 9.1, mood.path, -0.005, 0.05);
    b.slab(-ex, 13.2, ex, 18.2, mood.road, -0.005, 0.05);
    for (let x = -ex + 1; x < ex; x += 3) b.slab(x, 15.6, x + 1.5, 15.8, 0xf4e9b0, 0.0, 0.05);
    const lot = st.dingy ? 0x7a7682 : P.lighten(mood.road, 0.06);
    b.slab(0.9, 9.1, 13.4, 13.2, lot, -0.004, 0.05);
    for (let i = 0; i <= 5; i++) b.slab(1.2 + i * 2.35, 9.7, 1.3 + i * 2.35, 12.6, st.dingy ? 0xc9c6bd : 0xffffff, 0.001, 0.05);
    b.slab(-1.2, LD - 0.1, 1.2, 8.3, st.dingy ? 0xc44a72 : st.runner ?? st.accent, 0.0, 0.05); // paillasson
    if (st.dingy) {
      // fissures, herbes folles, flaques
      for (let i = 0; i < 9; i++) {
        const x = 1.5 + rnd() * 11;
        const z = 9.4 + rnd() * 3.4;
        b.box(0.9 + rnd(), 0.012, 0.05, 0x33333a, x, 0, z, { r: 0, ry: rnd() * 3 });
      }
      for (let i = 0; i < 14; i++) {
        const x = -9 + rnd() * 22;
        const z = 7.9 + rnd() * 5;
        b.cyl(0.01, 0.1, 0.3, 0x6f8a4a, x, 0, z, { seg: 5, rz: (rnd() - 0.5) * 0.6 });
        b.cyl(0.01, 0.08, 0.22, 0x7f9a52, x + 0.1, 0, z + 0.05, { seg: 5, rz: (rnd() - 0.5) * 0.8 });
      }
      b.cyl(0.9, 0.9, 0.012, 0x3a3f4f, 7.5, 0.002, 11.6, { seg: 12, sz: 0.6 });
      b.cyl(0.5, 0.5, 0.012, 0x3a3f4f, -3.5, 0.002, 8.6, { seg: 10, sx: 1.4 });
    }

    // --- sols intérieurs
    const [c1, c2] = st.lobby;
    if (st.lobbyPattern === 'checker') {
      const n = 8;
      const sx = (HX * 2) / n;
      const nz = 5;
      const sz = LD / nz;
      for (let i = 0; i < n; i++) for (let k = 0; k < nz; k++) b.slab(-HX + i * sx, k * sz, -HX + (i + 1) * sx, (k + 1) * sz, (i + k) % 2 ? c1 : c2, 0, 0.06);
      if (st.dingy) {
        // lino fatigué : dalles ternies, dalles manquantes, taches
        for (let i = 0; i < 7; i++) {
          const ti = Math.floor(rnd() * n);
          const tk = Math.floor(rnd() * nz);
          const col = i % 3 === 0 ? 0xb9ab95 : P.lighten((ti + tk) % 2 ? c1 : c2, -0.09);
          b.slab(-HX + ti * sx + 0.04, tk * sz + 0.04, -HX + (ti + 1) * sx - 0.04, (tk + 1) * sz - 0.04, col, 0.003, 0.06);
        }
        for (let i = 0; i < 5; i++) b.cyl(0.25 + rnd() * 0.3, 0.3, 0.012, 0xcdb894, -4.8 + rnd() * 9, 0.008, 0.8 + rnd() * 6, { seg: 9, sz: 0.6 + rnd() * 0.5, grad: 0 });
      }
    } else if (st.lobbyPattern === 'planks') {
      const n = 10;
      const sz = LD / n;
      for (let k = 0; k < n; k++) b.slab(-HX, k * sz, HX, (k + 1) * sz, k % 2 ? c1 : c2, 0, 0.06);
    } else {
      b.slab(-HX, 0, HX, LD, c1, 0, 0.06);
      // lino usé : plaques rapiécées
      for (let i = 0; i < 7; i++) {
        const x = -5 + rnd() * 9;
        const z = 0.6 + rnd() * 6;
        b.slab(x, z, x + 0.8 + rnd() * 1.2, z + 0.6 + rnd(), i % 2 ? c2 : P.lighten(c1, -0.05), 0.003, 0.06);
      }
    }
    b.slab(-CW, l.zN, CW, 0, st.corridor, 0, 0.06);
    if (st.runner !== null) {
      b.slab(-0.95, l.zN + 0.3, 0.95, 0.4, st.runnerEdge, 0.004, 0.06);
      b.slab(-0.8, l.zN + 0.3, 0.8, 0.4, st.runner, 0.008, 0.06);
      b.slab(-0.95, 0.4, 0.95, LD - 0.3, st.runnerEdge, 0.004, 0.06);
      b.slab(-0.8, 0.4, 0.8, LD - 0.3, st.runner, 0.008, 0.06);
    } else {
      for (let i = 0; i < 8; i++) {
        const z = l.zN + 0.5 + rnd() * (-l.zN - 1.5);
        b.slab(-1.2 + rnd() * 1.4, z, -0.2 + rnd() * 1.4, z + 0.5 + rnd() * 0.8, P.lighten(st.corridor, i % 2 ? -0.06 : 0.04), 0.003, 0.06);
      }
    }
    for (const r of l.rooms) this.roomFloor(b, r, st.locked, 0);
    // chambres pas encore achetées : cartons et bâche
    for (const r of l.rooms) {
      const s = r.side;
      b.box(0.6, 0.5, 0.6, 0xb8936a, s * 5.0, 0.0, r.cz - 1.5, { r: 0.04, ry: 0.3 });
      b.box(0.5, 0.4, 0.5, 0xa5825c, s * 4.3, 0.0, r.cz - 1.6, { r: 0.04, ry: -0.2 });
      b.box(0.45, 0.36, 0.45, 0xc9a27a, s * 4.9, 0.5, r.cz - 1.5, { r: 0.04, ry: 0.7 });
    }

    // --- murs
    for (const w of l.walls) {
      const ww = w.x1 - w.x0;
      const wd = w.z1 - w.z0;
      const cx = (w.x0 + w.x1) / 2;
      const cz = (w.z0 + w.z1) / 2;
      b.box(ww, WH, wd, st.wall, cx, 0, cz, { r: 0.05, grad: 0.22 });
      b.box(ww + 0.08, 0.13, wd + 0.08, st.trim, cx, WH - 0.02, cz, { r: 0.05, grad: 0 });
      b.shadow(cx, cz + (ww > wd ? 0.25 : 0), ww + 0.5, wd + 0.6, 0.3);
      if (st.dingy) {
        // peinture écaillée : plaques sur les faces sud et sur le couronnement
        if (ww > wd) {
          const n = Math.floor(ww / 1.4);
          for (let i = 0; i < n; i++) {
            if (rnd() < 0.55) b.box(0.4 + rnd() * 0.7, 0.25 + rnd() * 0.5, 0.02, rnd() < 0.5 ? st.wallAlt : 0xd08a62, w.x0 + 0.5 + i * 1.4 + rnd() * 0.4, 0.15 + rnd() * 0.4, w.z1 + 0.003, { r: 0.01, grad: 0 });
          }
        }
        if (rnd() < 0.6) {
          const t = rnd();
          b.box(ww > wd ? 0.7 : ww + 0.1, 0.14, ww > wd ? wd + 0.1 : 0.7, P.lighten(st.trim, -0.2), ww > wd ? w.x0 + 0.5 + t * Math.max(0, ww - 1) : cx, WH - 0.02, ww > wd ? cz : w.z0 + 0.5 + t * Math.max(0, wd - 1), { r: 0.04, grad: 0 });
        }
      } else if (st.luxe >= 2 && ww > wd && ww > 2) {
        b.box(ww - 0.4, 0.08, 0.03, st.metal, cx, 0.5, w.z1 + 0.004, { r: 0.01, grad: 0 });
      }
    }
    // numéros / paillassons de porte
    for (const r of l.rooms) {
      b.slab(r.side * (CW - 0.75), r.cz - 0.5, r.side * (CW - 0.2), r.cz + 0.5, st.dingy ? 0xd0764f : st.accent, 0.012, 0.06);
    }

    // portes : battant ouvert à 90° dans chaque chambre, face caméra
    const doorC = st.dingy ? P.lighten(st.trim, -0.06) : st.luxe >= 3 ? st.metal : P.lighten(st.wood, 0.06);
    for (const r of l.rooms) {
      const dx = r.side * (CW + 0.15 + 0.37);
      const dz = r.cz - L.DOOR / 2 - 0.04;
      b.box(0.74, WH * 0.96, 0.09, doorC, dx, 0, dz, { r: 0.03 });
      b.box(0.5, WH * 0.34, 0.1, P.lighten(doorC, 0.1), dx, WH * 0.5, dz, { r: 0.02, grad: 0 });
      b.sph(0.06, st.metal, dx + r.side * 0.24, WH * 0.45, dz + 0.07, { seg: 6 });
    }

    // --- abords : haies, arbres et massifs le long du bâtiment (là où il n'y a pas de service)
    const leaf = st.dingy ? 0x8fb35a : 0x4fbf5f;
    const hasE = !!(l.services.casino || l.services.heliport);
    for (let r = 0; r < l.rows; r++) {
      const z = -(r + 0.5) * L.RD;
      for (const side of [-1, 1]) {
        if (hasE) continue;
        P.bush(b.push(side * (HX + 0.95), 0, z - 1.0 + rnd() * 0.4, rnd() * 3), r % 3 === 1 ? P.lighten(leaf, 0.06) : leaf);
        b.pop();
        P.bush(b.push(side * (HX + 1.05), 0, z + 1.0 + rnd() * 0.4, rnd() * 3), leaf);
        b.pop();
        if (r % 2 === 0) {
          P.tree(b.push(side * (HX + 2.7), 0, z + rnd(), rnd() * 3), st.dingy ? 0x9ab85e : r % 4 === 0 ? 0xff9ec4 : leaf, 0.95 + rnd() * 0.3);
          b.pop();
        } else if (!st.dingy) {
          P.flowerBed(b.push(side * (HX + 2.4), 0, z, Math.PI / 2), 0xff7eb6, 0xffd166);
          b.pop();
        }
      }
    }
    if (!l.northDoor) {
      for (let x = -4.8; x <= 4.8; x += 1.6) {
        P.bush(b.push(x, 0, l.zN - 1.0 + rnd() * 0.3, rnd() * 3), leaf);
        b.pop();
      }
      P.tree(b.push(-3.2, 0, l.zN - 2.6), leaf, 1.2);
      b.pop();
      P.tree(b.push(3.4, 0, l.zN - 2.9), st.dingy ? 0x9ab85e : 0xff9ec4, 1.1);
      b.pop();
    }
    for (const side of [-1, 1]) {
      const used = side > 0 ? l.eastDoor : l.westDoor;
      if (used) continue;
      for (let k = 0; k < 3; k++) {
        P.bush(b.push(side * (HX + 0.95), 0, 1.2 + k * 2.4 + rnd() * 0.3, rnd() * 3), k === 1 ? P.lighten(leaf, 0.06) : leaf);
        b.pop();
      }
      if (st.dingy) {
        // bidons et pneus oubliés
        b.cyl(0.32, 0.32, 0.8, 0x4f9a9a, side * (HX + 2.3), 0, 2.2, { seg: 10 });
        b.cyl(0.32, 0.32, 0.8, 0xd9773f, side * (HX + 2.9), 0, 2.9, { seg: 10 });
        b.shadow(side * (HX + 2.6), 2.5, 1.8, 1.6, 0.3);
        b.cyl(0.4, 0.4, 0.22, 0x33333a, side * (HX + 2.4), 0, 5.2, { seg: 12 });
        b.cyl(0.4, 0.4, 0.22, 0x33333a, side * (HX + 2.5), 0.22, 5.25, { seg: 12 });
      } else {
        P.tree(b.push(side * (HX + 2.6), 0, 3.4), 0xff9ec4, 1.1);
        b.pop();
      }
    }

    // --- hall
    P.desk(b.push(l.desk.x, 0, l.desk.z), st);
    b.pop();
    P.linenShelf(b.push(l.closetShelf.x, 0, l.closetShelf.z), st);
    b.pop();
    b.slab(l.closetZone.x - 1.3, l.closetZone.z - 1.3, l.closetZone.x + 1.3, l.closetZone.z + 1.3, P.lighten(st.rug, st.dingy ? 0.04 : 0.1), 0.006, 0.06);
    if (!l.services.vending) {
      P.sofa(b.push(-3.6, 0, 6.85, Math.PI), st.luxe >= 3 ? 0x7b3fe4 : st.runner ?? 0x5b8def);
      b.pop();
    }
    if (st.luxe >= 1) {
      P.plant(b.push(5.2, 0, 0.55), st.luxe >= 3 ? 2 : 1);
      b.pop();
      P.plant(b.push(1.9, 0, 7.0), st.luxe >= 3 ? 2 : 1);
      b.pop();
    } else {
      P.trashCan(b.push(1.9, 0, 6.95));
      b.pop();
    }
    if (st.luxe >= 3) {
      for (const [x, z] of [[-2.2, 0.55], [2.2, 0.55], [-1.6, LD + 0.9], [1.6, LD + 0.9]] as const) {
        P.column(b.push(x, 0, z), st.wall, st.metal);
        b.pop();
      }
      P.fountain(b.push(-7.2, 0, 10.9), 0xfbf7f0, st.metal);
      b.pop();
    } else if (st.luxe >= 1) {
      for (const x of [-1.7, 1.7]) {
        P.lampPost(b.push(x, 0, LD + 0.75), st.luxe >= 2 ? 0x2c3f6b : 0x3b3b4f);
        b.pop();
      }
      P.flowerBed(b.push(-3.6, 0, LD + 0.55), 0xff7eb6, 0xffd166);
      b.pop();
      P.flowerBed(b.push(3.9, 0, LD + 0.55), 0xffd166, 0xff7eb6);
      b.pop();
    } else {
      P.lampPost(b.push(1.9, 0, LD + 0.8), 0x4a4a52, true);
      b.pop();
      P.trashCan(b.push(-1.9, 0, LD + 0.7));
      b.pop();
    }
    this.root.add(b.build());
  }

  private roomFloor(b: Builder, r: RoomSlot, color: number, y: number): void {
    const { CW, HX, RD, WT } = L;
    const x0 = r.side * (CW + WT / 2);
    const x1 = r.side * (HX - WT / 2);
    b.slab(x0, r.cz - RD / 2 + WT / 2, x1, r.cz + RD / 2 - WT / 2, color, y, 0.06);
  }

  // ------------------------------------------------------------- chambres
  private buildRoom(i: number): void {
    const r = this.layout.rooms[i];
    const st = this.style;
    const lv = this.roomLevel;
    const b = new Builder();
    this.roomFloor(b, r, st.room, 0.014);
    if (st.lobbyPattern === 'planks' || st.luxe >= 2) {
      // lames de parquet
      for (let k = 0; k < 4; k++) b.slab(r.side * 1.8, r.cz - 1.9 + k * 1.0, r.side * 5.6, r.cz - 1.87 + k * 1.0, P.lighten(st.room, -0.07), 0.016, 0.06);
    }
    b.push(r.cx, 0, r.cz);
    P.roomExtras(b, st, lv, r.side);
    b.pop();
    P.bed(b.push(r.bed.x, 0, r.bed.z, r.side > 0 ? 0 : Math.PI), st, lv);
    b.pop();
    P.nightstand(b.push(r.side * 5.2, 0, r.cz + 0.2), st, lv);
    b.pop();
    const g = b.build();
    this.root.add(g);
    this.rooms[i] = g;

    const mb = new Builder();
    mb.push(r.cx, 0, r.cz);
    P.roomMess(mb, st, r.side);
    mb.pop();
    const m = mb.build();
    m.visible = false;
    this.root.add(m);
    this.mess[i] = m;
  }

  /** Synchronise les chambres possédées ; `pop` anime les nouvelles. */
  setRooms(owned: number, level: number, pop: boolean): void {
    const rebuild = level !== this.roomLevel;
    this.roomLevel = level;
    for (let i = 0; i < this.layout.rooms.length; i++) {
      if (i < owned && (rebuild || !this.rooms[i])) {
        const dirty = this.mess[i]?.visible ?? false;
        if (this.rooms[i]) disposeGroup(this.rooms[i]!);
        if (this.mess[i]) disposeGroup(this.mess[i]!);
        this.buildRoom(i);
        this.mess[i]!.visible = dirty;
        if (pop) this.pop(this.rooms[i]!, rebuild ? i * 0.07 : 0, this.layout.rooms[i]);
      }
    }
  }
  setDirty(i: number, dirty: boolean): void {
    const m = this.mess[i];
    if (!m || m.visible === dirty) return;
    m.visible = dirty;
    if (dirty) this.pop(m, 0, this.layout.rooms[i]);
  }

  /** Animation "pop" : l'objet jaillit du sol avec rebond, autour de son pivot. */
  private pop(o: THREE.Object3D, delay: number, pivot?: { cx: number; cz: number } | { x: number; z: number }): void {
    const px = pivot ? ('cx' in pivot ? pivot.cx : pivot.x) : 0;
    const pz = pivot ? ('cz' in pivot ? pivot.cz : pivot.z) : 0;
    o.userData.px = px;
    o.userData.pz = pz;
    o.scale.setScalar(0.001);
    o.position.set(px, 0, pz);
    this.pops.push({ o, t: 0, delay });
  }

  // ------------------------------------------------------------- services
  setServices(ids: ServiceId[], pop: boolean): void {
    for (const id of ids) {
      if (this.services[id]) continue;
      const slot = this.layout.services[id];
      if (!slot) continue;
      const g = this.buildService(id);
      this.root.add(g);
      this.services[id] = g;
      if (pop) this.pop(g, 0, { x: (slot.x0 + slot.x1) / 2, z: (slot.z0 + slot.z1) / 2 });
    }
  }

  private water(g: THREE.Group, x0: number, z0: number, x1: number, z1: number, y: number): void {
    const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    geo.rotateX(-Math.PI / 2);
    const uv = geo.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * (x1 - x0)) / 3, (uv.getY(i) * (z1 - z0)) / 3);
    const m = new THREE.Mesh(geo, waterMat);
    m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    g.add(m);
    this.waters.push(m);
  }

  private buildService(id: ServiceId): THREE.Group {
    const st = this.style;
    const s = this.layout.services[id]!;
    const b = new Builder();
    const cx = (s.x0 + s.x1) / 2;
    const cz = (s.z0 + s.z1) / 2;
    const extra = new THREE.Group();
    // soucoupe à pourboires
    b.cyl(0.62, 0.66, 0.05, st.metal, s.pile.x, 0, s.pile.z, { seg: 16 });
    b.cyl(0.5, 0.5, 0.06, P.lighten(st.metal, 0.12), s.pile.x, 0, s.pile.z, { seg: 16 });

    if (id === 'vending') {
      P.vending(b.push(-4.9, 0, 6.95));
      b.pop();
    } else if (id === 'parking') {
      // guérite du voiturier + panneau P
      b.push(4.3, 0, 8.55);
      b.shadow(0, 0, 1.5, 1.5, 0.35);
      b.box(0.9, 1.1, 0.9, st.luxe >= 3 ? 0xfffbf2 : 0x3f7fe8, 0, 0, 0, { r: 0.1 });
      b.box(1.1, 0.14, 1.1, st.luxe >= 3 ? st.metal : 0xffffff, 0, 1.1, 0, { r: 0.05 });
      b.cyl(0.05, 0.05, 1.5, 0xd9d9d9, 0.9, 0, 0, { seg: 6 });
      b.box(0.6, 0.6, 0.08, 0x3f7fe8, 0.9, 1.5, 0, { r: 0.1 });
      b.box(0.1, 0.36, 0.1, 0xffffff, 0.82, 1.62, 0.02, { r: 0.02 });
      b.box(0.22, 0.2, 0.1, 0xffffff, 0.94, 1.78, 0.02, { r: 0.06 });
      b.pop();
      for (let i = 0; i <= 5; i++) b.cyl(0.14, 0.18, 0.4, 0xff9f43, 1.25 + i * 2.35, 0, 12.9, { seg: 8 });
    } else if (id === 'cafe' || id === 'restaurant') {
      const fancy = id === 'restaurant';
      b.slab(s.x0, s.z0, s.x1, s.z1, fancy ? P.lighten(st.lobby[0], -0.03) : 0xd9b98a, 0.01, 0.06);
      if (fancy) {
        for (let i = 0; i < 5; i++) for (let k = 0; k < 5; k++) if ((i + k) % 2) b.slab(s.x0 + i * 1.48, s.z0 + k * 1.4, s.x0 + (i + 1) * 1.48, s.z0 + (k + 1) * 1.4, st.lobby[1], 0.014, 0.06);
      } else {
        for (let k = 0; k < 7; k++) b.slab(s.x0, s.z0 + k, s.x1, s.z0 + k + 0.06, 0xc4a070, 0.014, 0.06);
      }
      const tops = fancy ? 0xffffff : 0xfff3dc;
      const seat = fancy ? st.runner ?? 0xa9374b : 0xff8f6b;
      for (const c of s.colliders) {
        P.tableSet(b.push((c.x0 + c.x1) / 2, 0, (c.z0 + c.z1) / 2), tops, seat, fancy ? null : [0xff6b6b, 0x4ecdc4, 0xffd166, 0xff9f43][Math.floor(c.x0) % 4]);
        b.pop();
      }
      // comptoir / cuisine au fond
      b.push(cx + 0.4, 0, s.z0 + 0.75);
      b.shadow(0, 0.2, 4.4, 1.6, 0.36);
      b.box(3.8, 0.95, 0.8, fancy ? st.desk : 0xff8f6b, 0, 0, 0, { r: 0.1 });
      b.box(4.0, 0.1, 1.0, fancy ? st.deskTop : 0xffffff, 0, 0.95, 0, { r: 0.04 });
      b.cyl(0.2, 0.26, 0.24, 0xd9d9d9, -1.2, 1.05, 0, { seg: 10 });
      b.sph(0.2, 0xd9d9d9, -1.2, 1.3, 0, { sy: 0.5, seg: 8 });
      b.cyl(0.26, 0.26, 0.05, 0xffffff, 0, 1.05, 0.05, { seg: 12 });
      b.sph(0.17, 0xffb347, 0, 1.16, 0.05, { seg: 8, sy: 0.7 });
      b.cyl(0.1, 0.12, 0.3, 0x6bd968, 1.1, 1.05, 0, { seg: 8 });
      b.cyl(0.1, 0.12, 0.3, 0xff7eb6, 1.4, 1.05, 0.1, { seg: 8 });
      b.pop();
      for (const [x, z] of [[s.x1 - 0.6, s.z1 - 0.6], [s.x1 - 0.6, s.z0 + 0.6]] as const) {
        P.plant(b.push(x, 0, z), fancy ? 2 : 1);
        b.pop();
      }
      if (fancy) {
        // guirlande lumineuse
        for (let i = 0; i < 9; i++) b.sph(0.1, i % 2 ? 0xfff3c4 : 0xffd166, s.x0 + 0.5 + i * 0.85, 1.9 - Math.sin((i / 8) * Math.PI) * 0.35, s.z1 - 0.2, { glow: true, seg: 6 });
        b.cyl(0.05, 0.05, 2.0, 0x6b4a2e, s.x0 + 0.3, 0, s.z1 - 0.2, { seg: 6 });
        b.cyl(0.05, 0.05, 2.0, 0x6b4a2e, s.x1 - 0.3, 0, s.z1 - 0.2, { seg: 6 });
      }
    } else if (id === 'spa') {
      b.slab(s.x0, s.z0, s.x1, s.z1, 0xe6dccb, 0.01, 0.06);
      for (let k = 0; k < 4; k++) b.slab(s.x0 + 0.3 + k * 1.9, s.z0, s.x0 + 0.36 + k * 1.9, s.z1, 0xd3c6b0, 0.014, 0.06);
      const tx = -10.4;
      const tz = 3.3;
      // bain bouillonnant enterré, margelle de galets
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        b.sph(0.36, i % 2 ? 0xb9b2a6 : 0xa39c90, tx + Math.cos(a) * 1.75, 0.1, tz + Math.sin(a) * 1.75, { sy: 0.6, seg: 7 });
      }
      b.cyl(1.72, 1.72, 0.05, 0x7fe3f0, tx, 0.0, tz, { seg: 22, glow: true });
      b.cyl(1.2, 1.2, 0.052, 0xa8f0f7, tx, 0.0, tz, { seg: 18, glow: true });
      for (const [x, z, ry] of [[-12.6, 5.9, 0.3], [-11.2, 6.3, 0.1]] as const) {
        P.lounger(b.push(x, 0, z, ry), 0x9aed8f);
        b.pop();
      }
      for (const [x, z] of [[-13.2, 0.9], [-7.2, 0.9], [-13.2, 3.4]] as const) {
        b.push(x, 0, z);
        b.shadow(0, 0, 1.0, 1.0, 0.3);
        b.cyl(0.3, 0.26, 0.4, 0xfffbf2, 0, 0, 0, { seg: 10 });
        for (let k = 0; k < 4; k++) b.cyl(0.05, 0.06, 1.5 + (k % 2) * 0.5, 0x7fbf5a, (k - 1.5) * 0.12, 0.3, (k % 2) * 0.1, { seg: 6, rz: (k - 1.5) * 0.08 });
        b.sph(0.26, 0x58cf7c, 0, 1.9, 0, { sy: 1.4, seg: 7 });
        b.pop();
      }
      // galets empilés + bougies
      b.sph(0.3, 0x6f6f78, -7.6, 0.14, 3.2, { sy: 0.5, seg: 8 });
      b.sph(0.22, 0x85858f, -7.6, 0.36, 3.2, { sy: 0.5, seg: 8 });
      b.sph(0.14, 0x9a9aa4, -7.6, 0.52, 3.2, { sy: 0.6, seg: 8 });
      for (const [x, z] of [[-8.3, 1.7], [-12.4, 1.8], [-8.6, 5.2]] as const) {
        b.cyl(0.09, 0.09, 0.2, 0xfff3dc, x, 0, z, { seg: 7 });
        b.sph(0.06, 0xffc933, x, 0.27, z, { glow: true, seg: 5 });
      }
    } else if (id === 'pool') {
      const z0 = s.z0 + 0.3;
      const z1 = s.z1 - 0.2;
      b.slab(s.x0, z0, s.x1, z1, st.luxe >= 3 ? 0xfbf7f0 : 0xf2dfc0, 0.01, 0.06);
      for (let k = 0; k < 9; k++) b.slab(s.x0, z0 + k, s.x1, z0 + k + 0.05, st.luxe >= 3 ? 0xe6dcd0 : 0xdcc49a, 0.014, 0.06);
      const pc = s.colliders[0];
      // margelle
      const e = 0.35;
      const rimC = st.luxe >= 3 ? st.metal : 0xffffff;
      b.box(pc.x1 - pc.x0 + e * 2, 0.16, e, rimC, 0, 0, pc.z0, { r: 0.06 });
      b.box(pc.x1 - pc.x0 + e * 2, 0.16, e, rimC, 0, 0, pc.z1, { r: 0.06 });
      b.box(e, 0.16, pc.z1 - pc.z0, rimC, pc.x0, 0, (pc.z0 + pc.z1) / 2, { r: 0.06 });
      b.box(e, 0.16, pc.z1 - pc.z0, rimC, pc.x1, 0, (pc.z0 + pc.z1) / 2, { r: 0.06 });
      this.water(extra, pc.x0, pc.z0, pc.x1, pc.z1, 0.05);
      // échelle, plongeoir, bouée canard
      b.cyl(0.04, 0.04, 0.8, 0xd9d9d9, pc.x1 - 0.2, 0, pc.z1 - 0.9, { seg: 6 });
      b.cyl(0.04, 0.04, 0.8, 0xd9d9d9, pc.x1 - 0.2, 0, pc.z1 - 1.4, { seg: 6 });
      b.box(0.5, 0.1, 1.6, 0x38b6ff, pc.x0 + 1.2, 0.3, pc.z0 + 0.3, { r: 0.04 });
      b.box(0.6, 0.3, 0.5, 0xd9d9d9, pc.x0 + 1.2, 0, pc.z0 - 0.3, { r: 0.05 });
      b.sph(0.3, 0xffd166, 1.0, 0.18, pc.z0 + 1.2, { sy: 0.7, seg: 9 });
      b.sph(0.18, 0xffd166, 1.0, 0.45, pc.z0 + 1.35, { seg: 8 });
      b.box(0.1, 0.05, 0.14, 0xff9f43, 1.0, 0.42, pc.z0 + 1.55, { r: 0.02 });
      const lc = [0xff7e67, 0x35c9d6, 0xffc145, 0xff5fa2];
      for (let i = 0; i < 4; i++) {
        const side = i % 2 ? 1 : -1;
        P.lounger(b.push(side * 4.75, 0, pc.z0 + 1.2 + Math.floor(i / 2) * 2.4, side * -1.2), lc[i]);
        b.pop();
      }
      P.parasol(b.push(-4.8, 0, pc.z0 + 2.4), 0xff7e67);
      b.pop();
      P.parasol(b.push(4.8, 0, pc.z0 + 2.4), 0x35c9d6);
      b.pop();
      P.palm(b.push(-4.6, 0, pc.z1 + 0.9), 0.9);
      b.pop();
      P.palm(b.push(4.9, 0, pc.z0 - 0.5), 1.0);
      b.pop();
    } else if (id === 'casino') {
      b.slab(s.x0, s.z0, s.x1, s.z1, st.metal, 0.01, 0.06);
      b.slab(s.x0 + 0.2, s.z0 + 0.2, s.x1 - 0.2, s.z1 - 0.2, 0x9e1b3c, 0.014, 0.06);
      for (let i = 0; i < 5; i++) for (let k = 0; k < 5; k++) if ((i + k) % 2) b.cyl(0.3, 0.3, 0.01, 0xb52548, s.x0 + 1.1 + i * 1.3, 0.016, s.z0 + 1.3 + k * 1.45, { seg: 4, ry: Math.PI / 4 });
      const mc = [0xffc933, 0x7b3fe4, 0x38b6ff, 0xff5d73, 0x3ddc6c];
      for (let i = 0; i < 5; i++) {
        P.slotMachine(b.push(8.2 + i * 1.0, 0, -6.6), mc[i]);
        b.pop();
      }
      for (const v of s.visits.slice(0, 3)) {
        P.stool(b.push(v.x, 0, v.z - 0.9), 0xffc933);
        b.pop();
      }
      // table de roulette
      b.push(10.2, 0, -2.6 - 0.95);
      b.shadow(0, 0, 2.6, 1.8, 0.36);
      b.box(2.0, 0.7, 1.1, 0x5e2a1a, 0, 0, 0, { r: 0.14 });
      b.box(1.8, 0.06, 0.9, 0x1f9e55, 0, 0.7, 0, { r: 0.04 });
      b.cyl(0.36, 0.36, 0.1, 0x2a2a35, -0.5, 0.74, 0, { seg: 14 });
      b.cyl(0.28, 0.28, 0.12, 0xd93a52, -0.5, 0.74, 0, { seg: 14 });
      b.sph(0.07, st.metal, -0.5, 0.9, 0, { seg: 6 });
      for (let i = 0; i < 4; i++) b.cyl(0.07, 0.07, 0.05 + i * 0.03, [0xff5d73, 0x38b6ff, 0xffc933, 0xffffff][i], 0.2 + i * 0.2, 0.76, 0.15, { seg: 8 });
      b.pop();
      for (const [x, z] of [[s.x0 + 0.6, s.z0 + 0.6], [s.x1 - 0.6, s.z0 + 0.6], [s.x1 - 0.6, s.z1 - 0.6]] as const) {
        b.cyl(0.08, 0.12, 1.8, st.metal, x, 0, z, { seg: 8 });
        b.sph(0.26, 0xffe27a, x, 1.95, z, { glow: true, seg: 8 });
      }
    } else if (id === 'heliport') {
      const px = -10.4;
      const pz = -5.0;
      b.cyl(3.3, 3.4, 0.14, 0x4a4f5c, px, 0, pz, { seg: 28 });
      b.cyl(3.0, 3.0, 0.15, 0xffc933, px, 0, pz, { seg: 28 });
      b.cyl(2.75, 2.75, 0.16, 0x565c6b, px, 0, pz, { seg: 28 });
      b.slab(px - 0.9, pz - 1.0, px - 0.5, pz + 1.0, 0xffffff, 0.175, 0.03);
      b.slab(px + 0.5, pz - 1.0, px + 0.9, pz + 1.0, 0xffffff, 0.175, 0.03);
      b.slab(px - 0.5, pz - 0.2, px + 0.5, pz + 0.2, 0xffffff, 0.175, 0.03);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        b.sph(0.12, i % 2 ? 0xff5d73 : 0x7fffd4, px + Math.cos(a) * 3.15, 0.2, pz + Math.sin(a) * 3.15, { glow: true, seg: 6 });
      }
      // hélicoptère
      b.push(px, 0.16, pz, 0.6);
      b.shadow(0, 0, 3.0, 4.6, 0.4);
      b.sph(0.95, 0xfffbf2, 0, 1.15, -0.2, { sz: 1.35, sy: 0.92, seg: 14 });
      b.sph(0.7, 0x7fd9f5, 0, 1.25, -0.95, { sz: 0.9, sy: 0.8, seg: 12 });
      b.box(0.3, 0.3, 2.2, 0xfffbf2, 0, 1.2, 1.9, { r: 0.12 });
      b.box(0.1, 0.9, 0.5, st.metal, 0, 1.3, 2.9, { r: 0.04 });
      b.box(1.9, 0.14, 0.34, st.metal, 0, 1.0, -0.2, { r: 0.05 });
      b.cyl(0.07, 0.07, 0.4, 0x565c6b, 0, 2.0, -0.2, { seg: 6 });
      for (const x of [-0.7, 0.7]) {
        b.box(0.1, 0.1, 2.4, 0x565c6b, x, 0.02, -0.2, { r: 0.04 });
        b.cyl(0.04, 0.04, 0.5, 0x565c6b, x, 0.1, -0.8, { seg: 5 });
        b.cyl(0.04, 0.04, 0.5, 0x565c6b, x, 0.1, 0.4, { seg: 5 });
      }
      b.pop();
      const rb = new Builder();
      rb.box(5.4, 0.05, 0.3, 0x3a3f4f, 0, 0, 0, { r: 0.02 });
      rb.box(0.3, 0.05, 5.4, 0x3a3f4f, 0, 0, 0, { r: 0.02 });
      rb.cyl(0.16, 0.16, 0.14, st.metal, 0, -0.03, 0, { seg: 8 });
      const rotor = rb.build();
      rotor.position.set(px + Math.sin(0.6) * -0.2, 2.6, pz + Math.cos(0.6) * -0.2);
      extra.add(rotor);
      this.anims.push((dt) => {
        rotor.rotation.y += dt * 7;
      });
      // manche à air
      b.cyl(0.05, 0.05, 2.2, 0xd9d9d9, s.x0 + 0.7, 0, s.z1 - 0.8, { seg: 6 });
      b.cyl(0.1, 0.22, 0.8, 0xff7e3a, s.x0 + 1.1, 2.0, s.z1 - 0.8, { seg: 8, rz: Math.PI / 2 });
    }
    const g = b.build();
    g.add(extra);
    return g;
  }

  // ---------------------------------------------------------- environnement
  private buildEnvironment(): void {
    const { layout: l, theme, mood, tier } = this;
    const b = new Builder();
    const rnd = rng(77 + tier * 31 + theme.length * 13);
    const bx0 = l.bounds.x0 - 1.5;
    const bx1 = l.bounds.x1 + 1.5;
    const bz0 = l.bounds.z0 - 1.5;
    const inside = (x: number, z: number): boolean => x > bx0 && x < bx1 && z > bz0 && z < 19;
    const scatter = (n: number, fn: (x: number, z: number, i: number) => void, spread = 30): void => {
      let placed = 0;
      for (let tries = 0; placed < n && tries < n * 12; tries++) {
        const x = (rnd() - 0.5) * 2 * (bx1 + spread * 0.5);
        const z = bz0 - spread * 0.55 + rnd() * (19 - bz0 + spread * 0.7);
        if (inside(x, z) || (z > 12.6 && z < 18.6)) continue;
        fn(x, z, placed++);
      }
    };
    // taches de sol
    scatter(26, (x, z) => b.cyl(1.2 + rnd() * 2.2, 1.2, 0.01, mood.ground2, x, -0.012, z, { seg: 9, sz: 0.6 + rnd() * 0.5, grad: 0 }), 40);

    const place = (x: number, z: number, fn: () => void, ry = 0, s = 1): void => {
      b.push(x, 0, z, ry, s);
      fn();
      b.pop();
    };
    if (theme === 'town') {
      if (tier === 0) {
        scatter(9, (x, z) => place(x, z, () => P.deadTree(b), rnd() * 6));
        scatter(12, (x, z) => place(x, z, () => P.rock(b, 0x77776a, 0.6 + rnd() * 0.6), rnd() * 6));
        scatter(10, (x, z) => place(x, z, () => P.bush(b, 0x6f8a4a)));
        scatter(3, (x, z) => place(x, z, () => P.trashCan(b)));
      } else {
        const leaf = [0x4fbf5f, 0x4fbf5f, 0x58c46a, 0x45c98a, 0x3fb86a][tier];
        scatter(tier >= 2 ? 14 : 20, (x, z, i) => place(x, z, () => (tier === 3 ? P.palm(b, 0.9 + rnd() * 0.3) : P.tree(b, i % 3 ? leaf : 0xff9ec4, 0.9 + rnd() * 0.5)), rnd() * 6));
        scatter(16, (x, z) => place(x, z, () => P.bush(b, leaf)));
        scatter(6, (x, z) => place(x, z, () => P.flowerBed(b, 0xff7eb6, 0xffd166), rnd() * 3));
        if (tier === 2 || tier === 4) {
          const cols = [0xe9c9a8, 0xc9d6e8, 0xf2b8a0, 0xd9e8c9, 0xe8d9f2];
          for (let i = 0; i < 9; i++) {
            const x = -34 + i * 8.5 + rnd() * 2;
            place(x, bz0 - 9 - rnd() * 4, () => P.building(b, 4 + rnd() * 2, 5 + rnd() * 6, 4, cols[i % 5], 0xfff3c4, false));
          }
        }
      }
    } else if (theme === 'beach') {
      scatter(18, (x, z) => place(x, z, () => P.palm(b, 0.9 + rnd() * 0.5), rnd() * 6));
      scatter(10, (x, z) => place(x, z, () => P.rock(b, 0xd9c9a8, 0.5 + rnd() * 0.5), rnd() * 6));
      scatter(8, (x, z, i) => place(x, z, () => P.parasol(b, [0xff6b6b, 0x4ecdc4, 0xffd166, 0xff9f43][i % 4])));
      scatter(8, (x, z) => place(x, z, () => P.bush(b, 0x58cf7c)));
      scatter(10, (x, z, i) => b.sph(0.22, i % 2 ? 0xff8f6b : 0xff7eb6, x, 0.05, z, { sy: 0.3, seg: 5 }));
      const sea = new THREE.Group();
      this.water(sea, -130, bz0 - 60, 130, bz0 - 13, 0.0);
      this.root.add(sea);
      b.slab(-130, bz0 - 13.6, 130, bz0 - 12.6, 0xffffff, 0.0, 0.04);
    } else if (theme === 'mountain') {
      scatter(26, (x, z) => place(x, z, () => P.pine(b, true, 0.9 + rnd() * 0.6), rnd() * 6));
      scatter(12, (x, z) => place(x, z, () => P.rock(b, 0x8a94a8, 0.6 + rnd() * 0.8), rnd() * 6));
      scatter(8, (x, z) => b.sph(0.5 + rnd() * 0.4, 0xffffff, x, 0.1, z, { sy: 0.45, seg: 8 }));
      for (let i = 0; i < 7; i++) place(-36 + i * 12 + rnd() * 4, bz0 - 16 - rnd() * 8, () => P.mountain(b, 9 + rnd() * 5, 12 + rnd() * 7, 0x8fa3c4, 0xffffff));
    } else if (theme === 'desert') {
      scatter(18, (x, z) => place(x, z, () => P.cactus(b, 0.8 + rnd() * 0.7), rnd() * 6));
      scatter(16, (x, z) => place(x, z, () => P.rock(b, 0xc9834f, 0.6 + rnd() * 0.9), rnd() * 6));
      scatter(6, (x, z) => place(x, z, () => P.deadTree(b), rnd() * 6));
      for (let i = 0; i < 6; i++) {
        const x = -36 + i * 14 + rnd() * 4;
        const z = bz0 - 14 - rnd() * 8;
        b.cyl(4 + rnd() * 2, 6 + rnd() * 2, 5 + rnd() * 4, 0xd98a4f, x, 0, z, { seg: 9, grad: 0.3 });
        b.cyl(3.2, 4.2, 0.6, 0xe8a060, x, 5, z, { seg: 9 });
      }
    } else if (theme === 'mega') {
      const cols = [0x3a3f6b, 0x4a3f7a, 0x2f4a6b, 0x5a3f6b, 0x3f5a7a];
      const lits = [0xfff3a8, 0x7fffd4, 0xff9ee0, 0x9fd8ff];
      for (let i = 0; i < 10; i++) place(-40 + i * 9 + rnd() * 2, bz0 - 8 - rnd() * 5, () => P.building(b, 4 + rnd() * 2.5, 9 + rnd() * 12, 4, cols[i % 5], lits[i % 4], true));
      for (let i = 0; i < 5; i++) {
        place(bx0 - 6 - rnd() * 4, bz0 + 4 + i * 8, () => P.building(b, 4, 6 + rnd() * 8, 4.5, cols[(i + 2) % 5], lits[i % 4], true));
        place(bx1 + 6 + rnd() * 4, bz0 + 4 + i * 8, () => P.building(b, 4, 6 + rnd() * 8, 4.5, cols[(i + 3) % 5], lits[(i + 1) % 4], true));
      }
      scatter(10, (x, z) => place(x, z, () => P.lampPost(b, 0x24243a, true)));
      scatter(8, (x, z) => place(x, z, () => P.tree(b, 0x3f8f7a, 0.8)));
    } else if (theme === 'undersea') {
      const cc = [0xff6b9a, 0xff9f43, 0xb983ff, 0xffd166, 0x4ecdc4];
      scatter(26, (x, z, i) => place(x, z, () => P.coral(b, cc[i % 5], 0.9 + rnd() * 0.8), rnd() * 6));
      scatter(18, (x, z) => place(x, z, () => P.kelp(b, 0.9 + rnd() * 0.8), rnd() * 6));
      scatter(14, (x, z) => place(x, z, () => P.rock(b, 0x5a8a9a, 0.6 + rnd() * 0.8), rnd() * 6));
      scatter(10, (x, z, i) => b.sph(0.25, i % 2 ? 0xffb3c8 : 0xfff3c4, x, 0.08, z, { sy: 0.35, seg: 6 }));
      this.buildFish();
    }
    this.root.add(b.build());
  }

  private buildFish(): void {
    const cols = [0xff9f43, 0xffd166, 0xff6b9a, 0x7fffd4, 0xb983ff, 0xffffff];
    for (let i = 0; i < 7; i++) {
      const b = new Builder();
      b.sph(0.3, cols[i % cols.length], 0, 0, 0, { sz: 1.7, sx: 0.6, seg: 8 });
      b.cyl(0.02, 0.25, 0.3, cols[(i + 1) % cols.length], 0, -0.15, 0.6, { rx: -Math.PI / 2, sx: 0.4, seg: 6 });
      b.sph(0.05, 0x1c1c22, 0.15, 0.06, -0.3, { seg: 5 });
      b.sph(0.05, 0x1c1c22, -0.15, 0.06, -0.3, { seg: 5 });
      const g = b.build();
      this.root.add(g);
      const cx = (i % 2 ? 1 : -1) * (3 + i * 1.7);
      const cz = this.layout.zN / 2 + (i - 3) * 4;
      const r = 5 + (i % 3) * 2.5;
      const sp = 0.25 + (i % 4) * 0.07;
      const h = 2.4 + (i % 3) * 0.7;
      this.anims.push((_dt, t) => {
        const a = t * sp * (i % 2 ? 1 : -1) + i * 2;
        g.position.set(cx + Math.cos(a) * r, h + Math.sin(t * 1.3 + i) * 0.25, cz + Math.sin(a) * r);
        g.rotation.y = -a + (i % 2 ? Math.PI : 0) + Math.sin(t * 6 + i) * 0.12;
      });
    }
  }

  // --------------------------------------------------------------- enseigne
  private buildSign(): void {
    const st = this.style;
    const text = st.signText;
    const w = Math.min(3.4, text.length * 0.5 + 0.8);
    const h = 1.1;
    const { x, z } = this.layout.sign;
    const b = new Builder();
    b.shadow(x, z, 1.0, 0.9, 0.35);
    // enseigne basse inclinée vers la caméra : lisible sans masquer le hall
    for (const dx of [-w * 0.32, w * 0.32]) {
      b.cyl(0.09, 0.12, 0.75, st.dingy ? 0x4a4038 : st.metal, x + dx, 0, z + 0.1, { seg: 8 });
      b.box(0.4, 0.12, 0.4, st.dingy ? 0x4a4038 : st.metal, x + dx, 0, z + 0.1, { r: 0.04 });
    }
    this.root.add(b.build());

    const make = (dead: number): THREE.CanvasTexture => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = Math.round((512 * h) / w);
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#' + st.signBg.toString(16).padStart(6, '0');
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.lineWidth = 10;
      ctx.strokeStyle = st.signColor;
      ctx.globalAlpha = dead >= 0 ? 0.6 : 0.9;
      ctx.beginPath();
      ctx.roundRect(12, 12, c.width - 24, c.height - 24, 22);
      ctx.stroke();
      const size = Math.min(c.height * 0.62, (c.width - 70) / (text.length * 0.66));
      ctx.font = `700 ${size}px Fredoka, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const step = (c.width - 70) / text.length;
      for (let i = 0; i < text.length; i++) {
        const off = i === dead || dead === 99;
        ctx.globalAlpha = off ? 0.16 : 1;
        ctx.shadowColor = st.signColor;
        ctx.shadowBlur = off ? 0 : 22;
        ctx.fillStyle = off ? st.signColor : '#ffffff';
        const cx = 35 + step * (i + 0.5);
        ctx.fillText(text[i], cx, c.height / 2 + 4);
        if (!off) {
          ctx.shadowBlur = 8;
          ctx.fillStyle = st.signColor;
          ctx.globalAlpha = 0.55;
          ctx.fillText(text[i], cx, c.height / 2 + 4);
        }
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      this.disposables.push(t);
      return t;
    };
    const mat = new THREE.MeshBasicMaterial({ map: null, fog: false });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.24, h + 0.24, 0.26), new THREE.MeshLambertMaterial({ color: st.dingy ? 0x3a3038 : st.metal }));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    face.position.z = 0.135;
    const g = new THREE.Group();
    g.add(frame, face);
    g.position.set(x, 1.15, z);
    g.rotation.x = -0.72;
    this.root.add(g);
    this.disposables.push(frame.geometry, frame.material as THREE.Material, face.geometry, mat);

    const apply = (): void => {
      if (st.dingy) {
        // néon fatigué : une lettre morte + clignotement aléatoire
        const texOn = make(3);
        const texOff = make(99);
        const texHalf = make(1);
        mat.map = texOn;
        let next = 1.5;
        let until = 0;
        this.anims.push((_dt, t) => {
          if (t > next) {
            until = t + 0.06 + Math.random() * 0.25;
            next = t + 0.4 + Math.random() * 3.5;
            mat.map = Math.random() < 0.5 ? texOff : texHalf;
          } else if (until && t > until) {
            until = 0;
            mat.map = texOn;
          }
        });
      } else {
        mat.map = make(-1);
      }
      mat.needsUpdate = true;
    };
    apply();
    // la police arrive parfois après : on redessine une fois chargée
    void document.fonts?.load('700 40px Fredoka').then(() => {
      if (!st.dingy) {
        mat.map = make(-1);
        mat.needsUpdate = true;
      }
    });
  }

  // ---------------------------------------------------------------- voitures
  private buildCars(): void {
    const dingy = this.style.dingy;
    const n = dingy ? 3 : 5;
    for (let i = 0; i < n; i++) {
      const b = new Builder();
      P.car(b, dingy ? [0xd9a05a, 0x6fb0b0, 0xc9705a][i % 3] : CAR_COLORS[(i * 2 + this.tier) % CAR_COLORS.length], dingy);
      const g = b.build();
      g.visible = false;
      g.userData.home = { x: 2.4 + i * 2.35, z: 11.1 };
      g.position.set(2.4 + i * 2.35, 0, 11.1);
      g.rotation.y = dingy ? (i - 1) * 0.07 : 0;
      this.root.add(g);
      this.cars.push(g);
    }
  }
  /** Affiche n voitures garées (suit l'occupation des chambres). */
  setCars(n: number): void {
    n = Math.min(n, this.cars.length);
    if (n === this.carsShown) return;
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];
      const show = i < n;
      if (show && !c.visible) {
        c.visible = true;
        c.scale.setScalar(0.001);
        this.pops.push({ o: c, t: 0, delay: 0 });
        c.userData.px = c.userData.home.x;
        c.userData.pz = c.userData.home.z;
      } else if (!show) c.visible = false;
    }
    this.carsShown = n;
  }

  // ------------------------------------------------------------------ update
  update(dt: number, t: number): void {
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const p = this.pops[i];
      if (p.delay > 0) {
        p.delay -= dt;
        continue;
      }
      p.t = Math.min(1, p.t + dt * 2.6);
      // easeOutBack + petit écrasement vertical
      const c = 2.2;
      const k = 1 + (c + 1) * Math.pow(p.t - 1, 3) + c * Math.pow(p.t - 1, 2);
      const sy = k * (1 + Math.sin(p.t * Math.PI) * 0.25);
      const px = p.o.userData.px ?? 0;
      const pz = p.o.userData.pz ?? 0;
      const isCar = p.o.userData.home !== undefined;
      p.o.scale.set(k, sy, k);
      if (isCar) p.o.position.set(px, 0, pz);
      else p.o.position.set(px * (1 - k), 0, pz * (1 - k));
      if (p.t >= 1) {
        p.o.scale.setScalar(1);
        if (!isCar) p.o.position.set(0, 0, 0);
        this.pops.splice(i, 1);
      }
    }
    for (const a of this.anims) a(dt, t);
    waterTex.offset.set(t * 0.03, t * 0.02);
    // pulsation douce des néons
    const g = this.mood.glow * (0.92 + Math.sin(t * 3.1) * 0.08);
    glowMat.color.setScalar(Math.min(1.25, 0.75 + g * 0.35));
  }

  dispose(): void {
    disposeGroup(this.root);
    for (const d of this.disposables) d.dispose();
    for (const w of this.waters) w.geometry.dispose();
  }
}
