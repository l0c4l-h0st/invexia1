import type { Builder } from './build';
import type { TierStyle } from './styles';

/** Bibliothèque d'objets procéduraux. Chaque fonction dessine autour de l'origine du repère courant. */

const lighten = (c: number, k: number): number => {
  const r = Math.min(255, ((c >> 16) & 255) + 255 * k);
  const g = Math.min(255, ((c >> 8) & 255) + 255 * k);
  const b = Math.min(255, (c & 255) + 255 * k);
  return (Math.max(0, r) << 16) | (Math.max(0, g) << 8) | Math.max(0, b);
};
export { lighten };

/** Lit : tête vers +X. */
export function bed(b: Builder, st: TierStyle, level: number): void {
  const blanket = st.blanket[Math.min(level, 3) - 1];
  b.shadow(0, 0, 3.0, 2.3, 0.4);
  if (st.luxe >= 3 || level >= 3) b.box(2.5, 0.12, 1.8, st.metal, 0, 0, 0, { r: 0.05 });
  b.box(2.3, 0.3, 1.6, st.bedFrame, 0, 0.04, 0, { r: 0.09 });
  b.box(0.24, 0.95 + level * 0.14, 1.72, st.bedFrame, 1.1, 0, 0, { r: 0.11 });
  if (level >= 2) b.box(0.1, 0.5 + level * 0.1, 1.3, lighten(st.bedFrame, 0.12), 0.97, 0.45, 0, { r: 0.05 });
  b.box(2.12, 0.26, 1.44, st.mattress, -0.03, 0.3, 0, { r: 0.12 });
  b.box(1.42, 0.3, 1.5, blanket, -0.4, 0.31, 0, { r: 0.13 });
  b.box(0.2, 0.33, 1.5, lighten(blanket, 0.18), 0.36, 0.31, 0, { r: 0.1 });
  b.box(0.48, 0.2, 0.86, st.pillow, 0.74, 0.52, 0, { r: 0.09 });
  if (st.dingy) {
    // matelas taché, couverture rapiécée
    b.box(0.4, 0.31, 0.5, lighten(blanket, -0.1), -0.7, 0.312, 0.3, { r: 0.1 });
    b.cyl(0.16, 0.16, 0.02, 0xa89a78, 0.35, 0.555, -0.4, { seg: 8 });
  }
  if (level >= 3) {
    b.box(0.5, 0.12, 1.52, st.accent, -0.85, 0.5, 0, { r: 0.05 });
    b.box(0.3, 0.16, 0.5, st.accent, 0.5, 0.56, 0, { r: 0.07 });
  }
}

export function nightstand(b: Builder, st: TierStyle, level: number): void {
  b.shadow(0, 0, 1.0, 1.0, 0.3);
  b.box(0.62, 0.55, 0.6, st.wood, 0, 0, 0, { r: 0.07 });
  b.box(0.5, 0.06, 0.04, lighten(st.wood, 0.2), 0, 0.3, 0.3, { r: 0.02 });
  // lampe
  if (st.dingy && level < 2) {
    b.cyl(0.05, 0.09, 0.22, 0x55504a, 0, 0.55, 0);
    b.cyl(0.13, 0.18, 0.2, 0xcfc39a, 0, 0.75, 0, { rz: 0.18 });
  } else {
    b.cyl(0.04, 0.1, 0.25, st.metal, 0, 0.55, 0);
    b.cyl(0.12, 0.2, 0.24, 0xfff3c4, 0, 0.78, 0, { glow: true });
  }
}

