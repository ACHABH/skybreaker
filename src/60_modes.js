/* =====================================================================
   SKYBREAK — game flow, modes, campaign, progression
   ===================================================================== */
const ISLAND_ORDER = ['verdantia', 'ignis', 'nivara', 'aridia', 'aquaris', 'noctyra'];
const ISLES = {
  verdantia: { name: 'Verdantia', sub: 'Forest Island', icon: '🌲', col: '#5fbf4a', desc: 'Huge trees, wooden huts and rope bridges. Soft materials, fire spreads fast.', tags: 'Beginner friendly · Wood · Fire' },
  ignis: { name: 'Ignis', sub: 'Volcano Island', icon: '🌋', col: '#ff6a2a', desc: 'Durable obsidian, lava channels, explosive vents and erupting volcano.', tags: 'Tough rock · Explosions · Eruptions' },
  nivara: { name: 'Nivara', sub: 'Frozen Island', icon: '❄️', col: '#8fd8ff', desc: 'Brittle ice on stilts. Cut the supports and whole glaciers fall.', tags: 'Fragile · Support collapse' },
  aridia: { name: 'Aridia', sub: 'Desert Island', icon: '🏜️', col: '#e8c987', desc: 'Sandstone ruins on weak foundations, giant statues, collapsing dunes.', tags: 'Weak foundations · Sand collapse' },
  aquaris: { name: 'Aquaris', sub: 'Ocean Island', icon: '🌊', col: '#3ad6ff', desc: 'Sky docks, bridges and a dam. Break it and the flood washes it all away.', tags: 'Flood · Vertical · Bridges' },
  noctyra: { name: 'Noctyra', sub: 'Mystic Island', icon: '🌌', col: '#b36bff', desc: 'Glowing crystals chain-explode. Ancient ruins, floating stones.', tags: 'Crystal chains · Mystery' }
};
const ITEM_ORDER = ['mega', 'titan', 'tornado', 'meteor', 'gravity', 'inferno', 'freeze', 'rod', 'saw'];
const MISSIONS = [
  { id: 'c1', ch: 'Chapter 1', name: 'Verdantia', island: 'verdantia', limit: 360, target: 270, goal: 100, pool: 3, teach: 'Movement, basic tools, structure collapse, chain reactions.', special: 'Use fewer than 5 major abilities', chk: (s) => s.major < 5, obj: 'Destroy the island.' },
  { id: 'c2', ch: 'Chapter 2', name: 'Aridia', island: 'aridia', limit: 270, target: 210, goal: 90, pool: 4, teach: 'Weak foundations and sand collapse.', special: 'Create a chain of x10 or higher', chk: (s) => s.chainMax >= 10, obj: 'Reach 90% destruction, fast.' },
  { id: 'b1', ch: 'Boss Island', name: 'The Ancient Forest', island: 'boss_forest', limit: 360, target: 240, goal: 100, pool: 5, teach: 'Trees regrow until you destroy the Heart Tree.', special: 'Finish without falling', chk: (s) => s.falls === 0, obj: 'Destroy the glowing Heart Tree.', boss: 'forest' },
  { id: 'c3', ch: 'Chapter 3', name: 'Nivara', island: 'nivara', limit: 270, target: 210, goal: 100, pool: 5, teach: 'Fragile ice and strategic collapse.', special: 'Create a chain of x15 or higher', chk: (s) => s.chainMax >= 15, obj: 'Destroy the island, maximise chains.' },
  { id: 'c4', ch: 'Chapter 4', name: 'Aquaris', island: 'aquaris', limit: 300, target: 240, goal: 95, pool: 6, teach: 'Water, vertical traversal, bridges and platforms.', special: 'Finish without falling', chk: (s) => s.falls === 0, obj: 'Reach 95% destruction.' },
  { id: 'b2', ch: 'Boss Island', name: 'The Living Volcano', island: 'boss_volcano', limit: 300, target: 210, goal: 100, pool: 7, teach: 'Destroy three volcanic cores before the lava rises.', special: 'Use only 3 major abilities', chk: (s) => s.major <= 3, obj: 'Destroy all 3 volcanic cores.', boss: 'volcano' },
  { id: 'c5', ch: 'Chapter 5', name: 'Ignis', island: 'ignis', limit: 300, target: 240, goal: 100, pool: 7, teach: 'Lava, explosions, escalating eruptions.', special: 'Use only 3 major abilities', chk: (s) => s.major <= 3, obj: 'Destroy the island before the final eruption.' },
  { id: 'c6', ch: 'Chapter 6', name: 'Noctyra', island: 'noctyra', limit: 300, target: 240, goal: 100, pool: 8, teach: 'Crystal chains and strange reactions.', special: 'Create a chain of x15 or higher', chk: (s) => s.chainMax >= 15, obj: 'Destroy the mystic island.' },
  { id: 'b3', ch: 'Boss Island', name: 'The Void Island', island: 'boss_void', limit: 330, target: 270, goal: 90, pool: 9, teach: 'Terrain vanishes and returns. Plan your movement.', special: 'Finish without falling', chk: (s) => s.falls === 0, obj: 'Reach 90% while the ground blinks out.', boss: 'void' }
];
const CHALLENGES = [
  { id: 'bare', name: 'Bare Hands', icon: '✊', desc: 'Only the basic kit. No item drops.', time: 240, drafts: [], pool: [] },
  { id: 'demo', name: 'Demolition Expert', icon: '💥', desc: 'Only explosive abilities, bombs and blasts.', time: 300, drafts: [30, 80, 130, 180], pool: ['mega', 'meteor', 'rod'], kit: ['bomb', 'grapple', 'dash'] },
  { id: 'speed', name: 'Speed Break', icon: '⏱️', desc: 'Destroy as much as you can in 90 seconds.', time: 90, drafts: [12, 32, 52], pool: ITEM_ORDER, score: 'pct' },
  { id: 'onehit', name: 'One Hit', icon: '☝️', desc: 'Every major tool can only be used once.', time: 300, drafts: [40, 80, 120, 160], pool: ITEM_ORDER, itemUses: 1 },
  { id: 'chaos', name: 'Chaos Mode', icon: '🎲', desc: 'Your equipment changes randomly every 15 seconds.', time: 300, drafts: [], pool: ITEM_ORDER, chaos: true },
  { id: 'storm', name: 'Storm', icon: '⛈️', desc: 'Constant meteors, lightning and quakes batter you and the island.', time: 300, drafts: [50, 110, 170], pool: ITEM_ORDER, level: .85 },
  { id: 'falling', name: 'Falling Island', icon: '🍂', desc: 'The island is crumbling. Break it yourself before it falls on its own.', time: 240, drafts: [30, 80, 130], pool: ITEM_ORDER, falling: true }
];
const HATS = [{ id: 0xffd45a, name: 'Gold', need: 0 }, { id: 0xff4d6d, name: 'Crimson', need: 3 }, { id: 0x5be7ff, name: 'Aether', need: 8 }, { id: 0xc27bff, name: 'Violet', need: 14 }, { id: 0xffffff, name: 'Ivory', need: 22 }];
const BODIES = [{ id: 0x4aa8ff, name: 'Azure', need: 0 }, { id: 0xff9a3c, name: 'Amber', need: 1 }, { id: 0x9dff6b, name: 'Lime', need: 5 }, { id: 0xff6bb5, name: 'Rose', need: 10 }, { id: 0x2c3350, name: 'Midnight', need: 18 }];
const TRAILS = [{ id: 'none', name: 'None', need: 0, col: 0 }, { id: 'ember', name: 'Ember', need: 5, col: 0xff7a2a }, { id: 'aqua', name: 'Aqua', need: 11, col: 0x5be7ff }, { id: 'spirit', name: 'Spirit', need: 20, col: 0xc27bff }];
const Save = {
  d: Object.assign({ stars: {}, best: {}, wins: 0, plays: 0, cos: { body: 0x4aa8ff, hat: 0xffd45a, trail: 'none' }, sens: 1, vol: .6, unlockAll: false, endless: 0 }, store.get('prog', {})),
  save() { store.set('prog', this.d); },
  total() { return Object.values(this.d.stars).reduce((a, b) => a + b, 0); },
  unlocked(i) { return this.d.unlockAll || i === 0 || (this.d.stars[MISSIONS[i - 1].id] || 0) >= 1; }
};
Game.sens = Save.d.sens; Snd.vol = Save.d.vol; P.fp = !!Save.d.fp;

