import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import './ui/style.css';
import { B, TIERS } from './balance';
import { audio } from './core/audio';
import { Joystick } from './core/input';
import { loadState, saveState } from './core/save';
import { Store } from './core/store';
import { offlineCap, offlineEarnings } from './game/economy';
import { Game } from './game/game';
import { Stage } from './gfx/stage';
import { setLang } from './i18n';
import { preloadIcons } from './ui/icons';
import { UI } from './ui/ui';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('game') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui') as HTMLElement;

const { state, fresh } = loadState();
// ---- outils de test visuel : ?tier=N&city=N (saute à un palier), &demo=1 (tout acheté). Ne sauvegarde pas.
if (params.has('tier') || params.has('city') || params.has('demo')) {
  (window as unknown as { __noSave: boolean }).__noSave = true;
  state.tier = Math.max(0, Math.min(TIERS.length - 1, Number(params.get('tier')) || 0));
  state.city = Math.max(0, Number(params.get('city')) || 0);
  const T = TIERS[state.tier];
  state.rooms = T.startRooms;
  state.roomLevel = 1;
  state.services = [];
  state.tutorial = 3;
  if (params.get('demo') === '1') {
    state.rooms = T.maxRooms;
    state.roomLevel = 3;
    for (const c of T.chain) if (c.kind === 'service') state.services.push(c.service);
    state.staff = { receptionist: 1, housekeeper: 3, bellhop: 1 };
    state.features = { staff: true, upgrades: true, boosts: true, quests: true, prestige: true };
    state.cash = 12345;
    state.stars = 12;
  }
}
const store = new Store(state);
setLang(state.settings.lang);
audio.applySettings(state.settings);

const stage = new Stage(canvas);
const ui = new UI(store, stage);
const joy = new Joystick(canvas, uiRoot);
const game = new Game(stage, store, joy, ui);
ui.game = game;

// ---- outils de test : ?bot=1 (auto-joueur) & ?speed=N (accéléré)
const speed = Math.max(1, Math.min(4000, Number(params.get('speed')) || 1));
const headless = params.get('headless') === '1'; // simulation seule, sans rendu (équilibrage)
game.bot = params.get('bot') === '1';
(window as unknown as Record<string, unknown>).__game = game;
(window as unknown as Record<string, unknown>).__store = store;

// ---- sauvegarde : auto toutes les 10 s + à la mise en arrière-plan
function save(): void {
  if ((window as unknown as { __noSave?: boolean }).__noSave) return;
  const s = store.state;
  s.pendingCash = game.floorCash();
  saveState(s);
  s.pendingCash = 0;
}
window.setInterval(save, 10_000);
window.addEventListener('pagehide', save);

// ---- gains hors-ligne (plafonnés, plafond améliorable)
function checkOffline(since: number): void {
  const s = store.state;
  const elapsed = (Date.now() - since) / 1000;
  if (elapsed < B.offline.minSeconds || ui.blocking) return;
  const amount = offlineEarnings(s, elapsed);
  if (amount >= 1) ui.offline(amount, elapsed, offlineCap(s));
}
if (!fresh) checkOffline(state.lastSeen);

let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    hiddenAt = Date.now();
    save();
    audio.suspend(true);
  } else {
    audio.suspend(false);
    last = performance.now();
    if (hiddenAt) checkOffline(hiddenAt);
    hiddenAt = 0;
  }
});

// ---- premier geste : débloque l'audio, tente le plein écran + verrou portrait sur mobile
let firstTouch = true;
window.addEventListener(
  'pointerdown',
  () => {
    audio.unlock();
    if (!firstTouch) return;
    firstTouch = false;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const standalone = window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
    if (coarse && !standalone && window.self === window.top) {
      void document.documentElement
        .requestFullscreen?.({ navigationUI: 'hide' })
        .then(() => (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.('portrait'))
        .catch(() => undefined);
    }
  },
  { capture: true },
);

// police et icônes arrivent en asynchrone : on redessine les textures canvas ensuite
void Promise.all([preloadIcons(), document.fonts?.load('700 40px Fredoka')]).then(() => game.redrawTiles());

// ---- boucle principale
let last = performance.now();
let lastView: unknown = null;
const STEP = 1 / 60;
function frame(now: number): void {
  const real = Math.min(0.1, (now - last) / 1000);
  last = now;
  const dt = Math.min(0.05, real);
  if (speed > 1) for (let i = 0; i < speed; i++) game.step(STEP);
  else game.step(dt);
  game.draw(speed > 1 ? Math.min(1, STEP * speed) : dt);
  ui.tick(dt);
  store.flush();
  if (game.view !== lastView) {
    lastView = game.view;
    document.documentElement.style.setProperty('--vig', game.view.mood.vignette);
  }
  if (!headless) {
    stage.render();
    stage.adapt(real * 1000);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