/** Détails de chambre selon le niveau. Origine = centre de la chambre ; side = +1 si le mur extérieur est en +X. */
export function roomExtras(b: Builder, st: TierStyle, level: number, side: number): void {
  const X = (x: number): number => x * side;
  b.slab(X(-1.5), -0.35, X(0.2), 1.75, st.rug, 0.02, 0.03);
  b.slab(X(-1.38), -0.23, X(0.08), 1.63, lighten(st.rug, 0.12), 0.03, 0.03);
  if (level >= 2) {
    plant(b.push(X(1.55), 0, 1.6), st.luxe >= 2 ? 1 : 0);
    b.pop();
    b.box(0.5, 0.5, 0.9, st.wood, X(1.62), 0, 0.5, { r: 0.07 }); // commode
    b.shadow(X(1.62), 0.5, 0.8, 1.2, 0.3);
    b.box(0.06, 0.36, 0.5, 0x2a2a35, X(1.62), 0.52, 0.5, { r: 0.03 }); // télé
  }
  if (level >= 3) {
    b.box(0.7, 0.42, 0.7, lighten(st.blanket[2], 0.05), X(-0.4), 0, 1.3, { r: 0.16 }); // pouf
    b.shadow(X(-0.4), 1.3, 1.0, 1.0, 0.3);
    b.cyl(0.07, 0.07, 0.9, st.metal, X(-1.65), 0, -1.75);
    b.sph(0.2, 0xfff3c4, X(-1.65), 1.0, -1.75, { glow: true });
  }
  if (st.dingy) {
    b.cyl(0.3, 0.3, 0.015, 0x74654f, X(-0.9), 0.035, 0.2, { seg: 9, sz: 0.7 });
    b.cyl(0.2, 0.2, 0.015, 0x74654f, X(0.3), 0.035, 1.5, { seg: 8 });
  }
}

/** Saleté affichée quand la chambre est à nettoyer (origine = centre chambre). */
export function roomMess(b: Builder, st: TierStyle, side: number): void {
  const X = (x: number): number => x * side;
  const sheet = lighten(st.mattress, -0.12);
  b.sph(0.38, sheet, X(1.1), 0.72, -1.25, { sy: 0.55, seg: 8 });
  b.sph(0.3, sheet, X(0.5), 0.7, -0.9, { sy: 0.5, seg: 8 });
  b.sph(0.26, lighten(st.pillow, -0.1), X(1.6), 0.74, -0.75, { sy: 0.6, seg: 8 });
  b.sph(0.3, 0xe9e2d2, X(-0.9), 0.12, 0.6, { sy: 0.45, sx: 1.3, seg: 8 }); // serviette au sol
  b.sph(0.2, 0xe9e2d2, X(0.5), 0.1, 1.2, { sy: 0.5, seg: 8 });
  b.cyl(0.35, 0.35, 0.012, 0x6b5a3a, X(-0.2), 0.05, 0.9, { seg: 9, sx: 1.3 }); // tache
  b.cyl(0.22, 0.22, 0.012, 0x7a6a42, X(0.9), 0.05, 0.3, { seg: 8 });
  b.box(0.16, 0.22, 0.16, 0xd94f4f, X(-1.3), 0, 1.4, { r: 0.05, rz: 1.4 }); // canette
  b.box(0.34, 0.06, 0.34, 0xc9a27a, X(1.1), 0.02, 1.4, { r: 0.02, ry: 0.5 }); // carton pizza
  b.sph(0.11, 0x8a8a52, X(0.1), 0.1, 0.2, { seg: 6 });
  b.sph(0.09, 0x8a8a52, X(-1.0), 0.09, -0.2, { seg: 6 });
}

export function plant(b: Builder, kind = 0): void {
  b.shadow(0, 0, 1.0, 1.0, 0.3);
  b.cyl(0.26, 0.2, 0.36, kind === 2 ? 0xe9b93c : 0xd97b4f, 0, 0, 0);
  if (kind === 2) {
    // topiaire boule
    b.cyl(0.05, 0.05, 0.5, 0x6b4a2e, 0, 0.36, 0);
    b.sph(0.36, 0x3fae5a, 0, 1.05, 0);
    b.sph(0.22, 0x4cc46a, 0, 1.5, 0);
  } else if (kind === 1) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      b.sph(0.2, i % 2 ? 0x44b86a : 0x2fa058, Math.cos(a) * 0.2, 0.62, Math.sin(a) * 0.2, { sy: 1.9, rz: Math.cos(a) * 0.5, rx: -Math.sin(a) * 0.5, seg: 7 });
    }
    b.sph(0.2, 0x58cf7c, 0, 0.8, 0, { sy: 2.1, seg: 7 });
  } else {
    b.sph(0.3, 0x4f9a55, 0, 0.6, 0, { seg: 8 });
    b.sph(0.22, 0x5fae63, 0.12, 0.85, 0.05, { seg: 8 });
  }
}