/* ---------- session management ---------- */
Game.bots = []; Game.decor = []; Game.ghost = null; Game.rec = null; Game.draft = null; Game.sched = []; Game.cine = null; Game.menuIsland = null;
Game.clear = function () {
  clearEffects();
  for (const I of Game.islands) I.dispose(); Game.islands = [];
  if (Game.menuIsland) { Game.menuIsland.dispose(); Game.menuIsland = null; }
  for (const b of Game.bots) b.dispose(); Game.bots = [];
  for (const d of Game.decor) { scene.remove(d); d.traverse(m => { if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); }); } Game.decor = [];
  for (let i = 0; i < debris.max; i++) if (debris.life[i] > 0) debris.kill(i);
  for (const ps of [glowP, dustP]) ps.life.fill(0);
  if (P.avatar) { scene.remove(P.avatar); P.avatar = null; }
  if (Game.ghost && Game.ghost.av) { scene.remove(Game.ghost.av); } Game.ghost = null;
  if (Game.lavaSea) { scene.remove(Game.lavaSea); Game.lavaSea = null; }
  Game.removeFloor(); Game.floorBreak = null;
  if (P.ropeLine) P.ropeLine.visible = false;
  GRAV.scale = 1; P.windX = P.windZ = 0; Game.cine = null; Game.draft = null; Game.draftKeys = false;
};
function mkIsland(kind, cx, cy, cz, far) {
  const I = buildIsland(kind, cx, cy, cz, {}); attachHazards(I);
  if (far) { I.fxScale = .35; for (const k in I.meshes) { I.meshes[k].castShadow = false; I.meshes[k].receiveShadow = false; } }
  Game.islands.push(I); return I;
}
function makeDecorIslands(n, spread) {
  for (let i = 0; i < n; i++) {
    const g = new T.Group(), a = i / n * 6.28 + Math.random(), r = spread * (.85 + Math.random() * .6), s = 5 + Math.random() * 9;
    const rock = new T.Mesh(new T.ConeGeometry(s, s * 1.6, 6), new T.MeshPhongMaterial({ color: 0x6c6a78, flatShading: true })); rock.rotation.x = Math.PI; rock.position.y = -s * .8;
    const top = new T.Mesh(new T.CylinderGeometry(s, s * 1.05, 1.2, 8), new T.MeshPhongMaterial({ color: pick([0x5fbf4a, 0x4aa86a, 0xc9b27a, 0xdaf0ff]), flatShading: true }));
    g.add(rock); g.add(top);
    if (Math.random() < .7) { const t = new T.Mesh(new T.ConeGeometry(1.4, 4, 6), new T.MeshPhongMaterial({ color: 0x2f8f4a, flatShading: true })); t.position.set(rnd(-s * .4, s * .4), 3, rnd(-s * .4, s * .4)); g.add(t); }
    g.position.set(Math.cos(a) * r, rnd(-12, 30), Math.sin(a) * r); g.userData.bob = Math.random() * 6; scene.add(g); Game.decor.push(g);
  }
}
Game.begin = function (cfg) {
  Snd.init(); Game.clear(); Game.cfg = cfg; Game.t = 0; Game.rounds = 0; Game.finished = false; Game.sched = []; Game.paused = false; Game.menuLock = false;
  const mode = cfg.mode; let kind = cfg.island === 'random' ? pick(ISLAND_ORDER) : cfg.island; cfg.kind = kind;
  let mission = null, chal = null;
  if (mode === 'campaign') { mission = MISSIONS[cfg.mission]; kind = mission.island; }
  if (mode === 'challenge') chal = CHALLENGES.find(c => c.id === cfg.challenge);
  Game.mission = mission; Game.chal = chal;
  Game.bots = [];
  if (mode === 'mp') {
    const kinds = [kind]; if (cfg.ranked) { for (const k of shuffle(ISLAND_ORDER.filter(k => k !== kind))) kinds.push(k); } else for (let i = 0; i < 5; i++) kinds.push(pick(ISLAND_ORDER));
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283, I = mkIsland(kinds[i], Math.cos(a) * 125, rnd(-6, 6) * (i ? 1 : 0), Math.sin(a) * 125, i > 0); I.owner = i === 0 ? 'YOU' : null; if (i > 0) { const b = new Bot(I, i - 1, cfg.diff || 'normal'); Game.bots.push(b); I.owner = b.name; setAvatarTool(b.av, 'bomb'); } }
    Game.pi = Game.islands[0]; makeDecorIslands(4, 230);
  } else { Game.pi = mkIsland(kind, 0, 0, 0, false); makeDecorIslands(7, 150); }
  const I = Game.pi; applyTheme(I.theme);
  Game.hearts = 3; Game.knockedOut = false; Game.floorBreak = null; P.floorT = 0; P.tpCd = 0; Game.addFloor(I);
  I.hooks.chain = n => { if (window.UI) UI.chain(n); };
  I.hooks.chainEnd = (n, lost) => { if (window.UI) UI.chainEnd(n, lost); };
  for (const x of Game.islands) x.hooks.destroyed = isl => Game.onIslandDestroyed(isl);
  P.avatar = makeAvatar(Save.d.cos.body, Save.d.cos.hat); scene.add(P.avatar);
  resetLoadout(); spawnPlayer(); if (mode === 'mp') { P.camYaw = Math.PI / 2; P.yaw = P.camYaw; }
  Game.rules = { time: 0, draftKind: 'choose', pool: ITEM_ORDER.slice(), level: null, final: 0, dir: 1 };
  const R = Game.rules;
  if (mode === 'mp') { R.time = 480; R.draftKind = 'race'; R.drafts = [120, 240, 360]; R.final = 420; R.esc = 420; R.pool = ITEM_ORDER; }
  else if (mode === 'solo') { R.time = 300; R.drafts = [60, 120, 180]; R.final = 240; R.esc = 240; }
  else if (mode === 'campaign') { R.time = mission.limit; R.drafts = [.2, .4, .6].map(f => Math.round(mission.limit * f)); R.final = mission.limit * .8; R.esc = R.final; R.pool = ITEM_ORDER.slice(0, mission.pool); R.goal = mission.goal; }
  else if (mode === 'challenge') { R.time = chal.time; R.drafts = chal.drafts.slice(); R.pool = chal.pool.slice(); R.final = chal.time * .8; R.esc = chal.time * .8; if (chal.level) R.level = chal.level; }
  else if (mode === 'endless') { R.time = 0; R.drafts = [30, 90, 150, 210, 270, 330, 390]; R.esc = 1e9; R.wave = 1; Game.reforming = 0; Game.waveScore = 0; }
  else if (mode === 'free') { R.time = 0; R.drafts = []; }
  if (chal && chal.kit) P.slots = P.slots.filter(s => chal.kit.includes(s.id));
  if (chal && chal.itemUses) R.itemUses = chal.itemUses;
  if (mode === 'free') for (const id of ITEM_ORDER) giveItem(id, 99999);
  Game.sched = (R.drafts || []).map((t, i) => ({ t, kind: 'draft' }));
  if (chal && chal.chaos) for (let t = 15; t < R.time; t += 15) Game.sched.push({ t, kind: 'chaos' });
  if (chal && chal.falling) Game.erode = { acc: 0 };
  Game.ghost = null; Game.rec = null;
  if (mode === 'solo' || mode === 'campaign') {
    const key = Game.pbKey(); const g = store.get('ghost:' + key, null);
    if (g) { Game.ghost = { data: g.d, time: g.time, av: makeAvatar(0xffffff, 0xffffff, true) }; scene.add(Game.ghost.av); }
    Game.rec = [];
  }
  if (mission && mission.boss) Game.initBoss(mission.boss);
  Game.t0real = performance.now(); Game.state = 'intro'; Game.introT = 0; Input.captureWanted = true; Input.lockFailed = false;
  if (canvas.requestPointerLock) { try { const pr = canvas.requestPointerLock(); if (pr && pr.catch) pr.catch(() => { }); } catch (e) { } }
  Game.hint = mode === 'mp' ? 'Destroy your island before anyone else does' : (mission ? mission.obj : mode === 'free' ? 'Sandbox: unlimited everything. R = reset island.' : mode === 'endless' ? 'Survive. Three falls and the run ends.' : 'Destroy 100% of the island');
  if (window.UI) UI.startGame();
};
Game.pbKey = function () { const c = Game.cfg; return c.mode + ':' + (c.mode === 'campaign' ? Game.mission.id : c.kind); };
Game.initBoss = function (b) {
  const I = Game.pi;
  if (b === 'volcano') {
    I.cores = I.cores || []; let dead = 0; I.hooks.kill = (p) => { if (p.core) { dead++; UI.toast('VOLCANIC CORE DESTROYED  ' + dead + '/3', 'good'); if (dead >= 3) Game.finish(true, 'All three cores destroyed'); } };
    const sea = new T.Mesh(new T.CylinderGeometry(I.R0 * VX * 1.6, I.R0 * VX * 1.6, 1, 28), new T.MeshBasicMaterial({ color: 0xff5a1a })); scene.add(sea); Game.lavaSea = sea; I.bossHud = () => '🌋 CORES ' + dead + '/3';
  } else if (b === 'forest') {
    I.hooks.kill = (p) => { if (p.heart) Game.finish(true, 'The Heart Tree has fallen'); };
    I.bossHud = () => '🌳 HEART TREE ' + (I.pieces.some(p => p.heart && p.alive) ? 'ALIVE' : 'DOWN');
    I.updaters.push((dt, t) => {
      I._rg = (I._rg || 0) - dt; if (I._rg > 0) return; I._rg = 1;
      const old = I.dead.filter(d => !d.p.alive && d.p.regrow && t - d.t > 11); if (!old.length) return;
      const gs = new Set(old.map(d => d.p.g)); for (const g of gs) { const grp = I.groups[g]; if (!grp) continue; for (const p of grp.pieces) if (!p.alive && p.regrow) { I.revive(p); } Fx.dust(grp.pieces[0].x, grp.pieces[0].y, grp.pieces[0].z, 10, 0x6fdc6a, 3, 1.2); }
      I.dead = I.dead.filter(d => !d.p.alive);
    });
  } else if (b === 'void') {
    const secs = [[], [], [], [], [], []]; for (const p of I.pieces) if (p.voidSec !== undefined) secs[p.voidSec].push(p);
    I.bossHud = () => '🌀 THE GROUND BLINKS';
    I.updaters.push((dt, t) => {
      for (let s = 0; s < 6; s++) {
        const ph = (t + s * 1.5) % 9, hid = ph >= 6, warn = ph >= 5 && ph < 6; const L = secs[s];
        if (hid !== L.hid) { L.hid = hid; for (const p of L) I.setPhased(p, hid); if (hid && s === 0) Snd.play('whoosh', .3); }
        if (warn) { L.wt = (L.wt || 0) - dt; if (L.wt <= 0) { L.wt = .22; for (const p of L) if (p.alive) { p.flash = .12; I.flashing.add(p); I.refreshColor(p); } } }
      }
    });
  }
};
Game.restartMenuScene = function (kind) {
  if (Game.menuIsland) { Game.menuIsland.dispose(); Game.menuIsland = null; }
  Game.menuKind = kind; const I = buildIsland(kind, 0, 0, 0, {}); Game.menuIsland = I; I.fxScale = .5;
  applyTheme(kind === 'title' ? 'menu' : I.theme);
};
Game.showMenu = function (kind) {
  Game.clear(); Game.state = 'menu'; Input.captureWanted = false; if (document.exitPointerLock) try { document.exitPointerLock(); } catch (e) { }
  Game.restartMenuScene(kind || 'verdantia'); applyTheme('menu'); makeDecorIslands(6, 120);
  Game.pi = null; camera.fov = 60; camera.updateProjectionMatrix();
};
/* ---------- drafts ---------- */
Game.startDraft = function () {
  const R = Game.rules, race = R.draftKind === 'race', n = race ? 6 : 3;
  const pool = shuffle(R.pool.slice()); if (!pool.length) return; const items = pool.slice(0, Math.min(n, pool.length));
  const secret = Math.random() < .55 ? pick(items) : null;
  const d = { race, items, taken: {}, secret, t0: Game.t, dur: 13, round: ++Game.rounds, plans: [], picked: false, closed: false };
  if (race) {
    for (const b of Game.bots) d.plans.push({ b, at: rnd(.9, 4.4) / b.skill, done: false });
  }
  Game.draft = d; Game.draftKeys = true; Snd.play('drop', 1);
  if (window.UI) { UI.banner('ITEM DROP #' + d.round, race ? 'First come, first served. Press 1-' + items.length : 'Choose one. Press 1-' + items.length, 2200); UI.showDraft(d); }
};
function botChoose(b, d) {
  const th = THEME_BOOST[b.I.theme] || {}; let best = null, bs = -1;
  for (const id of d.items) { if (d.taken[id]) continue; const s = (ITEM_W[id] || 1) * (th[id] || 1) * (.7 + Math.random() * .6) + (id === d.secret ? Math.random() * .3 : 0); if (s > bs) { bs = s; best = id; } }
  return best;
}
Game.claimItem = function (id, by, isMe, bot) {
  const d = Game.draft; d.taken[id] = { by, me: isMe };
  if (isMe) {
    let uses = Game.rules.itemUses || undefined; const s = giveItem(id, uses); P.sel = P.slots.indexOf(s); Game.pi.stats.items++; d.picked = true;
    if (id === d.secret) giveSecret(id); else { Snd.play('pick', 1); UI.toast('Got ' + ITEMS[id].name.toUpperCase(), 'good'); }
  } else if (bot) bot.claim(id, id === d.secret);
  if (window.UI) UI.updateDraft(d);
};
Game.pickDraft = function (i) {
  const d = Game.draft; if (!d || d.closed || d.picked) return; const id = d.items[i]; if (!id || d.taken[id]) return;
  Game.claimItem(id, 'YOU', true);
  if (!d.race) setTimeout(() => Game.closeDraft(), 1400);
};
Game.closeDraft = function () {
  const d = Game.draft; if (!d || d.closed) return; d.closed = true; Game.draftKeys = false;
  if (!d.picked) { const left = d.items.filter(id => !d.taken[id]); if (left.length) { d.closed = false; Game.claimItem(pick(left), 'YOU', true); d.closed = true; } }
  for (const p of d.plans) if (!p.done) { const id = botChoose(p.b, d); if (id) Game.claimItem(id, p.b.name, false, p.b); }
  if (window.UI) UI.hideDraft(); Game.draft = null;
};
/* ---------- end / results ---------- */
Game.onIslandDestroyed = function (isl) {
  if (Game.state !== 'play' || Game.finished) return;
  const mode = Game.cfg.mode;
  if (mode === 'mp') { Game.finish(isl === Game.pi, isl === Game.pi ? 'You destroyed your island!' : (isl.owner + ' destroyed their island first'), isl); }
  else if (isl === Game.pi) {
    if (mode === 'endless') { Game.reforming = 1; Game.waveScore += 500; UI.toast('ISLAND DOWN  +500  — it reforms…', 'good'); isl.destroyed = false; return; }
    if (mode === 'free') { isl.destroyed = false; UI.toast('Island destroyed. Press R to rebuild.', 'good'); return; }
    if (Game.chal && Game.chal.falling && isl.stats.weightKilled / isl.totalW < .5) { Game.finish(false, 'The island fell apart on its own'); return; }
    if (Game.mission && Game.mission.boss) { isl.destroyed = false; return; }
    Game.finish(true, 'Island destroyed');
  }
};
Game.finish = function (win, reason, winnerIsl) {
  if (Game.finished) return; Game.finished = true; Game.state = 'ended'; Game.draftKeys = false; if (window.UI) UI.hideDraft();
  Input.captureWanted = false; Input.mouse.l = Input.mouse.r = false; if (document.exitPointerLock) try { document.exitPointerLock(); } catch (e) { }
  const I = Game.pi, mode = Game.cfg.mode, isl = winnerIsl || I;
  const destroyed = isl.integrity() <= THRESH + .01 || isl.destroyed;
  if (destroyed && win !== false || (mode === 'mp' && destroyed)) { isl.finalCollapse(); Snd.play('bigboom', 1); }
  Game.cine = { I: isl, t: 0 }; camShake.v = .8;
  if (isl === I && destroyed && win && I.floor) Game.floorBreak = { t: 0, done: false };
  const res = Game.buildResults(win, reason, winnerIsl); res.revenge = !!Game.floorBreak;
  setTimeout(() => { if (Game.state === 'ended') { UI.showResults(res); Snd.play(res.win ? 'win' : 'lose', .8); } }, 4800);
  if (window.UI) UI.banner(win ? (mode === 'mp' ? 'VICTORY' : 'COMPLETE') : (reason && reason.startsWith('Time') ? "TIME'S UP" : mode === 'mp' ? 'DEFEAT' : 'FAILED'), reason, 4000);
};
Game.buildResults = function (win, reason, winnerIsl) {
  const I = Game.pi, st = I.stats, mode = Game.cfg.mode, t = Game.t, pct = 100 - I.integrity();
  const res = { win, reason, mode, title: win ? 'VICTORY' : 'DEFEATED', rows: [], stars: null, table: null, awards: [], newBest: [] };
  const fmtp = v => Math.round(v) + '%';
  const rowsFor = (S, isl, time) => [['Island destroyed', fmtp(100 - isl.integrity())], ['Time', fmtP(time)], ['Structures destroyed', S.pieces], ['Longest chain', 'x' + S.chainMax], ['Largest collapse', fmtp(S.collapseMax)], ['Items claimed', S.items], ['Secret Power', S.secret ? 'YES' : 'NO']];
  Save.d.plays++;
  if (mode === 'mp') {
    const all = [{ name: 'YOU', isl: I, me: true }, ...Game.bots.map(b => ({ name: b.name, isl: b.I, bot: b }))];
    all.forEach(a => { a.dmg = 100 - a.isl.integrity(); a.score = a.isl.stats.score; });
    const winner = winnerIsl ? all.find(a => a.isl === winnerIsl) : all.slice().filter(a => !(Game.knockedOut && a.me)).sort((a, b) => (b.dmg - a.dmg) || (b.score - a.score))[0];
    res.win = winner.me; res.title = winner.me ? 'VICTORY' : 'DEFEAT'; res.winner = winner.name;
    res.reason = Game.knockedOut ? 'You ran out of hearts. ' + winner.name + ' takes the win.' : winnerIsl ? (winner.me ? 'You destroyed your island first!' : winner.name + ' destroyed their island first') : (winner.me ? 'Time expired. You had the most destruction.' : 'Time expired. ' + winner.name + ' had the most destruction.');
    res.rows = rowsFor(winner.isl.stats, winner.isl, t); res.rowsTitle = winner.name === 'YOU' ? 'YOU' : winner.name;
    res.table = all.slice().sort((a, b) => b.dmg - a.dmg).map((a, i) => ({ rank: i + 1, name: a.name, kind: ISLES[a.isl.kind] ? ISLES[a.isl.kind].name : a.isl.kind, dmg: fmtp(a.dmg), chain: 'x' + a.isl.stats.chainMax, me: a.me, win: a === winner }));
    const best = (f) => all.slice().sort((a, b) => f(b) - f(a))[0];
    res.awards = [['Fastest Breaker', best(a => a.isl.stats.pieces + a.isl.stats.terrain * .5 - (a.isl.stats.score * 0) ).name, 'most early destruction'], ['Destruction Master', best(a => a.isl.stats.pieces).name, best(a => a.isl.stats.pieces).isl.stats.pieces + ' structures'], ['Longest Chain', best(a => a.isl.stats.chainMax).name, 'x' + best(a => a.isl.stats.chainMax).isl.stats.chainMax], ['Biggest Collapse', best(a => a.isl.stats.collapseMax).name, fmtp(best(a => a.isl.stats.collapseMax).isl.stats.collapseMax)]];
    const sh = all.filter(a => a.isl.stats.secret); res.awards.push(['Secret Hunter', sh.length ? sh.map(a => a.name).join(', ') : 'nobody', sh.length ? 'found a Secret Power' : '']);
    if (res.win) Save.d.wins++;
  } else if (mode === 'solo' || mode === 'campaign') {
    const m = Game.mission, key = Game.pbKey();
    if (m) { res.title = win ? 'MISSION COMPLETE' : 'MISSION FAILED'; res.mname = m.ch + ' · ' + m.name; }
    else res.title = win ? '100% DESTROYED' : 'TIME EXPIRED';
    res.rows = [['Time', fmtP(t)], ['Island damage', fmtp(pct)], ['Structures', st.pieces], ['Chain reaction', 'x' + st.chainMax], ['Largest collapse', fmtp(st.collapseMax)], ['Tools used', st.tools + st.major], ['Secret power', st.secret ? 'YES' : 'NO'], ['Falls', st.falls]];
    let stars = 0;
    if (win) { stars = 1; if (!m || t <= m.target) { if (m) { stars = 2; if (m.chk(st, t)) stars = 3; } else { stars = t <= 270 ? 2 : 1; if (t <= 270 && st.falls === 0 && st.major < 5) stars = 3; } } }
    res.stars = stars;
    if (m) { res.starRows = [['Complete the mission', win], ['Under ' + fmt(m.target), win && t <= m.target], [m.special, win && t <= m.target && m.chk(st, t)]]; }
    else res.starRows = [['Destroy the island', win], ['Under 4:30', win && t <= 270], ['No falls and under 5 major abilities', win && t <= 270 && st.falls === 0 && st.major < 5]];
    if (m) { if ((Save.d.stars[m.id] || 0) < stars) Save.d.stars[m.id] = stars; }
    const b = Save.d.best[key] || {};
    if (win && (!b.time || t < b.time)) { b.time = t; res.newBest.push('Fastest clear'); if (Game.rec && Game.rec.length) store.set('ghost:' + key, { d: Game.rec, time: t }); }
    if (st.chainMax > (b.chain || 0)) { b.chain = st.chainMax; if (st.chainMax >= 4) res.newBest.push('Highest chain x' + st.chainMax); }
    if (st.collapseMax > (b.collapse || 0)) { b.collapse = st.collapseMax; if (st.collapseMax > 5) res.newBest.push('Largest collapse'); }
    if (pct > (b.pct || 0)) b.pct = pct; Save.d.best[key] = b;
    if (win) Save.d.wins++;
  } else if (mode === 'challenge') {
    const c = Game.chal; res.title = c.name.toUpperCase(); res.win = c.score === 'pct' ? true : win;
    const score = Math.round(st.score + (win ? Math.max(0, (c.time - t) * 4) : 0));
    res.rows = [['Island damage', fmtp(pct)], ['Time', fmtP(t)], ['Structures', st.pieces], ['Chain reaction', 'x' + st.chainMax], ['Largest collapse', fmtp(st.collapseMax)], ['Challenge score', score]];
    const key = 'challenge:' + c.id + ':' + Game.cfg.kind; const b = Save.d.best[key] || {}; if (score > (b.score || 0)) { b.score = score; res.newBest.push('Challenge high score'); } Save.d.best[key] = b;
    res.reason = c.score === 'pct' ? 'You broke ' + fmtp(pct) + ' of the island in ' + c.time + ' seconds' : reason;
    if (win) Save.d.wins++;
  } else if (mode === 'endless') {
    const sc = Math.round(st.score + Game.waveScore + t * 2); res.title = 'RUN OVER'; res.win = true; res.reason = 'You survived ' + fmtP(t) + ' and reached wave ' + Game.rules.wave;
    res.rows = [['Time survived', fmtP(t)], ['Wave reached', Game.rules.wave], ['Structures destroyed', st.pieces + st.terrain], ['Chain score', 'x' + st.chainMax], ['Total score', sc]];
    if (sc > (Save.d.endless || 0)) { Save.d.endless = sc; res.newBest.push('Endless high score'); }
  }
  Save.save(); return res;
};
/* ---------- HUD feed ---------- */
Game.hudInfo = function () {
  const I = Game.pi, R = Game.rules, c = Game.cfg, mode = c.mode, t = Game.t;
  const h = { integ: I.integrity(), t: 0, label: 'TIME', phase: '', race: null, sub: '', hearts: mode === 'free' ? -1 : Game.hearts };
  if (R.time) { h.t = Math.max(0, R.time - t); }
  else h.t = t, h.label = mode === 'endless' ? 'SURVIVED' : 'SANDBOX';
  let nextDrop = null; for (const s of Game.sched) if (s.kind === 'draft' && s.t > t) { nextDrop = s.t; break; }
  if (R.time && t >= R.final && R.final) h.phase = 'FINAL DESTRUCTION'; else if (nextDrop !== null) h.phase = 'NEXT ITEM DROP  ' + fmt(nextDrop - t); else h.phase = mode === 'mp' ? 'FINAL DESTRUCTION PHASE' : '';
  if (mode === 'mp') { h.race = [{ name: 'YOU', integ: I.integrity(), me: true, col: '#4aa8ff' }, ...Game.bots.map(b => ({ name: b.name, integ: b.I.integrity(), col: '#' + b.col.toString(16).padStart(6, '0') }))].sort((a, b) => a.integ - b.integ); }
  if (I.bossHud) h.sub = I.bossHud();
  if (mode === 'endless') h.sub = 'WAVE ' + R.wave;
  if (Game.mission) h.goal = Game.mission.goal;
  if (Game.ghost && Game.ghostDelta !== undefined) h.ghost = Game.ghostDelta;
  return h;
};
/* ---------- main update ---------- */
let simT = 0;
function hazardLevel() {
  const R = Game.rules, t = Game.t, c = Game.cfg;
  if (c.mode === 'endless') return clamp((R.wave - 1) * .24, 0, 1.6);
  if (R.level) return R.level;
  if (!R.esc || t < R.esc) return 0; const span = Math.max(30, (R.time || 1e9) - R.esc);
  return clamp(.35 + .65 * (t - R.esc) / span, 0, 1);
}
function worldStep(dt) {
  updateProjs(dt); updateEffects(dt);
  for (const I of Game.islands) I.update(dt, simT);
  if (Game.menuIsland) Game.menuIsland.update(dt, simT);
  for (const b of Game.bots) b.update(dt, Game.t);
  updateFx(dt, simT);
  for (const d of Game.decor) { d.position.y += Math.sin(simT * .5 + d.userData.bob) * .01; }
}
function focusSun(x, y, z) { sun.target.position.set(x, y, z); sun.position.set(x + sunDir.x * 110, y + sunDir.y * 110, z + sunDir.z * 110); sky.position.copy(camera.position); }
Game.frame = function (dt) {
  simT += dt;
  const st = Game.state;
  if (st !== 'play') VM.g.visible = false;
  if (st === 'menu') {
    const I = Game.menuIsland; worldStep(dt);
    const a = simT * .12 + 1, d = 74; camera.position.set(Math.sin(a) * d, 30 + Math.sin(simT * .2) * 4, Math.cos(a) * d); camera.lookAt(0, -3, 0); focusSun(0, 0, 0);
    if (I && Math.random() < dt * .35 && Game.menuKind !== 'title') { const t = randTarget(I, .3); Fx.explosion(t.x, t.y, t.z, 2.5, { col: 0xff7a2a }); I.blast(t.x, t.y, t.z, 3.5, 40, 'x', 'tool'); }
  } else if (st === 'intro') {
    Game.introT += dt; const I = Game.pi; Game.menuLock = true; worldStep(dt); updateCamera(0); updateAim();
    const u = clamp(Game.introT / 3.4, 0, 1), s = u * u * (3 - 2 * u), a = 2.4 - Game.introT * .55;
    const fx = camera.position.x, fy = camera.position.y, fz = camera.position.z, cx = I.cx, cz = I.cz;
    const ox = cx + Math.sin(a) * 62, oy = I.cy + 40, oz = cz + Math.cos(a) * 62;
    camera.position.set(lerp(ox, fx, s), lerp(oy, fy, s), lerp(oz, fz, s));
    camera.lookAt(lerp(cx, P.pos.x, s), lerp(I.cy, P.pos.y + 1.6, s), lerp(cz, P.pos.z, s));
    P.avatar.position.copy(P.pos); P.avatar.rotation.y = P.yaw; updateAvatar(P.avatar, dt, 0, 0, 0); setAvatarTool(P.avatar, 'hammer');
    focusSun(P.pos.x, P.pos.y, P.pos.z);
    if (window.UI) UI.countdown(Game.introT < 3.4 ? String(Math.max(1, Math.ceil(3 - Game.introT))) : '');
    if (Game.introT >= 3.4) { Game.state = 'play'; Game.menuLock = false; UI.countdown('GO!'); Snd.play('drop', .6); }
    if (window.UI) UI.hud(Game.hudInfo());
  } else if (st === 'play') {
    if (Game.paused) { focusSun(P.pos.x, P.pos.y, P.pos.z); return; }
    Game.t += dt; const I = Game.pi, R = Game.rules, mode = Game.cfg.mode;
    if (Input.pressed.KeyR && mode === 'free') Game.resetFree();
    updatePlayer(dt); tickHeld(dt); tickSecret(dt);
    worldStep(dt);
    // trail
    const tr = TRAILS.find(x => x.id === Save.d.cos.trail); if (tr && tr.col && Math.hypot(P.vel.x, P.vel.z) > 3 && Math.random() < .6) glowP.emit(P.pos.x + rnd(-.2, .2), P.pos.y + .2, P.pos.z + rnd(-.2, .2), 0, rnd(.2, 1), 0, tr.col, .3, .6, 0, 1);
    // schedule
    while (Game.sched.length && Game.t >= Game.sched[0].t) { const s = Game.sched.shift(); if (s.kind === 'draft') Game.startDraft(); else if (s.kind === 'chaos') Game.chaosSwap(); }
    const d = Game.draft;
    if (d && !d.closed) {
      if (d.race) { for (const p of d.plans) if (!p.done && Game.t - d.t0 >= p.at) { const id = botChoose(p.b, d); p.done = true; if (id) Game.claimItem(id, p.b.name, false, p.b); } }
      if (window.UI) UI.draftTick(d, Game.t - d.t0);
      if (Game.t - d.t0 >= d.dur || (d.race && d.items.every(id => d.taken[id]))) Game.closeDraft();
    }
    // hazards & modes
    const lvl = hazardLevel();
    if (R.esc && !Game.escShown && Game.t >= R.esc && R.time) { Game.escShown = true; UI.banner('ENVIRONMENTAL ESCALATION', 'The sky is breaking too…', 2600); Snd.play('lose', .5); }
    Hazards.update(I, dt, lvl); for (const b of Game.bots) Hazards.update(b.I, dt, lvl * .6);
    if (!(mode === 'mp') && I.theme === 'ignis' && lvl === 0) Hazards.update(I, dt, 0.0001);
    if (mode === 'endless') Game.endlessTick(dt);
    if (Game.erode) Game.erodeTick(dt);
    if (Game.lavaSea) { const f = clamp(Game.t / R.time, 0, 1), lvlY = lerp(-6, .6, f * f * .6 + f * .4); I.lavaLevel = lvlY; Game.lavaSea.position.set(I.cx, I.cy + lvlY - .5, I.cz); Game.lavaSea.scale.y = 1; }
    // ghost + record
    if (Game.rec) { Game.recT = (Game.recT || 0) - dt; if (Game.recT <= 0) { Game.recT = .2; Game.rec.push(+Game.t.toFixed(1), +P.pos.x.toFixed(2), +P.pos.y.toFixed(2), +P.pos.z.toFixed(2), +P.yaw.toFixed(2), +I.integrity().toFixed(1)); } }
    if (Game.ghost) {
      const g = Game.ghost.data, n = g.length / 6, idx = Math.min(n - 1, Math.floor(Game.t / .2)), i0 = idx * 6; const av = Game.ghost.av;
      if (idx < n - 1) { const f = (Game.t / .2) - idx, i1 = i0 + 6; av.position.set(lerp(g[i0 + 1], g[i1 + 1], f), lerp(g[i0 + 2], g[i1 + 2], f), lerp(g[i0 + 3], g[i1 + 3], f)); av.rotation.y = g[i0 + 4]; av.visible = true; updateAvatar(av, dt, 5, 0, 0); Game.ghostDelta = (g[i0 + 5] - I.integrity()); } else { av.visible = false; Game.ghostDelta = g[i0 + 5] - I.integrity(); }
    }
    // checks
    if (R.time && Game.t >= R.time && !Game.finished) Game.timeUp();
    if (mode === 'campaign' && R.goal < 100 && !Game.finished && 100 - I.integrity() >= R.goal && !Game.mission.boss) Game.finish(true, 'Goal reached');
    if (mode === 'challenge' && Game.chal.falling) { }
    focusSun(P.pos.x, P.pos.y, P.pos.z);
    if (window.UI) UI.hud(Game.hudInfo());
  } else if (st === 'ended') {
    worldStep(dt); Game.updateFloorBreak(dt); const c = Game.cine; if (c) {
      c.t += dt; const I = c.I, u = clamp(c.t / 5, 0, 1), a = c.t * .25 + 1, dist = lerp(50, 120, u), hgt = lerp(24, 60, u);
      camera.position.set(I.cx + Math.sin(a) * dist, I.cy + hgt, I.cz + Math.cos(a) * dist); camera.lookAt(I.cx, I.cy - 6, I.cz); focusSun(I.cx, I.cy, I.cz);
      if (Game.cine && c.t < 3 && Math.random() < dt * 8) { const tp = randTarget(I, 0); Fx.explosion(tp.x, tp.y, tp.z, 3, { col: 0xff8a3a }); }
    }
    P.avatar && (P.avatar.visible = true);
  }
  Input.endFrame();
};
Game.timeUp = function () {
  const c = Game.cfg, I = Game.pi;
  if (c.mode === 'mp') { Game.finish(false, 'Time expired'); return; }
  if (c.mode === 'challenge' && Game.chal.score === 'pct') { Game.finish(true, 'Time'); return; }
  if (c.mode === 'campaign' && Game.mission.goal < 100 && 100 - I.integrity() >= Game.mission.goal) { Game.finish(true, 'Goal reached'); return; }
  Game.finish(false, 'Time expired — ' + Math.round(100 - I.integrity()) + '% destroyed');
};
Game.pause = function (on) {
  if (Game.state !== 'play' && Game.state !== 'intro') return;
  Game.paused = on; if (window.UI) UI.pause(on); if (on) { Input.mouse.l = Input.mouse.r = false; Input.captureWanted = false; if (document.exitPointerLock) try { document.exitPointerLock(); } catch (e) { } } else { Input.captureWanted = true; if (canvas.requestPointerLock) try { const pr = canvas.requestPointerLock(); if (pr && pr.catch) pr.catch(() => { }); } catch (e) { } }
};
Game.chaosSwap = function () {
  P.slots = P.slots.filter(s => s.kit); const ids = shuffle(ITEM_ORDER.slice()).slice(0, 3); for (const id of ids) giveItem(id, 3); P.sel = 5; UI.banner('EQUIPMENT SWAP', ids.map(i => ITEMS[i].name).join(' · '), 1800); Snd.play('drop', .7);
};
Game.resetFree = function () {
  const k = Game.cfg.kind; Game.islands.forEach(i => i.dispose()); Game.islands = []; clearEffects();
  Game.pi = mkIsland(k, 0, 0, 0, false); attachHazards(Game.pi); Game.pi.hooks.chain = n => UI.chain(n); Game.pi.hooks.chainEnd = (n, l) => UI.chainEnd(n, l); Game.pi.hooks.destroyed = isl => Game.onIslandDestroyed(isl);
  spawnPlayer(); Game.addFloor(Game.pi); UI.toast('Island rebuilt', 'info');
};
Game.endlessTick = function (dt) {
  const I = Game.pi, R = Game.rules, t = Game.t, w = Math.floor(t / 60) + 1;
  if (w !== R.wave) { R.wave = w; const names = ['', 'Normal island', 'STORM', 'METEORS', 'LAVA EVENTS', 'GALE FORCE WINDS', 'UNSTABLE GRAVITY', 'EXTREME COMBINATIONS']; UI.banner('WAVE ' + w, names[Math.min(w, 7)], 2400); Snd.play('lose', .5); }
  I.hz = I.hz || { m: 0, l: 0, e: 0, q: 0, f: false };
  if (w >= 4) { I.hz.e += dt * .5; if (I.hz.e >= 1) { I.hz.e = 0; Hazards.eruptionBomb(I.volcano ? I : Object.assign(I, { volcano: { x: I.cx + rnd(-12, 12), y: I.cy + 45, z: I.cz + rnd(-12, 12) } })); } }
  if (w >= 5) { P.windX = Math.sin(t * .35) * 13; P.windZ = Math.cos(t * .27) * 13; } else P.windX = P.windZ = 0;
  GRAV.scale = w >= 6 ? 1 + .55 * Math.sin(t * .5) : 1;
  // regrow
  Game.regT = (Game.regT || 0) - dt;
  if (Game.regT <= 0 && !Game.reforming) { Game.regT = 2.4; let n = 0; while (I.dead.length && n < 3) { const d = I.dead.shift(); if (!d.p.alive && t - d.t > 4) { I.revive(d.p); n++; } else if (d.p.alive) continue; else { I.dead.push(d); break; } } }
  if (Game.reforming) { let n = 0; while (I.dead.length && n < 50) { const d = I.dead.shift(); if (!d.p.alive) { I.revive(d.p); n++; } } if (!I.dead.length) Game.reforming = 0; }
};
Game.erodeTick = function (dt) {
  const I = Game.pi, e = Game.erode; e.acc += dt; if (e.acc < 1.1) return; e.acc = 0;
  let best = null, bd = -1; for (let k = 0; k < 60; k++) { const p = I.pieces[(Math.random() * I.pieces.length) | 0]; if (!p.alive || !p.terr || p.collapseT >= 0) continue; const d = Math.hypot(p.x - I.cx, p.z - I.cz) + Math.random() * 3; if (d > bd) { bd = d; best = p; } }
  if (best) { for (let k = 0; k < 3; k++) { I.kill(best, 'fall'); } }
};
Game.outOfHearts = function () {
  if (Game.finished) return; Game.knockedOut = true;
  const mode = Game.cfg.mode;
  if (mode === 'endless') Game.finish(true, 'You ran out of hearts');
  else Game.finish(false, 'You fell three times — out of hearts');
};
