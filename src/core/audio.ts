/**
 * Audio 100 % procédural (WebAudio) : musique lo-fi en boucle + SFX + haptique.
 * Aucun fichier son : zéro poids, zéro licence.
 */
type Settings = { music: boolean; sfx: boolean; haptics: boolean };

const midi = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);

// Dm9 – G13 – Cmaj9 – Am9 : progression jazzy/lo-fi, 1 accord par mesure.
const CHORDS: number[][] = [
  [50, 57, 60, 64, 65],
  [43, 53, 59, 64, 65],
  [48, 55, 59, 62, 64],
  [45, 55, 60, 64, 67],
];
const SCALE = [72, 74, 76, 79, 81, 84, 86];

export class AudioSys {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private noise!: AudioBuffer;
  private settings: Settings = { music: true, sfx: true, haptics: true };
  private timer = 0;
  private nextStep = 0; // temps audio de la prochaine double-croche
  private step = 0;
  private cashCombo = 0;
  private cashLast = 0;
  private readonly bpm = 74;

  /** À appeler sur le premier geste utilisateur (politique autoplay). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 5;
    this.master.connect(comp).connect(ctx.destination);

    this.musicBus = ctx.createGain();
    const lofi = ctx.createBiquadFilter();
    lofi.type = 'lowpass';
    lofi.frequency.value = 2600;
    lofi.Q.value = 0.4;
    this.musicBus.connect(lofi).connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.connect(this.master);

    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.startCrackle();
    this.applySettings(this.settings);
    this.nextStep = ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 90);
  }

  applySettings(s: Settings): void {
    this.settings = { ...s };
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(s.music ? 0.5 : 0, t, 0.15);
    this.sfxBus.gain.setTargetAtTime(s.sfx ? 0.8 : 0, t, 0.05);
  }

  suspend(on: boolean): void {
    if (!this.ctx) return;
    if (on) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  // ------------------------------------------------------------------ musique
  private startCrackle(): void {
    const ctx = this.ctx!;
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * 0.015;
      if (Math.random() < 0.0006) d[i] += (Math.random() * 2 - 1) * 0.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1200;
    const g = ctx.createGain();
    g.gain.value = 0.35;
    src.connect(hp).connect(g).connect(this.musicBus);
    src.start();
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    if (this.nextStep < ctx.currentTime - 0.5) this.nextStep = ctx.currentTime + 0.05; // retour d'onglet
    const sixteenth = 60 / this.bpm / 4;
    while (this.nextStep < ctx.currentTime + 0.35) {
      const s = this.step % 64; // 4 mesures de 16 doubles-croches
      const swing = s % 2 === 1 ? sixteenth * 0.28 : 0;
      this.playStep(s, this.nextStep + swing);
      this.nextStep += sixteenth;
      this.step++;
    }
  }

  private playStep(s: number, t: number): void {
    if (!this.settings.music) return;
    const bar = Math.floor(s / 16);
    const pos = s % 16;
    const chord = CHORDS[bar];
    if (pos === 0) {
      chord.slice(1).forEach((n, i) => this.keys(midi(n), t + i * 0.035, 2.6, 0.085));
      this.bass(midi(chord[0] - 12), t, 0.9);
    }
    if (pos === 10) {
      this.bass(midi(chord[0] - 12), t, 0.5);
      if (bar % 2 === 1) chord.slice(2, 4).forEach((n, i) => this.keys(midi(n), t + i * 0.03, 1.2, 0.05));
    }
    if (pos === 0 || pos === 8 || (pos === 11 && bar === 3)) this.kick(t);
    if (pos === 4 || pos === 12) this.snare(t);
    if (pos % 2 === 0) this.hat(t, pos % 4 === 2 ? 0.05 : 0.028);
    // petite mélodie pentatonique clairsemée
    if (pos % 2 === 0 && Math.random() < 0.22 && pos !== 0) {
      const n = SCALE[Math.floor(Math.random() * SCALE.length)];
      this.keys(midi(n), t, 0.9, 0.05, true);
    }
  }

  private keys(freq: number, t: number, dur: number, vol: number, lead = false): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(lead ? 2200 : 1500, t);
    f.frequency.exponentialRampToValueAtTime(500, t + dur);
    const o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = freq * 1.003;
    const g2 = ctx.createGain();
    g2.gain.value = 0.35;
    // léger "wow" de bande
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.6 + Math.random() * 0.5;
    const lg = ctx.createGain();
    lg.gain.value = freq * 0.004;
    lfo.connect(lg);
    lg.connect(o1.frequency);
    lg.connect(o2.frequency);
    o1.connect(g);
    o2.connect(g2).connect(g);
    g.connect(f).connect(this.musicBus);
    for (const o of [o1, o2, lfo]) {
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  private bass(freq: number, t: number, dur: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.28, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private kick(t: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    o.connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.26);
  }

  private noiseHit(t: number, dur: number, type: BiquadFilterType, freq: number, vol: number, bus: AudioNode, q = 0.8): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random());
    src.stop(t + dur + 0.02);
  }

  private snare(t: number): void {
    this.noiseHit(t, 0.16, 'bandpass', 1700, 0.2, this.musicBus);
  }
  private hat(t: number, vol: number): void {
    this.noiseHit(t, 0.04, 'highpass', 7000, vol, this.musicBus);
  }

  // ---------------------------------------------------------------------- SFX
  private tone(freq: number, dur: number, vol: number, type: OscillatorType = 'sine', delay = 0, slideTo = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.settings.sfx || ctx.state !== 'running') return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  /** Billet ramassé : la hauteur monte tant qu'on enchaîne. */
  cash(): void {
    const now = performance.now();
    if (now - this.cashLast < 28) return;
    this.cashCombo = now - this.cashLast > 450 ? 0 : Math.min(this.cashCombo + 1, 14);
    this.cashLast = now;
    const f = midi(76 + [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33][this.cashCombo]);
    this.tone(f, 0.11, 0.16, 'triangle');
    this.tone(f * 2, 0.07, 0.05, 'sine', 0.01);
  }
  pay(): void {
    const now = performance.now();
    if (now - this.cashLast < 45) return;
    this.cashLast = now;
    this.tone(520 + Math.random() * 60, 0.06, 0.1, 'triangle', 0, 300);
  }
  pop(): void {
    this.tone(560, 0.13, 0.3, 'sine', 0, 170);
  }
  pick(): void {
    this.tone(700 + Math.random() * 120, 0.05, 0.12, 'sine', 0, 950);
  }
  ding(): void {
    this.tone(1318.5, 0.7, 0.2, 'sine');
    this.tone(1975.5, 0.5, 0.1, 'sine', 0.005);
    this.tone(2637, 0.3, 0.04, 'sine', 0.01);
  }
  clean(): void {
    const ctx = this.ctx;
    if (!ctx || !this.settings.sfx || ctx.state !== 'running') return;
    this.noiseHit(ctx.currentTime, 0.28, 'bandpass', 2400, 0.16, this.sfxBus, 1.6);
    [88, 93, 100].forEach((n, i) => this.tone(midi(n), 0.22, 0.07, 'sine', 0.08 + i * 0.06));
  }
  build(): void {
    this.pop();
    [72, 76, 79, 84].forEach((n, i) => this.tone(midi(n), 0.2, 0.14, 'triangle', 0.06 + i * 0.07));
  }
  fanfare(): void {
    [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => {
      this.tone(midi(n), 0.34, 0.15, 'triangle', i * 0.085);
      this.tone(midi(n + 12), 0.25, 0.05, 'sine', i * 0.085);
    });
    this.tone(midi(84), 0.9, 0.12, 'triangle', 0.66);
    this.tone(midi(88), 0.9, 0.1, 'triangle', 0.66);
    this.tone(midi(91), 0.9, 0.1, 'triangle', 0.66);
  }
  vip(): void {
    [84, 88, 91, 96, 100].forEach((n, i) => this.tone(midi(n), 0.3, 0.09, 'sine', i * 0.05));
  }
  tap(): void {
    this.tone(900, 0.04, 0.1, 'triangle', 0, 600);
  }
  deny(): void {
    this.tone(160, 0.14, 0.2, 'triangle', 0, 110);
  }
  whoosh(): void {
    const ctx = this.ctx;
    if (!ctx || !this.settings.sfx || ctx.state !== 'running') return;
    this.noiseHit(ctx.currentTime, 0.4, 'bandpass', 900, 0.2, this.sfxBus, 0.9);
  }

  // ------------------------------------------------------------------ haptique
  buzz(pattern: number | number[]): void {
    if (!this.settings.haptics) return;
    try {
      navigator.vibrate?.(pattern);
    } catch {
      /* non supporté (iOS Safari) */
    }
  }
}

export const audio = new AudioSys();