/** Comptoir de réception (long axe X, clients côté +Z). */
export function desk(b: Builder, st: TierStyle): void {
  b.shadow(0, 0, 3.7, 1.6, 0.42);
  b.box(3.0, 0.95, 0.75, st.desk, 0, 0, 0, { r: 0.1 });
  b.box(3.2, 0.12, 0.95, st.deskTop, 0, 0.93, 0, { r: 0.05 });
  b.box(2.8, 0.5, 0.05, lighten(st.desk, st.dingy ? -0.06 : 0.1), 0, 0.22, 0.38, { r: 0.02 });
  // sonnette
  b.cyl(0.13, 0.15, 0.04, 0x6b4a2e, -0.9, 1.05, 0.15);
  b.sph(0.13, 0xffc933, -0.9, 1.1, 0.15, { sy: 0.7, seg: 10 });
  b.sph(0.035, 0xe8951c, -0.9, 1.21, 0.15, { seg: 6 });
  // écran + registre
  b.box(0.5, 0.36, 0.06, 0x2a2a35, 0.75, 1.12, -0.18, { r: 0.03, rx: 0.2 });
  b.box(0.42, 0.28, 0.02, st.dingy ? 0x9fe0c0 : 0x9fe3ff, 0.75, 1.16, -0.145, { r: 0.01, rx: 0.2, glow: true });
  b.box(0.2, 0.08, 0.14, 0x2a2a35, 0.75, 1.05, -0.16, { r: 0.02 });
  b.box(0.4, 0.05, 0.3, 0xfdfaf2, 0.05, 1.05, 0.12, { r: 0.02, ry: 0.2 });
  if (st.luxe >= 2) {
    b.box(3.24, 0.06, 0.99, st.metal, 0, 0.9, 0, { r: 0.03 });
    b.cyl(0.1, 0.14, 0.3, st.metal, 1.25, 1.05, 0.15);
    b.sph(0.2, 0xff7eb6, 1.25, 1.5, 0.15, { seg: 8 });
    b.sph(0.14, 0xffb3d1, 1.15, 1.62, 0.2, { seg: 7 });
  }
  if (st.dingy) b.box(0.5, 0.3, 0.04, 0xffe9a8, -0.3, 0.4, 0.4, { r: 0.01, rz: 0.08 }); // affichette de travers
}

/** Étagères de linge (dos contre le mur -X). */
export function linenShelf(b: Builder, st: TierStyle): void {
  b.shadow(0.1, 0, 1.5, 3.0, 0.4);
  const wood = st.wood;
  b.box(0.85, 1.7, 0.12, wood, 0, 0, -1.2, { r: 0.04 });
  b.box(0.85, 1.7, 0.12, wood, 0, 0, 1.2, { r: 0.04 });
  for (let i = 0; i < 3; i++) {
    b.box(0.85, 0.09, 2.5, lighten(wood, 0.08), 0, 0.12 + i * 0.6, 0, { r: 0.03 });
    for (let k = 0; k < 4; k++) {
      const z = -0.86 + k * 0.57;
      if (i === 1) {
        b.cyl(0.15, 0.15, 0.26, 0xfdfdf6, 0.02, 0.81, z, { seg: 10 });
        b.cyl(0.15, 0.15, 0.26, 0xfdfdf6, 0.02, 1.07, z + 0.02, { seg: 10 });
      } else {
        const c = (i + k) % 2 ? 0xffffff : st.dingy ? 0xffd9a0 : 0x9fe3ff;
        b.box(0.6, 0.16, 0.44, c, 0.02, 0.21 + i * 0.6, z, { r: 0.07 });
        b.box(0.6, 0.16, 0.44, (i + k) % 2 ? (st.dingy ? 0xa8e0d0 : 0x9fe3ff) : 0xffffff, 0.03, 0.37 + i * 0.6, z, { r: 0.07 });
      }
    }
  }
  b.box(0.9, 0.1, 2.56, wood, 0, 1.66, 0, { r: 0.04 });
}

