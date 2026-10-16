/* =====================================================================
   SKYBREAK — epic drops: KAMEHAMEHA (rare) and NUKE BOMB (ultra rare, instant win)
   Loaded after 60_modes so it can hook Game.*; items are plain ITEMS entries so the
   draft, hotbar, bots and first-person viewmodel all handle them like any other tool.
   ===================================================================== */
const RARE = { nuke: .01, kame: .05 };           // chance per item drop (one roll per drop)
const RARE_MODES = ['mp', 'solo', 'campaign', 'endless'];
const _kq = new T.Quaternion(), _ky = new T.Vector3(0, 1, 0), _kv = new T.Vector3();
function addMat(col, op) { return new T.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }); }
function disposeGroup(g) { scene.remove(g); g.traverse(m => { if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); }); }
function nearLocal(x, y, z) { return Fx.near(x, y, z); }

/* ---------- Kamehameha ---------- */
// reads hand position + aim direction from a context (live for the player, fixed target for bots)
function kameRay(c) {
  const f = c.from, a = c.aim; let dx = a ? a.x - f.x : 0, dy = a ? a.y - f.y : 0, dz = a ? a.z - f.z : 0, d = Math.hypot(dx, dy, dz);
  if (!(d > 2)) { const q = c.dir; dx = q.x; dy = q.y; dz = q.z; d = Math.hypot(dx, dy, dz) || 1; }
  dx /= d; dy /= d; dz /= d; dy = clamp(dy, -.5, .3); const n = Math.hypot(dx, dy, dz) || 1;
  return { f: { x: f.x, y: f.y, z: f.z }, d: { x: dx / n, y: dy / n, z: dz / n } };
}
function fireKame(I, live, o = {}) {
  const pw = o.pw || 1, R = 5 + 7 * pw, L = 100, dmg = 720 * (.55 + .45 * pw), dur = o.dur || 1.3, sweep = o.sweep || 0, spd = 160;
  const grp = new T.Group(), mk = (r, col, op) => { const m = new T.Mesh(new T.CylinderGeometry(1, 1, 1, 14, 1, true), addMat(col, op)); grp.add(m); return m; };
  const outer = mk(1, 0x1e7bff, .3), mid = mk(1, 0x3fb8ff, .42), core = mk(1, 0xbfe6ff, .65);
  const head = new T.Mesh(new T.IcosahedronGeometry(1, 1), addMat(0xbfeaff, .8)), base = new T.Mesh(new T.IcosahedronGeometry(1, 1), addMat(0xffffff, .9)); grp.add(head, base); scene.add(grp);
  let t = 0, len = 0, tk = 0, snd = 0; const mine = I === Game.pi;
  Snd.play('bigboom', mine ? .8 : Math.max(.15, .8 - nearLocal(I.cx, I.cy, I.cz) / 200)); Snd.play('whoosh', .6);
  const maxR = I.R0 * VX * 1.25 + R;
  addEffect({
    I, update(dt) {
      t += dt; len = Math.min(L, len + spd * dt);
      const r = live(); let dx = r.d.x, dy = r.d.y, dz = r.d.z, fx = r.f.x, fy = r.f.y, fz = r.f.z;
      if (sweep) { const a = sweep * (t / dur - .5), ca = Math.cos(a), sa = Math.sin(a), nx = dx * ca + dz * sa, nz = -dx * sa + dz * ca; dx = nx; dz = nz; }
      const env = t < .12 ? t / .12 : t > dur - .35 ? Math.max(0, (dur - t) / .35) : 1, pul = 1 + Math.sin(t * 60) * .07;
      _kv.set(dx, dy, dz); _kq.setFromUnitVectors(_ky, _kv);
      for (const [m, k] of [[outer, .36], [mid, .22], [core, .11]]) { m.quaternion.copy(_kq); m.position.set(fx + dx * len / 2, fy + dy * len / 2, fz + dz * len / 2); const rr = Math.max(.01, R * k * env * pul); m.scale.set(rr, len, rr); }
      head.position.set(fx + dx * len, fy + dy * len, fz + dz * len); head.scale.setScalar(Math.max(.01, R * .3 * env * pul));
      base.position.set(fx, fy, fz); base.scale.setScalar(Math.max(.01, R * .22 * env * pul));
      // particles
      if (nearLocal(fx, fy, fz) < 260) {
        for (let k = 0; k < 22; k++) { const h = Math.random() * len, a = Math.random() * 6.28, rr = R * rnd(.2, .75) * env; glowP.emit(fx + dx * h + Math.cos(a) * rr * .5, fy + dy * h + Math.sin(a) * rr * .5, fz + dz * h + Math.cos(a + 1) * rr * .5, rnd(-2, 2), rnd(-2, 2), rnd(-2, 2), Math.random() < .8 ? 0x4cb8ff : 0xcff0ff, rnd(.2, .45), rnd(.2, .45), 0, 0); }
        for (let k = 0; k < 6; k++) { const a = Math.random() * 6.28; glowP.emit(head.position.x, head.position.y, head.position.z, Math.cos(a) * rnd(6, 16), rnd(-4, 10), Math.sin(a) * rnd(6, 16), 0xcff0ff, rnd(.3, .7), rnd(.3, .6), 6, .6); }
      }
      camShake.v = Math.max(camShake.v, (mine ? .4 : Math.max(0, .35 - nearLocal(fx, fy, fz) / 220)) * env);
      Fx.flash(head.position.x, head.position.y, head.position.z, 0x7fd8ff, 5 * env);
      // damage along the beam (only where the island is)
      tk -= dt; if (tk <= 0) {
        tk = .09; const D = dmg * env;
        for (let s = 3; s <= len; s += 2.6) {
          const px = fx + dx * s, py = fy + dy * s, pz = fz + dz * s; if (Math.hypot(px - I.cx, pz - I.cz) > maxR) continue;
          I.blast(px, py, pz, R, D, 'x', 'tool', { terrMul: 1.25 });
          if (Math.random() < .18) Fx.dust(px, py - 1, pz, 3, 0xe9f7ff, 2.4, 1.1);
        }
        snd -= 1; if (snd <= 0) { snd = 3; Snd.play('boom', mine ? .45 : .12); }
      }
      return t < dur;
    },
    end() { disposeGroup(grp); }
  });
  I.stats.explosives++;
}
function startKameCharge(I, c, o = {}) {
  const player = c.who === 'player', pw0 = o.pw || (player ? 1 : .85), full = o.full || 2.4, auto = o.auto || 0;
  const orb = new T.Mesh(new T.IcosahedronGeometry(1, 2), addMat(0xbfeaff, .8)), halo = new T.Mesh(new T.IcosahedronGeometry(1, 1), addMat(0x2a8cff, .3)); const grp = new T.Group(); grp.add(orb, halo); scene.add(grp);
  const eff = {
    I, t: 0, done: false, ray: null, announced: false,
    refresh(cc) { this.ray = kameRay(cc || (player ? ctxFor('player') : c)); },
    frac() { return clamp(this.t / full, 0, 1); },
    release() {
      if (this.done) return; this.done = true;
      if (this.t < .3) { Fx.hitSparks(this.ray.f.x, this.ray.f.y, this.ray.f.z, 8, 0x9fe2ff); return; }
      const f = this.frac(), pw = (.3 + .7 * f) * pw0 * (o.boost || 1);
      fireKame(I, () => { const r = player ? kameRay(ctxFor('player')) : this.ray; return r; }, { pw, sweep: o.sweep, dur: o.dur });
    },
    update(dt) {
      if (this.done) return false; this.t += dt; if (!this.ray) this.refresh();
      if (player) this.refresh(); const r = this.ray, f = this.frac();
      if (auto && this.t >= auto) { this.release(); return false; }
      const sz = .16 + .6 * f * (o.boost ? 1.4 : 1) + Math.sin(this.t * 40) * .025;
      grp.position.set(r.f.x + r.d.x * 1.2, r.f.y + r.d.y * 1.2 - .1, r.f.z + r.d.z * 1.2); orb.scale.setScalar(sz); halo.scale.setScalar(sz * 1.6 + Math.sin(this.t * 25) * .05);
      if (nearLocal(r.f.x, r.f.y, r.f.z) < 200) for (let k = 0; k < 3; k++) { const a = Math.random() * 6.28, b = rnd(-1.2, 1.2), rr = (1.8 + 1.4 * f) * rnd(.6, 1.1), px = grp.position.x + Math.cos(a) * Math.cos(b) * rr, py = grp.position.y + Math.sin(b) * rr, pz = grp.position.z + Math.sin(a) * Math.cos(b) * rr; glowP.emit(px, py, pz, (grp.position.x - px) * 3.2, (grp.position.y - py) * 3.2, (grp.position.z - pz) * 3.2, Math.random() < .8 ? 0x4cb8ff : 0xffffff, .12 + f * .08, .35, 0, 0); }
      if (Math.random() < dt * 8) Snd.play('zap', .06 + f * .12);
      if (player) { camShake.v = Math.max(camShake.v, .06 + f * .16); if (f >= 1 && !this.announced) { this.announced = true; if (window.UI) UI.toast('FULLY CHARGED — RELEASE!', 'good'); Snd.play('pick', .6); } }
      Fx.flash(grp.position.x, grp.position.y, grp.position.z, 0x7fd8ff, 1 + f * 2.5);
      return true;
    },
    end() { disposeGroup(grp); }
  };
  eff.refresh(c); addEffect(eff);
  if (player && window.UI) UI.toast('CHARGING… hold to power up, release to fire', 'info');
  return eff;
}

