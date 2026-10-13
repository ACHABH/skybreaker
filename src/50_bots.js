/* =====================================================================
   SKYBREAK — AI rivals
   ===================================================================== */
const BOT_NAMES = ['KIRA', 'BOLT', 'NOVA', 'REX', 'JUNO', 'ZED'];
const BOT_COLS = [0xff4d6d, 0x5be7ff, 0x9dff6b, 0xc27bff, 0xffd45a, 0xff9a3c];
const DIFF = { rookie: [11, 14], normal: [8, 10.6], expert: [6, 8.2] };
const ITEM_W = { mega: 1.25, meteor: 1.25, tornado: 1, titan: 1.05, rod: .95, gravity: .9, freeze: .6, saw: .85, inferno: .8 };
const THEME_BOOST = { verdantia: { inferno: 1.8, saw: 1.3, tornado: 1.2 }, ignis: { meteor: .8, mega: 1.2, rod: 1.1 }, nivara: { mega: 1.3, meteor: 1.2, freeze: 1.5, titan: 1.2 }, aridia: { tornado: 1.4, gravity: 1.2 }, aquaris: { rod: 1.4, tornado: 1.2 }, noctyra: { rod: 1.4, mega: 1.2 } };
class Bot {
  constructor(I, idx, diff) {
    this.I = I; this.idx = idx; this.name = BOT_NAMES[idx % 6]; this.col = BOT_COLS[idx % 6];
    this.av = makeAvatar(this.col, pick([0xffffff, 0xffd45a, 0x2c3350, 0xff4d6d])); scene.add(this.av);
    this.pos = new V3().copy(I.spawn); this.target = null; this.items = []; this.secret = null; this.secretT = 0; this.secretUsed = false;
    const [a, b] = DIFF[diff] || DIFF.normal; this.finish = rnd(a, b) * 60; this.skill = rnd(.9, 1.1);
    this.bombCd = rnd(3, 6); this.itemCd = 4; this.thinkT = 0; this.gt = 0; this.swing = 0; this.speed = 0; this.yaw = 0; this.gy = I.spawn.y; this.walk = new V3();
    this.tx = I.spawn.x; this.tz = I.spawn.z; this.name2 = this.name;
  }
  want(t) { return clamp(Math.pow(Math.max(0, t - 4) / this.finish, 1.15), 0, 1); }
  pickTarget() {
    const I = this.I; let best = null, bs = -1;
    for (let k = 0; k < 14; k++) { const p = I.pieces[(Math.random() * I.pieces.length) | 0]; if (!p.alive || p.phased || p.collapseT >= 0) continue; if ((p.crystal || p.explosive) && !(this.err > .1)) continue; const s = p.w + (p.terr ? 0 : 1.5) + Math.random(); if (s > bs) { bs = s; best = p; } }
    this.target = best;
    if (best) { const a = Math.random() * 6.28; this.tx = best.x + Math.cos(a) * 6; this.tz = best.z + Math.sin(a) * 6; const c = Math.hypot(this.tx - I.cx, this.tz - I.cz), R = I.R0 * VX * .8; if (c > R) { this.tx = I.cx + (this.tx - I.cx) / c * R; this.tz = I.cz + (this.tz - I.cz) / c * R; } }
  }
  ctx() {
    const t = this.target || { x: this.I.cx, y: this.I.cy, z: this.I.cz, maxY: this.I.cy, sy: 0, sx: 1 };
    const tx = t.x, ty = t.maxY !== undefined ? t.maxY : t.y, tz = t.z, dx = tx - this.pos.x, dz = tz - this.pos.z, d = Math.hypot(dx, dz) || 1;
    return { who: 'bot', from: { x: this.pos.x, y: this.pos.y + 1.5, z: this.pos.z }, aim: { x: tx, y: ty, z: tz, hit: true, dist: d }, dir: new V3(dx / d, -.2, dz / d), face: new V3(dx / d, 0, dz / d), pos: this.pos };
  }
  claim(id, isSecret) {
    this.items.push({ id, uses: ITEMS[id].uses, cdEnd: 0 }); this.I.stats.items++;
    if (isSecret) { this.secret = id; this.secretT = rnd(1.5, 3.5); this.secretUsed = false; this.I.stats.secret = true; Fx.fireworks(this.pos.x, this.pos.y, this.pos.z); if (window.UI) UI.toast(this.name + ' found a SECRET POWER!', 'secret'); Snd.play('secret', .5); }
  }
  update(dt, t) {
    const I = this.I; if (!I.alive) return;
    const actual = 1 - I.integrity() / 100, err = this.want(t) - actual; this.err = err;
    this.thinkT -= dt; if (!this.target || !this.target.alive || this.thinkT <= 0) { this.pickTarget(); this.thinkT = rnd(3, 6); }
    // walk
    const dx = this.tx - this.pos.x, dz = this.tz - this.pos.z, d = Math.hypot(dx, dz);
    this.speed = 0; if (d > 1.2) { const s = 6.6 * dt; this.pos.x += dx / d * s; this.pos.z += dz / d * s; this.speed = 6.6; this.yaw = Math.atan2(-dx, -dz); }
    this.gt -= dt; if (this.gt <= 0) { this.gt = .25; const g = I.groundAt(this.pos.x, this.pos.z, I.cy + 26); if (g !== null) this.gy = g; else { this.tx = I.spawn.x; this.tz = I.spawn.z; } }
    this.pos.y += (this.gy - this.pos.y) * Math.min(1, dt * 12);
    // attacks
    this.bombCd -= dt; this.itemCd -= dt; this.swing = Math.max(0, this.swing - dt);
    const tgt = this.target;
    if (t > 3 && tgt && err > -.012) {
      const td = Math.hypot(tgt.x - this.pos.x, tgt.z - this.pos.z);
      if (this.bombCd <= 0 && td < 24) {
        const mul = clamp(1 + err * 9, .75, 2.1); this.swing = .3; this.yaw = Math.atan2(-(tgt.x - this.pos.x), -(tgt.z - this.pos.z));
        throwBomb(I, { x: this.pos.x, y: this.pos.y + 1.5, z: this.pos.z }, { x: tgt.x + rnd(-1.5, 1.5), y: tgt.maxY, z: tgt.z + rnd(-1.5, 1.5) }, { r: 4.8, dmg: 72 * mul, opts: { knock: 0 } });
        this.bombCd = (err > .08 ? .85 : err > .03 ? 1.6 : 2.6) / this.skill + rnd(0, .8);
      }
      if (this.itemCd <= 0 && this.items.length && td < 30) {
        const s = this.items.find(i => i.uses > 0 && t >= i.cdEnd);
        if (s) {
          const def = ITEMS[s.id], c = this.ctx();
          if (def.hold) runHold(I, def, c, def.maxHold * .85); else def.use(I, c, s);
          s.uses--; s.cdEnd = t + def.cd; this.swing = .3; I.stats.major++; this.itemCd = def.cd + rnd(2, 5) / this.skill;
          if (s.uses <= 0) this.items.splice(this.items.indexOf(s), 1);
        } else this.itemCd = 1;
      }
    }
    if (this.secret && !this.secretUsed) {
      this.secretT -= dt;
      if (this.secretT <= 0 && this.target) {
        this.secretUsed = true; const sd = ITEMS[this.secret].secret, c = this.ctx(), st = {};
        if (sd.hold) { let tt = 0; if (sd.begin) sd.begin(I, c, st); addEffect({ I, update: dt2 => { tt += dt2; const cc = this.ctx(); Object.assign(c.aim, cc.aim); sd.tick(I, c, dt2, st); return tt < 5; }, end() { sd.endHold && sd.endHold(st); } }); }
        else sd.start(I, c);
        I.stats.major++;
      }
    }
    this.av.position.set(this.pos.x, this.pos.y, this.pos.z); this.av.rotation.y = this.yaw; updateAvatar(this.av, dt, this.speed, this.swing, t);
  }
  dispose() { scene.remove(this.av); this.av.traverse(m => { if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); }); }
}
