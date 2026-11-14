import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { glowMat, shadowMat, solidMat } from './materials';

/**
 * Builder de modèles procéduraux "chunky" : on empile des primitives arrondies colorées,
 * puis tout est fusionné en UN mesh à couleurs de sommets (1 draw call par objet construit).
 * Un léger dégradé vertical par pièce simule une occlusion ambiante cuite.
 */
export interface PartOpts {
  r?: number; // rayon d'arrondi (boîtes)
  rx?: number;
  ry?: number;
  rz?: number;
  sx?: number;
  sy?: number;
  sz?: number;
  grad?: number; // intensité du dégradé vertical (0 = aplat)
  seg?: number;
  glow?: boolean; // pièce non éclairée (néons, lampes, fenêtres)
}

const cache = new Map<string, THREE.BufferGeometry>();
function cached(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = cache.get(key);
  if (!g) {
    g = make();
    if (g.index) g = g.toNonIndexed();
    g.deleteAttribute('uv');
    cache.set(key, g);
  }
  return g;
}

const _m = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

export class Builder {
  private solid: THREE.BufferGeometry[] = [];
  private glow: THREE.BufferGeometry[] = [];
  private shadows: number[] = []; // x, z, w, d, alpha
  private base = new THREE.Matrix4();
  private stack: THREE.Matrix4[] = [];

