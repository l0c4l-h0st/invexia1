import * as THREE from 'three';
import { iconImage } from '../ui/icons';

/** Dalle d'achat au sol : icône + prix restant + jauge qui monte quand on paie. */
export class TileView {
  readonly mesh: THREE.Mesh;
  private canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  private tex: THREE.CanvasTexture;
  private key = '';
  private bump = 0;
  x = 0;
  z = 0;

  constructor(scene: THREE.Scene) {
    this.canvas.width = this.canvas.height = 256;
    this.ctx = this.canvas.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    const g = new THREE.PlaneGeometry(1, 1);
    g.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false, fog: false }));
    this.mesh.renderOrder = 2;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  hide(): void {
    this.mesh.visible = false;
    this.key = '';
  }

  /** Force un redessin (police/icônes chargées après coup). */
  invalidate(): void {
    this.key = '';
  }

  show(x: number, z: number, size: number, icon: string, price: string, progress: number, affordable: boolean, time: number, dt: number): void {
    this.x = x;
    this.z = z;
    this.mesh.visible = true;
    if (this.bump > 0) this.bump = Math.max(0, this.bump - dt * 4);
    const pulse = affordable ? 1 + Math.sin(time * 6) * 0.035 : 1;
    const s = size * pulse * (1 + Math.sin(this.bump * Math.PI) * 0.12);
    this.mesh.position.set(x, 0.03, z);
    this.mesh.scale.set(s, 1, s);
    const key = `${icon}|${price}|${Math.round(progress * 40)}|${affordable ? 1 : 0}`;
    if (key === this.key) return;
    if (this.key && this.key.split('|')[1] !== price) this.bump = 1;
    this.key = key;
    const c = this.ctx;
    const S = 256;
    c.clearRect(0, 0, S, S);
    const m = 12;
    const r = 44;
    c.save();
    c.beginPath();
    c.roundRect(m, m, S - m * 2, S - m * 2, r);
    c.clip();
    c.fillStyle = 'rgba(24,18,48,0.55)';
    c.fillRect(0, 0, S, S);
    if (progress > 0) {
      const h = (S - m * 2) * Math.min(1, progress);
      const grd = c.createLinearGradient(0, S - m - h, 0, S - m);
      grd.addColorStop(0, 'rgba(110,240,140,0.95)');
      grd.addColorStop(1, 'rgba(40,190,95,0.95)');
      c.fillStyle = grd;
      c.fillRect(0, S - m - h, S, h);
    }
    c.restore();
    c.lineWidth = 11;
    c.strokeStyle = affordable ? '#ffffff' : 'rgba(255,255,255,0.8)';
    c.setLineDash([30, 17]);
    c.lineCap = 'round';
    c.beginPath();
    c.roundRect(m, m, S - m * 2, S - m * 2, r);
    c.stroke();
    c.setLineDash([]);
    const img = iconImage(icon);
    if (img.complete && img.naturalWidth) c.drawImage(img, S / 2 - 58, 26, 116, 116);
    c.font = '700 54px Fredoka, system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.lineWidth = 12;
    c.strokeStyle = '#231a44';
    c.strokeText(price, S / 2, 190, S - 44);
    c.fillStyle = affordable ? '#ffe45c' : '#ffffff';
    c.fillText(price, S / 2, 190, S - 44);
    this.tex.needsUpdate = true;
  }
}
