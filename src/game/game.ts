import * as THREE from 'three';
import { B, TIERS, type ChainItem, type Feature, type Role, type ServiceId, type StarId, type UpgradeId } from '../balance';
import { audio } from '../core/audio';
import { money } from '../core/format';
import type { Joystick } from '../core/input';
import type { GameState, Store } from '../core/store';
import { CharRenderer, CharView, looks, POSE } from '../gfx/chars';
import { Blobs, Flyers, makeBillPool, makePaperPool, makeTowelPool, Particles, puffTex, sparkTex, Zones, zTex, type ItemPool } from '../gfx/fx';
import { HotelView } from '../gfx/hotel';
import type { Stage } from '../gfx/stage';
import { TileView } from '../gfx/tiles';
import * as E from './economy';
import { L, makeLayout, places, route, type Approach, type Box, type Layout, type V2 } from './layout';
import { claimAchievement, claimQuest, ensureQuests, questProgress } from './quests';

/** Ce que le jeu demande à l'interface (découplage simulation / DOM). */
export interface GameUI {
  float(x: number, y: number, z: number, text: string, cls?: string): void;
  banner(icon: string, title: string, sub?: string): void;
  feature(f: Feature): void;
  transition(mid: () => void): void;
  toast(icon: string, text: string): void;
}

type RoomState = 'clean' | 'reserved' | 'occupied' | 'dirty';
interface Room {
  state: RoomState;
  progress: number;
  claimed: Npc | null;
}
interface Pile {
  x: number;
  z: number;
  value: number;
  n: number;
  key: string;
  place: Approach;
  claimed: Npc | null;
  dead: boolean;
  pop: number;
}
interface Mover {
  v: CharView;
  path: V2[];
  here: Approach;
  lane: number;
}
interface Guest extends Mover {
  state: 'toQueue' | 'queue' | 'toRoom' | 'sleep' | 'toService' | 'service' | 'exit';
  vip: boolean;
  room: number;
  t: number;
  svc: ServiceId | null;
  spark: number;
}
interface Npc extends Mover {
  role: Role;
  idx: number;
  state: string;
  room: number;
  pile: Pile | null;
  carry: number;
  t: number;
  stack: { x: number; y: number; z: number }[];
}
export interface Target {
  x: number;
  z: number;
  kind: 'tile' | 'pile' | 'checkin' | 'closet' | 'room';
  place: Approach;
  affordable?: boolean;
}
interface ActiveTile {
  item: ChainItem;
  id: string;
  x: number;
  z: number;
  size: number;
  cost: number;
  icon: string;
  place: Approach;
}

const CONFETTI = [0xff5d73, 0xffc933, 0x3ddc6c, 0x38b6ff, 0xb983ff, 0xff9f43, 0xffffff];
const dist2 = (ax: number, az: number, bx: number, bz: number): number => (ax - bx) * (ax - bx) + (az - bz) * (az - bz);

export class Game {
  layout!: Layout;
  view!: HotelView;
  readonly chars: CharRenderer;
  private bills: ItemPool;
  private towels: ItemPool;
  private papers: ItemPool;
  private blobs: Blobs;
  private zones: Zones;
  private flyers = new Flyers();
  private confetti: Particles;
  private sparks: Particles;
  private puffs: Particles;
  private zs: Particles;
  private tileViews: TileView[] = [];
  private arrow: THREE.Mesh;
  private chevron: THREE.Mesh;

  // joueur
  px = 0;
  pz = 4.8;
  private pvx = 0;
  private pvz = 0;
  private pv: CharView;
  stack = 0;
  private stackPos: { x: number; y: number; z: number }[] = [];

  private rooms: Room[] = [];
  private piles: Pile[] = [];
  private guests: Guest[] = [];
  private queue: Guest[] = [];
  private staff: Npc[] = [];
  tiles: ActiveTile[] = [];
  private colliders: Box[] = [];

  private checkin = 0;
  private closetT = 0;
  private spawnT = 1.5;
  private vipT = 60;
  private payDwell = 0;
  private payTick = 0;
  private hintT = 0;
  private dustT = 0;
  private slowT = 0;
  private guideT = 0;
  time = 0;
  target: Target | null = null;
  objective: ActiveTile | null = null;
  busy = false; // transition en cours
  private stick = { x: 0, y: 0 };

  // outils de test (?bot=1&speed=8)
  bot = false;
  private botPath: V2[] = [];
  private botKey = '';
  private botStuck = 0;
  private botLast = { x: 0, z: 0 };

