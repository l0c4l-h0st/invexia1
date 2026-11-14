import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { blobMat, blobTex } from './materials';
import { iconImage, preloadIcons } from '../ui/icons';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const Z = new THREE.Vector3(0, 0, 1);

function colored(g: THREE.BufferGeometry, color: number): THREE.BufferGeometry {
  const ng = g.index ? g.toNonIndexed() : g;
  ng.deleteAttribute('uv');
  const n = ng.getAttribute('position').count;
  const col = new Float32Array(n * 3);
  _c.set(color);
  for (let i = 0; i < n; i++) col.set([_c.r, _c.g, _c.b], i * 3);
  ng.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return ng;
}

/** Pool d'instances réécrit chaque frame : begin() → put()… → end(). */
export class ItemPool {
  readonly mesh: THREE.InstancedMesh;
  private n = 0;
  constructor(scene: THREE.Scene, geo: THREE.BufferGeometry, mat: THREE.Material, private cap: number) {
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    scene.add(this.mesh);
  }
  begin(): void {
    this.n = 0;
  }
  put(x: number, y: number, z: number, yaw = 0, s = 1, tilt = 0): void {
    if (this.n >= this.cap) return;
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(tilt, yaw, 0, 'YXZ')), _s.set(s, s, s));
    this.mesh.setMatrixAt(this.n++, _m);
  }
  end(): void {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

const itemsMat = new THREE.MeshLambertMaterial({ vertexColors: true });

export function makeBillPool(scene: THREE.Scene): ItemPool {
  const body = colored(new THREE.BoxGeometry(0.52, 0.085, 0.3), 0x34c466);
  const band = colored(new THREE.BoxGeometry(0.13, 0.09, 0.305), 0xeafcd8);
  const face = colored(new THREE.BoxGeometry(0.45, 0.089, 0.22), 0x62e58c);
  return new ItemPool(scene, mergeGeometries([body, band, face])!, itemsMat, 700);
}
export function makeCoinPool(scene: THREE.Scene): ItemPool {
  const rim = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 18);
  rim.rotateX(Math.PI / 2);
  const face = new THREE.CylinderGeometry(0.21, 0.21, 0.1, 14);
  face.rotateX(Math.PI / 2);
  return new ItemPool(scene, mergeGeometries([colored(rim, 0xffb81f), colored(face, 0xffe27a)])!, itemsMat, 48);
}
export function makeTowelPool(scene: THREE.Scene): ItemPool {
  const roll = new THREE.CylinderGeometry(0.15, 0.15, 0.44, 12);
  roll.rotateZ(Math.PI / 2);
  const stripe = new THREE.CylinderGeometry(0.153, 0.153, 0.07, 12);
  stripe.rotateZ(Math.PI / 2);
  const s2 = stripe.clone();
  stripe.translate(-0.12, 0, 0);
  s2.translate(0.12, 0, 0);
  return new ItemPool(scene, mergeGeometries([colored(roll, 0xffffff), colored(stripe, 0x48c6ef), colored(s2, 0x48c6ef)])!, itemsMat, 160);
}
export function makePaperPool(scene: THREE.Scene): ItemPool {
  const roll = new THREE.CylinderGeometry(0.16, 0.16, 0.26, 12);
  const core = new THREE.CylinderGeometry(0.06, 0.06, 0.265, 8);
  return new ItemPool(scene, mergeGeometries([colored(roll, 0xfdfdf6), colored(core, 0xc9a27a)])!, itemsMat, 160);
}

