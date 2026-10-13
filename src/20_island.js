/* =====================================================================
   SKYBREAK — destructible island model
   ===================================================================== */
const VX = 3; // terrain voxel size
const IK = {
  box: new T.BoxGeometry(1, 1, 1), cyl: new T.CylinderGeometry(.5, .5, 1, 8), cone: new T.ConeGeometry(.5, 1, 7),
  pyr: (() => { const g = new T.ConeGeometry(.7071, 1, 4); g.rotateY(Math.PI / 4); return g; })(), ico: new T.IcosahedronGeometry(.5, 0)
};
const ISLMAT = new T.MeshPhongMaterial({ flatShading: true, shininess: 6, specular: 0x222222 });
const GLOWMAT = new T.MeshBasicMaterial({});
// damage types: b blunt, p pick, x blast, f fire, e electric, s saw, c crush, g generic/env, w water
const MATS = {
  grass: { hp: 30, col: 0x5fbf4a, mult: { p: .85, x: 1.2 }, flam: .25 },
  dirt: { hp: 26, col: 0x8a5a3a, mult: {} },
  rock: { hp: 58, col: 0x7d7f86, mult: { b: .7, p: 2.2, s: .7, f: 0 } },
  wood: { hp: 28, col: 0x9b6a3c, mult: { b: 1.3, s: 2.2, f: 2.6, e: 1.2, w: 2 }, flam: 1 },
  leaf: { hp: 10, col: 0x3fae45, mult: { s: 2, f: 3.5, x: 1.4, w: 1.5 }, flam: 1 },
  brick: { hp: 44, col: 0xb46a4a, mult: { b: .9, p: 1.6, f: .1 } },
  stone: { hp: 52, col: 0x9a9aa4, mult: { b: .8, p: 2, f: 0 } },
  obsidian: { hp: 105, col: 0x1b1626, mult: { b: .5, p: 2.4, s: .5, f: 0, x: 1.1 } },
  basalt: { hp: 70, col: 0x3a3a46, mult: { b: .7, p: 2.2, f: 0 } },
  ice: { hp: 15, col: 0xa8e0ff, mult: { b: 1.6, x: 1.45, c: 1.5, f: 1.4, p: 1.3 }, flam: 0 },
  snow: { hp: 16, col: 0xf0f8ff, mult: { b: 1.4, x: 1.3, f: 1.6 } },
  sand: { hp: 14, col: 0xe8c987, mult: { x: 1.3, b: 1.2 } },
  sandstone: { hp: 38, col: 0xd7a867, mult: { p: 1.8, b: .9, f: 0 } },
  coral: { hp: 22, col: 0xff7a9a, mult: { b: 1.3, w: 2.2, x: 1.2 }, flam: 0 },
  crystal: { hp: 30, col: 0xb36bff, mult: { e: 1.8, b: 1.1 } },
  metal: { hp: 70, col: 0x8a93a6, mult: { b: .6, p: 1.2, e: 1.6, f: 0 } },
  core: { hp: 230, col: 0xff4a2a, mult: { b: .7, p: .7, f: 0 } },
  heart: { hp: 260, col: 0xffd45a, mult: { b: .8, f: .3 } }
};
const CHARC = new T.Color(0x1a1512), ICEC = new T.Color(0xa8e6ff), FIREC = new T.Color(0xff7a20), WHITEC = new T.Color(1, 1, 1);
const _tc = new T.Color();
function newStats() { return { pieces: 0, terrain: 0, score: 0, chainMax: 0, collapseMax: 0, items: 0, secret: false, falls: 0, tools: 0, explosives: 0, major: 0, weightKilled: 0 }; }
function setInst(a, i, x, y, z, sx, sy, sz, ry) {
  const o = i * 16, c = Math.cos(ry), s = Math.sin(ry);
  a[o] = c * sx; a[o + 1] = 0; a[o + 2] = -s * sx; a[o + 3] = 0; a[o + 4] = 0; a[o + 5] = sy; a[o + 6] = 0; a[o + 7] = 0;
  a[o + 8] = s * sz; a[o + 9] = 0; a[o + 10] = c * sz; a[o + 11] = 0; a[o + 12] = x; a[o + 13] = y; a[o + 14] = z; a[o + 15] = 1;
}
const cellKey = (i, j, k) => ((i + 512) * 1024 + (j + 512)) * 1024 + (k + 512);
const CS = 4;
const THRESH = 3; // integrity % at which an island counts as destroyed (remaining rubble crumbles)