export function sofa(b: Builder, color: number): void {
  b.shadow(0, 0, 2.3, 1.3, 0.35);
  b.box(1.8, 0.4, 0.8, color, 0, 0.08, 0, { r: 0.14 });
  b.box(1.8, 0.55, 0.28, lighten(color, -0.06), 0, 0.35, -0.3, { r: 0.12 });
  b.box(0.28, 0.5, 0.8, lighten(color, -0.06), -0.85, 0.2, 0, { r: 0.12 });
  b.box(0.28, 0.5, 0.8, lighten(color, -0.06), 0.85, 0.2, 0, { r: 0.12 });
  b.box(0.7, 0.14, 0.56, lighten(color, 0.1), -0.38, 0.46, 0.06, { r: 0.07 });
  b.box(0.7, 0.14, 0.56, lighten(color, 0.1), 0.38, 0.46, 0.06, { r: 0.07 });
}

export function vending(b: Builder): void {
  b.shadow(0, 0.1, 1.5, 1.3, 0.42);
  b.box(1.0, 1.75, 0.72, 0xd9435a, 0, 0, 0, { r: 0.08 });
  b.box(0.62, 0.95, 0.04, 0xbfeaff, -0.13, 0.62, -0.35, { r: 0.03, glow: true });
  const cols = [0xffd166, 0x6bd968, 0x38b6ff, 0xff9f43, 0xb983ff, 0xff7eb6];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) b.cyl(0.07, 0.07, 0.18, cols[(r * 3 + c) % 6], -0.31 + c * 0.18, 0.7 + r * 0.29, -0.3, { seg: 8 });
  b.box(0.16, 0.3, 0.04, 0xffd166, 0.33, 1.0, -0.36, { r: 0.02, glow: true });
  b.box(0.7, 0.2, 0.05, 0x5a1826, -0.1, 0.2, -0.35, { r: 0.03 });
  b.box(1.02, 0.22, 0.74, 0xff6b81, 0, 1.55, 0, { r: 0.06 });
}

export function tableSet(b: Builder, top: number, seat: number, parasol: number | null): void {
  b.shadow(0, 0, 2.6, 2.6, 0.3);
  b.cyl(0.06, 0.06, 0.62, 0x8f9bb8, 0, 0, 0);
  b.cyl(0.26, 0.3, 0.05, 0x8f9bb8, 0, 0, 0);
  b.cyl(0.55, 0.55, 0.08, top, 0, 0.62, 0, { seg: 18 });
  b.cyl(0.14, 0.14, 0.03, 0xffffff, -0.2, 0.7, 0.1, { seg: 10 });
  b.cyl(0.14, 0.14, 0.03, 0xffffff, 0.22, 0.7, -0.08, { seg: 10 });
  b.sph(0.08, 0xff9f43, -0.2, 0.76, 0.1, { seg: 6 });
  b.sph(0.08, 0x6bd968, 0.22, 0.76, -0.08, { seg: 6 });
  for (const [x, z] of [[-0.95, 0], [0.95, 0]]) {
    b.box(0.46, 0.1, 0.46, seat, x, 0.36, z, { r: 0.05 });
    b.cyl(0.05, 0.05, 0.36, 0x8f9bb8, x, 0, z);
    b.box(0.08, 0.5, 0.46, seat, x + Math.sign(x) * 0.22, 0.4, z, { r: 0.04 });
  }
  if (parasol !== null) {
    b.cyl(0.035, 0.035, 2.0, 0xf4f4f4, 0, 0.6, 0);
    b.cyl(0.05, 1.25, 0.42, parasol, 0, 2.3, 0, { seg: 10 });
    b.cyl(0.02, 0.5, 0.17, 0xffffff, 0, 2.56, 0, { seg: 10 });
  }
}