/* ---------- Nuke Bomb ---------- */
let nukeFlashEl = null;
function nukeFlash(v, ms) {
  if (!nukeFlashEl) { nukeFlashEl = document.createElement('div'); nukeFlashEl.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:70'; document.body.appendChild(nukeFlashEl); }
  nukeFlashEl.style.transition = ms ? 'opacity ' + ms + 'ms ease-out' : 'none'; nukeFlashEl.style.opacity = v;
}
function armNuke(I, c) {
  const mine = I === Game.pi, x = I.cx, z = I.cz, y = surfaceY(I, x, z), ARM = 2.3, SPD = 42;
  I.nuking = true;
  const who = mine ? 'YOU' : (I.owner || 'A RIVAL');
  if (mine && window.UI) UI.banner('☢ NUKE ARMED', 'Impact in 2 seconds — hold on', 2100); else if (window.UI) UI.toast(who + ' LAUNCHED A NUKE!', 'warn');
  Snd.play('drop', 1);
  // missile
  const mis = new T.Group(), steel = new T.MeshPhongMaterial({ color: 0x8b95a3, flatShading: true }), red = new T.MeshPhongMaterial({ color: 0xd8321f, emissive: 0x551100, flatShading: true });
  const body = new T.Mesh(new T.CylinderGeometry(1.1, 1.1, 7, 10), steel), nose = new T.Mesh(new T.ConeGeometry(1.1, 2.6, 10), red), band = new T.Mesh(new T.CylinderGeometry(1.14, 1.14, 1, 10), new T.MeshPhongMaterial({ color: 0xffe14a, emissive: 0x443300, flatShading: true }));
  nose.position.y = -4.8; nose.rotation.x = Math.PI; band.position.y = -1.5; mis.add(body, nose, band);
  for (let k = 0; k < 4; k++) { const fin = new T.Mesh(new T.BoxGeometry(.2, 2.2, 1.8), red); const a = k * Math.PI / 2; fin.position.set(Math.cos(a) * 1.4, 3, Math.sin(a) * 1.4); fin.rotation.y = -a; mis.add(fin); }
  scene.add(mis);
  // blast visuals
  const wave = new T.Mesh(new T.SphereGeometry(1, 28, 16), addMat(0xfff0b0, .35)), stem = new T.Mesh(new T.CylinderGeometry(.35, 1, 1, 12, 1, true), new T.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: .85, side: T.DoubleSide, depthWrite: false }));
  const cap = new T.Mesh(new T.SphereGeometry(1, 20, 12), new T.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: .88, depthWrite: false })), cap2 = new T.Mesh(new T.SphereGeometry(1, 16, 10), new T.MeshBasicMaterial({ color: 0xffd07a, transparent: true, opacity: .8, depthWrite: false }));
  wave.visible = stem.visible = cap.visible = cap2.visible = false; scene.add(wave, stem, cap, cap2);
  let t = 0, boom = false, list = null, ptr = 0, tail = 0; const savedFx = I.fxScale;
  addEffect({
    I, update(dt) {
      t += dt;
      if (!boom) {
        const k = clamp(t / ARM, 0, 1), top = y + 150 * (1 - k * k) + 6;
        mis.position.set(x, top, z); mis.rotation.y += dt * 3;
        if (nearLocal(x, top, z) < 400) for (let n = 0; n < 8; n++) glowP.emit(x + rnd(-.5, .5), top + 4.5, z + rnd(-.5, .5), rnd(-2, 2), rnd(8, 18), rnd(-2, 2), Math.random() < .5 ? 0xffb030 : 0xff5a1a, rnd(.5, 1), rnd(.25, .5), 0, 0);
        if (Math.floor(t * 5) !== Math.floor((t - dt) * 5)) { Snd.play('tick', mine ? .6 : .15); Fx.flash(x, y + 4, z, 0xff3030, 3); }
        if (t < ARM) { for (let n = 0; n < 3; n++) { const a = Math.random() * 6.28; glowP.emit(x + Math.cos(a) * 14, y + .5, z + Math.sin(a) * 14, 0, 2, 0, 0xff3a2a, .5, .3, 0, 0); } return true; }
        // ---- detonation ----
        boom = true; I.nuked = true; scene.remove(mis); mis.traverse(m => { if (m.geometry) m.geometry.dispose(); });
        list = I.pieces.filter(p => p.alive).map(p => ({ p, d: Math.hypot(p.x - x, (p.y + p.sy / 2 - y) * .6, p.z - z) })).sort((a, b) => a.d - b.d);
        I.fxScale = Math.min(I.fxScale, .45);
        wave.visible = stem.visible = cap.visible = cap2.visible = true; t = 0;
        if (mine) { nukeFlash(1, 0); setTimeout(() => nukeFlash(0, 2600), 60); }
        Fx.flash(x, y + 6, z, 0xffffff, 9); camShake.v = mine ? 1.6 : Math.max(.3, 1.2 - nearLocal(x, y, z) / 250);
        Snd.play('bigboom', 1); setTimeout(() => Snd.play('bigboom', 1), 180); setTimeout(() => Snd.play('boom', 1), 420);
        if (mine) knockPlayer(x, y, z, 70, 1.3);
        Fx.explosion(x, y + 2, z, 14, { col: 0xffe9a0, col2: 0xffffff });
        for (let n = 0; n < 220; n++) { const a = Math.random() * 6.28, e = Math.random() * 1.2, s = rnd(18, 60); glowP.emit(x, y + 2, z, Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s + 6, Math.sin(a) * Math.cos(e) * s, Math.random() < .5 ? 0xffd070 : 0xffffff, rnd(.6, 1.4), rnd(.7, 1.6), 6, .8); }
        return true;
      }
      // expanding shockwave kills everything
      const r = t * SPD + 4; wave.position.set(x, y + 1, z); wave.scale.setScalar(r); wave.material.opacity = Math.max(0, .4 - t * .12);
      while (ptr < list.length && list[ptr].d <= r) {
        const e = list[ptr++], p = e.p; if (!p.alive) continue;
        const dx = p.x - x, dz = p.z - z, L = Math.hypot(dx, dz) || 1; I.kill(p, 'tool', { dx: dx / L, dy: .55, dz: dz / L, power: 2.4 });
      }
      // mushroom cloud
      const g = Math.min(1, t / 3.2), h = 8 + 62 * g, rs = 3 + 5 * g;
      stem.position.set(x, y + h / 2, z); stem.scale.set(rs, h, rs); stem.material.opacity = .85 * (1 - Math.max(0, t - 5) / 3);
      cap.position.set(x, y + h + 3 * g, z); cap.scale.set(10 * g + 3, 5.5 * g + 1.6, 10 * g + 3); cap.material.opacity = .88 * (1 - Math.max(0, t - 5) / 3);
      cap2.position.set(x, y + h + 5 * g, z); cap2.scale.set(6 * g + 2, 3.2 * g + 1, 6 * g + 2); cap2.material.opacity = .8 * (1 - Math.max(0, t - 4.5) / 3);
      if (nearLocal(x, y + h, z) < 500) for (let n = 0; n < 12; n++) { const a = Math.random() * 6.28, rr = rnd(0, 10 * g + 2); glowP.emit(x + Math.cos(a) * rr, y + h + rnd(-2, 4), z + Math.sin(a) * rr, Math.cos(a) * 4, rnd(1, 6), Math.sin(a) * 4, Math.random() < .5 ? 0xff8a2a : 0xffd070, rnd(.7, 1.5), rnd(.6, 1.2), 0, .4); }
      if (ptr >= list.length) { tail += dt; if (I.fxScale !== savedFx) I.fxScale = savedFx; }
      return t < 8.5;
    },
    end() { I.fxScale = savedFx; for (const m of [wave, stem, cap, cap2]) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); } if (mis.parent) disposeGroup(mis); if (mine) nukeFlash(0, 0); }
  });
}