class Island {
  constructor(kind, cx, cy, cz, opts = {}) {
    this.kind = kind; this.theme = opts.theme || kind; this.cx = cx; this.cy = cy; this.cz = cz; this.opts = opts;
    this.pieces = []; this.groups = []; this.curGroup = -1; this.grid = new Map(); this.qid = 0; this.stampN = 0;
    this.collapsing = []; this.fires = []; this.flashing = new Set(); this.pending = []; this.dirtyStab = false; this.dead = [];
    this.stats = newStats(); this.chain = { n: 0, t: 0, startInt: 100, groups: new Set(), terrN: 0 };
    this.group = new T.Group(); scene.add(this.group);
    this.hooks = {}; this.alive = true; this.custom = null; this.fxScale = 1; this.finalizing = false; this.destroyed = false;
    this.totalW = 0; this.aliveW = 0; this.heights = new Map(); this.terrainSupport = !!opts.terrainSupport;
    this.radius = 26; this.minY = cy - 30; this.maxY = cy + 30; this.spawn = new T.Vector3(cx, cy + 1, cz);
    this.decor = []; this.updaters = []; this.lavaLevel = -999; this.selfFallW = 0; this.owner = null; this.t = 0;
    this.rng = mulberry32(opts.seed || ((Math.random() * 1e9) | 0));
  }
  newGroup(name) { this.groups.push({ name, idx: this.groups.length, n: 0, dead: 0, pieces: [] }); this.curGroup = this.groups.length - 1; return this.curGroup; }
  add(o) {
    const m = MATS[o.m]; if (!m) throw new Error('unknown mat ' + o.m);
    const shape = o.k || 'box', k = shape + (o.glow ? 'G' : '');
    const p = {
      id: this.pieces.length, k, shape, x: o.x + this.cx, y: o.y + this.cy, z: o.z + this.cz, sx: o.sx, sy: o.sy, sz: o.sz, ry: o.ry || 0, m: o.m, mat: m,
      base: new T.Color(o.c !== undefined ? o.c : m.col), alive: true, g: o.terr ? -1 : this.curGroup, anchor: !!o.anchor, terr: !!o.terr,
      solid: o.solid !== undefined ? o.solid : (shape === 'box' || shape === 'cyl'), deps: [], supExtra: o.sup || null, nsup: 0, reach: 0, collapseT: -1,
      burn: 0, burnT: 0, frozen: false, charred: false, flash: 0, phased: false, ii: 0, q: 0, regrow: !!o.regrow
    };
    if (o.f) Object.assign(p, o.f);
    const c = Math.abs(Math.cos(p.ry)), s = Math.abs(Math.sin(p.ry)), hx = p.sx / 2, hz = p.sz / 2;
    const ex = c * hx + s * hz, ez = s * hx + c * hz;
    p.minX = p.x - ex; p.maxX = p.x + ex; p.minZ = p.z - ez; p.maxZ = p.z + ez; p.minY = p.y; p.maxY = p.y + p.sy;
    const vf = shape === 'cone' || shape === 'pyr' ? .33 : shape === 'ico' ? .52 : shape === 'cyl' ? .8 : 1;
    const vol = p.sx * p.sy * p.sz * vf;
    p.vol = vol; p.w = o.w !== undefined ? o.w : (o.terr ? (o.tw || 1) : clamp(vol / 27, 0.25, 3));
    p.maxHp = p.hp = (o.hp !== undefined ? o.hp : m.hp) * (o.hpMul || 1);
    this.pieces.push(p);
    if (this.curGroup >= 0 && !o.terr) { const g = this.groups[this.curGroup]; g.n++; g.pieces.push(p); }
    return p;
  }
  finalize() {
    const counts = {};
    for (const p of this.pieces) { counts[p.k] = (counts[p.k] || 0) + 1; p.ii = counts[p.k] - 1; }
    this.meshes = {};
    for (const k in counts) {
      const glow = k.endsWith('G'), shape = glow ? k.slice(0, -1) : k;
      const mesh = new T.InstancedMesh(IK[shape], glow ? GLOWMAT : ISLMAT, counts[k]);
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      mesh.instanceColor = new T.InstancedBufferAttribute(new Float32Array(counts[k] * 3), 3);
      mesh.frustumCulled = false; mesh.castShadow = !glow; mesh.receiveShadow = !glow; this.group.add(mesh); this.meshes[k] = mesh;
    }
    let minY = 1e9, maxY = -1e9, rad = 0;
    for (const p of this.pieces) {
      this.writeM(p); this.refreshColor(p);
      minY = Math.min(minY, p.minY); maxY = Math.max(maxY, p.maxY); rad = Math.max(rad, Math.hypot(p.x - this.cx, p.z - this.cz) + 3);
      this.totalW += p.w;
      const i0 = Math.floor(p.minX / CS), i1 = Math.floor(p.maxX / CS), j0 = Math.floor(p.minY / CS), j1 = Math.floor(p.maxY / CS), k0 = Math.floor(p.minZ / CS), k1 = Math.floor(p.maxZ / CS);
      for (let i = i0; i <= i1; i++)for (let j = j0; j <= j1; j++)for (let k = k0; k <= k1; k++) {
        const key = cellKey(i, j, k); let a = this.grid.get(key); if (!a) { a = []; this.grid.set(key, a); } a.push(p);
      }
    }
    this.aliveW = this.totalW; this.minY = minY; this.maxY = maxY + 10; this.radius = rad;
    // support graph
    for (const p of this.pieces) {
      if (p.anchor) continue;
      const sups = new Set();
      this.queryBox(p.minX + .06, p.minY - .45, p.minZ + .06, p.maxX - .06, p.minY + .1, p.maxZ - .06, q => {
        if (q === p || q.maxY > p.minY + .45 || q.maxY < p.minY - .45) return;
        const ox = Math.min(p.maxX, q.maxX) - Math.max(p.minX, q.minX), oz = Math.min(p.maxZ, q.maxZ) - Math.max(p.minZ, q.minZ);
        if (ox > .1 && oz > .1) sups.add(q);
      });
      if (p.supExtra) for (const q of p.supExtra) sups.add(q);
      for (const q of sups) { q.deps.push(p); p.nsup++; }
    }
    let orphans = 0;
    for (const p of this.pieces) if (!p.anchor && p.nsup === 0) { p.anchor = true; orphans++; }
    this.orphans = orphans;
    this.stampN++; this.updateStability(true);
  }
  writeM(p, jx = 0, jy = 0, jz = 0) {
    const m = this.meshes[p.k]; setInst(m.instanceMatrix.array, p.ii, p.x + jx, p.y + p.sy / 2 + jy, p.z + jz, p.sx, p.sy, p.sz, p.ry); m.instanceMatrix.needsUpdate = true;
  }
  hide(p) { const m = this.meshes[p.k], a = m.instanceMatrix.array, o = p.ii * 16; a[o] = a[o + 5] = a[o + 10] = 0; a[o + 1] = a[o + 2] = a[o + 8] = a[o + 9] = 0; m.instanceMatrix.needsUpdate = true; }
  refreshColor(p) {
    const c = _tc.copy(p.base);
    if (p.charred) c.lerp(CHARC, .65);
    if (p.frozen) c.lerp(ICEC, .55);
    const d = 1 - p.hp / p.maxHp; if (d > 0) c.multiplyScalar(1 - .38 * d);
    if (p.burn > 0) c.lerp(FIREC, .35 + .25 * Math.sin(this.t * 22 + p.id));
    if (p.collapseT >= 0) c.lerp(WHITEC, .25);
    if (p.flash > 0) c.lerp(WHITEC, .65);
    const m = this.meshes[p.k], a = m.instanceColor.array, o = p.ii * 3; a[o] = c.r; a[o + 1] = c.g; a[o + 2] = c.b; m.instanceColor.needsUpdate = true;
  }
  /* ----- queries ----- */
  queryBox(x0, y0, z0, x1, y1, z1, fn) {
    const q = ++this.qid;
    const i0 = Math.floor(x0 / CS), i1 = Math.floor(x1 / CS), j0 = Math.floor(y0 / CS), j1 = Math.floor(y1 / CS), k0 = Math.floor(z0 / CS), k1 = Math.floor(z1 / CS);
    for (let i = i0; i <= i1; i++)for (let j = j0; j <= j1; j++)for (let k = k0; k <= k1; k++) {
      const a = this.grid.get(cellKey(i, j, k)); if (!a) continue;
      for (let n = 0; n < a.length; n++) {
        const p = a[n]; if (!p.alive || p.q === q) continue; p.q = q;
        if (p.maxX < x0 || p.minX > x1 || p.maxY < y0 || p.minY > y1 || p.maxZ < z0 || p.minZ > z1) continue;
        fn(p);
      }
    }
  }
  pointSolid(x, y, z, all) {
    const a = this.grid.get(cellKey(Math.floor(x / CS), Math.floor(y / CS), Math.floor(z / CS))); if (!a) return null;
    for (let n = 0; n < a.length; n++) {
      const p = a[n]; if (!p.alive || p.phased || (!all && !p.solid)) continue;
      if (x >= p.minX && x <= p.maxX && y >= p.minY && y <= p.maxY && z >= p.minZ && z <= p.maxZ) return p;
    }
    return null;
  }
  rayHit(ox, oy, oz, dx, dy, dz, maxD, step = .25) {
    let px = ox, py = oy, pz = oz;
    for (let t = 0; t < maxD; t += step) {
      const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t;
      const p = this.pointSolid(x, y, z, true);
      if (p) return { p, t, x, y, z, px, py, pz };
      px = x; py = y; pz = z;
    }
    return null;
  }
  groundAt(x, z, fromY) {
    for (let y = fromY; y > this.minY - 2; y -= .5) { const p = this.pointSolid(x, y, z); if (p) return p.maxY; }
    return null;
  }
  integrity() { return Math.max(0, 100 * this.aliveW / this.totalW); }
  /* ----- damage ----- */
  damagePiece(p, amt, type = 'g', cause = 'tool', dx = 0, dy = 0, dz = 0) {
    if (!p.alive || p.phased || this.destroyed && !this.finalizing) return false;
    let mul = p.mat.mult[type]; if (mul === undefined) mul = 1;
    if (p.frozen && type !== 'f' && type !== 'i') mul *= 2.4;
    amt *= mul; if (amt <= 0) return false;
    p.hp -= amt;
    if (p.hp <= 0) { this.kill(p, cause, { dx, dy, dz, power: amt / p.maxHp }); return true; }
    p.flash = .12; this.flashing.add(p); this.refreshColor(p);
    return false;
  }
  blast(x, y, z, r, dmg, type = 'x', cause = 'tool', o = {}) {
    let kills = 0; const q = ++this.qid;
    const i0 = Math.floor((x - r) / CS), i1 = Math.floor((x + r) / CS), j0 = Math.floor((y - r) / CS), j1 = Math.floor((y + r) / CS), k0 = Math.floor((z - r) / CS), k1 = Math.floor((z + r) / CS);
    for (let i = i0; i <= i1; i++)for (let j = j0; j <= j1; j++)for (let k = k0; k <= k1; k++) {
      const a = this.grid.get(cellKey(i, j, k)); if (!a) continue;
      for (let n = 0; n < a.length; n++) {
        const p = a[n]; if (!p.alive || p.q === q || p.phased) continue; p.q = q;
        const ddx = Math.max(p.minX - x, 0, x - p.maxX), ddy = Math.max(p.minY - y, 0, y - p.maxY), ddz = Math.max(p.minZ - z, 0, z - p.maxZ);
        const d = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz); if (d >= r) continue;
        const f = Math.pow(1 - d / r, .75);
        let amt = dmg * f; if (p.terr && o.terrMul !== undefined) amt *= o.terrMul;
        let ux = p.x - x, uy = p.y + p.sy / 2 - y, uz = p.z - z; const L = Math.hypot(ux, uy, uz) || 1;
        if (this.damagePiece(p, amt, type, cause, ux / L, uy / L + .4, uz / L)) kills++;
        else if (o.ignite && p.mat.flam && Math.random() < o.ignite * f) this.ignite(p);
        if (o.freeze && Math.random() < o.freeze * (1 - d / r + .2)) this.freeze(p);
      }
    }
    return kills;
  }
  kill(p, cause = 'tool', o = {}) {
    if (!p.alive) return; p.alive = false; this.aliveW -= p.w; this.hide(p); p.burn = 0; this.dirtyStab = true; this.dead.push({ p, t: this.t });
    this.flashing.delete(p);
    const g = this.groups[p.g]; if (g) g.dead++;
    this.registerKill(p, cause);
    const cx = p.x, cy = p.y + p.sy / 2, cz = p.z, sz = Math.cbrt(p.vol);
    const col = _tc.copy(p.base); if (p.frozen) col.lerp(ICEC, .5); if (p.charred) col.lerp(CHARC, .6);
    const fs = this.fxScale;
    if (cause === 'pull') {
      this.lastDebris = debris.spawn({ x: cx, y: cy, z: cz, vx: rnd(-2, 2), vy: rnd(0, 3), vz: rnd(-2, 2), sx: Math.min(p.sx, 3) * .8, sy: Math.min(p.sy, 3) * .8, sz: Math.min(p.sz, 3) * .8, col, life: 8, held: true, spin: 6, isl: null });
    } else if (cause === 'collapse' || cause === 'fall') {
      const k = p.shape === 'box' || p.shape === 'cyl' ? 1 : .75;
      debris.spawn({ x: cx, y: cy, z: cz, vx: rnd(-1.5, 1.5), vy: rnd(0, 1.2), vz: rnd(-1.5, 1.5), rx: 0, ry: p.ry, rz: 0, spin: 1.4, sx: Math.min(p.sx, 6) * k, sy: Math.min(p.sy, 6) * k, sz: Math.min(p.sz, 6) * k, col, heavy: cause === 'collapse', mass: Math.max(1, p.vol / 2.5), life: 6, isl: this, grace: .2 });
    } else {
      const n = Math.max(1, Math.ceil(clamp(Math.round(sz * 1.15), 2, 6) * fs));
      const spd = 4 + clamp((o.power || 1), 0, 3) * 3, ux = o.dx || 0, uy = o.dy || .5, uz = o.dz || 0;
      for (let i = 0; i < n; i++) {
        const s = sz * rnd(.2, .42);
        debris.spawn({ x: cx + rnd(-.5, .5) * p.sx * .6, y: cy + rnd(-.5, .5) * p.sy * .6, z: cz + rnd(-.5, .5) * p.sz * .6, vx: ux * spd * rnd(.5, 1.2) + rnd(-2, 2), vy: uy * spd * rnd(.5, 1.2) + rnd(1, 4), vz: uz * spd * rnd(.5, 1.2) + rnd(-2, 2), sx: s, sy: s * rnd(.7, 1.2), sz: s, col, life: rnd(1.6, 3), isl: this });
      }
    }
    if (fs > .5) Fx.dust(cx, cy, cz, 1 + Math.floor(sz * .6), col.getHex(), 1.6, .5 + sz * .22);
    if (p.explosive) this.pending.push({ t: .07, x: cx, y: cy, z: cz, r: 7, d: 130, type: 'x', cause: 'chain', col: 0xff5a20 });
    if (p.crystal) this.pending.push({ t: .1, x: cx, y: cy, z: cz, r: 6.5, d: 95, type: 'e', cause: 'chain', col: 0xc27bff, col2: 0xeaccff });
    if (p.dam && this.hooks.dam) this.hooks.dam(p);
    if (this.hooks.kill) this.hooks.kill(p, cause);
  }
  registerKill(p, cause) {
    const indirect = cause === 'collapse' || cause === 'crush' || cause === 'chain' || cause === 'fire';
    const st = this.stats, ch = this.chain;
    if (cause !== 'fall') {
      if (p.terr) st.terrain++; else st.pieces++;
      st.score += p.w * (indirect ? 15 : 10); st.weightKilled += p.w;
    } else this.selfFallW += p.w;
    if (ch.t <= 0) { ch.n = 0; ch.startInt = this.integrity() + 100 * p.w / this.totalW; ch.groups.clear(); ch.terrN = 0; }
    ch.t = Math.max(ch.t, indirect ? 2.4 : 1.7);
    if (indirect) {
      let inc = false;
      if (p.g >= 0) { if (!ch.groups.has(p.g)) { ch.groups.add(p.g); ch.n++; inc = true; } }
      else { ch.terrN++; if (ch.terrN % 7 === 0) { ch.n++; inc = true; } }
      if (inc && this.hooks.chain) this.hooks.chain(ch.n);
    }
  }
  ignite(p, dur = 7) {
    if (!p.alive || p.burn > 0 || !p.mat.flam) return;
    if (p.frozen) { p.frozen = false; this.refreshColor(p); return; }
    p.burn = dur; p.burnT = rnd(.2, .6); this.fires.push(p); p.charred = false; this.refreshColor(p);
  }
  freeze(p) {
    if (!p.alive || p.frozen) return; p.frozen = true; p.burn = 0; this.refreshColor(p);
  }
  /* ----- stability ----- */
  updateStability(initial) {
    const st = ++this.stampN, stack = [];
    for (const p of this.pieces) if (p.alive && p.anchor) { p.reach = st; stack.push(p); }
    while (stack.length) {
      const p = stack.pop();
      for (let i = 0; i < p.deps.length; i++) { const d = p.deps[i]; if (d.alive && d.reach !== st && d.collapseT < 0) { d.reach = st; stack.push(d); } }
    }
    if (initial) return;
    let minY = 1e9; const list = [];
    for (const p of this.pieces) if (p.alive && p.reach !== st && p.collapseT < 0) { list.push(p); if (p.y < minY) minY = p.y; }
    for (const p of list) { p.collapseT = .12 + Math.random() * .45 + (p.y - minY) * .02; this.collapsing.push(p); this.refreshColor(p); }
    if (list.length > 6) { const c = list[0]; Snd.play('crumble', Math.max(.1, 1 - Fx.near(c.x, c.y, c.z) / 160)); }
  }
  finalCollapse() {
    if (this.finalizing) return; this.finalizing = true;
    for (const p of this.pieces) if (p.alive && p.collapseT < 0) { p.collapseT = rnd(0, 2.4) + (p.terr ? 0.3 : 0); this.collapsing.push(p); }
  }
  /* ----- per-frame ----- */
  update(dt, t) {
    this.t = t;
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const b = this.pending[i]; b.t -= dt;
      if (b.t <= 0) { this.pending.splice(i, 1); Fx.explosion(b.x, b.y, b.z, b.r * .8, { col: b.col, col2: b.col2 }); this.blast(b.x, b.y, b.z, b.r, b.d, b.type, b.cause); }
    }
    for (let i = this.collapsing.length - 1; i >= 0; i--) {
      const p = this.collapsing[i]; p.collapseT -= dt;
      if (p.collapseT <= 0) { this.collapsing.splice(i, 1); if (p.alive) this.kill(p, this.finalizing ? 'fall' : 'collapse'); }
      else if (p.alive) this.writeM(p, rnd(-.07, .07), 0, rnd(-.07, .07));
    }
    if (this.dirtyStab) { this.dirtyStab = false; this.updateStability(); }
    // fire
    if (this.fires.length) {
      for (let i = this.fires.length - 1; i >= 0; i--) {
        const p = this.fires[i];
        if (!p.alive) { this.fires.splice(i, 1); continue; }
        p.burn -= dt; p.burnT -= dt;
        if (p.burn <= 0) { p.burn = 0; p.charred = true; this.refreshColor(p); this.fires.splice(i, 1); continue; }
        if (this.damagePiece(p, 8 * dt, 'f', 'fire')) { this.fires.splice(i, 1); continue; }
        if (Math.random() < dt * 9 && Fx.near(p.x, p.y, p.z) < 110) glowP.emit(p.x + rnd(-.5, .5) * p.sx, p.maxY - rnd(0, .5), p.z + rnd(-.5, .5) * p.sz, rnd(-.4, .4), rnd(1.5, 3.5), rnd(-.4, .4), Math.random() < .5 ? 0xff7a1a : 0xffc53a, rnd(.3, .6), rnd(.4, .8), -1, .5);
        if (Math.random() < dt * 2 && Fx.near(p.x, p.y, p.z) < 80) dustP.emit(p.x, p.maxY, p.z, rnd(-.5, .5), rnd(1, 2), rnd(-.5, .5), 0x302a28, rnd(.6, 1.1), rnd(.8, 1.6), -.5, .8);
        if (p.burnT <= 0) {
          p.burnT = .55; this.refreshColor(p);
          this.queryBox(p.minX - 1.4, p.minY - 1.2, p.minZ - 1.4, p.maxX + 1.4, p.maxY + 1.6, p.maxZ + 1.4, q => { if (q.burn <= 0 && q.mat.flam && !q.charred && Math.random() < .3 * q.mat.flam) this.ignite(q); });
        }
      }
    }
    for (const p of this.flashing) { p.flash -= dt; if (p.flash <= 0) { p.flash = 0; this.flashing.delete(p); this.refreshColor(p); } }
    const ch = this.chain;
    if (ch.t > 0) {
      ch.t -= dt;
      if (ch.t <= 0) {
        const lost = Math.max(0, ch.startInt - this.integrity()), st = this.stats;
        st.chainMax = Math.max(st.chainMax, ch.n); st.collapseMax = Math.max(st.collapseMax, lost); if (ch.n >= 4) st.score += ch.n * 25;
        if (this.hooks.chainEnd) this.hooks.chainEnd(ch.n, lost); ch.n = 0;
      }
    }
    if (this.custom) this.custom(dt, t);
    for (const u of this.updaters) u(dt, t);
    if (!this.destroyed && this.integrity() <= THRESH) { this.destroyed = true; if (this.hooks.destroyed) this.hooks.destroyed(this); }
  }
  revive(p) {
    if (p.alive) return; p.alive = true; p.hp = p.maxHp; p.frozen = false; p.charred = false; p.burn = 0; p.collapseT = -1; p.anchor = true; p.phased = false;
    this.aliveW += p.w; this.writeM(p); this.refreshColor(p); const g = this.groups[p.g]; if (g) g.dead = Math.max(0, g.dead - 1);
  }
  setPhased(p, on) { if (!p.alive) return; p.phased = on; if (on) this.hide(p); else this.writeM(p); }
  addDecor(obj) { this.group.add(obj); this.decor.push(obj); return obj; }
  dispose() {
    this.alive = false; scene.remove(this.group);
    for (const k in this.meshes) this.meshes[k].dispose();
    this.group.traverse(o => { if (o.material && o.userData.own) o.material.dispose(); if (o.geometry && o.userData.own) o.geometry.dispose(); });
    this.pieces.length = 0; this.grid.clear();
  }
}
