/**
 * Joystick flottant : poser le doigt n'importe où sur la scène crée le joystick à cet endroit.
 * C'est l'UNIQUE contrôle du jeu (clavier ZQSD/flèches en plus pour le test sur PC).
 */
export class Joystick {
  x = 0; // -1..1 (droite +)
  y = 0; // -1..1 (bas de l'écran +)
  active = false;
  /** Vrai dès que le joueur a déplacé le stick au moins une fois. */
  used = false;

  private id = -1;
  private ox = 0;
  private oy = 0;
  private readonly max = 58;
  private base: HTMLDivElement;
  private knob: HTMLDivElement;
  private keys = new Set<string>();

  constructor(surface: HTMLElement, layer: HTMLElement) {
    this.base = document.createElement('div');
    this.base.className = 'joy-base';
    this.knob = document.createElement('div');
    this.knob.className = 'joy-knob';
    this.base.appendChild(this.knob);
    layer.appendChild(this.base);

    surface.addEventListener('pointerdown', (e) => {
      if (this.id !== -1) return;
      this.id = e.pointerId;
      this.ox = e.clientX;
      this.oy = e.clientY;
      this.active = true;
      this.x = this.y = 0;
      try {
        surface.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      this.base.style.transform = `translate(${this.ox}px, ${this.oy}px)`;
      this.knob.style.transform = 'translate(0px, 0px)';
      this.base.classList.add('on');
      e.preventDefault();
    });
    surface.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.id) return;
      let dx = e.clientX - this.ox;
      let dy = e.clientY - this.oy;
      const len = Math.hypot(dx, dy);
      if (len > this.max) {
        // le socle suit le doigt quand on dépasse : jamais de "bout de course"
        const over = len - this.max;
        this.ox += (dx / len) * over;
        this.oy += (dy / len) * over;
        dx = (dx / len) * this.max;
        dy = (dy / len) * this.max;
        this.base.style.transform = `translate(${this.ox}px, ${this.oy}px)`;
      }
      this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const dead = 0.12;
      const clen = Math.hypot(dx, dy);
      const m = clen / this.max;
      if (m < dead) {
        this.x = this.y = 0;
      } else {
        const k = Math.min(1, (m - dead) / (1 - dead)) / clen;
        this.x = dx * k;
        this.y = dy * k;
        this.used = true;
      }
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.id) return;
      this.id = -1;
      this.active = false;
      this.x = this.y = 0;
      this.base.classList.remove('on');
    };
    surface.addEventListener('pointerup', end);
    surface.addEventListener('pointercancel', end);
    surface.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.id = -1;
      this.active = false;
      this.x = this.y = 0;
      this.base.classList.remove('on');
    });
  }

  /** Vecteur final (stick ou clavier), normalisé à 1 max. */
  read(out: { x: number; y: number }): void {
    let x = this.x;
    let y = this.y;
    const k = this.keys;
    if (k.size) {
      if (k.has('arrowleft') || k.has('q') || k.has('a')) x -= 1;
      if (k.has('arrowright') || k.has('d')) x += 1;
      if (k.has('arrowup') || k.has('z') || k.has('w')) y -= 1;
      if (k.has('arrowdown') || k.has('s')) y += 1;
      if (x || y) this.used = true;
    }
    const n = Math.hypot(x, y);
    if (n > 1) {
      x /= n;
      y /= n;
    }
    out.x = x;
    out.y = y;
  }
}