/* ---------- item catalogue entries ---------- */
ITEMS.kame = {
  name: 'Kamehameha', icon: '🔵', col: '#4dc9ff', uses: 2, cd: 7, rare: true, kind: 'beam', hold: true, maxHold: 3,
  desc: 'RARE · Hold to charge, release to fire a huge energy beam that carves a trench through the island.',
  start(I, c) { return startKameCharge(I, c, {}); },
  tick(I, c, s, dt, eff) { },
  stop(eff) { if (eff) eff.release(); },
  secret: { name: 'MAX POWER', text: 'Activate with Q — instant charge, then a sweeping mega beam.', hold: false, start(I, c) { startKameCharge(I, c, { auto: .85, pw: 1.45, boost: 1.6, sweep: 1.15, dur: 1.9, full: .85 }); } }
};
ITEMS.nuke = {
  name: 'Nuke Bomb', icon: '☢️', col: '#9dff3a', uses: 1, cd: 1, rare: true, kind: 'nuke', explosive: true,
  desc: 'ULTRA RARE (1%) · Wipes out your whole island. Instant win.',
  use(I, c) { if (I.nuking || I.nuked) return false; armNuke(I, c); return true; }
};
ITEM_COL.kame = 0x4dc9ff; ITEM_COL.nuke = 0x9dff3a;
ITEM_W.kame = 1.7; ITEM_W.nuke = 4;

/* ---------- drop rules ---------- */
Game.rare = RARE;
Game.rareOK = function () { return RARE_MODES.indexOf(Game.cfg && Game.cfg.mode) >= 0; };
Game.injectRare = function (items) {
  if (!Game.rareOK() || !items.length) return;
  const r = Math.random(), id = r < Game.rare.nuke ? 'nuke' : r < Game.rare.nuke + Game.rare.kame ? 'kame' : null;
  if (id) items[(Math.random() * items.length) | 0] = id;
};
(function () {
  const claim = Game.claimItem;
  Game.claimItem = function (id, by, isMe, bot) {
    claim.apply(this, arguments);
    const it = ITEMS[id]; if (!it || !it.rare || !window.UI) return;
    if (isMe) UI.banner(id === 'nuke' ? '☢ NUKE BOMB ACQUIRED' : '🔵 KAMEHAMEHA ACQUIRED', id === 'nuke' ? 'Select it and fire — instant win' : 'Hold fire to charge, release to blast', 2600);
    else UI.toast(by + ' GOT THE ' + it.name.toUpperCase() + '!', 'warn');
  };
})();
