import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { charMat } from './materials';

/**
 * Personnages "chunky" entièrement instanciés : ~9 draw calls pour TOUS les persos
 * (corps, tête, bras, jambes, cheveux, chapeaux, yeux, valise). Animation procédurale
 * (marche, idle, sommeil, nage, squash & stretch) calculée sur CPU par matrices.
 */
export interface CharLook {
  skin: number;
  shirt: number;
  pants: number;
  hair: number;
  hat: 0 | 1 | 2; // 0 aucun, 1 casquette/calot, 2 haut-de-forme (VIP)
  hatColor: number;
  scale: number;
}

export const POSE = { stand: 0, sleep: 1, swim: 2 } as const;

export class CharView {
  x = 0;
  y = 0;
  z = 0;
  yaw = 0;
  look: CharLook;
  phase = Math.random() * 6;
  move = 0; // 0 idle .. 1 marche (lissé)
  moving = false;
  pose: number = POSE.stand;
  punch = 0; // squash & stretch (1 -> 0)
  jump = 0; // saut de joie (1 -> 0)
  bag = false;
  carry = 0; // bras relevés (0..1)
  cover = 0; // couleur de couverture quand il dort (0 = chemise)
  visible = true;
  grow = 1; // échelle d'apparition (pop)
  constructor(look: CharLook) {
    this.look = look;
  }
}

const SKINS = [0xffd2b0, 0xf2b98c, 0xd99a6c, 0xa86f48, 0x7a4a2e];
const HAIRS = [0x2b1d16, 0x4a2f1c, 0x8a5a2b, 0xd9a441, 0xe8e2d8, 0xc0392b, 0x1c1c22, 0x6b4a8a];
const SHIRTS = [0xff6b6b, 0x4ecdc4, 0xffd166, 0x5b8def, 0xb983ff, 0xff9f43, 0x6bd968, 0xff7eb6, 0x38b6ff, 0xf4f1de];
const PANTS = [0x2d3e63, 0x3b3b4f, 0x6b4a2e, 0x4a6b8a, 0x556b2f, 0x7a3b4a];
const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

export const looks = {
  guest: (): CharLook => ({ skin: pick(SKINS), shirt: pick(SHIRTS), pants: pick(PANTS), hair: pick(HAIRS), hat: 0, hatColor: 0, scale: 1.0 + Math.random() * 0.1 }),
  vip: (): CharLook => ({ skin: pick(SKINS), shirt: 0x7b2ff7, pants: 0x1c1c2e, hair: pick(HAIRS), hat: 2, hatColor: 0xffc933, scale: 1.14 }),
  player: (): CharLook => ({ skin: 0xffd2b0, shirt: 0x18c29c, pants: 0x2b3a67, hair: 0x4a2f1c, hat: 1, hatColor: 0xffc933, scale: 1.14 }),
  receptionist: (): CharLook => ({ skin: pick(SKINS), shirt: 0x3a4a8a, pants: 0x1f2540, hair: pick(HAIRS), hat: 0, hatColor: 0, scale: 1 }),
  housekeeper: (): CharLook => ({ skin: pick(SKINS), shirt: 0xff8fb8, pants: 0xf6f1ea, hair: pick(HAIRS), hat: 1, hatColor: 0xffffff, scale: 0.98 }),
  bellhop: (): CharLook => ({ skin: pick(SKINS), shirt: 0xd62839, pants: 0x1f1f2e, hair: pick(HAIRS), hat: 1, hatColor: 0xd62839, scale: 1 }),
};

function limbGeo(r: number, len: number): THREE.BufferGeometry {
  const g = new THREE.CapsuleGeometry(r, len, 4, 10);
  g.translate(0, -(len / 2 + r * 0.5), 0); // pivot en haut du membre
  return g;
}

const _root = new THREE.Matrix4();
const _loc = new THREE.Matrix4();
const _out = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _one = new THREE.Vector3(1, 1, 1);
const _c = new THREE.Color();
const X = new THREE.Vector3(1, 0, 0);

export class CharRenderer {
  readonly list: CharView[] = [];
  private body: THREE.InstancedMesh;
  private head: THREE.InstancedMesh;
  private arm: THREE.InstancedMesh;
  private leg: THREE.InstancedMesh;
  private hair: THREE.InstancedMesh;
  private cap: THREE.InstancedMesh;
  private top: THREE.InstancedMesh;
  private eyes: THREE.InstancedMesh;
  private bag: THREE.InstancedMesh;
  private all: THREE.InstancedMesh[];

