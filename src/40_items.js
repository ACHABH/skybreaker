/* =====================================================================
   SKYBREAK — draft items, secret powers, effects, hazards
   ===================================================================== */
const EFFECTS = [];
function addEffect(e) { EFFECTS.push(e); return e; }
function updateEffects(dt) {
  for (let i = EFFECTS.length - 1; i >= 0; i--) { const e = EFFECTS[i]; if (e.I && !e.I.alive) { e.end && e.end(); EFFECTS.splice(i, 1); continue; } if (e.update(dt) === false) { e.end && e.end(); EFFECTS.splice(i, 1); } }
}
function clearEffects() { for (const e of EFFECTS) e.end && e.end(); EFFECTS.length = 0; for (const p of projs) { scene.remove(p.mesh); } projs.length = 0; }
const _col = new T.Color();
function surfaceY(I, x, z) { const r = I.rayHit(x, I.cy + 70, z, 0, -1, 0, 140, .5); return r ? r.y : I.cy - 1; }
function randTarget(I, pref = .55) {
  const ps = I.pieces; for (let k = 0; k < 40; k++) { const p = ps[(Math.random() * ps.length) | 0]; if (p.alive && !p.phased && (!p.terr || Math.random() > pref)) return { x: p.x, y: p.maxY, z: p.z, p }; }
  return { x: I.cx, y: I.cy, z: I.cz };
}
function lightningBolt(I, x, z, r = 3, dmg = 110, ign = .5) {
  const y = surfaceY(I, x, z);
  if (Fx.near(x, y, z) < 260) for (let k = 0; k < 28; k++) { const h = k / 28; glowP.emit(x + rnd(-.6, .6) * (1 - h * .6), y + h * 55, z + rnd(-.6, .6), 0, 0, 0, k % 3 ? 0xe9f7ff : 0xfff06a, rnd(.35, .7), rnd(.12, .3), 0, 0); }
  Fx.flash(x, y + 3, z, 0xcfe8ff, 5); camShake.v = Math.max(camShake.v, Math.max(0, .35 - Fx.near(x, y, z) / 200));
  Snd.play('zap', Math.max(.1, 1 - Fx.near(x, y, z) / 200));
  Fx.hitSparks(x, y, z, 12, 0xfff7b0);
  I.blast(x, y, z, r, dmg, 'e', 'tool', { ignite: ign });
}
function castMeteor(I, x, z, o = {}) {
  const delay = o.delay === undefined ? 1.1 : o.delay, r = o.r || 8, dmg = o.dmg || 300, y = surfaceY(I, x, z);
  let t = 0, launched = false;
  addEffect({
    I, update(dt) {
      t += dt;
      if (t < delay && Fx.near(x, y, z) < 220) { for (let k = 0; k < 5; k++) { const a = Math.random() * 6.28; glowP.emit(x + Math.cos(a) * r * .9, y + .4, z + Math.sin(a) * r * .9, 0, 1.2, 0, 0xff6a2a, .35, .25, 0, 0); } }
      if (t >= delay && !launched) {
        launched = true;
        launch({
          I, x: x + 26, y: y + 85, z: z + 14, tx: x, ty: y, tz: z, T: .9, g: 0, size: 1.3 + r * .06, color: 0xff5a1a, emissive: 0xff3a00, trail: 0xff8a2a, noClip: false,
          onHit: (hx, hy, hz) => { explode(I, hx, hy, hz, r, dmg, { ignite: .55, terrMul: 1.4, fx: { col: 0xff5a1a, col2: 0xffd070 }, stat: o.stat !== false }); I.blast(hx, hy - 1, hz, r * .65, dmg * .6, 'x', 'tool', { terrMul: 1.6 }); }
        });
      }
      return t < delay + 1.6;
    }
  });
  if (Fx.near(x, y, z) < 300) Snd.play('whoosh', .4);
}
function spawnTornado(I, x, z, dx, dz, o = {}) {
  const e = {
    I, x, z, dx, dz, t: 0, life: o.life || 11, r: o.r || 5, dps: o.dps || 120, speed: o.speed || 4.2, follow: o.follow, ang: 0, tk: 0, gy: surfaceY(I, x, z), gt: 0, mesh: null,
    update(dt) {
      this.t += dt; if (this.t > this.life) return false;
      if (this.follow && this.follow()) { const f = this.follow(); const ddx = f.x - this.x, ddz = f.z - this.z, d = Math.hypot(ddx, ddz) || 1; const sp = Math.min(this.speed * 3, d * 4); this.x += ddx / d * sp * dt; this.z += ddz / d * sp * dt; }
      else { const a = Math.atan2(this.dx, this.dz) + Math.sin(this.t * .9) * .6; this.x += Math.sin(a) * this.speed * dt; this.z += Math.cos(a) * this.speed * dt; }
      const ox = this.x - I.cx, oz = this.z - I.cz, od = Math.hypot(ox, oz); if (od > I.R0 * VX * .85) { this.dx = -ox; this.dz = -oz; this.x -= ox / od * 6 * dt; this.z -= oz / od * 6 * dt; }
      this.gt -= dt; if (this.gt <= 0) { this.gy = surfaceY(I, this.x, this.z); this.gt = .2; }
      const H = 11 * this.r / 5; this.ang += dt * 9;
      if (Fx.near(this.x, this.gy, this.z) < 240) for (let k = 0; k < 9; k++) {
        const h = Math.random(), rad = (.35 + h * 1.0) * this.r * .7, a = this.ang + h * 6 + k;
        const col = Math.random() < .5 ? 0xdff6ff : 0xaee6ff;
        (Math.random() < .6 ? glowP : dustP).emit(this.x + Math.cos(a) * rad, this.gy + h * H, this.z + Math.sin(a) * rad, -Math.sin(a) * 7, 2, Math.cos(a) * 7, col, rnd(.35, .8) * (1 + this.r * .08), rnd(.25, .5), 0, 0);
      }
      this.tk -= dt;
      if (this.tk <= 0) {
        this.tk = .1; const r = this.r;
        I.queryBox(this.x - r, this.gy - 1, this.z - r, this.x + r, this.gy + 9, this.z + r, p => {
          const d = Math.hypot(p.x - this.x, p.z - this.z); if (d > r + Math.max(p.sx, p.sz) * .5) return;
          I.damagePiece(p, this.dps * .1 * (p.terr ? .3 : 1), 'g', 'tool', -(p.z - this.z) / (d || 1), .6, (p.x - this.x) / (d || 1));
        });
        if (Math.random() < .25) Snd.play('whoosh', Math.max(.05, .5 - Fx.near(this.x, this.gy, this.z) / 150));
      }
      // lift loose debris
      const R2 = this.r * 1.9;
      for (let i = 0; i < debris.max; i++) {
        if (debris.life[i] <= 0 || debris.held[i] || debris.heavy[i]) continue;
        const ddx = debris.px[i] - this.x, ddz = debris.pz[i] - this.z; if (ddx * ddx + ddz * ddz > R2 * R2 || debris.py[i] > this.gy + H + 4) continue;
        const d = Math.hypot(ddx, ddz) || 1; debris.vy[i] += 46 * dt; debris.vx[i] += (-ddz / d * 22 - ddx / d * 6) * dt * 3; debris.vz[i] += (ddx / d * 22 - ddz / d * 6) * dt * 3; debris.rest[i] = 0;
      }
      return true;
    }
  };
  return addEffect(e);
}
function spawnSingularity(I, x, y, z, o = {}) {
  const e = {
    I, x, y, z, t: 0, r: o.r || 13, life: o.life || 3.6, rate: o.rate || 11, acc: 0, held: [], ending: false, finalR: o.finalR || 7.5, finalD: o.finalD || 140, mesh: null, hold: !!o.hold,
    setTarget(tx, ty, tz) { this.x += (tx - this.x) * .2; this.y += (ty - this.y) * .2; this.z += (tz - this.z) * .2; },
    stop() { this.ending = true; },
    update(dt) {
      this.t += dt;
      if (!this.mesh) { this.mesh = new T.Mesh(new T.IcosahedronGeometry(1, 1), new T.MeshBasicMaterial({ color: 0x120622 })); scene.add(this.mesh); }
      this.mesh.position.set(this.x, this.y, this.z); this.mesh.scale.setScalar(.9 + Math.sin(this.t * 14) * .12 + Math.min(2, this.held.length * .02)); this.mesh.rotation.y += dt * 4;
      if (Fx.near(this.x, this.y, this.z) < 240) for (let k = 0; k < 6; k++) { const a = Math.random() * 6.28, rr = rnd(2, this.r * .5); glowP.emit(this.x + Math.cos(a) * rr, this.y + rnd(-1.5, 1.5), this.z + Math.sin(a) * rr, -Math.sin(a) * 8 - Math.cos(a) * 5, rnd(-1, 1), Math.cos(a) * 8 - Math.sin(a) * 5, Math.random() < .5 ? 0xb06bff : 0xe3b8ff, .3, .45, 0, 0); }
      if (!this.ending && (this.t < this.life)) {
        this.acc += this.rate * dt;
        while (this.acc >= 1) {
          this.acc -= 1; const cands = [];
          I.queryBox(this.x - this.r, this.y - this.r * .8, this.z - this.r, this.x + this.r, this.y + this.r, this.z + this.r, p => { if ((!p.terr || p.y > I.cy - 5) && p.collapseT < 0 && !p.phased && Math.hypot(p.x - this.x, p.y - this.y, p.z - this.z) < this.r) cands.push(p); });
          if (!cands.length) break; cands.sort((a, b) => (a.terr ? 1 : 0) - (b.terr ? 1 : 0) + (Math.random() - .5) * .8);
          const p = cands[0]; I.kill(p, 'pull'); if (I.lastDebris !== undefined) this.held.push(I.lastDebris);
        }
      }
      for (let k = this.held.length - 1; k >= 0; k--) {
        const i = this.held[k]; if (debris.life[i] <= 0 || !debris.held[i]) { this.held.splice(k, 1); continue; }
        const dx = this.x - debris.px[i], dy = this.y - debris.py[i], dz = this.z - debris.pz[i], d = Math.hypot(dx, dy, dz) || 1;
        debris.vx[i] += (dx / d * 36 - dz / d * 14) * dt; debris.vy[i] += (dy / d * 36) * dt; debris.vz[i] += (dz / d * 36 + dx / d * 14) * dt;
        const dm = Math.max(0, 1 - 3 * dt); debris.vx[i] *= dm; debris.vy[i] *= dm; debris.vz[i] *= dm; debris.life[i] = Math.max(debris.life[i], 1);
        if (d < 1.2) { debris.life[i] = 0; debris.kill(i); this.held.splice(k, 1); glowP.emit(this.x, this.y, this.z, rnd(-3, 3), rnd(-3, 3), rnd(-3, 3), 0xe3b8ff, .3, .3, 0, 1); }
      }
      if (this.ending || this.t >= this.life) {
        this.ending = true; const boost = Math.min(2.2, 1 + this.held.length * .02);
        explode(I, this.x, this.y, this.z, this.finalR * boost * .9, this.finalD * boost, { fx: { col: 0xb06bff, col2: 0xe9d0ff }, terrMul: 1.2, stat: false }); I.stats.explosives++;
        for (const i of this.held) { if (debris.life[i] > 0) { debris.held[i] = 0; debris.vx[i] = rnd(-12, 12); debris.vy[i] = rnd(2, 14); debris.vz[i] = rnd(-12, 12); } }
        return false;
      }
      return true;
    },
    end() { if (this.mesh) { scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); this.mesh = null; } }
  };
  return addEffect(e);
}
function spawnDrone(I, from, o = {}) {
  const grp = new T.Group(), body = new T.Mesh(new T.BoxGeometry(.8, .35, .8), new T.MeshPhongMaterial({ color: 0x66707e, flatShading: true })), disc = new T.Mesh(new T.CylinderGeometry(.75, .75, .07, 12), new T.MeshPhongMaterial({ color: 0xdfe6f0, emissive: 0x223344, flatShading: true }));
  disc.position.y = -.25; grp.add(body); grp.add(disc); body.castShadow = true; scene.add(grp); grp.position.set(from.x, from.y, from.z);
  const e = {
    I, t: 0, life: o.life || 14, speed: o.speed || 8.5, dps: o.dps || 75, target: null, rt: 0,
    update(dt) {
      this.t += dt; if (this.t > this.life) return false; disc.rotation.y += dt * 30;
      this.rt -= dt; if (!this.target || !this.target.alive || this.rt <= 0) {
        this.rt = .7; let best = null, bd = 1e9;
        for (const p of I.pieces) { if (!p.alive || p.phased || p.terr) continue; const d = Math.hypot(p.x - grp.position.x, p.y - grp.position.y, p.z - grp.position.z); if (d < bd) { bd = d; best = p; } }
        if (!best) { for (let k = 0; k < 30; k++) { const p = I.pieces[(Math.random() * I.pieces.length) | 0]; if (p.alive) { best = p; break; } } }
        this.target = best;
      }
      const p = this.target; if (!p) return true;
      const tx = p.x, ty = p.y + p.sy / 2 + .6, tz = p.z, dx = tx - grp.position.x, dy = ty - grp.position.y, dz = tz - grp.position.z, d = Math.hypot(dx, dy, dz);
      if (d > 1.1) { const s = Math.min(this.speed * dt, d); grp.position.x += dx / d * s; grp.position.y += dy / d * s; grp.position.z += dz / d * s; }
      if (d < Math.max(p.sx, p.sy, p.sz) * .5 + 1.9) {
        I.damagePiece(p, this.dps * dt, 's', 'tool', 0, .5, 0);
        if (Math.random() < dt * 40) Fx.hitSparks(grp.position.x, grp.position.y - .4, grp.position.z, 2, 0xffffff);
        if (Math.random() < dt * 4) Snd.play('hit', Math.max(.05, .3 - Fx.near(p.x, p.y, p.z) / 160));
      }
      return true;
    },
    end() { scene.remove(grp); grp.traverse(m => { if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); }); }
  };
  return addEffect(e);
}
function spawnFireZone(I, x, y, z, r, life = 12) {
  let t = 0, tk = 0;
  addEffect({
    I, update(dt) {
      t += dt; tk -= dt;
      if (Fx.near(x, y, z) < 200) for (let k = 0; k < 4; k++) { const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * r; glowP.emit(x + Math.cos(a) * d, y + .2, z + Math.sin(a) * d, rnd(-.3, .3), rnd(2, 5), rnd(-.3, .3), Math.random() < .5 ? 0xff7a1a : 0xffc53a, rnd(.4, .9), rnd(.5, .9), -1.5, .3); }
      if (tk <= 0) { tk = .35; I.queryBox(x - r, y - 2, z - r, x + r, y + 6, z + r, p => { if (p.mat.flam && Math.hypot(p.x - x, p.z - z) < r + 1 && Math.random() < .8) I.ignite(p, 8); }); I.blast(x, y, z, r, 8, 'f', 'tool'); }
      return t < life;
    }
  });
}
function placeRod(I, x, y, z, o = {}) {
  const m = new T.Mesh(new T.CylinderGeometry(.08, .16, 7, 6), new T.MeshPhongMaterial({ color: 0xcfd6e0, emissive: 0x333300 })); m.position.set(x, y + 3.5, z); scene.add(m);
  const tip = new T.Mesh(new T.SphereGeometry(.28, 8, 6), new T.MeshBasicMaterial({ color: 0xfff06a })); tip.position.set(x, y + 7.1, z); scene.add(tip);
  let t = 0, tk = 0;
  addEffect({
    I, update(dt) {
      t += dt; tk -= dt; tip.scale.setScalar(1 + Math.sin(t * 20) * .3);
      if (tk <= 0) {
        tk = o.interval || .55; const cands = [];
        I.queryBox(x - 13, y - 6, z - 13, x + 13, y + 14, z + 13, p => { if (!p.terr || Math.random() < .25) cands.push(p); });
        let tx, tz; if (cands.length && Math.random() < .8) { const p = cands[(Math.random() * cands.length) | 0]; tx = p.x; tz = p.z; } else { const a = Math.random() * 6.28, d = Math.random() * 12; tx = x + Math.cos(a) * d; tz = z + Math.sin(a) * d; }
        lightningBolt(I, tx, tz, 3.2, o.dmg || 115, .6);
      }
      return t < (o.life || 10);
    },
    end() { scene.remove(m); scene.remove(tip); m.geometry.dispose(); m.material.dispose(); tip.geometry.dispose(); tip.material.dispose(); }
  });
}
let freezeBeamAcc = 0;
function freezeAt(I, x, y, z, r) { I.queryBox(x - r, y - r, z - r, x + r, y + r, z + r, p => { if (Math.hypot(p.x - x, p.y + p.sy / 2 - y, p.z - z) < r + Math.max(p.sx, p.sz) * .4) { I.freeze(p); if (p.burn > 0) { p.burn = 0; } } }); }
function beamFx(from, to, col) {
  const n = 14, dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
  for (let k = 0; k < n; k++) { const h = Math.random(); glowP.emit(from.x + dx * h + rnd(-.15, .15), from.y + dy * h + rnd(-.15, .15), from.z + dz * h + rnd(-.15, .15), rnd(-.5, .5), rnd(-.5, .5), rnd(-.5, .5), col, rnd(.15, .3), .2, 0, 0); }
}
function groundFront(I, ctx, dist) { const x = ctx.pos.x + ctx.face.x * dist, z = ctx.pos.z + ctx.face.z * dist; return { x, z, y: surfaceY(I, x, z) }; }
function secretBanner(I, id) { }