export function lounger(b: Builder, color: number): void {
  b.shadow(0, 0, 1.2, 2.4, 0.3);
  b.box(0.7, 0.14, 1.5, 0xffffff, 0, 0.22, 0.2, { r: 0.06 });
  b.box(0.7, 0.14, 0.75, 0xffffff, 0, 0.42, -0.78, { r: 0.06, rx: 0.65 });
  b.box(0.62, 0.08, 1.4, color, 0, 0.33, 0.22, { r: 0.04 });
  b.box(0.62, 0.08, 0.66, color, 0, 0.52, -0.74, { r: 0.04, rx: 0.65 });
  for (const [x, z] of [[-0.28, 0.75], [0.28, 0.75], [-0.28, -0.4], [0.28, -0.4]]) b.cyl(0.035, 0.035, 0.24, 0xd9d9d9, x, 0, z, { seg: 6 });
}

export function parasol(b: Builder, color: number): void {
  b.shadow(0, 0, 2.6, 2.6, 0.26);
  b.cyl(0.04, 0.04, 2.3, 0xf4f4f4, 0, 0, 0, { seg: 8 });
  b.cyl(0.06, 1.3, 0.45, color, 0, 2.2, 0, { seg: 10 });
  b.cyl(0.03, 0.6, 0.2, 0xffffff, 0, 2.47, 0, { seg: 10 });
  b.sph(0.07, 0xffffff, 0, 2.7, 0, { seg: 6 });
}

export function car(b: Builder, color: number, rusty = false): void {
  // long axe Z, avant vers -Z
  b.shadow(0, 0, 2.3, 4.0, 0.45);
  b.box(1.5, 0.55, 3.1, color, 0, 0.22, 0, { r: 0.2 });
  b.box(1.32, 0.5, 1.7, lighten(color, 0.1), 0, 0.7, 0.15, { r: 0.2 });
  b.box(1.2, 0.3, 0.06, 0x9fd8f5, 0, 0.82, -0.7, { r: 0.03, rx: -0.3 });
  b.box(1.2, 0.3, 0.06, 0x9fd8f5, 0, 0.82, 1.0, { r: 0.03, rx: 0.3 });
  b.box(1.36, 0.26, 1.2, 0x9fd8f5, 0, 0.84, 0.15, { r: 0.04 });
  for (const [x, z] of [[-0.72, -1.0], [0.72, -1.0], [-0.72, 1.0], [0.72, 1.0]]) b.cyl(0.3, 0.3, 0.22, 0x25252e, x, 0.02, z, { rz: Math.PI / 2, seg: 12 });
  b.sph(0.11, 0xfff3c4, -0.5, 0.52, -1.55, { glow: true, seg: 6 });
  b.sph(0.11, 0xfff3c4, 0.5, 0.52, -1.55, { glow: true, seg: 6 });
  b.box(0.3, 0.1, 0.06, 0xd93a52, -0.5, 0.5, 1.55, { r: 0.02 });
  b.box(0.3, 0.1, 0.06, 0xd93a52, 0.5, 0.5, 1.55, { r: 0.02 });
  if (rusty) {
    b.box(0.5, 0.2, 0.05, 0x8a5a3a, 0.76, 0.36, 0.5, { r: 0.02, ry: Math.PI / 2 });
    b.box(0.6, 0.1, 0.4, 0x8a5a3a, 0.2, 0.74, -1.2, { r: 0.03 });
  }
}

export function tree(b: Builder, leaf = 0x4fbf5f, s = 1): void {
  b.shadow(0, 0, 2.2 * s, 2.2 * s, 0.3);
  b.cyl(0.14 * s, 0.2 * s, 1.0 * s, 0x8a5a2b, 0, 0, 0, { seg: 8 });
  b.sph(0.85 * s, leaf, 0, 1.55 * s, 0, { seg: 10 });
  b.sph(0.6 * s, lighten(leaf, 0.08), 0.35 * s, 2.1 * s, 0.1 * s, { seg: 9 });
  b.sph(0.5 * s, lighten(leaf, -0.05), -0.45 * s, 1.9 * s, -0.2 * s, { seg: 8 });
}

