import { B, TIERS, type Feature, type Role, type StarId, type UpgradeId } from '../balance';
import { CONFIG } from '../config';
import { ads, type AdPlacement } from '../core/ads';
import { audio } from '../core/audio';
import { fmt, fmtTime, money } from '../core/format';
import { wipeSave } from '../core/save';
import type { GameState, Store } from '../core/store';
import * as E from '../game/economy';
import type { Game, GameUI } from '../game/game';
import { achievementsClaimable, achState, ACHIEVEMENTS, QUEST_ICON, questsClaimable } from '../game/quests';
import type { Stage } from '../gfx/stage';
import { setLang, t } from '../i18n';
import { icon } from './icons';

type PanelId = 'upgrades' | 'quests' | 'boosts' | 'world' | 'settings';
const el = <T extends HTMLElement = HTMLDivElement>(cls: string, html = '', tag = 'div'): T => {
  const e = document.createElement(tag) as T;
  e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

const FEATURE_PANEL: Record<Feature, { panel: PanelId | null; icon: string }> = {
  staff: { panel: null, icon: 'person' },
  upgrades: { panel: 'upgrades', icon: 'up' },
  boosts: { panel: 'boosts', icon: 'gift' },
  quests: { panel: 'quests', icon: 'quest' },
  prestige: { panel: 'world', icon: 'globe' },
};
const THEME_ICON: Record<string, string> = { town: 'hotel', beach: 'pool', mountain: 'sparkle', desert: 'bolt', mega: 'casino', undersea: 'spa' };

/** HUD minimal + panneaux. Implémente GameUI pour recevoir les événements de la simulation. */
export class UI implements GameUI {
  game!: Game;
  private root: HTMLElement;
  private cashEl: HTMLElement;
  private starsPill: HTMLElement;
  private starsEl: HTMLElement;
  private objEl: HTMLElement;
  private stepsEl: HTMLElement;
  private chipsEl: HTMLElement;
  private sideEl: HTMLElement;
  private floats: HTMLElement;
  private toasts: HTMLElement;
  private bannerEl: HTMLElement;
  private hand: HTMLElement;
  private fade: HTMLElement;
  private sheet: HTMLElement;
  private modalEl: HTMLElement;
  private shownCash = 0;
  private panel: PanelId | null = null;
  private tab = 0;
  private panelHtml = '';
  private panelT = 0;
  private bannerQ: { icon: string; title: string; sub?: string }[] = [];
  private bannerBusy = false;
  private sideKey = '';
  private objKey = '';
  private modalAct: Record<string, () => void> = {};

  constructor(
    private store: Store,
    private stage: Stage,
  ) {
    this.root = document.getElementById('ui')!;
    this.root.innerHTML = '';
    const top = el('top');
    const pills = el('pills');
    const cash = el('pill cash', `${icon('cash', 26)}<span>$0</span>`);
    this.cashEl = cash.querySelector('span')!;
    this.starsPill = el('pill stars', `${icon('star', 24)}<span>0</span>`);
    this.starsEl = this.starsPill.querySelector('span')!;
    pills.append(cash, this.starsPill);
    const gear = el<HTMLButtonElement>('rbtn gear', icon('gear', 28), 'button');
    gear.dataset.act = 'panel:settings';
    top.append(pills, gear);
    this.stepsEl = el('steps');
    this.objEl = el('objective');
    this.chipsEl = el('chips');
    this.sideEl = el('side');
    this.toasts = el('toasts');
    this.bannerEl = el('banner');
    this.floats = el('floats');
    this.hand = el('hand', `<div class="hand-ring"></div><div class="hand-ic">${icon('hand', 54)}</div>`);
    this.fade = el('fade', `<div class="fade-ic">${icon('hotel', 84)}</div>`);
    this.sheet = el('sheet-wrap');
    this.modalEl = el('modal-wrap');
    this.root.append(top, this.stepsEl, this.objEl, this.chipsEl, this.sideEl, this.toasts, this.floats, this.hand, this.bannerEl, this.sheet, this.modalEl, this.fade);

    // délégation : une action = attribut data-act (robuste aux re-rendus)
    let downX = 0;
    let downY = 0;
    this.root.addEventListener('pointerdown', (e) => {
      downX = e.clientX;
      downY = e.clientY;
    });
    this.root.addEventListener('pointerup', (e) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 12) return; // c'était un scroll
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
      if (!target || target.classList.contains('off')) return;
      this.act(target.dataset.act!);
    });
    store.subscribe((s) => this.render(s));
  }

  // ------------------------------------------------------------- GameUI
  float(x: number, y: number, z: number, text: string, cls = ''): void {
    const p = this.stage.project(x, y, z);
    const f = el('float ' + cls, cls === 'need-towel' ? icon('towel', 34) : text);
    f.style.left = p.x + 'px';
    f.style.top = p.y + 'px';
    this.floats.appendChild(f);
    f.addEventListener('animationend', () => f.remove());
    if (this.floats.childElementCount > 24) this.floats.firstElementChild?.remove();
  }
  banner(ic: string, title: string, sub?: string): void {
    this.bannerQ.push({ icon: ic, title, sub });
    this.nextBanner();
  }
  private nextBanner(): void {
    if (this.bannerBusy) return;
    const b = this.bannerQ.shift();
    if (!b) return;
    this.bannerBusy = true;
    const sub = b.sub ? `<div class="banner-sub">${t(b.sub)}</div>` : '';
    this.bannerEl.innerHTML = `<div class="banner-card"><div class="banner-ic">${icon(b.icon, 64)}</div><div><div class="banner-title">${t(b.title)}</div>${sub}</div></div>`;
    this.bannerEl.classList.add('on');
    window.setTimeout(() => {
      this.bannerEl.classList.remove('on');
      window.setTimeout(() => {
        this.bannerBusy = false;
        this.nextBanner();
      }, 280);
    }, 2100);
  }
  feature(f: Feature): void {
    this.banner(FEATURE_PANEL[f].icon, 'feature.' + f, 'feature.' + f + '.sub');
    audio.fanfare();
    this.sideKey = '';
  }
  toast(ic: string, text: string): void {
    const n = el('toast', `${icon(ic, 24)}<span>${t(text)}</span>`);
    this.toasts.appendChild(n);
    window.setTimeout(() => n.classList.add('out'), 1700);
    window.setTimeout(() => n.remove(), 2100);
    if (this.toasts.childElementCount > 3) this.toasts.firstElementChild?.remove();
  }
  transition(mid: () => void): void {
    this.closePanel();
    this.fade.classList.add('on');
    audio.whoosh();
    window.setTimeout(() => {
      mid();
      window.setTimeout(() => this.fade.classList.remove('on'), 380);
    }, 420);
  }

  // ---------------------------------------------------------------- HUD
  /** Appelé chaque frame : compteur de cash animé, rafraîchissement du panneau ouvert. */
  tick(dt: number): void {
    const s = this.store.state;
    const diff = s.cash - this.shownCash;
    if (Math.abs(diff) > 0.5) {
      this.shownCash += diff * Math.min(1, dt * 9);
      if (Math.abs(s.cash - this.shownCash) < 0.6) this.shownCash = s.cash;
      this.cashEl.textContent = money(this.shownCash);
    }
    this.hand.classList.toggle('on', s.tutorial === 0 && !this.panel);
    if (this.panel) {
      this.panelT -= dt;
      if (this.panelT <= 0) {
        this.panelT = 0.25;
        this.renderPanel();
      }
    }
  }

  private render(s: GameState): void {
    this.cashEl.textContent = money(this.shownCash);
    const showStars = s.stars > 0 || s.features.prestige;
    this.starsPill.classList.toggle('show', showStars);
    this.starsEl.textContent = fmt(s.stars);

    // objectif : prochain déblocage + jauge
    const o = this.game?.objective;
    if (o) {
      const paid = s.paid[o.id] ?? 0;
      const rem = Math.max(0, o.cost - paid);
      const pct = Math.max(0, Math.min(1, (paid + Math.min(s.cash, rem)) / o.cost));
      const key = `${o.id}|${Math.round(pct * 100)}|${Math.ceil(rem)}|${s.settings.lang}`;
      if (key !== this.objKey) {
        this.objKey = key;
        const it = o.item;
        const label =
          it.kind === 'room'
            ? t('obj.room', { n: it.n })
            : it.kind === 'roomUp'
              ? t('obj.roomUp', { n: it.n })
              : it.kind === 'service'
                ? t('svc.' + it.service)
                : it.kind === 'hire'
                  ? t('role.' + it.role)
                  : s.tier >= TIERS.length - 1
                    ? t('obj.newCity')
                    : t('tier.' + TIERS[s.tier + 1].id);
        const ready = pct >= 1;
        this.objEl.className = 'objective show' + (ready ? ' ready' : '');
        this.objEl.innerHTML = `<div class="obj-ic">${icon(o.icon, 34)}</div><div class="obj-main"><div class="obj-row"><span class="obj-label">${label}</span><span class="obj-cost">${money(Math.ceil(rem))}</span></div><div class="bar"><i style="width:${(pct * 100).toFixed(1)}%"></i></div></div>`;
      }
    } else if (this.objKey) {
      this.objKey = '';
      this.objEl.className = 'objective';
    }

    // tutoriel : 3 pastilles sans texte
    const tut = s.tutorial;
    this.stepsEl.classList.toggle('show', tut < 3);
    if (tut < 3) {
      const cur = tut <= 1 ? 0 : s.stats.cleaned === 0 ? 1 : 2;
      const key = 'steps' + cur;
      if (this.stepsEl.dataset.k !== key) {
        this.stepsEl.dataset.k = key;
        this.stepsEl.innerHTML = ['bell', 'broom', 'up'].map((n, i) => `<div class="step ${i < cur ? 'done' : i === cur ? 'cur' : ''}">${icon(i < cur ? 'check' : n, 26)}</div>`).join('<i></i>');
      }
    }

    // boosts actifs
    let chips = '';
    if (s.boosts.income > 0) chips += `<div class="chip">${icon('coins', 20)}<b>×2</b> ${fmtTime(s.boosts.income)}</div>`;
    if (s.boosts.speed > 0) chips += `<div class="chip">${icon('bolt', 20)} ${fmtTime(s.boosts.speed)}</div>`;
    if (this.chipsEl.innerHTML !== chips) this.chipsEl.innerHTML = chips;

    // boutons latéraux, révélés un par un
    const f = s.features;
    const qn = questsClaimable(s) + achievementsClaimable(s);
    const canUp = f.upgrades && (['pSpeed', 'pCap', 'pIncome'] as UpgradeId[]).some((id) => !E.upgradeMaxed(s, id) && s.cash >= E.upgradeCost(id, s.up[id]));
    const key = `${f.upgrades}|${f.boosts}|${f.quests}|${f.prestige}|${qn}|${canUp}|${Object.keys(s.seen).length}`;
    if (key !== this.sideKey) {
      this.sideKey = key;
      const btn = (panel: PanelId, ic: string, on: boolean, badge: string): string =>
        on ? `<button class="rbtn ${s.seen[panel] ? '' : 'fresh'}" data-act="panel:${panel}">${icon(ic, 30)}${badge ? `<em>${badge}</em>` : ''}</button>` : '';
      this.sideEl.innerHTML =
        btn('upgrades', 'up', f.upgrades, canUp ? '!' : '') + btn('quests', 'quest', f.quests, qn ? String(qn) : '') + btn('boosts', 'gift', f.boosts, '') + btn('world', 'globe', f.prestige, '');
    }
  }

  // ------------------------------------------------------------ actions
  private act(a: string): void {
    const [cmd, arg] = a.split(':');
    const g = this.game;
    const s = this.store.state;
    audio.unlock();
    switch (cmd) {
      case 'panel':
        audio.tap();
        this.openPanel(arg as PanelId);
        break;
      case 'close':
        audio.tap();
        this.closePanel();
        break;
      case 'tab':
        audio.tap();
        this.tab = Number(arg);
        this.renderPanel(true);
        break;
      case 'up':
        g.buyUpgrade(arg as UpgradeId);
        this.renderPanel(true);
        break;
      case 'star':
        g.buyStar(arg as StarId);
        this.renderPanel(true);
        break;
      case 'quest':
        g.claimQuest(Number(arg));
        this.renderPanel(true);
        break;
      case 'ach':
        g.claimAchievement(arg);
        this.renderPanel(true);
        break;
      case 'ad':
        void this.watchAd(arg === 'income' ? 'income_x2' : 'speed', () => g.addBoost(arg as 'income' | 'speed'));
        break;
      case 'prestige':
        this.confirm(t('prestige.confirm', { n: fmt(E.starsOnPrestige(s)) }), 'star', () => g.prestige());
        break;
      case 'toggle': {
        const k = arg as 'music' | 'sfx' | 'haptics';
        s.settings[k] = !s.settings[k];
        audio.applySettings(s.settings);
        audio.tap();
        if (k === 'haptics') audio.buzz(30);
        this.store.touch();
        this.renderPanel(true);
        break;
      }
      case 'lang':
        s.settings.lang = arg as 'fr' | 'en';
        setLang(s.settings.lang);
        audio.tap();
        this.sideKey = this.objKey = '';
        this.store.touch();
        this.renderPanel(true);
        break;
      case 'fullscreen':
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen?.().catch(() => undefined);
        break;
      case 'reset':
        this.confirm(t('settings.reset.confirm'), 'trash', () => {
          wipeSave();
          (window as unknown as { __noSave: boolean }).__noSave = true;
          location.reload();
        });
        break;
      case 'modal':
        this.modalAct[arg]?.();
        break;
    }
  }

  private async watchAd(placement: AdPlacement, reward: () => void): Promise<void> {
    const p = ads.get();
    if (!p.isReady(placement)) return;
    if (await p.showRewarded(placement)) reward();
    this.renderPanel(true);
  }

  // ------------------------------------------------------------ panneaux
  openPanel(id: PanelId): void {
    const s = this.store.state;
    if (!s.seen[id]) {
      s.seen[id] = 1;
      this.store.touch();
    }
    this.panel = id;
    this.tab = 0;
    this.sheet.classList.add('on');
    this.renderPanel(true);
  }
  closePanel(): void {
    this.panel = null;
    this.sheet.classList.remove('on');
    this.panelHtml = '';
  }

  private renderPanel(force = false): void {
    if (!this.panel) return;
    const s = this.store.state;
    let title = '';
    let tabs: string[] = [];
    let body = '';
    switch (this.panel) {
      case 'upgrades':
        title = t('up.title');
        tabs = [t('up.tab.player'), t('up.tab.staff')];
        body = this.tab === 0 ? this.upgradesPlayer(s) : this.upgradesStaff(s);
        break;
      case 'quests':
        title = t('quests.title');
        tabs = [t('quests.tab.quests'), t('quests.tab.ach')];
        body = this.tab === 0 ? this.questsBody(s) : this.achBody(s);
        break;
      case 'boosts':
        title = t('boosts.title');
        body = this.boostsBody(s);
        break;
      case 'world':
        title = t('world.title');
        tabs = [t('world.tab.map'), t('world.tab.prestige')];
        body = this.tab === 0 ? this.mapBody(s) : this.prestigeBody(s);
        break;
      case 'settings':
        title = t('settings.title');
        body = this.settingsBody(s);
        break;
    }
    const tabsHtml = tabs.length ? `<div class="tabs">${tabs.map((n, i) => `<button class="tab ${i === this.tab ? 'on' : ''}" data-act="tab:${i}">${n}</button>`).join('')}</div>` : '';
    const html = `<div class="sheet-head"><h2>${title}</h2><button class="xbtn" data-act="close">${icon('close', 22)}</button></div>${tabsHtml}<div class="sheet-body">${body}</div>`;
    if (html === this.panelHtml && !force) return;
    const fresh = this.panelHtml === '';
    const old = this.sheet.querySelector('.sheet-body');
    const scroll = old ? old.scrollTop : 0;
    this.panelHtml = html;
    this.sheet.innerHTML = `<div class="scrim" data-act="close"></div><div class="sheet ${fresh ? 'in' : ''}">${html}</div>`;
    const nb = this.sheet.querySelector('.sheet-body');
    if (nb) nb.scrollTop = scroll;
  }

  private upRow(s: GameState, id: UpgradeId, ic: string, value: string, locked = false): string {
    const lv = s.up[id];
    const maxed = E.upgradeMaxed(s, id);
    const cost = E.upgradeCost(id, lv);
    const can = !maxed && !locked && s.cash >= cost;
    const btn = locked
      ? `<button class="buy off">${icon('lock', 22)}</button>`
      : maxed
        ? `<button class="buy off max">${t('max')}</button>`
        : `<button class="buy ${can ? 'can' : 'off'}" data-act="up:${id}">${icon('cash', 20)}${fmt(cost)}</button>`;
    return `<div class="row ${locked ? 'locked' : ''}"><div class="row-ic">${icon(ic, 40)}</div><div class="row-main"><div class="row-title">${t('up.' + id)} <small>${t('lvl', { n: lv })}</small></div><div class="row-sub">${locked ? t('up.needStaff') : t('up.' + id + '.d', { v: value })}</div></div>${btn}</div>`;
  }

  private upgradesPlayer(s: GameState): string {
    return (
      this.upRow(s, 'pSpeed', 'bolt', String(Math.round((s.up.pSpeed + 1) * B.upgrades.pSpeed.per * 100))) +
      this.upRow(s, 'pCap', 'box', String(E.playerCap(s) + 1)) +
      this.upRow(s, 'pIncome', 'coins', String(Math.round((s.up.pIncome + 1) * B.upgrades.pIncome.per * 100)))
    );
  }
  private upgradesStaff(s: GameState): string {
    const head = (role: Role, ic: string): string => `<div class="group">${icon(ic, 22)}<span>${t('role.' + role)}</span><b>×${s.staff[role]}</b></div>`;
    const rec = s.staff.receptionist === 0;
    const hk = s.staff.housekeeper === 0;
    const bh = s.staff.bellhop === 0;
    const next = (id: UpgradeId): GameState => ({ ...s, up: { ...s.up, [id]: s.up[id] + 1 } });
    return (
      head('receptionist', 'bell') +
      this.upRow(s, 'recSpeed', 'bolt', E.recCheckinTime(next('recSpeed')).toFixed(2), rec) +
      this.upRow(s, 'recCap', 'person', String(E.queueCap(s) + 1), rec) +
      head('housekeeper', 'broom') +
      this.upRow(s, 'hkSpeed', 'bolt', String(Math.round((s.up.hkSpeed + 1) * B.upgrades.hkSpeed.per * 100)), hk) +
      this.upRow(s, 'hkCap', 'towel', String(E.hkCap(s) + 1), hk) +
      head('bellhop', 'bag') +
      this.upRow(s, 'bhSpeed', 'bolt', String(Math.round((s.up.bhSpeed + 1) * B.upgrades.bhSpeed.per * 100)), bh) +
      this.upRow(s, 'bhCap', 'coins', String(Math.round((0.1 + (s.up.bhCap + 1) * B.upgrades.bhCap.per) * 100)), bh)
    );
  }

  private questsBody(s: GameState): string {
    return s.quests
      .map((q) => {
        const done = q.progress >= q.target;
        const n = q.type === 'earn' ? money(q.target) : String(q.target);
        const prog = q.type === 'earn' ? `${money(q.progress)} / ${money(q.target)}` : `${Math.floor(q.progress)} / ${q.target}`;
        const btn = done ? `<button class="buy can" data-act="quest:${q.id}">${t('claim')}</button>` : `<div class="reward">${icon('cash', 20)}${fmt(q.reward)}</div>`;
        return `<div class="row ${done ? 'done' : ''}"><div class="row-ic">${icon(QUEST_ICON[q.type], 40)}</div><div class="row-main"><div class="row-title">${t('q.' + q.type, { n })}</div><div class="bar"><i style="width:${Math.min(100, (q.progress / q.target) * 100).toFixed(0)}%"></i></div><div class="row-sub">${prog}</div></div>${btn}</div>`;
      })
      .join('');
  }
  private achBody(s: GameState): string {
    const total = E.achievementCount(s);
    return (
      `<div class="note">${icon('trophy', 22)}<span>${t('ach.bonus')}<br><b>${t('ach.total', { n: total })}</b></span></div>` +
      ACHIEVEMENTS.map((a) => {
        const st = achState(s, a);
        const money$ = a.stat === 'earned';
        const fmtv = (v: number): string => (money$ ? money(v) : fmt(v));
        const btn = st.maxed ? `<button class="buy off max">${t('max')}</button>` : st.claimable ? `<button class="buy can" data-act="ach:${a.id}">${t('claim')}</button>` : `<div class="reward">+1%</div>`;
        const stars = '★'.repeat(st.level) + '☆'.repeat(Math.max(0, Math.min(5, a.steps.length) - st.level));
        return `<div class="row ${st.claimable ? 'done' : ''}"><div class="row-ic">${icon(a.icon, 40)}</div><div class="row-main"><div class="row-title">${t('ach.' + a.id)} <small class="ach-stars">${stars}</small></div><div class="bar"><i style="width:${Math.min(100, (st.value / st.target) * 100).toFixed(0)}%"></i></div><div class="row-sub">${fmtv(Math.min(st.value, st.target))} / ${fmtv(st.target)}</div></div>${btn}</div>`;
      }).join('')
    );
  }

  private boostsBody(s: GameState): string {
    const card = (kind: 'income' | 'speed', ic: string): string =>
      `<div class="row boost"><div class="row-ic">${icon(ic, 44)}</div><div class="row-main"><div class="row-title">${t('boost.' + kind)}</div><div class="row-sub">${s.boosts[kind] > 0 ? fmtTime(s.boosts[kind]) : t('boost.' + kind + '.d')}</div></div><button class="buy ad" data-act="ad:${kind}">${icon('play', 22)}${t('boost.watch')}</button></div>`;
    return card('income', 'coins') + card('speed', 'bolt') + `<div class="note">${icon('check', 20)}<span>${t('boost.note')}</span></div>`;
  }

  private mapBody(s: GameState): string {
    const count = Math.max(6, s.city + 2);
    let html = '<div class="map">';
    for (let c = 0; c < count; c++) {
      const theme = E.themeOf(c);
      const lap = c === 0 ? 0 : Math.floor((c - 1) / 5);
      const name = t('city.' + theme) + (lap > 0 ? ' ' + '+'.repeat(lap) : '');
      const state = c < s.city ? 'done' : c === s.city ? 'cur' : 'lock';
      const prog = E.chainProgress(s);
      const sub =
        state === 'done'
          ? t('world.done')
          : state === 'cur'
            ? `${t('tier.' + TIERS[s.tier].id)} · ${t('world.tier', { n: s.tier + 1 })}<div class="bar"><i style="width:${((s.tier + prog.done / prog.total) / TIERS.length) * 100}%"></i></div>`
            : c === s.city + 1
              ? `×${fmt(E.cityIncome(c) / E.cityIncome(s.city))} ${icon('coins', 16)}`
              : t('world.locked');
      html += `<div class="city ${state} th-${theme}"><div class="city-dot">${icon(state === 'done' ? 'check' : state === 'lock' ? 'lock' : THEME_ICON[theme], 34)}</div><div class="city-main"><div class="row-title">${name}${state === 'cur' ? ` <small>${t('world.here')}</small>` : ''}</div><div class="row-sub">${sub}</div></div></div>`;
    }
    return html + '</div>';
  }

  private prestigeBody(s: GameState): string {
    if (!s.features.prestige && s.stars === 0 && s.starsSpent === 0) return `<div class="note">${icon('lock', 22)}<span>${t('prestige.locked')}</span></div>`;
    const gain = E.starsOnPrestige(s);
    const ok = gain >= B.prestige.minStars;
    const node = (id: StarId, ic: string): string => {
      const lv = s.starTree[id];
      const def = B.stars[id];
      const maxed = lv >= def.max;
      const avail = E.starAvailable(s, id);
      const cost = E.starCost(id, lv);
      const can = avail && !maxed && s.stars >= cost;
      return `<button class="node ${avail ? '' : 'lock'} ${can ? 'can' : ''} ${lv > 0 ? 'has' : ''}" data-act="star:${id}"><div class="node-ic">${icon(avail ? ic : 'lock', 34)}</div><div class="node-name">${t('star.' + id)}</div><div class="node-sub">${t('star.' + id + '.d')}</div><div class="node-foot"><span>${t('lvl', { n: lv })}</span>${maxed ? `<b>${t('max')}</b>` : `<b>${icon('star', 14)}${cost}</b>`}</div></button>`;
    };
    return (
      `<div class="prestige-card"><div class="prestige-gain">${icon('star', 46)}<div><small>${t('prestige.gain')}</small><b>+${fmt(gain)}</b></div></div>` +
      `<button class="buy big ${ok ? 'can' : 'off'}" data-act="prestige:1">${icon('sell', 24)}${t('prestige.do')}</button>` +
      `<div class="row-sub center">${ok ? t('prestige.info') : t('prestige.need', { n: B.prestige.minStars })}</div></div>` +
      `<div class="group">${icon('star', 22)}<span>${t('prestige.tree')}</span><b>${fmt(s.stars)}</b></div>` +
      `<div class="tree"><div class="tree-row one">${node('income', 'coins')}</div><div class="tree-row">${node('speed', 'bolt')}${node('capacity', 'box')}</div><div class="tree-row">${node('offlineCap', 'clock')}${node('offlineRate', 'gift')}</div><div class="tree-row">${node('startCash', 'cash')}${node('vip', 'crown')}</div></div>`
    );
  }

  private settingsBody(s: GameState): string {
    const tog = (k: 'music' | 'sfx' | 'haptics', ic: string): string =>
      `<div class="row"><div class="row-ic">${icon(ic, 36)}</div><div class="row-main"><div class="row-title">${t('settings.' + k)}</div></div><button class="switch ${s.settings[k] ? 'on' : ''}" data-act="toggle:${k}"><i></i></button></div>`;
    return (
      tog('music', 'music') +
      tog('sfx', 'sound') +
      tog('haptics', 'vibrate') +
      `<div class="row"><div class="row-ic">${icon('lang', 36)}</div><div class="row-main"><div class="row-title">${t('settings.lang')}</div></div><div class="seg"><button class="${s.settings.lang === 'fr' ? 'on' : ''}" data-act="lang:fr">FR</button><button class="${s.settings.lang === 'en' ? 'on' : ''}" data-act="lang:en">EN</button></div></div>` +
      ('requestFullscreen' in document.documentElement ? `<div class="row"><div class="row-ic">${icon('hotel', 36)}</div><div class="row-main"><div class="row-title">${t('settings.fullscreen')}</div></div><button class="buy can" data-act="fullscreen:1">${t('ok')}</button></div>` : '') +
      `<div class="row"><div class="row-ic">${icon('trash', 36)}</div><div class="row-main"><div class="row-title">${t('settings.reset')}</div></div><button class="buy danger" data-act="reset:1">${t('ok')}</button></div>` +
      `<div class="version">${CONFIG.title} · v${__APP_VERSION__}</div>`
    );
  }

  // -------------------------------------------------------------- modales
  private modal(html: string, acts: Record<string, () => void>): void {
    this.modalAct = acts;
    this.modalEl.innerHTML = `<div class="scrim"></div><div class="modal">${html}</div>`;
    this.modalEl.classList.add('on');
  }
  private closeModal(): void {
    this.modalEl.classList.remove('on');
    this.modalEl.innerHTML = '';
    this.modalAct = {};
  }
  confirm(text: string, ic: string, yes: () => void): void {
    this.modal(`<div class="modal-ic">${icon(ic, 64)}</div><p>${text}</p><div class="modal-btns"><button class="buy ghost" data-act="modal:no">${t('no')}</button><button class="buy can" data-act="modal:yes">${t('yes')}</button></div>`, {
      no: () => {
        audio.tap();
        this.closeModal();
      },
      yes: () => {
        this.closeModal();
        yes();
      },
    });
  }
  /** Retour de pause : gains hors-ligne, ×2 optionnel via pub récompensée. */
  offline(amount: number, seconds: number, cap: number): void {
    const g = this.game;
    this.modal(
      `<div class="modal-ic bounce">${icon('clock', 64)}</div><h2>${t('offline.title')}</h2><p>${t('offline.body', { t: fmtTime(Math.min(seconds, cap)) })}<br><small>${t('offline.cap', { t: fmtTime(cap) })}</small></p><div class="offline-amount">${icon('cash', 34)}<b>${money(amount)}</b></div><div class="modal-btns"><button class="buy can" data-act="modal:take">${t('offline.collect')}</button><button class="buy ad" data-act="modal:double">${icon('play', 22)}${t('offline.double')}</button></div>`,
      {
        take: () => {
          this.closeModal();
          g.grant(amount);
        },
        double: () => {
          void this.watchAd('offline_x2', () => {
            this.closeModal();
            g.grant(amount * 2);
          });
        },
      },
    );
  }
  get blocking(): boolean {
    return this.modalEl.classList.contains('on');
  }
}