/* ---------- item catalogue ---------- */
const ITEMS = {
  mega: {
    name: 'Mega Bomb', icon: '💣', col: '#ff6a2a', uses: 4, cd: 4.5, desc: 'Huge area explosion. Excellent against dense structures.', kind: 'blast', explosive: true,
    use(I, c) { launch({ I, x: c.from.x, y: c.from.y, z: c.from.z, tx: c.aim.x, ty: c.aim.y, tz: c.aim.z, size: .55, color: 0x2a1a10, emissive: 0x662200, onHit: (x, y, z) => explode(I, x, y, z, 10.5, 250, { terrMul: 1, fx: { col: 0xff6a1a } }) }); Snd.play('whoosh', .7); return true; },
    secret: {
      name: 'NUKE', text: 'Activate with Q.', hold: false,
      start(I, c) { const x = c.aim.x, y = c.aim.y, z = c.aim.z; let t = 0; addEffect({ I, update(dt) { t += dt; if (Fx.near(x, y, z) < 300) for (let k = 0; k < 10; k++) { const a = Math.random() * 6.28; glowP.emit(x + Math.cos(a) * 22, y + .5, z + Math.sin(a) * 22, 0, 2, 0, 0xffe070, .5, .3, 0, 0); } if (t > .9) { explode(I, x, y, z, 23, 460, { terrMul: 1.1, fx: { col: 0xffd070, col2: 0xffffff } }); return false; } return true; } }); }
    }
  },
  rod: {
    name: 'Lightning Rod', icon: '⚡', col: '#fff06a', uses: 2, cd: 5, desc: 'Calls down repeated lightning strikes.', kind: 'elec',
    use(I, c) { placeRod(I, c.aim.x, c.aim.y, c.aim.z); Snd.play('zap', .5); return true; },
    secret: { name: 'STORM LORD', text: 'Hold Q + RMB to activate.', hold: true, acc: 0, tick(I, c, dt, st) { st.acc = (st.acc || 0) + dt; while (st.acc > .1) { st.acc -= .1; lightningBolt(I, c.aim.x + rnd(-3, 3), c.aim.z + rnd(-3, 3), 3.2, 135, .6); } } }
  },
  titan: {
    name: 'Titan Hammer', icon: '🔨', col: '#ffd45a', uses: 14, cd: 1.05, desc: 'Massive slam that shatters everything in front of you.', kind: 'melee',
    use(I, c) {
      const a = c.aim, g = a.hit && a.dist < 10 ? { x: a.x, y: a.y, z: a.z } : groundFront(I, c, 5);
      setTimeout(() => { if (!I.alive) return; Fx.explosion(g.x, g.y, g.z, 3.6, { col: 0xffd070, col2: 0xffffff, smoke: 0x7a6a50 }); I.blast(g.x, g.y, g.z, 6.8, 165, 'b', 'tool', { terrMul: 1 }); I.stats.tools++; camShake.v = Math.max(camShake.v, .5); for (let k = 0; k < 30; k++) { const a2 = k / 30 * 6.28; glowP.emit(g.x, g.y + .3, g.z, Math.cos(a2) * 14, .6, Math.sin(a2) * 14, 0xfff0b0, .4, .35, 0, 2); } }, 150);
      Snd.play('swing', .8); return true;
    },
    secret: {
      name: 'EARTHSHAKER', text: 'Hold Q + RMB to activate.', hold: true, acc: 0,
      tick(I, c, dt, st) { st.acc = (st.acc || 0) + dt; if (st.acc > .42) { st.acc = 0; st.n = (st.n || 0) + 1; const x = c.pos.x, y = c.pos.y, z = c.pos.z; Fx.explosion(x, y, z, 5, { col: 0xffd070, col2: 0xffffff }); I.blast(x, y, z, 7 + (st.n % 3) * 3.5, 140, 'b', 'tool', { terrMul: 1.2 }); camShake.v = .6; for (let k = 0; k < 36; k++) { const a2 = k / 36 * 6.28; glowP.emit(x, y + .3, z, Math.cos(a2) * 18, .6, Math.sin(a2) * 18, 0xfff0b0, .45, .4, 0, 2); } } }
    }
  },
  gravity: {
    name: 'Gravity Gun', icon: '🌀', col: '#b06bff', uses: 3, cd: 3, desc: 'Hold to rip structures loose and crush them together.', kind: 'grav', hold: true, maxHold: 3.6,
    start(I, c) { return spawnSingularity(I, c.aim.x, c.aim.y + 1.5, c.aim.z, { hold: true, r: 13, life: 99, rate: 11, finalR: 7.5, finalD: 150 }); },
    tick(I, c, s, dt, eff) { if (eff) { eff.setTarget(c.aim.x, c.aim.y + 1.8, c.aim.z); beamFx(c.from, { x: eff.x, y: eff.y, z: eff.z }, 0xb06bff); } },
    stop(eff) { if (eff) eff.stop(); },
    secret: { name: 'BLACK HOLE', text: 'Activate with Q.', hold: false, start(I, c) { spawnSingularity(I, c.aim.x, c.aim.y + 3, c.aim.z, { r: 28, life: 5, rate: 40, finalR: 14, finalD: 240 }); } }
  },
  tornado: {
    name: 'Tornado', icon: '🌪️', col: '#9be8ff', uses: 2, cd: 6, desc: 'Roams the island, shredding everything in its path.', kind: 'storm',
    use(I, c) { const a = c.aim, x = a.x, z = a.z; spawnTornado(I, x, z, c.face.x, c.face.z, { r: 5, life: 11, dps: 125, speed: 4.4 }); Snd.play('whoosh', .8); return true; },
    secret: {
      name: 'OVERDRIVE', text: 'Hold Q + RMB to activate.', hold: true, begin(I, c, st) { st.e = spawnTornado(I, c.aim.x, c.aim.z, c.face.x, c.face.z, { r: 10, life: 30, dps: 330, speed: 4.5, follow: () => st.live ? { x: c.aim.x, z: c.aim.z } : null }); },
      tick(I, c, dt, st) { st.live = true; }, endHold(st) { st.live = false; if (st.e) st.e.life = Math.min(st.e.life, st.e.t + 1.2); }
    }
  },
  meteor: {
    name: 'Meteor', icon: '☄️', col: '#ff4a2a', uses: 3, cd: 4.5, desc: 'Very powerful single impact that carves a large crater.', kind: 'blast', explosive: true,
    use(I, c) { castMeteor(I, c.aim.x, c.aim.z, { r: 9, dmg: 330, delay: 1.1 }); I.stats.explosives++; return true; },
    secret: { name: 'APOCALYPSE', text: 'Activate with Q.', hold: false, start(I, c) { const x = c.aim.x, z = c.aim.z; let t = 0, n = 0; addEffect({ I, update(dt) { t += dt; while (n < 14 && t > n * .33) { n++; const a = Math.random() * 6.28, d = Math.random() * 14; castMeteor(I, x + Math.cos(a) * d, z + Math.sin(a) * d, { r: 7, dmg: 250, delay: .5, stat: false }); } return t < 5.2; } }); I.stats.explosives += 3; } }
  },
  freeze: {
    name: 'Freeze Ray', icon: '❄️', col: '#6bd8ff', uses: 3, cd: 2.5, desc: 'Freezes structures and makes them far more fragile.', kind: 'frost', hold: true, maxHold: 6,
    start() { return {}; },
    tick(I, c, s, dt) { const a = c.aim; beamFx(c.from, a, 0x9fe8ff); freezeBeamAcc += dt; if (freezeBeamAcc > .06) { freezeBeamAcc = 0; freezeAt(I, a.x, a.y, a.z, 3.4); if (Math.random() < .2) Snd.play('ice', .3); } },
    stop() { }, secret: {
      name: 'ABSOLUTE ZERO', text: 'Activate with Q.', hold: false, start(I, c) {
        let t = 0; const cx = c.pos.x, cz = c.pos.z; Snd.play('ice', 1);
        addEffect({ I, update(dt) { t += dt; const r = t * 24; for (const p of I.pieces) if (p.alive && !p.frozen && Math.hypot(p.x - cx, p.z - cz) < r) I.freeze(p); if (Fx.near(cx, c.pos.y, cz) < 200) for (let k = 0; k < 20; k++) { const a = Math.random() * 6.28; glowP.emit(cx + Math.cos(a) * r, c.pos.y + .5, cz + Math.sin(a) * r, 0, 3, 0, 0xcff4ff, .5, .4, 0, 0); } return r < 70; } });
      }
    }
  },
  saw: {
    name: 'Saw Drone', icon: '⚙️', col: '#cfd6e0', uses: 2, cd: 2.5, desc: 'An independent drone that cuts structures while you work elsewhere.', kind: 'drone',
    use(I, c) { spawnDrone(I, { x: c.from.x, y: c.from.y + .5, z: c.from.z }, { life: 15, dps: 80 }); Snd.play('pick', .6); return true; },
    secret: { name: 'SWARM', text: 'Activate with Q.', hold: false, start(I, c) { for (let k = 0; k < 7; k++) spawnDrone(I, { x: c.from.x + rnd(-2, 2), y: c.from.y + 1 + k * .2, z: c.from.z + rnd(-2, 2) }, { life: 6, dps: 200, speed: 17 }); Snd.play('pick', 1); } }
  },
  inferno: {
    name: 'Inferno', icon: '🔥', col: '#ff8a1a', uses: 2, cd: 4.5, desc: 'A spreading fire, devastating on wood, foliage and ice.', kind: 'fire',
    use(I, c) { launch({ I, x: c.from.x, y: c.from.y, z: c.from.z, tx: c.aim.x, ty: c.aim.y, tz: c.aim.z, size: .4, color: 0xff7a1a, emissive: 0xff5500, onHit: (x, y, z) => { Fx.explosion(x, y, z, 3, { col: 0xff7a1a }); spawnFireZone(I, x, y, z, 4.8, 12); Snd.play('fire', .8); } }); return true; },
    secret: { name: 'WILDFIRE', text: 'Activate with Q.', hold: false, start(I, c) { let t = 0; Snd.play('fire', 1); addEffect({ I, update(dt) { t += dt; const r = t * 14; for (const p of I.pieces) if (p.alive && p.mat.flam && !p.burn && Math.hypot(p.x - c.pos.x, p.z - c.pos.z) < r) I.ignite(p, 10); return r < 60; } }); } }
  }
};
const ITEM_IDS = Object.keys(ITEMS);
/* ---------- player hold items + secret powers ---------- */
function tickHeld(dt) {
  const I = Game.pi;
  for (let i = 0; i < P.slots.length; i++) {
    const s = P.slots[i]; if (s.kit) continue; const d = ITEMS[s.id]; if (!d.hold) continue;
    const active = s.active && (i === P.sel);
    const want = i === P.sel && Input.mouse.l && !Game.menuLock && P.stun <= 0;
    if (want && !s.active && Game.t >= s.cdEnd && s.uses > 0) { s.active = true; s.t = 0; s.uses--; I.stats.major++; s.eff = d.start(I, ctxFor('player')); P.aimT = .6; }
    if (s.active) {
      if (!want || s.t >= d.maxHold || i !== P.sel) { s.active = false; d.stop && d.stop(s.eff); s.eff = null; s.cdEnd = Game.t + s.cdDur; if (s.uses <= 0) { P.slots.splice(i, 1); P.sel = clamp(P.sel, 0, P.slots.length - 1); } break; }
      s.t += dt; P.aimT = .4; d.tick(I, ctxFor('player'), s, dt, s.eff);
    }
  }
}
function giveSecret(id) {
  const d = ITEMS[id].secret; P.secret = { id, def: d, left: 5, used: false, expire: Game.t + (d.hold ? 14 : 10), st: {}, active: false };
  Game.pi.stats.secret = true; Fx.fireworks(P.pos.x, P.pos.y, P.pos.z); Snd.play('secret', 1);
  if (window.UI) UI.secretBanner(ITEMS[id].name.toUpperCase(), d);
}
function tickSecret(dt) {
  const s = P.secret; if (!s) return; const d = s.def, I = Game.pi;
  if (Game.t > s.expire) { P.secret = null; return; }
  const c = ctxFor('player');
  if (d.hold) {
    const on = Input.keys.KeyQ && Input.mouse.r;
    if (on && s.left > 0) { if (!s.active) { s.active = true; d.begin && d.begin(I, c, s.st); } s.left -= dt; d.tick(I, c, dt, s.st); P.aimT = .4; }
    else if (s.active) { s.active = false; d.endHold && d.endHold(s.st); }
    if (s.left <= 0) { if (s.active) d.endHold && d.endHold(s.st); P.secret = null; }
  } else if (Input.pressed.KeyQ && !s.used) { s.used = true; d.start(I, c); I.stats.major++; P.aimT = .6; P.swing = .3; P.swingT = 0; P.hitDone = true; s.expire = Game.t + .5; Snd.play('secret', .7); }
}
/* generic timed hold runner (used by bots) */
function runHold(I, def, ctx, secs) { const slot = { t: 0 }; const eff = def.start ? def.start(I, ctx) : null; let t = 0; addEffect({ I, update(dt) { t += dt; def.tick(I, ctx, slot, dt, eff); return t < secs; }, end() { def.stop && def.stop(eff); } }); }