export function deadTree(b: Builder): void {
  b.shadow(0, 0, 1.4, 1.4, 0.25);
  b.cyl(0.1, 0.18, 1.3, 0x5a4a3a, 0, 0, 0, { seg: 7 });
  b.cyl(0.04, 0.08, 0.8, 0x5a4a3a, 0.25, 1.1, 0, { seg: 6, rz: -0.8 });
  b.cyl(0.04, 0.07, 0.7, 0x5a4a3a, -0.2, 1.2, 0.05, { seg: 6, rz: 0.7 });
  b.sph(0.3, 0x7a7a4a, -0.4, 1.7, 0.05, { seg: 7 });
}

export function pine(b: Builder, snow = false, s = 1): void {
  b.shadow(0, 0, 2.0 * s, 2.0 * s, 0.3);
  b.cyl(0.14 * s, 0.18 * s, 0.6 * s, 0x6b4a2e, 0, 0, 0, { seg: 7 });
  for (let i = 0; i < 3; i++) {
    b.cyl(0.02, (0.9 - i * 0.22) * s, 0.95 * s, i % 2 ? 0x2f8f5a : 0x257a4c, 0, (0.5 + i * 0.62) * s, 0, { seg: 9 });
    if (snow) b.cyl(0.02, (0.52 - i * 0.12) * s, 0.5 * s, 0xffffff, 0, (0.98 + i * 0.62) * s, 0, { seg: 9 });
  }
}

export function palm(b: Builder, s = 1): void {
  b.shadow(0, 0, 2.4 * s, 2.4 * s, 0.26);
  for (let i = 0; i < 5; i++) b.cyl(0.13 * s, 0.16 * s, 0.56 * s, i % 2 ? 0xb8834f : 0xa87443, i * 0.06 * s, i * 0.5 * s, 0, { seg: 7, rz: -0.12 });
  const top = 2.6 * s;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    b.sph(0.3 * s, i % 2 ? 0x3fbf6a : 0x2fa058, 0.32 * s + Math.cos(a) * 0.75 * s, top - 0.12 * s, Math.sin(a) * 0.75 * s, { sx: 2.6, sy: 0.3, sz: 0.9, ry: -a, rz: -0.35, seg: 7 });
  }
  b.sph(0.14 * s, 0x8a5a2b, 0.4 * s, top - 0.2 * s, 0.12 * s, { seg: 6 });
  b.sph(0.14 * s, 0x8a5a2b, 0.22 * s, top - 0.22 * s, -0.1 * s, { seg: 6 });
}

export function cactus(b: Builder, s = 1): void {
  b.shadow(0, 0, 1.3 * s, 1.3 * s, 0.3);
  b.cap(0.26 * s, 1.2 * s, 0x4fa85a, 0, 0, 0);
  b.cap(0.15 * s, 0.4 * s, 0x5fb86a, 0.5 * s, 0.75 * s, 0);
  b.cap(0.14 * s, 0.14 * s, 0x5fb86a, 0.34 * s, 0.7 * s, 0, { rz: Math.PI / 2 });
  b.cap(0.15 * s, 0.3 * s, 0x5fb86a, -0.48 * s, 0.45 * s, 0);
  b.cap(0.14 * s, 0.12 * s, 0x5fb86a, -0.32 * s, 0.42 * s, 0, { rz: Math.PI / 2 });
  b.sph(0.1 * s, 0xff7eb6, 0, 1.75 * s, 0, { seg: 6 });
}