/** Ombres rondes sous les persos et les objets mobiles. */
export class Blobs {
  private mesh: THREE.InstancedMesh;
  private n = 0;
  constructor(scene: THREE.Scene, private cap = 160) {
    const g = new THREE.PlaneGeometry(1, 1);
    g.rotateX(-Math.PI / 2);
    const col = new Float32Array(12).fill(0.36);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.mesh = new THREE.InstancedMesh(g, blobMat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    scene.add(this.mesh);
  }
  begin(): void {
    this.n = 0;
  }
  put(x: number, z: number, size: number): void {
    if (this.n >= this.cap) return;
    _m.compose(_p.set(x, 0.035, z), _q.identity(), _s.set(size, 1, size));
    this.mesh.setMatrixAt(this.n++, _m);
  }
  end(): void {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ particules
interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  size: number;
  rot: number;
  spin: number;
  color: number;
  g: number;
  drag: number;
  grow: number;
}

export interface EmitOpts {
  n?: number;
  speed?: number;
  up?: number;
  life?: number;
  size?: number;
  colors?: number[];
  gravity?: number;
  drag?: number;
  spread?: number;
  grow?: number;
}

/** Système de particules billboard instancié (confettis, étincelles, poussière, Zzz). */
export class Particles {
  private mesh: THREE.InstancedMesh;
  private ps: Particle[] = [];
  constructor(scene: THREE.Scene, tex: THREE.Texture | null, private cap: number, additive = false) {
    const g = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: !!tex,
      depthWrite: !tex,
      side: THREE.DoubleSide,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      fog: false,
    });
    this.mesh = new THREE.InstancedMesh(g, mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, _c.set(0xffffff));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 6;
    this.mesh.count = 0;
    scene.add(this.mesh);
  }
  emit(x: number, y: number, z: number, o: EmitOpts = {}): void {
    const n = o.n ?? 12;
    const colors = o.colors ?? [0xffffff];
    for (let i = 0; i < n; i++) {
      if (this.ps.length >= this.cap) this.ps.shift();
      const a = Math.random() * Math.PI * 2;
      const sp = (o.speed ?? 3) * (0.4 + Math.random() * 0.6);
      const spread = o.spread ?? 0.2;
      const life = (o.life ?? 1) * (0.7 + Math.random() * 0.6);
      this.ps.push({
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread,
        z: z + (Math.random() - 0.5) * spread,
        vx: Math.cos(a) * sp,
        vy: (o.up ?? 4) * (0.5 + Math.random() * 0.7),
        vz: Math.sin(a) * sp,
        life,
        max: life,
        size: (o.size ?? 0.16) * (0.7 + Math.random() * 0.6),
        rot: Math.random() * 6,
        spin: (Math.random() - 0.5) * 12,
        color: colors[Math.floor(Math.random() * colors.length)],
        g: o.gravity ?? 9,
        drag: o.drag ?? 1.2,
        grow: o.grow ?? 0,
      });
    }
  }
  update(dt: number, camQ: THREE.Quaternion): void {
    let n = 0;
    for (let i = this.ps.length - 1; i >= 0; i--) {
      const p = this.ps[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.ps.splice(i, 1);
        continue;
      }
      p.vy -= p.g * dt;
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d;
      p.vz *= d;
      if (p.g < 0.01) p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.y < 0.05 && p.g > 0) {
        p.y = 0.05;
        p.vy = 0;
        p.vx *= 0.6;
        p.vz *= 0.6;
        p.spin *= 0.5;
      }
      p.rot += p.spin * dt;
      const k = p.life / p.max;
      const s = p.size * (1 + p.grow * (1 - k)) * Math.min(1, k * 4);
      _q2.setFromAxisAngle(Z, p.rot);
      _q.copy(camQ).multiply(_q2);
      _m.compose(_p.set(p.x, p.y, p.z), _q, _s.set(s, s, s));
      this.mesh.setMatrixAt(n, _m);
      this.mesh.setColorAt(n, _c.set(p.color));
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  clear(): void {
    this.ps.length = 0;
  }
}

function glyphTex(draw: (ctx: CanvasRenderingContext2D, s: number) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  draw(c.getContext('2d')!, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export const sparkTex = glyphTex((ctx, s) => {
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  const c = s / 2;
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? s * 0.48 : s * 0.13;
    const a = (i * Math.PI) / 4;
    ctx.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
  }
  ctx.fill();
});
export const zTex = glyphTex((ctx, s) => {
  ctx.font = '900 52px Fredoka, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#3b3355';
  ctx.strokeText('Z', s / 2, s / 2 + 3);
  ctx.fillStyle = '#fff';
  ctx.fillText('Z', s / 2, s / 2 + 3);
});
export const heartTex = glyphTex((ctx, s) => {
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  const c = s / 2;
  ctx.moveTo(c, s * 0.86);
  ctx.bezierCurveTo(s * 0.02, s * 0.56, s * 0.1, s * 0.12, c, s * 0.34);
  ctx.bezierCurveTo(s * 0.9, s * 0.12, s * 0.98, s * 0.56, c, s * 0.86);
  ctx.fill();
});
export { blobTex as puffTex };

// ---------------------------------------------------------------------- zones
const ZONE_ICONS = ['bell', 'broom', 'towel', 'cash'];

/**
 * Cercles au sol qui se remplissent (camembert) : LE déclencheur d'action du jeu.
 * Un seul draw call instancié, shader dédié (anneau pointillé animé + remplissage + icône).
 */
export class Zones {
  private mesh: THREE.InstancedMesh;
  private aProg: THREE.InstancedBufferAttribute;
  private aCol: THREE.InstancedBufferAttribute;
  private aIcon: THREE.InstancedBufferAttribute;
  private mat: THREE.ShaderMaterial;
  private n = 0;
  constructor(scene: THREE.Scene, private cap = 32) {
    const g = new THREE.PlaneGeometry(2, 2);
    g.rotateX(-Math.PI / 2);
    this.aProg = new THREE.InstancedBufferAttribute(new Float32Array(cap * 2), 2);
    this.aCol = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    this.aIcon = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1);
    for (const a of [this.aProg, this.aCol, this.aIcon]) a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aProg', this.aProg);
    g.setAttribute('aCol', this.aCol);
    g.setAttribute('aIcon', this.aIcon);

    const canvas = document.createElement('canvas');
    canvas.width = 64 * ZONE_ICONS.length;
    canvas.height = 64;
    const atlas = new THREE.CanvasTexture(canvas);
    void preloadIcons(ZONE_ICONS).then(() => {
      const ctx = canvas.getContext('2d')!;
      ZONE_ICONS.forEach((name, i) => ctx.drawImage(iconImage(name), i * 64 + 6, 6, 52, 52));
      // silhouettes blanches : l'icône sert de masque
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      atlas.needsUpdate = true;
    });

    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uAtlas: { value: atlas }, uIcons: { value: ZONE_ICONS.length } },
      vertexShader: `
        attribute vec2 aProg; attribute vec3 aCol; attribute float aIcon;
        varying vec2 vUv; varying vec2 vProg; varying vec3 vCol; varying float vIcon;
        void main() {
          vUv = uv; vProg = aProg; vCol = aCol; vIcon = aIcon;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform float uTime; uniform sampler2D uAtlas; uniform float uIcons;
        varying vec2 vUv; varying vec2 vProg; varying vec3 vCol; varying float vIcon;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          if (r > 1.0) discard;
          float ang = atan(p.x, p.y) / 6.2831853 + 0.5;
          float act = vProg.y;
          float dash = mix(1.0, step(0.42, fract(ang * 14.0 + uTime * 0.25)), act);
          float ring = smoothstep(0.80, 0.84, r) * (1.0 - smoothstep(0.96, 1.0, r)) * dash;
          float inside = 1.0 - smoothstep(0.76, 0.79, r);
          float fill = inside * step(ang, vProg.x) * step(0.001, vProg.x);
          float pulse = 0.5 + 0.5 * sin(uTime * 4.0);
          float a = ring * (0.55 + 0.4 * act) + inside * (0.10 + 0.08 * act * pulse) + fill * 0.55;
          vec3 col = mix(vCol, vec3(1.0), ring * 0.35);
          // icône centrale
          vec2 iu = p * 1.25 * 0.5 + 0.5;
          if (vIcon >= 0.0 && iu.x > 0.0 && iu.x < 1.0 && iu.y > 0.0 && iu.y < 1.0) {
            float ia = texture2D(uAtlas, vec2((iu.x + vIcon) / uIcons, iu.y)).a;
            col = mix(col, vec3(1.0), ia);
            a = max(a, ia * (0.5 + 0.45 * act));
          }
          gl_FragColor = vec4(col, a);
        }`,
      transparent: true,
      depthWrite: false,
    });
    this.mesh = new THREE.InstancedMesh(g, this.mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
    scene.add(this.mesh);
  }
  begin(time: number): void {
    this.n = 0;
    this.mat.uniforms.uTime.value = time;
  }
  /** icon : 0 cloche, 1 balai, 2 serviette, 3 cash, -1 aucun. */
  put(x: number, z: number, radius: number, progress: number, active: boolean, color: number, icon: number): void {
    if (this.n >= this.cap) return;
    const i = this.n++;
    _m.compose(_p.set(x, 0.045, z), _q.identity(), _s.set(radius, 1, radius));
    this.mesh.setMatrixAt(i, _m);
    this.aProg.setXY(i, progress, active ? 1 : 0);
    _c.set(color);
    this.aCol.setXYZ(i, _c.r, _c.g, _c.b);
    this.aIcon.setX(i, icon);
  }
  end(): void {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.aProg.needsUpdate = this.aCol.needsUpdate = this.aIcon.needsUpdate = true;
  }
}