/* ---------- hazards / environmental escalation ---------- */
const Hazards = {
  flood(I) {
    if (I.floodedOnce) return; I.floodedOnce = true;
    const o = I.damDir; if (!o) return; if (I.reservoir) { I.reservoir.scale.y = .15; I.reservoir.position.y -= 1.6; }
    const wall = new T.Mesh(new T.BoxGeometry(18, 7, 4), waterMat); wall.position.set(o.x, o.y + 3, o.z + 2); scene.add(wall);
    let t = 0; Snd.play('whoosh', 1); camShake.v = Math.max(camShake.v, .4);
    if (window.UI) UI.toast('THE DAM BROKE — FLOOD INCOMING', 'warn');
    addEffect({
      I, update(dt) {
        t += dt; wall.position.z += 12 * dt; wall.scale.y = 1 + Math.sin(t * 6) * .08; const z = wall.position.z;
        if (Fx.near(wall.position.x, wall.position.y, z) < 250) for (let k = 0; k < 10; k++) dustP.emit(wall.position.x + rnd(-9, 9), o.y + rnd(1, 6), z + 2 + rnd(-.5, 1), rnd(-1, 1), rnd(0, 3), rnd(2, 6), 0xdff8ff, rnd(.8, 1.6), rnd(.6, 1), -1, 1);
        I.queryBox(o.x - 9, o.y - 2, z - 2, o.x + 9, o.y + 8, z + 4, p => { const w = p.mat.mult.w; I.damagePiece(p, (p.washable ? 700 : (w ? 250 : 30)) * dt * (p.terr ? .1 : 1), 'g', 'tool', 0, .3, 1); });
        if (Game.pi === I) { if (Math.abs(P.pos.x - o.x) < 9 && P.pos.z > z - 2 && P.pos.z < z + 4 && P.pos.y < o.y + 8) { P.vel.z += 50 * dt; P.vel.y = Math.max(P.vel.y, 3); } }
        return t < 4.2;
      }, end() { scene.remove(wall); }
    });
  },
  eruptionBomb(I) {
    const v = I.volcano; if (!v) return; const t = randTarget(I, .7);
    Fx.explosion(v.x, v.y, v.z, 3.5, { col: 0xff5a1a }); Snd.play('boom', .5);
    launch({ I, x: v.x, y: v.y, z: v.z, tx: t.x, ty: t.y, tz: t.z, T: 1.6, size: .9, color: 0xff5a1a, emissive: 0xff3300, trail: 0xff8a2a, onHit: (x, y, z) => { explode(I, x, y, z, 4.8, 120, { ignite: .6, fx: { col: 0xff5a1a }, stat: false }); } });
  },
  quake(I) {
    const near = Game.pi === I; if (near) { camShake.v = Math.max(camShake.v, .9); if (window.UI) UI.toast('EARTHQUAKE', 'warn'); } Snd.play('crumble', near ? 1 : .2);
    for (let k = 0; k < 14; k++) { const t = randTarget(I, .8); I.blast(t.x, t.y, t.z, 2.6, 26, 'g', 'tool'); Fx.dust(t.x, t.y, t.z, 4, 0xbbb2a0, 2, 1); }
  },
  meteor(I) { const t = randTarget(I, .4); castMeteor(I, t.x, t.z, { r: 5.5, dmg: 170, delay: .9, stat: false }); },
  lightning(I) {
    if (I.theme === 'noctyra' && Math.random() < .6) { const cr = I.pieces.filter(p => p.alive && p.crystal); if (cr.length) { const p = cr[(Math.random() * cr.length) | 0]; lightningBolt(I, p.x, p.z, 2, 80, 0); I.damagePiece(p, 999, 'e', 'tool'); return; } }
    const t = randTarget(I, .5); lightningBolt(I, t.x, t.z, 3, 100, .5);
  },
  update(I, dt, level) {
    if (!I.hz) I.hz = { m: 0, l: 0, e: 0, q: 0, f: false };
    const h = I.hz; level = Math.max(0, level);
    if (level <= 0 && I.theme !== 'ignis') return;
    h.m += dt * .22 * level; h.l += dt * .35 * level; h.q += dt * .06 * level;
    if (I.theme === 'ignis') h.e += dt * (.1 + .55 * level);
    if (h.m >= 1) { h.m = 0; this.meteor(I); }
    if (h.l >= 1) { h.l = 0; this.lightning(I); }
    if (h.e >= 1) { h.e = 0; this.eruptionBomb(I); }
    if (h.q >= 1 && (I.theme === 'nivara' || I.theme === 'aridia')) { h.q = 0; this.quake(I); } else if (h.q >= 1) h.q = 0;
    if (I.theme === 'aquaris' && level > .55 && !h.f && I.damDir) { h.f = true; const dm = I.pieces.find(p => p.alive && p.dam); if (dm) I.damagePiece(dm, 9999, 'g', 'tool'); }
  }
};
function attachHazards(I) { I.hooks.dam = () => Hazards.flood(I); }