export function rock(b: Builder, color = 0x9a9aa8, s = 1): void {
  b.shadow(0, 0, 1.6 * s, 1.4 * s, 0.3);
  b.sph(0.6 * s, color, 0, 0.25 * s, 0, { sy: 0.7, seg: 6 });
  b.sph(0.38 * s, lighten(color, 0.06), 0.5 * s, 0.15 * s, 0.2 * s, { sy: 0.7, seg: 6 });
}

export function bush(b: Builder, color = 0x4fbf5f): void {
  b.shadow(0, 0, 1.5, 1.2, 0.26);
  b.sph(0.45, color, 0, 0.32, 0, { seg: 8 });
  b.sph(0.34, lighten(color, 0.07), 0.42, 0.26, 0.08, { seg: 8 });
  b.sph(0.3, lighten(color, -0.05), -0.4, 0.24, -0.05, { seg: 8 });
}

export function flowerBed(b: Builder, c1: number, c2: number): void {
  b.box(2.2, 0.26, 0.7, 0xd9c2a0, 0, 0, 0, { r: 0.08 });
  b.shadow(0, 0, 2.5, 1.1, 0.28);
  for (let i = 0; i < 7; i++) {
    b.sph(0.2, 0x4fbf5f, -0.9 + i * 0.3, 0.32, (i % 2) * 0.14 - 0.07, { seg: 6 });
    b.sph(0.1, i % 2 ? c1 : c2, -0.9 + i * 0.3, 0.52, (i % 2) * 0.14 - 0.07, { seg: 6 });
  }
}

export function lampPost(b: Builder, color = 0x3b3b4f, lit = true): void {
  b.shadow(0, 0, 0.7, 0.7, 0.3);
  b.cyl(0.07, 0.11, 2.6, color, 0, 0, 0, { seg: 8 });
  b.cyl(0.2, 0.12, 0.12, color, 0, 2.6, 0, { seg: 8 });
  b.sph(0.22, lit ? 0xfff3c4 : 0x8a8a7a, 0, 2.86, 0, { glow: lit, seg: 8 });
}

export function trashCan(b: Builder): void {
  b.shadow(0, 0, 0.9, 0.9, 0.3);
  b.cyl(0.3, 0.25, 0.62, 0x6f7a80, 0, 0, 0, { seg: 10 });
  b.cyl(0.33, 0.33, 0.06, 0x555f66, 0.05, 0.62, 0, { seg: 10, rz: 0.25 });
  b.sph(0.14, 0x2a2a2a, 0.5, 0.12, 0.2, { seg: 6, sy: 0.8 });
  b.box(0.2, 0.14, 0.16, 0xc9a27a, -0.45, 0, 0.3, { r: 0.03, ry: 0.6 });
}

export function column(b: Builder, color: number, gold: number): void {
  b.shadow(0, 0, 1.0, 1.0, 0.32);
  b.box(0.7, 0.2, 0.7, gold, 0, 0, 0, { r: 0.05 });
  b.cyl(0.24, 0.27, 1.9, color, 0, 0.2, 0, { seg: 12 });
  b.box(0.66, 0.16, 0.66, gold, 0, 2.1, 0, { r: 0.05 });
  b.sph(0.26, gold, 0, 2.5, 0, { seg: 10 });
}

export function fountain(b: Builder, stone: number, gold: number): void {
  b.shadow(0, 0, 3.6, 3.6, 0.36);
  b.cyl(1.5, 1.6, 0.4, stone, 0, 0, 0, { seg: 20 });
  b.cyl(1.3, 1.3, 0.06, 0x48c6ef, 0, 0.38, 0, { seg: 20, glow: true });
  b.cyl(0.2, 0.3, 1.0, stone, 0, 0.3, 0, { seg: 10 });
  b.cyl(0.75, 0.3, 0.2, stone, 0, 1.25, 0, { seg: 16 });
  b.cyl(0.62, 0.62, 0.05, 0x7fd9f5, 0, 1.43, 0, { seg: 16, glow: true });
  b.cyl(0.08, 0.14, 0.5, gold, 0, 1.4, 0, { seg: 8 });
  b.sph(0.16, gold, 0, 1.98, 0, { seg: 8 });
}