// ------------------------------------------------------------------- flyers
export interface Flyer {
  pool: ItemPool;
  fx: number;
  fy: number;
  fz: number;
  to: () => { x: number; y: number; z: number };
  t: number;
  dur: number;
  arc: number;
  delay: number;
  done?: () => void;
}

/** Objets qui volent en cloche d'un point à une cible mobile (cash, serviettes). */
export class Flyers {
  list: Flyer[] = [];
  add(f: Omit<Flyer, 't'>): void {
    this.list.push({ ...f, t: 0 });
  }
  update(dt: number): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i];
      if (f.delay > 0) {
        f.delay -= dt;
        f.pool.put(f.fx, f.fy, f.fz);
        continue;
      }
      f.t += dt / f.dur;
      const tgt = f.to();
      if (f.t >= 1) {
        this.list.splice(i, 1);
        f.done?.();
        continue;
      }
      const k = f.t * f.t * (3 - 2 * f.t);
      const x = f.fx + (tgt.x - f.fx) * k;
      const z = f.fz + (tgt.z - f.fz) * k;
      const y = f.fy + (tgt.y - f.fy) * k + Math.sin(f.t * Math.PI) * f.arc;
      f.pool.put(x, y, z, f.t * 9, 1 - 0.3 * f.t, f.t * 5);
    }
  }
  clear(): void {
    this.list.length = 0;
  }
}
