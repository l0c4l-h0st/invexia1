import * as THREE from 'three';
import type { Mood } from './styles';

const PITCH = (50 * Math.PI) / 180;
const FOV = 36;
const VIEW_W = 10.1; // largeur de monde visible en portrait
const VIEW_H = 17;

/** Rendu, caméra aérienne inclinée (~50°) avec suivi lissé, lumières, brouillard d'horizon. */
export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 1, 1, 400);
  private hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 2);
  private sun = new THREE.DirectionalLight(0xffffff, 2);
  private target = new THREE.Vector3();
  private dist = 36;
  private shakeT = 0;
  private zoomPunch = 0;
  private maxRatio = 2;
  private ratio = 1;
  private slow = 0;
  private fast = 0;
  width = 1;
  height = 1;
  private v = new THREE.Vector3();

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false, stencil: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.sun.position.set(-6, 14, 9);
    this.scene.add(this.hemi, this.sun);
    this.scene.fog = new THREE.Fog(0xffffff, 40, 70);
    this.camera.rotation.order = 'YXZ';
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.width = w;
    this.height = h;
    this.maxRatio = Math.min(window.devicePixelRatio || 1, 2); // pixel ratio plafonné à 2
    this.ratio = Math.min(this.ratio < 1 ? 1 : this.maxRatio, this.maxRatio);
    this.renderer.setPixelRatio(this.ratio);
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    const aspect = w / h;
    this.camera.aspect = aspect;
    const t = Math.tan((FOV * Math.PI) / 360);
    this.dist = Math.max(VIEW_W / (2 * t * aspect), VIEW_H / (2 * t));
    this.camera.updateProjectionMatrix();
    const fog = this.scene.fog as THREE.Fog;
    fog.near = this.dist + 10;
    fog.far = this.dist + 46;
    this.place();
  }

  setMood(m: Mood): void {
    const fog = this.scene.fog as THREE.Fog;
    fog.color.set(m.fog);
    this.scene.background = new THREE.Color(m.fog);
    this.hemi.color.set(m.hemiSky);
    this.hemi.groundColor.set(m.hemiGround);
    this.hemi.intensity = m.hemi;
    this.sun.color.set(m.sun);
    this.sun.intensity = m.sunI;
  }

  /** Suivi lissé du joueur (léger retard = sensation de fluidité). */
  follow(x: number, z: number, dt: number, snap = false): void {
    const tz = z - 0.6;
    if (snap) this.target.set(x, 0, tz);
    else {
      const k = 1 - Math.exp(-dt * 6.5);
      this.target.x += (x - this.target.x) * k;
      this.target.z += (tz - this.target.z) * k;
    }
    if (this.shakeT > 0) this.shakeT = Math.max(0, this.shakeT - dt);
    if (this.zoomPunch > 0) this.zoomPunch = Math.max(0, this.zoomPunch - dt * 1.8);
    this.place();
  }

  private place(): void {
    const d = this.dist * (1 - 0.06 * Math.sin(this.zoomPunch * Math.PI));
    const sx = this.shakeT > 0 ? (Math.random() - 0.5) * this.shakeT * 0.5 : 0;
    const sz = this.shakeT > 0 ? (Math.random() - 0.5) * this.shakeT * 0.5 : 0;
    this.camera.position.set(this.target.x + sx, Math.sin(PITCH) * d, this.target.z + Math.cos(PITCH) * d + sz);
    this.camera.rotation.set(-PITCH, 0, 0);
    this.camera.updateMatrixWorld();
  }

  shake(amount = 0.3): void {
    this.shakeT = Math.max(this.shakeT, amount);
  }
  punch(): void {
    this.zoomPunch = 1;
  }

  /** Monde -> pixels écran. */
  project(x: number, y: number, z: number): { x: number; y: number } {
    this.v.set(x, y, z).project(this.camera);
    return { x: (this.v.x * 0.5 + 0.5) * this.width, y: (-this.v.y * 0.5 + 0.5) * this.height };
  }

  /** Qualité adaptative : si le téléphone peine, on baisse la résolution de rendu. */
  adapt(frameMs: number): void {
    if (frameMs > 24) this.slow++;
    else if (frameMs < 17.5) this.fast++;
    if (this.slow + this.fast < 120) return;
    if (this.slow > 70 && this.ratio > 1) {
      this.ratio = Math.max(1, this.ratio - 0.25);
      this.renderer.setPixelRatio(this.ratio);
      this.renderer.setSize(this.width, this.height, false);
    }
    this.slow = this.fast = 0;
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