export function slotMachine(b: Builder, color: number): void {
  b.shadow(0, 0, 1.2, 1.2, 0.36);
  b.box(0.8, 1.5, 0.7, color, 0, 0, 0, { r: 0.12 });
  b.box(0.6, 0.4, 0.05, 0xfff8e0, 0, 0.85, 0.34, { r: 0.03, glow: true });
  b.box(0.14, 0.3, 0.06, 0xff5d73, -0.2, 0.9, 0.36, { r: 0.02, glow: true });
  b.box(0.14, 0.3, 0.06, 0xffc933, 0, 0.9, 0.36, { r: 0.02, glow: true });
  b.box(0.14, 0.3, 0.06, 0x6bd968, 0.2, 0.9, 0.36, { r: 0.02, glow: true });
  b.box(0.66, 0.14, 0.3, lighten(color, -0.12), 0, 0.5, 0.36, { r: 0.04 });
  b.cyl(0.03, 0.03, 0.5, 0xd9d9d9, 0.47, 0.75, 0.1, { seg: 6 });
  b.sph(0.08, 0xff3d3d, 0.47, 1.3, 0.1, { seg: 6 });
  b.sph(0.12, 0xffe27a, 0, 1.6, 0, { glow: true, seg: 7 });
}

export function stool(b: Builder, color: number): void {
  b.cyl(0.05, 0.05, 0.45, 0xd9d9d9, 0, 0, 0, { seg: 6 });
  b.cyl(0.24, 0.24, 0.12, color, 0, 0.45, 0, { seg: 10 });
}

export function building(b: Builder, w: number, h: number, d: number, color: number, lit: number, night: boolean): void {
  b.box(w, h, d, color, 0, 0, 0, { r: 0.12, grad: 0.35 });
  b.box(w * 0.7, 0.4, d * 0.7, lighten(color, -0.08), 0, h, 0, { r: 0.08 });
  const cols = Math.max(2, Math.floor(w / 0.9));
  const rws = Math.max(2, Math.floor(h / 1.1));
  for (let r = 0; r < rws; r++)
    for (let c = 0; c < cols; c++) {
      const on = (r * 7 + c * 3 + Math.floor(w * 10)) % 3 !== 0;
      if (!night && !on) continue;
      b.box(0.45, 0.55, 0.05, on ? lit : lighten(color, -0.15), -w / 2 + (c + 0.5) * (w / cols), 0.6 + r * (h - 0.8) / rws, d / 2 + 0.005, { r: 0.02, glow: night && on });
    }
}

export function coral(b: Builder, color: number, s = 1): void {
  b.shadow(0, 0, 1.3 * s, 1.3 * s, 0.25);
  b.cap(0.14 * s, 0.7 * s, color, 0, 0, 0);
  b.cap(0.11 * s, 0.5 * s, lighten(color, 0.08), 0.3 * s, 0.25 * s, 0.05, { rz: -0.5 });
  b.cap(0.11 * s, 0.45 * s, lighten(color, -0.05), -0.28 * s, 0.3 * s, -0.05, { rz: 0.55 });
  b.cap(0.09 * s, 0.3 * s, lighten(color, 0.1), 0.05, 0.4 * s, 0.25 * s, { rx: 0.6 });
}

export function kelp(b: Builder, s = 1): void {
  for (let i = 0; i < 5; i++) b.sph(0.2 * s, i % 2 ? 0x2fa77a : 0x25916a, Math.sin(i * 1.3) * 0.14, (0.25 + i * 0.42) * s, 0, { sy: 1.4, sx: 0.8, sz: 0.45, seg: 6 });
}

export function mountain(b: Builder, r: number, h: number, color: number, cap: number | null): void {
  b.cyl(0.02, r, h, color, 0, 0, 0, { seg: 7, grad: 0.3 });
  if (cap !== null) b.cyl(0.02, r * 0.42, h * 0.42, cap, 0, h * 0.585, 0, { seg: 7, grad: 0.05 });
}