  /** Empile un repère local (position + rotation Y). */
  push(x: number, y: number, z: number, ry = 0, s = 1): this {
    this.stack.push(this.base.clone());
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(0, ry, 0)), _s.set(s, s, s));
    this.base.multiply(_m);
    return this;
  }
  pop(): this {
    const b = this.stack.pop();
    if (b) this.base.copy(b);
    return this;
  }

  private add(src: THREE.BufferGeometry, color: THREE.ColorRepresentation, x: number, y: number, z: number, o: PartOpts | undefined): void {
    const g = src.clone();
    _m.compose(
      _p.set(x, y, z),
      _q.setFromEuler(_e.set(o?.rx ?? 0, o?.ry ?? 0, o?.rz ?? 0)),
      _s.set(o?.sx ?? 1, o?.sy ?? 1, o?.sz ?? 1),
    );
    _m2.multiplyMatrices(this.base, _m);
    g.applyMatrix4(_m2);
    const pos = g.getAttribute('position');
    const n = pos.count;
    const col = new Float32Array(n * 3);
    _c.set(color);
    const grad = o?.glow ? 0 : (o?.grad ?? 0.16);
    let minY = Infinity;
    let maxY = -Infinity;
    if (grad > 0) {
      for (let i = 0; i < n; i++) {
        const yy = pos.getY(i);
        if (yy < minY) minY = yy;
        if (yy > maxY) maxY = yy;
      }
    }
    const span = Math.max(maxY - minY, 1e-4);
    for (let i = 0; i < n; i++) {
      const k = grad > 0 ? 1 - grad + grad * ((pos.getY(i) - minY) / span) : 1;
      col[i * 3] = _c.r * k;
      col[i * 3 + 1] = _c.g * k;
      col[i * 3 + 2] = _c.b * k;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    (o?.glow ? this.glow : this.solid).push(g);
  }

  /** Boîte arrondie posée sur y (y = dessous). */
  box(w: number, h: number, d: number, color: THREE.ColorRepresentation, x: number, y: number, z: number, o?: PartOpts): this {
    const r = Math.min(o?.r ?? 0.08, Math.min(w, h, d) * 0.5 - 0.001);
    const g =
      r <= 0.005
        ? cached(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d))
        : cached(`rb${w}|${h}|${d}|${r}`, () => new RoundedBoxGeometry(w, h, d, 2, r));
    this.add(g, color, x, y + h / 2, z, o);
    return this;
  }
  /** Cylindre/cône tronqué posé sur y. */
  cyl(rTop: number, rBot: number, h: number, color: THREE.ColorRepresentation, x: number, y: number, z: number, o?: PartOpts): this {
    const seg = o?.seg ?? 14;
    const g = cached(`c${rTop}|${rBot}|${h}|${seg}`, () => new THREE.CylinderGeometry(rTop, rBot, h, seg));
    this.add(g, color, x, y + h / 2, z, o);
    return this;
  }
  /** Sphère centrée en (x, y, z). */
  sph(r: number, color: THREE.ColorRepresentation, x: number, y: number, z: number, o?: PartOpts): this {
    const seg = o?.seg ?? 12;
    const g = cached(`s${r}|${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7))));
    this.add(g, color, x, y, z, o);
    return this;
  }
  /** Capsule verticale posée sur y. */
  cap(r: number, len: number, color: THREE.ColorRepresentation, x: number, y: number, z: number, o?: PartOpts): this {
    const g = cached(`k${r}|${len}`, () => new THREE.CapsuleGeometry(r, len, 4, 10));
    this.add(g, color, x, y + r + len / 2, z, o);
    return this;
  }
  /** Dalle plate (dessus à y), sans arrondi : sols, tapis, marquages. */
  slab(x0: number, z0: number, x1: number, z1: number, color: THREE.ColorRepresentation, y = 0, h = 0.06, o?: PartOpts): this {
    const w = Math.abs(x1 - x0);
    const d = Math.abs(z1 - z0);
    const g = cached(`b${w.toFixed(3)}|${h}|${d.toFixed(3)}`, () => new THREE.BoxGeometry(w, h, d));
    this.add(g, color, (x0 + x1) / 2, y - h / 2, (z0 + z1) / 2, { grad: 0, ...o });
    return this;
  }
  /** Ombre douce cuite au sol (rectangle flou). */
  shadow(x: number, z: number, w: number, d: number, alpha = 0.3): this {
    _p.set(x, 0, z).applyMatrix4(this.base);
    // rotation Y du repère : on échange w/d si proche de 90°
    const e = this.base.elements;
    const rot = Math.abs(e[0]) < Math.abs(e[2]);
    this.shadows.push(_p.x, _p.z, rot ? d : w, rot ? w : d, alpha);
    return this;
  }

  /** Fusionne tout en un groupe : mesh éclairé + mesh lumineux + ombres. */
  build(): THREE.Group {
    const group = new THREE.Group();
    if (this.solid.length) {
      const g = mergeGeometries(this.solid, false)!;
      const mesh = new THREE.Mesh(g, solidMat);
      mesh.matrixAutoUpdate = false;
      group.add(mesh);
    }
    if (this.glow.length) {
      const g = mergeGeometries(this.glow, false)!;
      const mesh = new THREE.Mesh(g, glowMat);
      mesh.matrixAutoUpdate = false;
      mesh.name = 'glow';
      group.add(mesh);
    }
    if (this.shadows.length) {
      const n = this.shadows.length / 5;
      const pos = new Float32Array(n * 18);
      const uv = new Float32Array(n * 12);
      const col = new Float32Array(n * 18);
      const quad = [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1];
      for (let i = 0; i < n; i++) {
        const [x, z, w, d, a] = this.shadows.slice(i * 5, i * 5 + 5);
        for (let v = 0; v < 6; v++) {
          const qx = quad[v * 2];
          const qz = quad[v * 2 + 1];
          pos[i * 18 + v * 3] = x + (qx * w) / 2;
          pos[i * 18 + v * 3 + 1] = 0.025;
          pos[i * 18 + v * 3 + 2] = z + (qz * d) / 2;
          uv[i * 12 + v * 2] = (qx + 1) / 2;
          uv[i * 12 + v * 2 + 1] = (qz + 1) / 2;
          col[i * 18 + v * 3] = col[i * 18 + v * 3 + 1] = col[i * 18 + v * 3 + 2] = a;
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      // triangles orientés vers le haut
      const idx: number[] = [];
      for (let i = 0; i < n * 6; i += 3) idx.push(i, i + 2, i + 1);
      g.setIndex(idx);
      const mesh = new THREE.Mesh(g, shadowMat);
      mesh.matrixAutoUpdate = false;
      mesh.renderOrder = 1;
      group.add(mesh);
    }
    for (const g of this.solid) g.dispose();
    for (const g of this.glow) g.dispose();
    this.solid = [];
    this.glow = [];
    this.shadows = [];
    return group;
  }
}

export function disposeGroup(g: THREE.Object3D): void {
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.geometry.dispose();
  });
  g.removeFromParent();
}