  constructor(scene: THREE.Scene, private capacity = 72) {
    const mk = (g: THREE.BufferGeometry, n: number, mat: THREE.Material = charMat): THREE.InstancedMesh => {
      const m = new THREE.InstancedMesh(g, mat, n);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.setColorAt(0, _c.set(0xffffff));
      m.instanceColor!.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.count = 0;
      scene.add(m);
      return m;
    };
    const bodyG = new THREE.CapsuleGeometry(0.27, 0.2, 5, 14);
    bodyG.scale(1.12, 1, 0.92);
    this.body = mk(bodyG, capacity);
    const headG = new THREE.SphereGeometry(0.3, 18, 14);
    headG.scale(1.04, 0.97, 1);
    this.head = mk(headG, capacity);
    this.arm = mk(limbGeo(0.085, 0.2), capacity * 2);
    this.leg = mk(limbGeo(0.115, 0.14), capacity * 2);
    const hairG = new THREE.SphereGeometry(0.325, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    hairG.rotateX(-0.28);
    hairG.translate(0, 0.01, -0.015);
    this.hair = mk(hairG, capacity);
    const capTop = new THREE.CylinderGeometry(0.2, 0.25, 0.15, 14);
    capTop.translate(0, 0.3, 0);
    const brim = new THREE.CylinderGeometry(0.17, 0.17, 0.035, 12);
    brim.scale(1, 1, 0.8);
    brim.translate(0, 0.245, 0.2);
    this.cap = mk(mergeGeometries([capTop, brim])!, capacity);
    const tube = new THREE.CylinderGeometry(0.19, 0.17, 0.3, 14);
    tube.translate(0, 0.42, 0);
    const rim = new THREE.CylinderGeometry(0.32, 0.32, 0.04, 16);
    rim.translate(0, 0.27, 0);
    this.top = mk(mergeGeometries([tube, rim])!, 16);
    const eyeL = new THREE.SphereGeometry(0.038, 8, 6);
    eyeL.translate(-0.11, 0.02, 0.272);
    const eyeR = new THREE.SphereGeometry(0.038, 8, 6);
    eyeR.translate(0.11, 0.02, 0.272);
    this.eyes = mk(mergeGeometries([eyeL, eyeR])!, capacity, new THREE.MeshBasicMaterial({ color: 0x241a1a }));
    const bagBody = new THREE.BoxGeometry(0.36, 0.28, 0.17);
    const handle = new THREE.TorusGeometry(0.07, 0.02, 6, 10, Math.PI);
    handle.translate(0, 0.14, 0);
    this.bag = mk(mergeGeometries([bagBody.toNonIndexed(), handle.toNonIndexed()])!, capacity);
    this.all = [this.body, this.head, this.arm, this.leg, this.hair, this.cap, this.top, this.eyes, this.bag];
  }

  add(look: CharLook): CharView {
    const v = new CharView(look);
    this.list.push(v);
    return v;
  }
  remove(v: CharView): void {
    const i = this.list.indexOf(v);
    if (i >= 0) this.list.splice(i, 1);
  }
  clear(keep?: CharView): void {
    this.list.length = 0;
    if (keep) this.list.push(keep);
  }

  private put(mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, q: THREE.Quaternion, s: THREE.Vector3, color: number): void {
    _loc.compose(_p.set(x, y, z), q, s);
    _out.multiplyMatrices(_root, _loc);
    mesh.setMatrixAt(i, _out);
    mesh.setColorAt(i, _c.set(color));
  }

  update(dt: number, time: number): void {
    let nb = 0;
    let nl = 0;
    let nh = 0;
    let nc = 0;
    let nt = 0;
    let nbag = 0;
    for (const v of this.list) {
      // lissage et horloges d'animation
      v.move += ((v.moving ? 1 : 0) - v.move) * Math.min(1, dt * 12);
      if (v.move > 0.02) v.phase += dt * 11.5;
      if (v.punch > 0) v.punch = Math.max(0, v.punch - dt * 3.2);
      if (v.jump > 0) v.jump = Math.max(0, v.jump - dt * 2.2);
      if (v.grow < 1) v.grow = Math.min(1, v.grow + dt * 4);
      if (!v.visible || nb >= this.capacity) continue;

      const L = v.look;
      const sin = Math.sin(v.phase);
      const idle = Math.sin(time * 2.2 + v.phase);
      const pu = v.punch > 0 ? Math.sin(v.punch * Math.PI * 3) * v.punch * 0.22 : 0;
      const jy = v.jump > 0 ? Math.sin((1 - v.jump) * Math.PI) * 0.7 : 0;
      const g = v.grow < 1 ? 1 + 0.25 * Math.sin(v.grow * Math.PI) - (1 - v.grow) : 1;
      const sc = L.scale * Math.max(0.01, g);
      const bob = Math.abs(sin) * 0.06 * v.move;
      let shirt = L.shirt;
      let limbs = L.skin;
      let pants = L.pants;

      if (v.pose === POSE.sleep) {
        // allongé sur le dos, corps "sous la couverture"
        _q.setFromEuler(_e.set(-Math.PI / 2, v.yaw, 0, 'YXZ'));
        _root.compose(_p.set(v.x, v.y, v.z), _q, _s.set(sc, sc * (1 + idle * 0.02), sc));
        if (v.cover) shirt = limbs = pants = v.cover;
      } else if (v.pose === POSE.swim) {
        _q.setFromEuler(_e.set(0, v.yaw, idle * 0.06, 'YXZ'));
        _root.compose(_p.set(v.x, v.y - 0.78 + idle * 0.04, v.z), _q, _s.set(sc, sc, sc));
      } else {
        _q.setFromEuler(_e.set(0.1 * v.move, v.yaw, 0, 'YXZ'));
        _root.compose(_p.set(v.x, v.y + jy, v.z), _q, _s.set(sc * (1 - pu * 0.6), sc * (1 + pu), sc * (1 - pu * 0.6)));
      }

      const breathe = 1 + idle * 0.018 * (1 - v.move);
      _q.identity();
      this.put(this.body, nb, 0, 0.72 + bob, 0, _q, _s.set(1, breathe, 1), shirt);
      this.put(this.head, nb, 0, 1.25 + bob + (breathe - 1) * 0.5, 0, _q, _one, L.skin);
      this.put(this.eyes, nb, 0, 1.25 + bob + (breathe - 1) * 0.5, 0, _q, v.pose === POSE.sleep ? _s.set(1, 0.25, 1) : _one, 0xffffff);
      if (L.hat !== 2) {
        this.put(this.hair, nh++, 0, 1.25 + bob, 0, _q, _one, L.hair);
      }
      if (L.hat === 1) this.put(this.cap, nc++, 0, 1.25 + bob, 0, _q, _one, L.hatColor);
      if (L.hat === 2) this.put(this.top, nt++, 0, 1.25 + bob, 0, _q, _one, L.hatColor);

      // jambes
      const swing = sin * 0.75 * v.move;
      const kick = v.pose === POSE.swim ? Math.sin(time * 6 + v.phase) * 0.5 : 0;
      _q.setFromAxisAngle(X, swing + kick);
      this.put(this.leg, nl, -0.145, 0.44 + bob * 0.5, 0, _q, _one, pants);
      _q.setFromAxisAngle(X, -swing - kick);
      this.put(this.leg, nl + 1, 0.145, 0.44 + bob * 0.5, 0, _q, _one, pants);

      // bras
      let aL = -swing * 0.9;
      let aR = swing * 0.9;
      let spread = 0.16 + idle * 0.02;
      if (v.pose === POSE.swim) {
        aL = -1.6 + Math.sin(time * 4 + v.phase) * 0.6;
        aR = -1.6 - Math.sin(time * 4 + v.phase) * 0.6;
        spread = 0.5;
      } else if (v.jump > 0) {
        aL = aR = -2.7;
        spread = 0.45;
      } else if (v.carry > 0) {
        aL = aL * (1 - v.carry) - 1.0 * v.carry;
        aR = aR * (1 - v.carry) - 1.0 * v.carry;
      }
      if (v.bag && v.pose === POSE.stand) aR = 0.05;
      _q.setFromAxisAngle(X, aL);
      _q2.setFromEuler(_e.set(0, 0, -spread));
      _q2.multiply(_q);
      this.put(this.arm, nl, -0.33, 0.98 + bob, 0, _q2, _one, limbs);
      _q.setFromAxisAngle(X, aR);
      _q2.setFromEuler(_e.set(0, 0, spread));
      _q2.multiply(_q);
      this.put(this.arm, nl + 1, 0.33, 0.98 + bob, 0, _q2, _one, limbs);
      nl += 2;

      if (v.bag && v.pose === POSE.stand) {
        _q.setFromEuler(_e.set(0, Math.PI / 2, 0));
        this.put(this.bag, nbag++, 0.44, 0.42 + bob, 0.03, _q, _one, L.hat === 2 ? 0xffc933 : 0x9a5b34);
      }
      nb++;
    }
    this.body.count = this.head.count = this.eyes.count = nb;
    this.arm.count = this.leg.count = nl;
    this.hair.count = nh;
    this.cap.count = nc;
    this.top.count = nt;
    this.bag.count = nbag;
    for (const m of this.all) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }
}