  constructor(
    private stage: Stage,
    private store: Store,
    private joy: Joystick,
    private ui: GameUI,
  ) {
    const scene = stage.scene;
    this.blobs = new Blobs(scene);
    this.zones = new Zones(scene);
    for (let i = 0; i < 3; i++) this.tileViews.push(new TileView(scene));
    this.chars = new CharRenderer(scene);
    this.bills = makeBillPool(scene);
    this.towels = makeTowelPool(scene);
    this.papers = makePaperPool(scene);
    this.confetti = new Particles(scene, null, 260);
    this.sparks = new Particles(scene, sparkTex, 120, true);
    this.puffs = new Particles(scene, puffTex, 80);
    this.zs = new Particles(scene, zTex, 40);
    this.pv = this.chars.add(looks.player());

    // flèche 3D au-dessus de la cible + chevron au sol près du joueur
    const cone = new THREE.ConeGeometry(0.42, 0.7, 4);
    cone.rotateX(Math.PI);
    const amat = new THREE.MeshBasicMaterial({ color: 0xffd23f, fog: false });
    this.arrow = new THREE.Mesh(cone, amat);
    this.arrow.visible = false;
    scene.add(this.arrow);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.55);
    shape.lineTo(0.5, -0.1);
    shape.lineTo(0.5, -0.4);
    shape.lineTo(0, 0.2);
    shape.lineTo(-0.5, -0.4);
    shape.lineTo(-0.5, -0.1);
    shape.closePath();
    const cg = new THREE.ShapeGeometry(shape);
    cg.rotateX(-Math.PI / 2);
    this.chevron = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.95, depthWrite: false, fog: false }));
    this.chevron.renderOrder = 4;
    this.chevron.visible = false;
    scene.add(this.chevron);

    this.buildTier(true);
  }

  get s(): GameState {
    return this.store.state;
  }

  // ================================================================ monde
  buildTier(first = false): void {
    const s = this.s;
    this.view?.dispose();
    this.layout = makeLayout(s.tier);
    this.view = new HotelView(this.stage.scene, this.layout, s.tier, E.themeOf(s.city));
    this.stage.setMood(this.view.mood);
    this.view.setRooms(s.rooms, s.roomLevel, false);
    this.view.setServices(s.services, false);
    this.rooms = this.layout.rooms.map(() => ({ state: 'clean' as RoomState, progress: 0, claimed: null }));
    this.piles = [];
    this.guests = [];
    this.queue = [];
    this.staff = [];
    this.flyers.clear();
    this.chars.clear(this.pv);
    this.confetti.clear();
    this.checkin = 0;
    this.px = 0;
    this.pz = 4.9;
    this.pvx = this.pvz = 0;
    this.pv.yaw = Math.PI;
    this.stack = 0;
    this.stackPos = [];
    this.spawnT = first ? 0.6 : 1.2;
    const [a, b] = E.vipInterval(s);
    this.vipT = a + Math.random() * (b - a);
    for (const role of ['receptionist', 'housekeeper', 'bellhop'] as Role[]) for (let i = 0; i < s.staff[role]; i++) this.spawnStaff(role, i, false);
    if (s.pendingCash > 0) {
      this.addPile('pending', 1.0, 5.3, s.pendingCash, places.free({ x: 1.0, z: 5.3 }));
      s.pendingCash = 0;
    }
    this.refreshColliders();
    this.refreshTiles();
    this.stage.follow(this.px, this.pz, 0, true);
    ensureQuests(s);
  }

  private refreshColliders(): void {
    const l = this.layout;
    this.colliders = [...l.walls, ...l.furniture];
    for (let i = 0; i < this.s.rooms; i++) {
      const r = l.rooms[i];
      this.colliders.push({ x0: r.bed.x - 1.15, x1: r.bed.x + 1.15, z0: r.bed.z - 0.8, z1: r.bed.z + 0.8 });
    }
    for (const id of this.s.services) {
      const sv = l.services[id];
      if (sv) this.colliders.push(...sv.colliders);
    }
  }

  private refreshTiles(): void {
    const s = this.s;
    const l = this.layout;
    this.tiles = E.visibleChain(s).map((item) => {
      let p: V2;
      let place: Approach;
      let size = 1.85;
      switch (item.kind) {
        case 'room':
          p = l.rooms[item.n - 1].tile;
          place = places.room(l, item.n - 1, p);
          break;
        case 'roomUp':
          p = l.roomUpTile;
          place = places.free(p);
          break;
        case 'service': {
          const sv = l.services[item.service]!;
          p = sv.tile;
          place = places.service(sv, p);
          break;
        }
        case 'hire':
          p = l.hireTile[item.role];
          place = places.free(p);
          break;
        case 'next':
          p = l.nextTile;
          place = [{ x: 0, z: L.LD }, { x: 0, z: 8.6 }, p];
          size = 2.5;
          break;
      }
      return { item, id: E.chainId(item), x: p.x, z: p.z, size, cost: E.chainCost(s, item), icon: E.chainIcon(s, item), place };
    });
    for (const t of this.tileViews) t.invalidate();
    this.store.touch();
  }

  redrawTiles(): void {
    for (const t of this.tileViews) t.invalidate();
  }

  // =============================================================== revenus
  private earn(amount: number): void {
    const s = this.s;
    s.cash += amount;
    s.runCash += amount;
    s.stats.earned += amount;
    if (questProgress(s, 'earn', amount)) this.questDone();
    this.store.touch();
  }
  private questDone(): void {
    this.ui.toast('quest', 'quest.done');
    audio.ding();
  }

  private addPile(key: string, x: number, z: number, value: number, place: Approach): void {
    let p = this.piles.find((q) => q.key === key && !q.dead);
    if (!p) {
      p = { x, z, value: 0, n: 0, key, place, claimed: null, dead: false, pop: 0 };
      this.piles.push(p);
    }
    p.value += value;
    const stays = p.value / Math.max(1, E.roomRate(this.s));
    p.n = Math.max(3, Math.min(30, Math.round(3 + stays * 4)));
    p.pop = 1;
  }

  private collectPile(p: Pile, tx: () => { x: number; y: number; z: number }, byPlayer: boolean, mult = 1): void {
    p.dead = true;
    const total = p.value * mult;
    this.earn(total);
    const n = p.n;
    for (let i = 0; i < n; i++) {
      const o = this.billOffset(i);
      this.flyers.add({
        pool: this.bills,
        fx: p.x + o.x,
        fy: o.y,
        fz: p.z + o.z,
        to: tx,
        dur: 0.32,
        arc: 1.3,
        delay: (n - 1 - i) * 0.035,
        done: byPlayer
          ? () => {
              audio.cash();
              if (i % 3 === 0) audio.buzz(8);
            }
          : undefined,
      });
    }
    this.ui.float(p.x, 1.4, p.z, '+' + money(total), 'cash');
    if (byPlayer) {
      this.s.stats.collected++;
      this.pv.punch = 1;
      if (questProgress(this.s, 'collect', 1)) this.questDone();
    }
  }

  private billOffset(i: number): { x: number; y: number; z: number } {
    const layer = Math.floor(i / 4);
    const k = i % 4;
    return { x: (k % 2) * 0.5 - 0.25, y: 0.06 + layer * 0.078, z: Math.floor(k / 2) * 0.31 - 0.155 };
  }

  // ================================================================= staff
  private spawnStaff(role: Role, idx: number, pop: boolean): void {
    const l = this.layout;
    const v = this.chars.add(looks[role]());
    const home = role === 'receptionist' ? places.desk(l, idx) : role === 'housekeeper' ? places.hkIdle(l, idx) : places.bhIdle(l, idx);
    const end = home[home.length - 1];
    v.x = end.x;
    v.z = end.z;
    v.yaw = role === 'receptionist' ? 0 : Math.PI * 0.2;
    if (pop) {
      v.grow = 0;
      v.jump = 1;
    }
    this.staff.push({ role, idx, v, path: [], here: home, lane: (idx % 3) * 0.35 - 0.35, state: role === 'receptionist' ? 'desk' : 'idle', room: -1, pile: null, carry: 0, t: 0, stack: [] });
  }

  private go(m: Mover, to: Approach): void {
    const path = route(m.here, to);
    // décalage de voie sur l'épine pour éviter que tout le monde marche en file indienne
    m.path = path.map((p, i) => (Math.abs(p.x) < 0.01 && i < path.length - 1 ? { x: m.lane, z: p.z } : p));
    m.here = to;
  }

  /** Avance le long du chemin. Renvoie vrai à l'arrivée. */
  private walk(m: Mover, speed: number, dt: number): boolean {
    const v = m.v;
    if (!m.path.length) {
      v.moving = false;
      return true;
    }
    let left = speed * dt;
    while (left > 0 && m.path.length) {
      const p = m.path[0];
      const dx = p.x - v.x;
      const dz = p.z - v.z;
      const d = Math.hypot(dx, dz);
      if (d <= left) {
        v.x = p.x;
        v.z = p.z;
        left -= d;
        m.path.shift();
      } else {
        v.x += (dx / d) * left;
        v.z += (dz / d) * left;
        const want = Math.atan2(dx, dz);
        let da = want - v.yaw;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        v.yaw += da * Math.min(1, dt * 12);
        left = 0;
      }
    }
    v.moving = m.path.length > 0;
    return m.path.length === 0;
  }

  private face(v: CharView, x: number, z: number, dt: number): void {
    const want = Math.atan2(x - v.x, z - v.z);
    let da = want - v.yaw;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    v.yaw += da * Math.min(1, dt * 8);
  }

  private updateStaff(dt: number): void {
    const s = this.s;
    const l = this.layout;
    for (const n of this.staff) {
      if (n.role === 'receptionist') {
        if (this.walk(n, 3.4, dt)) this.face(n.v, n.v.x, n.v.z + 2, dt);
        continue;
      }
      if (n.role === 'housekeeper') {
        const speed = E.hkSpeed(s);
        const cap = E.hkCap(s);
        switch (n.state) {
          case 'idle': {
            if (!this.walk(n, speed, dt)) break;
            const dirty = this.nearestDirty(n.v.x, n.v.z);
            if (n.carry === 0 || (dirty < 0 && n.carry < cap)) {
              if (n.carry < cap && (dirty >= 0 || n.t <= 0)) {
                this.go(n, places.closet(l));
                n.state = 'toCloset';
              }
            } else if (dirty >= 0) {
              this.rooms[dirty].claimed = n;
              n.room = dirty;
              this.go(n, places.room(l, dirty, l.rooms[dirty].zone));
              n.state = 'toRoom';
            }
            n.t -= dt;
            break;
          }
          case 'toCloset':
            if (this.walk(n, speed, dt)) {
              n.state = 'load';
              n.t = 0;
            }
            break;
          case 'load':
            this.face(n.v, l.closetShelf.x, l.closetShelf.z, dt);
            n.t += dt;
            if (n.t > B.zone.closetEvery * 1.6) {
              n.t = 0;
              if (n.carry < cap) {
                n.carry++;
                this.flySupply(l.closetShelf.x, 1.0, l.closetShelf.z + (Math.random() - 0.5), n.carry - 1, () => this.backSlot(n.v, n.carry - 1));
              } else {
                const dirty = this.nearestDirty(n.v.x, n.v.z);
                if (dirty >= 0) {
                  this.rooms[dirty].claimed = n;
                  n.room = dirty;
                  this.go(n, places.room(l, dirty, l.rooms[dirty].zone));
                  n.state = 'toRoom';
                } else {
                  this.go(n, places.hkIdle(l, n.idx));
                  n.state = 'idle';
                  n.t = 6;
                }
              }
            }
            break;
          case 'toRoom':
            if (this.walk(n, speed, dt)) n.state = 'clean';
            break;
          case 'clean': {
            const r = this.rooms[n.room];
            if (!r || r.state !== 'dirty') {
              if (r && r.claimed === n) r.claimed = null;
              n.room = -1;
              n.state = 'idle';
              n.t = 0;
              // enchaîne directement sur la chambre suivante si possible
              const dirty = n.carry > 0 ? this.nearestDirty(n.v.x, n.v.z) : -1;
              if (dirty >= 0) {
                this.rooms[dirty].claimed = n;
                n.room = dirty;
                this.go(n, places.room(l, dirty, l.rooms[dirty].zone));
                n.state = 'toRoom';
              } else if (n.carry === 0) {
                this.go(n, places.closet(l));
                n.state = 'toCloset';
              } else {
                this.go(n, places.hkIdle(l, n.idx));
              }
              break;
            }
            const slot = l.rooms[n.room];
            this.face(n.v, slot.bed.x, slot.bed.z, dt);
            n.v.punch = Math.max(n.v.punch, 0.25);
            r.progress += dt / E.hkCleanTime(s);
            if (r.progress >= 1) {
              n.carry--;
              this.finishClean(n.room, n.v);
            }
            break;
          }
        }
        continue;
      }
      // ---- bagagiste : ramasse le cash partout
      const speed = E.bhSpeed(s);
      switch (n.state) {
        case 'idle': {
          if (!this.walk(n, speed, dt)) break;
          let best: Pile | null = null;
          let bd = Infinity;
          for (const p of this.piles) {
            if (p.dead || p.claimed) continue;
            const d = dist2(n.v.x, n.v.z, p.x, p.z);
            if (d < bd) {
              bd = d;
              best = p;
            }
          }
          if (best) {
            best.claimed = n;
            n.pile = best;
            this.go(n, [...best.place.slice(0, -1), { x: best.x + (best.x > 0 ? -0.5 : 0.5), z: best.z + 0.45 }]);
            n.state = 'toPile';
          } else if (n.t <= 0) {
            n.t = 3;
            this.go(n, places.bhIdle(l, n.idx));
          }
          n.t -= dt;
          break;
        }
        case 'toPile':
          if (n.pile && n.pile.dead) {
            n.pile = null;
            n.state = 'idle';
            n.t = 0;
            break;
          }
          if (this.walk(n, speed, dt)) {
            const p = n.pile;
            if (p && !p.dead) {
              const v = n.v;
              this.collectPile(p, () => ({ x: v.x, y: 0.9, z: v.z }), false);
              v.punch = 1;
            }
            n.pile = null;
            n.state = 'idle';
            n.t = 0.35;
          }
          break;
      }
    }
  }

  private nearestDirty(x: number, z: number): number {
    let best = -1;
    let bd = Infinity;
    for (let i = 0; i < this.s.rooms; i++) {
      const r = this.rooms[i];
      if (r.state !== 'dirty' || r.claimed) continue;
      const slot = this.layout.rooms[i];
      const d = dist2(x, z, slot.zone.x, slot.zone.z);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  }

  private backSlot(v: CharView, i: number): { x: number; y: number; z: number } {
    const sn = Math.sin(v.yaw);
    const cs = Math.cos(v.yaw);
    return { x: v.x - sn * 0.36 * v.look.scale, y: 0.66 + i * 0.27, z: v.z - cs * 0.36 * v.look.scale };
  }

  private flySupply(fx: number, fy: number, fz: number, i: number, to: () => { x: number; y: number; z: number }, done?: () => void): void {
    this.flyers.add({ pool: i % 2 ? this.papers : this.towels, fx, fy, fz, to, dur: 0.26, arc: 0.9, delay: 0, done });
  }

  private finishClean(i: number, by: CharView): void {
    const r = this.rooms[i];
    const slot = this.layout.rooms[i];
    r.state = 'clean';
    r.progress = 0;
    r.claimed = null;
    this.view.setDirty(i, false);
    this.s.stats.cleaned++;
    this.flySupply(by.x, 1.0, by.z, 0, () => ({ x: slot.bed.x, y: 0.7, z: slot.bed.z }));
    this.sparks.emit(slot.cx, 0.9, slot.cz - 0.4, { n: 14, speed: 2.4, up: 2.2, life: 0.8, size: 0.34, colors: [0xffffff, 0xbfefff, 0xfff3a8], gravity: 0, drag: 2.5, spread: 2.2 });
    this.puffs.emit(slot.bed.x, 0.7, slot.bed.z, { n: 5, speed: 1.2, up: 0.6, life: 0.5, size: 0.5, colors: [0xffffff], gravity: 0, drag: 3, grow: 1.2, spread: 1 });
    const near = dist2(by.x, by.z, this.px, this.pz) < 200;
    if (near) audio.clean();
    if (questProgress(this.s, 'clean', 1)) this.questDone();
    this.store.touch();
  }

  // =============================================================== clients
  private spawnGuest(): void {
    const s = this.s;
    const l = this.layout;
    const vip = this.vipT <= 0 && s.stats.guests >= 6;
    if (vip) {
      const [a, b] = E.vipInterval(s);
      this.vipT = a + Math.random() * (b - a);
    }
    const side = Math.random() < 0.5 ? -1 : 1;
    const v = this.chars.add(vip ? looks.vip() : looks.guest());
    const here = places.exit(l, side);
    const start = here[here.length - 1];
    v.x = start.x;
    v.z = start.z;
    v.bag = true;
    const g: Guest = { v, path: [], here, lane: (Math.random() - 0.5) * 0.9, state: 'toQueue', vip, room: -1, t: 0, svc: null, spark: 0 };
    this.guests.push(g);
    this.queue.push(g);
    this.go(g, places.queue(l, this.queue.length - 1));
    if (vip) {
      this.ui.toast('crown', 'vip.arrive');
      audio.vip();
    }
  }

  private freeRoom(): number {
    for (let i = 0; i < this.s.rooms; i++) if (this.rooms[i].state === 'clean') return i;
    return -1;
  }

  private doCheckin(): void {
    const g = this.queue[0];
    const i = this.freeRoom();
    if (!g || i < 0) return;
    const s = this.s;
    const l = this.layout;
    this.queue.shift();
    this.queue.forEach((q, k) => {
      const spot = l.queue[Math.min(k, l.queue.length - 1)];
      q.here = places.queue(l, k);
      if (q.state === 'queue') {
        q.path = [spot];
        q.state = 'toQueue';
      } else if (q.path.length) q.path[q.path.length - 1] = spot;
    });
    this.rooms[i].state = 'reserved';
    g.room = i;
    g.state = 'toRoom';
    g.v.punch = 1;
    this.go(g, places.room(l, i, l.rooms[i].stand));
    s.stats.guests++;
    audio.ding();
    this.sparks.emit(g.v.x, 1.7, g.v.z, { n: 6, speed: 1.6, up: 1.6, life: 0.6, size: 0.3, colors: [0xfff3a8, 0xffffff], gravity: 0, drag: 2 });
    if (s.services.includes('parking')) {
      const sv = l.services.parking!;
      this.addPile('svc:parking', sv.pile.x, sv.pile.z, E.roomRate(s) * B.guest.parkingPay * (g.vip ? B.guest.vipMult : 1), places.service(sv, sv.pile));
    }
    if (s.tutorial === 1) s.tutorial = 2;
    if (questProgress(s, 'checkin', 1)) this.questDone();
    this.store.touch();
  }

  private updateGuests(dt: number): void {
    const s = this.s;
    const l = this.layout;
    const speed = B.guest.speed;
    for (let gi = this.guests.length - 1; gi >= 0; gi--) {
      const g = this.guests[gi];
      const v = g.v;
      if (g.vip) {
        g.spark -= dt;
        if (g.spark <= 0 && g.state !== 'sleep') {
          g.spark = 0.22;
          this.sparks.emit(v.x, 1.5, v.z, { n: 1, speed: 0.6, up: 0.9, life: 0.7, size: 0.26, colors: [0xffd84a, 0xfff3a8], gravity: 0, drag: 1, spread: 0.8 });
        }
      }
      switch (g.state) {
        case 'toQueue':
          if (this.walk(g, speed * (g.vip ? 1.15 : 1), dt)) g.state = 'queue';
          break;
        case 'queue':
          this.face(v, l.desk.x, l.desk.z - 1, dt);
          break;
        case 'toRoom':
          if (this.walk(g, speed, dt)) {
            const slot = l.rooms[g.room];
            g.state = 'sleep';
            g.t = B.guest.sleep;
            v.pose = POSE.sleep;
            v.x = slot.sleep.x;
            v.z = slot.sleep.z;
            v.y = 0.62;
            v.yaw = slot.sleep.yaw;
            v.bag = false;
            v.moving = false;
            v.cover = this.view.style.blanket[s.roomLevel - 1];
            this.rooms[g.room].state = 'occupied';
            this.puffs.emit(slot.bed.x, 0.8, slot.bed.z, { n: 4, speed: 1, up: 0.5, life: 0.45, size: 0.45, colors: [0xffffff], gravity: 0, drag: 3, grow: 1, spread: 0.8 });
          }
          break;
        case 'sleep': {
          g.t -= dt;
          g.spark -= dt;
          if (g.spark <= 0) {
            g.spark = 1.1;
            const slot = l.rooms[g.room];
            this.zs.emit(slot.bed.x + slot.side * 0.5, 1.3, slot.bed.z, { n: 1, speed: 0.25, up: 0.85, life: 1.5, size: 0.42, colors: [0xffffff], gravity: 0, drag: 0.2, spread: 0.1, grow: 0.7 });
          }
          if (g.t <= 0) this.wake(g);
          break;
        }
        case 'toService':
          if (this.walk(g, speed, dt)) {
            const sv = g.svc ? l.services[g.svc] : null;
            g.state = 'service';
            g.t = B.guest.serviceTime * (0.8 + Math.random() * 0.4);
            v.bag = false;
            if (sv?.swim) v.pose = POSE.swim;
            else if (sv && g.svc === 'vending') this.face(v, v.x, v.z + 2, 1);
          }
          break;
        case 'service':
          g.t -= dt;
          if (g.t <= 0) {
            const sv = g.svc ? l.services[g.svc] : null;
            v.pose = POSE.stand;
            v.bag = true;
            if (sv) this.addPile('svc:' + sv.id, sv.pile.x, sv.pile.z, E.roomRate(s) * B.guest.servicePay * (g.vip ? B.guest.vipMult : 1), places.service(sv, sv.pile));
            g.state = 'exit';
            this.go(g, places.exit(l, Math.random() < 0.5 ? -1 : 1));
          }
          break;
        case 'exit':
          if (this.walk(g, speed * 1.1, dt)) {
            this.chars.remove(v);
            this.guests.splice(gi, 1);
          }
          break;
      }
    }
  }

  private wake(g: Guest): void {
    const s = this.s;
    const l = this.layout;
    const slot = l.rooms[g.room];
    const v = g.v;
    v.pose = POSE.stand;
    v.cover = 0;
    v.y = 0;
    v.x = slot.stand.x;
    v.z = slot.stand.z;
    v.bag = true;
    v.punch = 1;
    this.rooms[g.room].state = 'dirty';
    this.rooms[g.room].progress = 0;
    this.view.setDirty(g.room, true);
    const pay = E.roomRate(s) * (g.vip ? B.guest.vipMult : 1) * E.tipMult(s);
    this.addPile('room:' + g.room, slot.pile.x, slot.pile.z, pay, places.room(l, g.room, slot.pile));
    if (g.vip) {
      s.stats.vips++;
      this.ui.float(slot.pile.x, 1.6, slot.pile.z, 'VIP ×' + B.guest.vipMult, 'vip');
      if (questProgress(s, 'vip', 1)) this.questDone();
    }
    const usable = s.services.filter((id) => (l.services[id]?.visits.length ?? 0) > 0);
    if (usable.length && Math.random() < B.guest.serviceChance) {
      const id = usable[Math.floor(Math.random() * usable.length)];
      const sv = l.services[id]!;
      const spot = sv.visits[Math.floor(Math.random() * sv.visits.length)];
      g.svc = id;
      g.state = 'toService';
      this.go(g, places.service(sv, { x: spot.x + (Math.random() - 0.5) * 0.3, z: spot.z + (Math.random() - 0.5) * 0.3 }));
    } else {
      g.state = 'exit';
      this.go(g, places.exit(l, Math.random() < 0.5 ? -1 : 1));
    }
    this.store.touch();
  }

  // ================================================================ joueur
  private updatePlayer(dt: number): void {
    const s = this.s;
    if (this.bot) this.botSteer();
    else this.joy.read(this.stick);
    const sp = E.playerSpeed(s);
    const tvx = this.stick.x * sp;
    const tvz = this.stick.y * sp;
    const k = Math.min(1, dt * 14);
    this.pvx += (tvx - this.pvx) * k;
    this.pvz += (tvz - this.pvz) * k;
    let x = this.px + this.pvx * dt;
    let z = this.pz + this.pvz * dt;
    const r = B.player.radius;
    for (let pass = 0; pass < 2; pass++) {
      for (const c of this.colliders) {
        const nx = Math.max(c.x0, Math.min(x, c.x1));
        const nz = Math.max(c.z0, Math.min(z, c.z1));
        const dx = x - nx;
        const dz = z - nz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          x = nx + (dx / d) * r;
          z = nz + (dz / d) * r;
        } else {
          // centre dans la boîte : sortir par la face la plus proche
          const l = x - c.x0;
          const rr = c.x1 - x;
          const t = z - c.z0;
          const bb = c.z1 - z;
          const m = Math.min(l, rr, t, bb);
          if (m === l) x = c.x0 - r;
          else if (m === rr) x = c.x1 + r;
          else if (m === t) z = c.z0 - r;
          else z = c.z1 + r;
        }
      }
    }
    const bd = this.layout.bounds;
    x = Math.max(bd.x0, Math.min(bd.x1, x));
    z = Math.max(bd.z0, Math.min(bd.z1, z));
    this.px = x;
    this.pz = z;
    const v = this.pv;
    v.x = x;
    v.z = z;
    const moving = Math.hypot(this.pvx, this.pvz) > 0.5;
    v.moving = moving;
    if (moving) {
      const want = Math.atan2(this.pvx, this.pvz);
      let da = want - v.yaw;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      v.yaw += da * Math.min(1, dt * 14);
      if (s.tutorial === 0) {
        s.tutorial = 1;
        this.store.touch();
      }
    }
    v.carry += ((this.stack > 0 ? 0.35 : 0) - v.carry) * Math.min(1, dt * 8);
    // petits nuages de poussière sous les pas
    if (moving) {
      this.dustT -= dt;
      if (this.dustT <= 0) {
        this.dustT = 0.16;
        this.puffs.emit(x, 0.12, z, { n: 1, speed: 0.5, up: 0.5, life: 0.4, size: 0.3, colors: [0xffffff], gravity: 0, drag: 2, grow: 1.2, spread: 0.2 });
      }
    }
  }

  private updateInteractions(dt: number): void {
    const s = this.s;
    const l = this.layout;
    const R2 = B.zone.radius * B.zone.radius;
    const work = E.playerWork(s);

    // ---- réception
    const front = this.queue[0];
    const can = !!front && front.state === 'queue' && this.freeRoom() >= 0;
    const inDesk = dist2(this.px, this.pz, l.checkin.x, l.checkin.z) < R2;
    let rate = 0;
    if (can) {
      if (inDesk) rate += work / B.zone.checkin;
      for (const n of this.staff) if (n.role === 'receptionist' && n.path.length === 0) rate += 1 / E.recCheckinTime(s);
    }
    if (rate > 0) {
      this.checkin += rate * dt;
      if (this.checkin >= 1) {
        this.checkin = 0;
        this.doCheckin();
        if (inDesk) audio.buzz(18);
      }
    } else this.checkin = Math.max(0, this.checkin - dt * B.zone.decay);

    // ---- réserve de linge
    const cap = E.playerCap(s);
    if (dist2(this.px, this.pz, l.closetZone.x, l.closetZone.z) < R2 * 1.25 && this.stack < cap) {
      this.closetT += dt;
      if (this.closetT >= B.zone.closetEvery) {
        this.closetT = 0;
        const i = this.stack++;
        this.flySupply(l.closetShelf.x, 1.0, l.closetShelf.z + (Math.random() - 0.5) * 1.6, i, () => this.backSlot(this.pv, i));
        audio.pick();
        audio.buzz(6);
        this.store.touch();
      }
    } else this.closetT = 0;

    // ---- nettoyage
    for (let i = 0; i < s.rooms; i++) {
      const r = this.rooms[i];
      if (r.state !== 'dirty') continue;
      const slot = l.rooms[i];
      const inZone = dist2(this.px, this.pz, slot.zone.x, slot.zone.z) < R2;
      if (inZone && this.stack > 0) {
        r.progress += (dt * work) / B.zone.clean;
        this.pv.punch = Math.max(this.pv.punch, 0.3);
        if (r.progress >= 1) {
          this.stack--;
          this.finishClean(i, this.pv);
          audio.buzz([14, 30, 14]);
        }
      } else {
        if (inZone && this.stack === 0) {
          this.hintT -= dt;
          if (this.hintT <= 0) {
            this.hintT = 1.6;
            this.ui.float(this.px, 2.2, this.pz, '', 'need-towel');
            audio.deny();
          }
        }
        const cleaning = r.claimed && r.claimed.state === 'clean';
        if (!cleaning) r.progress = Math.max(0, r.progress - dt * B.zone.decay);
      }
    }

    // ---- ramassage du cash
    const cr2 = B.player.collectRadius * B.player.collectRadius;
    for (const p of this.piles) {
      if (p.dead) continue;
      if (dist2(this.px, this.pz, p.x, p.z) < cr2) this.collectPile(p, () => ({ x: this.px, y: 1.0, z: this.pz }), true);
    }
    for (let i = this.piles.length - 1; i >= 0; i--) if (this.piles[i].dead) this.piles.splice(i, 1);

    // ---- dalles d'achat : rester dessus pour payer
    let onTile: ActiveTile | null = null;
    for (const t of this.tiles) {
      const h = t.size / 2 - 0.1;
      if (Math.abs(this.px - t.x) < h && Math.abs(this.pz - t.z) < h) onTile = t;
    }
    if (onTile && !this.busy) {
      this.payDwell += dt;
      const paid = s.paid[onTile.id] ?? 0;
      const remaining = onTile.cost - paid;
      if (this.payDwell > 0.22 && s.cash >= 1 && remaining > 0) {
        const rate2 = Math.max(B.player.payPerSecMin, onTile.cost / B.player.payDuration);
        const amount = Math.min(s.cash, remaining, Math.max(1, rate2 * dt));
        s.cash -= amount;
        s.paid[onTile.id] = paid + amount;
        this.payTick -= dt;
        if (this.payTick <= 0) {
          this.payTick = 0.055;
          const t = onTile;
          this.flyers.add({ pool: this.bills, fx: this.px, fy: 1.0, fz: this.pz, to: () => ({ x: t.x + (Math.random() - 0.5) * 0.6, y: 0.1, z: t.z + (Math.random() - 0.5) * 0.6 }), dur: 0.22, arc: 0.8, delay: 0 });
          audio.pay();
        }
        this.store.touch();
        if (s.paid[onTile.id] >= onTile.cost - 0.5) this.purchase(onTile);
      }
    } else this.payDwell = 0;
  }

  // ================================================================ achats
  private celebrate(x: number, z: number, big = false): void {
    this.confetti.emit(x, 1.2, z, { n: big ? 90 : 40, speed: big ? 6 : 4.2, up: big ? 9 : 7, life: 1.6, size: 0.2, colors: CONFETTI, gravity: 13, drag: 1.4, spread: 1 });
    this.puffs.emit(x, 0.3, z, { n: 8, speed: 2.6, up: 0.6, life: 0.5, size: 0.7, colors: [0xffffff], gravity: 0, drag: 3, grow: 1.4, spread: 1.6 });
    this.stage.punch();
    if (big) this.stage.shake(0.35);
    this.pv.jump = 1;
    audio.buzz(big ? [30, 40, 30, 40, 60] : [20, 30, 30]);
  }

  private purchase(t: ActiveTile): void {
    const s = this.s;
    const item = t.item;
    delete s.paid[t.id];
    s.bought[t.id] = 1;
    s.stats.bought++;
    if (s.tutorial < 3) s.tutorial = 3;
    switch (item.kind) {
      case 'room':
        s.rooms = item.n;
        this.view.setRooms(s.rooms, s.roomLevel, true);
        audio.build();
        this.celebrate(t.x, t.z);
        break;
      case 'roomUp':
        s.roomLevel = item.n;
        this.view.setRooms(s.rooms, s.roomLevel, true);
        audio.build();
        this.celebrate(t.x, t.z);
        this.ui.banner('sparkle', 'banner.roomUp', '+' + Math.round((B.roomLevelMult[item.n - 1] / B.roomLevelMult[item.n - 2] - 1) * 100) + '%');
        break;
      case 'service':
        s.services.push(item.service);
        this.view.setServices(s.services, true);
        audio.build();
        this.celebrate(t.x, t.z, true);
        this.ui.banner(t.icon, 'svc.' + item.service, 'banner.newService');
        break;
      case 'hire':
        s.staff[item.role] = item.n;
        this.spawnStaff(item.role, item.n - 1, true);
        audio.build();
        this.celebrate(t.x, t.z);
        this.ui.banner(t.icon, 'role.' + item.role, 'banner.hired');
        break;
      case 'next':
        this.nextTier();
        return;
    }
    if (questProgress(s, 'buy', 1)) this.questDone();
    this.refreshColliders();
    this.refreshTiles();
    this.checkFeatures();
    this.store.touch();
  }

  private nextTier(): void {
    const s = this.s;
    this.busy = true;
    audio.fanfare();
    this.celebrate(this.px, this.pz, true);
    const newCity = s.tier >= TIERS.length - 1;
    // le cash encore au sol suit le joueur
    for (const p of this.piles) if (!p.dead) s.pendingCash += p.value;
    this.piles = [];
    window.setTimeout(
      () =>
        this.ui.transition(() => {
          if (newCity) {
            // nouvelle ville : on repart les poches vides (tout est investi dans le voyage)
            s.city++;
            s.tier = 0;
            s.cash = 0;
            s.pendingCash = 0;
          } else s.tier++;
          this.resetTierState();
          s.stats.maxTier = Math.max(s.stats.maxTier, s.city * TIERS.length + s.tier);
          this.buildTier();
          this.busy = false;
          this.checkFeatures();
          this.store.touch();
          this.ui.banner(newCity ? 'plane' : 'hotel', newCity ? 'city.' + E.themeOf(s.city) : 'tier.' + TIERS[s.tier].id, newCity ? 'banner.newCity' : 'banner.newTier');
          this.confetti.emit(this.px, 3, this.pz, { n: 120, speed: 7, up: 8, life: 2, size: 0.22, colors: CONFETTI, gravity: 10, drag: 1.2, spread: 5 });
          audio.fanfare();
        }),
      650,
    );
  }

  private resetTierState(): void {
    const s = this.s;
    const t = TIERS[s.tier];
    s.rooms = t.startRooms;
    s.roomLevel = 1;
    s.services = [];
    s.bought = {};
    s.paid = {};
  }

  /** Déblocage progressif des systèmes, un par un. */
  checkFeatures(): void {
    const s = this.s;
    const f = s.features;
    const unlock = (k: Feature): void => {
      if (f[k]) return;
      f[k] = true;
      this.ui.feature(k);
      this.store.touch();
      if (k === 'staff') this.refreshTiles();
      if (k === 'quests') ensureQuests(s);
    };
    const global = s.city * TIERS.length + s.tier;
    const staffCount = s.staff.receptionist + s.staff.housekeeper + s.staff.bellhop;
    if (!f.staff) {
      const rest = TIERS[s.tier].chain.every((c) => c.kind === 'hire' || c.kind === 'next' || E.chainDone(s, c));
      if (global > 0 || (s.stats.playTime >= B.unlock.staffTime && s.rooms >= B.unlock.staffRooms) || rest) unlock('staff');
    } else if (!f.upgrades) {
      if (global > 0 || staffCount >= B.unlock.upgradesStaff) unlock('upgrades');
    } else if (!f.boosts) {
      if (global > 0) unlock('boosts');
    } else if (!f.quests) {
      if (global > 1 || (global === 1 && Object.keys(s.bought).length >= B.unlock.questsBought)) unlock('quests');
    } else if (!f.prestige) {
      if (global >= TIERS.length - 1) unlock('prestige');
    }
  }

  // ====================================================== actions de l'UI
  buyUpgrade(id: UpgradeId): boolean {
    const s = this.s;
    const cost = E.upgradeCost(id, s.up[id]);
    if (E.upgradeMaxed(s, id) || s.cash < cost) {
      audio.deny();
      return false;
    }
    s.cash -= cost;
    s.up[id]++;
    s.stats.bought++;
    audio.build();
    audio.buzz(20);
    if (id === 'pSpeed' || id === 'pCap' || id === 'pIncome') {
      this.pv.jump = 1;
      this.sparks.emit(this.px, 1.4, this.pz, { n: 12, speed: 2.5, up: 3, life: 0.8, size: 0.34, colors: [0xffd84a, 0xffffff, 0x7fffd4], gravity: 0, drag: 2 });
    }
    if (questProgress(s, 'buy', 1)) this.questDone();
    this.store.touch();
    return true;
  }

  buyStar(id: StarId): boolean {
    const s = this.s;
    const lv = s.starTree[id];
    const cost = E.starCost(id, lv);
    if (lv >= B.stars[id].max || s.stars < cost || !E.starAvailable(s, id)) {
      audio.deny();
      return false;
    }
    s.stars -= cost;
    s.starsSpent += cost;
    s.starTree[id]++;
    audio.vip();
    audio.buzz(25);
    this.store.touch();
    return true;
  }

  claimQuest(id: number): void {
    const reward = claimQuest(this.s, id);
    if (reward <= 0) return;
    this.earn(reward);
    audio.fanfare();
    audio.buzz([20, 30, 40]);
    this.ui.float(this.px, 2, this.pz, '+' + money(reward), 'cash');
    this.confetti.emit(this.px, 1.5, this.pz, { n: 40, speed: 4, up: 7, life: 1.5, size: 0.2, colors: CONFETTI, gravity: 13, drag: 1.4 });
    this.pv.jump = 1;
    this.store.touch();
  }

  claimAchievement(id: string): void {
    if (!claimAchievement(this.s, id)) return;
    audio.fanfare();
    audio.buzz([20, 30, 40]);
    this.confetti.emit(this.px, 1.5, this.pz, { n: 40, speed: 4, up: 7, life: 1.5, size: 0.2, colors: CONFETTI, gravity: 13, drag: 1.4 });
    this.store.touch();
  }

  addBoost(kind: 'income' | 'speed'): void {
    this.s.boosts[kind] = Math.min(this.s.boosts[kind] + B.boosts[kind].duration, B.boosts[kind].duration * 3);
    audio.vip();
    this.pv.jump = 1;
    this.store.touch();
  }

  grant(amount: number): void {
    if (amount <= 0) return;
    this.earn(amount);
    audio.fanfare();
    this.confetti.emit(this.px, 1.5, this.pz, { n: 60, speed: 5, up: 8, life: 1.6, size: 0.2, colors: CONFETTI, gravity: 13, drag: 1.4 });
  }

  /** Prestige : revend l'empire contre des Étoiles et repart du motel. */
  prestige(): void {
    const s = this.s;
    const gain = E.starsOnPrestige(s);
    if (gain < B.prestige.minStars || this.busy) return;
    this.busy = true;
    audio.fanfare();
    this.ui.transition(() => {
      s.stars += gain;
      s.stats.prestiges++;
      s.cash = 0;
      s.runCash = 0;
      s.city = 0;
      s.tier = 0;
      s.staff = { receptionist: 0, housekeeper: 0, bellhop: 0 };
      for (const k of Object.keys(s.up) as UpgradeId[]) s.up[k] = 0;
      s.quests = [];
      s.boosts = { income: 0, speed: 0 };
      s.pendingCash = 0;
      this.resetTierState();
      s.cash = E.startCash(s);
      this.buildTier();
      this.busy = false;
      this.store.touch();
      this.ui.banner('star', 'banner.prestige', '+' + gain);
      this.confetti.emit(this.px, 3, this.pz, { n: 140, speed: 7, up: 8, life: 2.2, size: 0.22, colors: [0xffd84a, 0xffffff, 0xffab2e], gravity: 9, drag: 1.2, spread: 5 });
    });
  }

  /** Cash au sol (pour la sauvegarde). */
  floorCash(): number {
    let v = 0;
    for (const p of this.piles) if (!p.dead) v += p.value;
    return v;
  }

  // =============================================================== guidage
  private taskTarget(): Target | null {
    const s = this.s;
    const l = this.layout;
    // 1. une dalle payable
    let best: ActiveTile | null = null;
    for (const t of this.tiles) {
      const rem = t.cost - (s.paid[t.id] ?? 0);
      if (s.cash >= rem && (!best || t.cost < best.cost)) best = t;
    }
    if (best) return { x: best.x, z: best.z, kind: 'tile', place: best.place, affordable: true };
    // 2. du cash à ramasser
    if (s.staff.bellhop === 0 || this.bot) {
      let bp: Pile | null = null;
      let bd = Infinity;
      for (const p of this.piles) {
        if (p.dead || (p.claimed && this.bot)) continue;
        const d = dist2(this.px, this.pz, p.x, p.z);
        if (d < bd) {
          bd = d;
          bp = p;
        }
      }
      if (bp && (s.staff.bellhop === 0 || bd < 30)) return { x: bp.x, z: bp.z, kind: 'pile', place: bp.place };
    }
    // 3. un client à enregistrer
    const waiting = this.queue.length > 0 && this.queue[0].state === 'queue';
    if (waiting && this.freeRoom() >= 0 && s.staff.receptionist === 0) return { x: l.checkin.x, z: l.checkin.z, kind: 'checkin', place: places.desk(l, 0) };
    // 4. une chambre sale
    const dirty = this.nearestDirty(this.px, this.pz);
    if (dirty >= 0 && (s.staff.housekeeper === 0 || this.bot)) {
      if (this.stack === 0) return { x: l.closetZone.x, z: l.closetZone.z, kind: 'closet', place: places.closet(l) };
      const slot = l.rooms[dirty];
      return { x: slot.zone.x, z: slot.zone.z, kind: 'room', place: places.room(l, dirty, slot.zone) };
    }
    if (this.stack === 0 && s.staff.housekeeper === 0 && this.rooms.some((r, i) => i < s.rooms && r.state !== 'clean')) {
      return { x: l.closetZone.x, z: l.closetZone.z, kind: 'closet', place: places.closet(l) };
    }
    if (s.staff.receptionist === 0) return { x: l.checkin.x, z: l.checkin.z, kind: 'checkin', place: places.desk(l, 0) };
    return null;
  }

  private updateGuide(dt: number): void {
    const s = this.s;
    this.guideT -= dt;
    if (this.guideT <= 0) {
      this.guideT = 0.2;
      let cheapest: ActiveTile | null = null;
      for (const t of this.tiles) if (!cheapest || t.cost - (s.paid[t.id] ?? 0) < cheapest.cost - (s.paid[cheapest.id] ?? 0)) cheapest = t;
      if (this.objective !== cheapest) {
        this.objective = cheapest;
        this.store.touch();
      }
      if (s.tutorial < 3 || this.bot) this.target = this.taskTarget();
      else if (cheapest) {
        const rem = cheapest.cost - (s.paid[cheapest.id] ?? 0);
        this.target = { x: cheapest.x, z: cheapest.z, kind: 'tile', place: cheapest.place, affordable: s.cash >= rem };
      } else this.target = null;
    }
    const t = this.target;
    const show = !!t && !this.busy && (s.tutorial > 0 || this.bot);
    this.arrow.visible = show;
    this.chevron.visible = false;
    if (!t || !show) return;
    const strong = t.kind !== 'tile' || !!t.affordable;
    const bob = Math.abs(Math.sin(this.time * (strong ? 5 : 2.4))) * (strong ? 0.5 : 0.2);
    this.arrow.position.set(t.x, (t.kind === 'tile' ? 1.5 : 2.5) + bob, t.z);
    this.arrow.rotation.y = this.time * 2.5;
    this.arrow.scale.setScalar(strong ? 1 : 0.6);
    (this.arrow.material as THREE.MeshBasicMaterial).color.set(strong ? 0xffd23f : 0xffffff);
    const dx = t.x - this.px;
    const dz = t.z - this.pz;
    const d = Math.hypot(dx, dz);
    if (d > 2.6) {
      this.chevron.visible = true;
      const a = Math.atan2(dx, dz);
      const r = 1.3 + (strong ? Math.sin(this.time * 7) * 0.12 : 0);
      this.chevron.position.set(this.px + Math.sin(a) * r, 0.06, this.pz + Math.cos(a) * r);
      this.chevron.rotation.y = a + Math.PI;
      const m = this.chevron.material as THREE.MeshBasicMaterial;
      m.opacity = strong ? 0.95 : 0.45;
      m.color.set(strong ? 0xffd23f : 0xffffff);
      this.chevron.scale.setScalar(strong ? 1 : 0.8);
    }
  }

  // ================================================================== bot
  private playerApproach(): Approach {
    const l = this.layout;
    const p = { x: this.px, z: this.pz };
    if (p.z < -0.1 && p.z > l.zN && Math.abs(p.x) > L.CW && Math.abs(p.x) < L.HX) {
      const row = Math.min(l.rows - 1, Math.floor(-p.z / L.RD));
      const cz = -(row + 0.5) * L.RD;
      return [{ x: 0, z: cz }, { x: Math.sign(p.x) * (L.CW + 0.7), z: cz }, p];
    }
    if (p.z > L.LD - 0.1) return [{ x: 0, z: L.LD }, { x: 0, z: 8.6 }, p];
    if (p.z <= l.zN) return [{ x: 0, z: l.zN }, { x: 0, z: l.zN - 2 }, p];
    if (Math.abs(p.x) > L.HX) {
      const s = Math.sign(p.x);
      const base: Approach = [{ x: 0, z: 5.6 }, { x: s * 5.8, z: 5.6 }, { x: s * 7.0, z: 5.6 }];
      if (p.z < 0) base.push({ x: s * 7.6, z: 1.2 }, { x: s * 8.2, z: -1.4 });
      return [...base, p];
    }
    return [{ x: 0, z: p.z }, p];
  }

  private botSteer(): void {
    const t = this.target;
    this.stick.x = this.stick.y = 0;
    if (!t || this.busy) return;
    const key = `${t.kind}|${t.x.toFixed(1)}|${t.z.toFixed(1)}`;
    if (key !== this.botKey) {
      this.botKey = key;
      this.botPath = route(this.playerApproach(), t.place);
      this.botStuck = 0;
    }
    while (this.botPath.length > 1 && dist2(this.px, this.pz, this.botPath[0].x, this.botPath[0].z) < 0.16) this.botPath.shift();
    const w = this.botPath[0] ?? t;
    const dx = w.x - this.px;
    const dz = w.z - this.pz;
    const d = Math.hypot(dx, dz);
    if (d > 0.12) {
      this.stick.x = dx / d;
      this.stick.y = dz / d;
    }
    // anti-blocage : recalcule le chemin si on n'avance plus
    this.botStuck++;
    if (this.botStuck > 90) {
      if (dist2(this.px, this.pz, this.botLast.x, this.botLast.z) < 0.05 && d > 0.3) this.botKey = '';
      this.botLast = { x: this.px, z: this.pz };
      this.botStuck = 0;
    }
  }

  /** Le bot gère aussi les panneaux : améliorations rentables, quêtes, succès. */
  private botManage(): void {
    const s = this.s;
    if (s.features.upgrades) {
      const ids: UpgradeId[] = ['pIncome', 'pSpeed', 'pCap'];
      if (s.staff.receptionist) ids.push('recSpeed', 'recCap');
      if (s.staff.housekeeper) ids.push('hkSpeed', 'hkCap');
      if (s.staff.bellhop) ids.push('bhSpeed', 'bhCap');
      for (const id of ids) {
        if (!E.upgradeMaxed(s, id) && E.upgradeCost(id, s.up[id]) <= s.cash * 0.2) this.buyUpgrade(id);
      }
    }
    for (const q of [...s.quests]) if (q.progress >= q.target) this.claimQuest(q.id);
    for (const id of ['guests', 'cleaned', 'vips', 'earned', 'bought', 'tier', 'quests', 'prestige']) this.claimAchievement(id);
  }

  // ================================================================ boucle
  step(dt: number): void {
    const s = this.s;
    this.time += dt;
    if (!this.busy) s.stats.playTime += dt;
    if (s.boosts.income > 0) s.boosts.income = Math.max(0, s.boosts.income - dt);
    if (s.boosts.speed > 0) s.boosts.speed = Math.max(0, s.boosts.speed - dt);
    if (this.busy) {
      this.pv.moving = false;
      return;
    }
    this.vipT -= dt;
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.queue.length < E.queueCap(s) && this.guests.length < 44) {
      this.spawnT = B.guest.spawnEvery * (0.7 + Math.random() * 0.6);
      this.spawnGuest();
    }
    this.updatePlayer(dt);
    this.updateGuests(dt);
    this.updateStaff(dt);
    this.updateInteractions(dt);
    this.slowT -= dt;
    if (this.slowT <= 0) {
      this.slowT = 1;
      this.checkFeatures();
      let occupied = 0;
      for (let i = 0; i < s.rooms; i++) if (this.rooms[i].state === 'reserved' || this.rooms[i].state === 'occupied') occupied++;
      this.view.setCars(s.tier === 0 || s.services.includes('parking') ? occupied : 0);
      this.store.touch(); // minuteurs de boosts, quêtes
      if (this.bot) this.botManage();
    }
    this.updateGuide(dt);
  }

  /** Mise à jour visuelle (une fois par frame, après les pas de simulation). */
  draw(dt: number): void {
    const s = this.s;
    const l = this.layout;
    const time = this.time;
    this.stage.follow(this.px, this.pz, dt);
    this.view.update(dt, time);

    // zones
    this.zones.begin(time);
    const front = this.queue[0];
    const canCheck = !!front && front.state === 'queue' && this.freeRoom() >= 0;
    this.zones.put(l.checkin.x, l.checkin.z, B.zone.radius, this.checkin, canCheck, canCheck ? 0x4fe38a : 0xffffff, 0);
    const needTowels = this.stack < E.playerCap(s);
    this.zones.put(l.closetZone.x, l.closetZone.z, B.zone.radius * 1.1, this.stack / Math.max(1, E.playerCap(s)), needTowels, 0x4fc3ff, 2);
    for (let i = 0; i < s.rooms; i++) {
      const r = this.rooms[i];
      if (r.state !== 'dirty') continue;
      const slot = l.rooms[i];
      this.zones.put(slot.zone.x, slot.zone.z, B.zone.radius, r.progress, true, 0xffc933, 1);
    }
    this.zones.end();

    // dalles
    for (let i = 0; i < this.tileViews.length; i++) {
      const t = this.tiles[i];
      const tv = this.tileViews[i];
      if (!t || this.busy) {
        tv.hide();
        continue;
      }
      const paid = s.paid[t.id] ?? 0;
      const rem = Math.max(0, t.cost - paid);
      tv.show(t.x, t.z, t.size, t.icon, money(Math.ceil(rem)), paid / t.cost, s.cash >= rem, time, dt);
    }

    // objets instanciés
    this.bills.begin();
    this.towels.begin();
    this.papers.begin();
    this.blobs.begin();
    for (const p of this.piles) {
      if (p.pop > 0) p.pop = Math.max(0, p.pop - dt * 3.5);
      const sc = 1 + Math.sin(p.pop * Math.PI) * 0.35;
      for (let i = 0; i < p.n; i++) {
        const o = this.billOffset(i);
        this.bills.put(p.x + o.x * sc, o.y * sc, p.z + o.z * sc, ((i * 7) % 5) * 0.06 - 0.12, sc);
      }
      this.blobs.put(p.x, p.z, 1.5);
    }
    // pile de linge sur le dos du joueur (suit avec un léger retard = effet ressort)
    this.drawStack(this.pv, this.stack, this.stackPos, dt);
    for (const n of this.staff) if (n.role === 'housekeeper') this.drawStack(n.v, n.carry, n.stack, dt);
    this.flyers.update(dt);
    this.bills.end();
    this.towels.end();
    this.papers.end();
    for (const c of this.chars.list) if (c.pose === POSE.stand && c.visible) this.blobs.put(c.x, c.z, 1.05 * c.look.scale);
    this.blobs.end();

    this.chars.update(dt, time);
    const q = this.stage.camera.quaternion;
    this.confetti.update(dt, q);
    this.sparks.update(dt, q);
    this.puffs.update(dt, q);
    this.zs.update(dt, q);
  }

  private drawStack(v: CharView, count: number, pos: { x: number; y: number; z: number }[], dt: number): void {
    while (pos.length > count) pos.pop();
    for (let i = 0; i < count; i++) {
      const tgt = this.backSlot(v, i);
      let p = pos[i];
      if (!p) {
        p = { ...tgt };
        pos[i] = p;
      }
      const k = Math.min(1, dt * (26 - Math.min(i, 10) * 1.9));
      p.x += (tgt.x - p.x) * k;
      p.z += (tgt.z - p.z) * k;
      p.y = tgt.y + (v.moving ? Math.abs(Math.sin(v.phase)) * 0.05 : 0);
      (i % 2 ? this.papers : this.towels).put(p.x, p.y, p.z, v.yaw, 1);
    }
  }
}
