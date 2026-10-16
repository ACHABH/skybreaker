'use strict';
/* ============================================================
   SKYBREAK — core utilities, audio, save data, material table
   ============================================================ */
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function mulberry(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const fmtTime = s => { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------------- save data (per-viewer convenience only) ---------------- */
const Save = {
  d: { stars: {}, best: {}, endless: 0, trail: 0, trails: [0], quality: 'high', sound: true, ghost: {} },
  load() { try { const r = localStorage.getItem('skybreak.v1'); if (r) Object.assign(this.d, JSON.parse(r)); } catch (e) { } },
  save() { try { localStorage.setItem('skybreak.v1', JSON.stringify(this.d)); } catch (e) { } }
};

/* ---------------- audio (WebAudio synth, starts after first click) ---------------- */
const Sfx = {
  ctx: null, master: null, noiseBuf: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate; this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },
  ok() { return this.ctx && Save.d.sound; },
  noise(vol, dur, f0, f1, type) {
    if (!this.ok()) return; const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; const f = c.createBiquadFilter(); f.type = type || 'lowpass';
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random() * 0.5, dur + 0.05);
  },
  tone(freq, dur, vol, type, slide) {
    if (!this.ok()) return; const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  boom(size) { this.noise(0.55 * size, 0.5 + size * 0.5, 900, 60); this.tone(90, 0.5, 0.45 * size, 'sine', 30); },
  crack() { this.noise(0.22, 0.18, 2400, 300, 'bandpass'); },
  hit(mat) { this.noise(0.28, 0.1, mat === 'rock' ? 3000 : 1800, 200, 'bandpass'); this.tone(mat === 'rock' ? 220 : 140, 0.08, 0.12, 'square', 70); },
  swing() { this.noise(0.1, 0.12, 1400, 400, 'bandpass'); },
  chime(n) { const base = 520 * Math.pow(1.122, n || 0); this.tone(base, 0.25, 0.18, 'triangle'); this.tone(base * 1.5, 0.35, 0.12, 'sine'); },
  fire() { this.noise(0.12, 0.35, 1200, 200); },
  zap() { this.noise(0.4, 0.3, 6000, 400, 'highpass'); this.tone(60, 0.35, 0.3, 'sawtooth', 30); },
  whoosh() { this.noise(0.2, 0.4, 300, 1800, 'bandpass'); },
  firework() { this.noise(0.2, 0.5, 5000, 700, 'highpass'); this.tone(900, 0.4, 0.1, 'sine', 300); },
  alarm() { this.tone(660, 0.12, 0.15, 'square'); setTimeout(() => this.tone(660, 0.12, 0.15, 'square'), 160); },
  rumble() { this.noise(0.5, 1.6, 400, 40); this.tone(48, 1.4, 0.4, 'sine', 25); }
};

/* ---------------- material table ----------------
   hpK: hit points per cubic unit (structures)   dens: mass density (for falling impacts)
   hm/pm: hammer / pickaxe multipliers           bl: blast multiplier      flam: flammability */
const MAT = {
  grass: { hm: .8, pm: 1.6, bl: 1, dens: 2, flam: .1 },
  dirt: { hm: .6, pm: 1.7, bl: 1, dens: 2.2, flam: 0 },
  rock: { hm: .45, pm: 2.2, bl: .9, dens: 2.6, hpK: 15, flam: 0 },
  basalt: { hm: .4, pm: 2.1, bl: .85, dens: 2.9, hpK: 17, flam: 0 },
  obsidian: { hm: .3, pm: 1.5, bl: .8, dens: 3, hpK: 24, flam: 0 },
  wood: { hm: 1.4, pm: .9, bl: 1.1, dens: .7, hpK: 32, flam: 1 },
  leaf: { hm: 1.6, pm: 1.2, bl: 1.3, dens: .25, hpK: 16, flam: 1 },
  ice: { hm: 1.1, pm: 1.7, bl: 1.2, dens: 1, hpK: 12, flam: 0, shatter: 1 },
  snow: { hm: 1.6, pm: 1.2, bl: 1.2, dens: .5, hpK: 8, flam: 0 },
  sand: { hm: 1.6, pm: 1.2, bl: 1.2, dens: 1.2, hpK: 7, flam: .15, slump: 1 },
  sandstone: { hm: .8, pm: 1.8, bl: 1, dens: 2, hpK: 15, flam: 0 },
  crystal: { hm: 1, pm: 1.4, bl: 1, dens: 1.5, hpK: 20, flam: 0, crystal: 1 },
  coral: { hm: 1.2, pm: 1.2, bl: 1.1, dens: 1, hpK: 18, flam: 0 },
  stone: { hm: .5, pm: 2, bl: .9, dens: 2.4, hpK: 14, flam: 0 },
  barrel: { hm: 1.5, pm: 1.2, bl: 1.5, dens: 1, hpK: 10, flam: .6 },
  core: { hm: 1, pm: 1, bl: .6, dens: 2, hpK: 40, flam: 0 }
};

/* ---------------- items ---------------- */
const ITEMS = {
  megabomb: { name: 'Mega Bomb', icon: '💣', uses: 2, cd: 1.0, aim: 1, explosive: 1, desc: 'Huge area explosion. Best against dense structures.',
    secret: { name: 'CLUSTER STORM', mode: 'press', text: 'Press Q to launch five mega bombs.' } },
  lightning: { name: 'Lightning Rod', icon: '⚡', uses: 1, cd: 1.0, aim: 1, explosive: 1, desc: 'Plant a rod. It calls down repeated lightning strikes.',
    secret: { name: 'THUNDERGOD', mode: 'hold', text: 'Hold Q + RMB to strike wherever you aim.' } },
  titan: { name: 'Titan Hammer', icon: '🔨', uses: 14, cd: .7, aim: 0, desc: 'Giant hammer. Every swing crushes a wide area.',
    secret: { name: 'SEISMIC SLAM', mode: 'press', text: 'Press Q to send a shockwave across the island.' } },
  gravity: { name: 'Gravity Gun', icon: '🌀', uses: 2, cd: 1.0, aim: 1, desc: 'Rips structures loose and pulls them into one tight cluster.',
    secret: { name: 'SINGULARITY', mode: 'press', text: 'Press Q to pull the whole island into one point, then detonate it.' } },
  tornado: { name: 'Tornado', icon: '🌪️', uses: 1, cd: 1.0, aim: 1, desc: 'A twister that wanders the island and tears apart what it touches.',
    secret: { name: 'OVERDRIVE', mode: 'hold', text: 'Hold Q + RMB. A giant tornado follows your crosshair.' } },
  meteor: { name: 'Meteor', icon: '☄️', uses: 2, cd: 1.0, aim: 1, explosive: 1, desc: 'Single huge impact. Leaves a deep crater.',
    secret: { name: 'APOCALYPSE', mode: 'press', text: 'Press Q to call down a meteor shower.' } },
  freeze: { name: 'Freeze Ray', icon: '❄️', uses: 3, cd: .8, aim: 1, desc: 'Freezes structures. Frozen pieces take far more damage.',
    secret: { name: 'ABSOLUTE ZERO', mode: 'press', text: 'Press Q to freeze the entire island.' } },
  saw: { name: 'Saw Drone', icon: '⚙️', uses: 1, cd: 1.0, aim: 1, desc: 'Flies on its own and shreds structures while you work elsewhere.',
    secret: { name: 'SWARM', mode: 'press', text: 'Press Q to release a swarm of six drones.' } },
  inferno: { name: 'Inferno', icon: '🔥', uses: 2, cd: 1.0, aim: 1, desc: 'A spreading fire. Devastating on wood, leaves and sand.',
    secret: { name: 'WILDFIRE', mode: 'press', text: 'Press Q to ignite fires across the whole island.' } }
};
const ITEM_IDS = Object.keys(ITEMS);
const BOT_PREF = ['meteor', 'megabomb', 'tornado', 'titan', 'lightning', 'gravity', 'inferno', 'saw', 'freeze'];

/* ---------------- island registry (visual + mechanic identity) ---------------- */
const ISLANDS = {
  verdantia: { name: 'Verdantia', sub: 'Forest Island', icon: '🌲', blurb: 'Huge trees, treehouses and wooden huts. Soft materials and tangled roots make it the friendliest island.', tags: ['Beginner friendly', 'Wood & leaves', 'Roots link structures'],
    grad: ['#6fd36a', '#2b8f6b'], sky: [0x4aa8ff, 0xd5f0ff], fog: 0xcfeeff, sun: 0xfff0cf, hemi: [0xbfe3ff, 0x4a7a3a], level: 'Easy' },
  ignis: { name: 'Ignis', sub: 'Volcano Island', icon: '🌋', blurb: 'Tough basalt, lava channels and volatile magma sacs. Eruptions rain fire on the island as the match goes on.', tags: ['Durable rock', 'Lava hazards', 'Volatile magma'],
    grad: ['#ff7a3d', '#4a1a3a'], sky: [0x2a1230, 0xff8a4a], fog: 0x7a3a3a, sun: 0xffb87a, hemi: [0xff9a70, 0x301820], level: 'Hard' },
  nivara: { name: 'Nivara', sub: 'Frozen Island', icon: '❄️', blurb: 'Fragile ice towers hold up heavy glacier slabs. Cut the right pillar and a whole wing falls.', tags: ['Brittle ice', 'Chain collapses', 'Support-based'],
    grad: ['#bfefff', '#5a7fe0'], sky: [0x6fa4ff, 0xeaf4ff], fog: 0xe3f0ff, sun: 0xffffff, hemi: [0xd6ecff, 0x7a8fb0], level: 'Medium' },
  aridia: { name: 'Aridia', sub: 'Desert Island', icon: '🏜️', blurb: 'Sandstone temples on weak foundations, loose dunes that slump, and one giant statue worth toppling.', tags: ['Sand slumps', 'Weak foundations', 'Big rewards'],
    grad: ['#ffd38a', '#c9733a'], sky: [0x3f9bd8, 0xffe6b8], fog: 0xffe6c0, sun: 0xffe2a8, hemi: [0xffe9c0, 0xa07040], level: 'Medium' },
  aquaris: { name: 'Aquaris', sub: 'Ocean Island', icon: '🌊', blurb: 'Pools, bridges, coral and tall water towers. Burst a tank and the flood washes bridges away.', tags: ['Floods', 'Bridges', 'Vertical play'],
    grad: ['#4fd8ff', '#1f7be0'], sky: [0x1f8fff, 0xc4f7ff], fog: 0xbff2ff, sun: 0xfffbe0, hemi: [0xbdf2ff, 0x2a7a8a], level: 'Medium' },
  noctyra: { name: 'Noctyra', sub: 'Mystic Island', icon: '🌌', blurb: 'Glowing crystals chain-detonate, ruins levitate on crystal stems, and the dark forest hums with energy.', tags: ['Crystal chains', 'Levitating ruins', 'Strange energy'],
    grad: ['#9b6bff', '#1c1450'], sky: [0x080722, 0x5a35a0], fog: 0x2d2060, sun: 0xb9a0ff, hemi: [0x7a64ff, 0x120c30], level: 'Hard' }
};
const ISLAND_ORDER = ['verdantia', 'ignis', 'nivara', 'aridia', 'aquaris', 'noctyra'];
