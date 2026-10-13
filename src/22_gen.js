/* =====================================================================
   SKYBREAK — island generators
   ===================================================================== */
function colVar(hex, v, r) {
  const R = (hex >> 16) & 255, G = (hex >> 8) & 255, B = hex & 255, k = 1 + (r() - .5) * v;
  return (clamp(R * k | 0, 0, 255) << 16) | (clamp(G * k | 0, 0, 255) << 8) | clamp(B * k | 0, 0, 255);
}
class Bld {
  constructor(I) { this.I = I; this.r = I.rng; this.pads = []; this.top = new Map(); this.cellMap = new Map(); this.cells = []; this.R0 = 7.6; }
  rr(a, b) { return a + this.r() * (b - a); }
  grp(n) { return this.I.newGroup(n); }
  box(x, z, y, sx, sy, sz, m, c, o) { return this.I.add(Object.assign({ k: 'box', x, y, z, sx, sy, sz, m, c }, o)); }
  cyl(x, z, y, d, h, m, c, o) { return this.I.add(Object.assign({ k: 'cyl', x, y, z, sx: d, sy: h, sz: d, m, c }, o)); }
  cone(x, z, y, d, h, m, c, o) { return this.I.add(Object.assign({ k: 'cone', x, y, z, sx: d, sy: h, sz: d, m, c }, o)); }
  pyr(x, z, y, sx, h, sz, m, c, o) { return this.I.add(Object.assign({ k: 'pyr', x, y, z, sx, sy: h, sz, m, c }, o)); }
  ico(x, z, y, d, m, c, o) { return this.I.add(Object.assign({ k: 'ico', x, y, z, sx: d, sy: d, sz: d, m, c }, o)); }
  initShape(R0) { this.R0 = R0; this.ph = [this.r() * 6.28, this.r() * 6.28, this.r() * 6.28]; }
  Rat(i, j) { const th = Math.atan2(j, i); return this.R0 + 1.0 * Math.sin(3 * th + this.ph[0]) + .55 * Math.sin(5 * th + this.ph[1]) + .35 * Math.sin(2 * th + this.ph[2]); }
  inside(x, z, m = .9) { const i = x / VX, j = z / VX; return Math.hypot(i, j) < this.Rat(i, j) - m; }
  fits(x, z, r) { if (!this.inside(x, z, 1)) return false; for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; if (!this.inside(x + Math.cos(a) * r, z + Math.sin(a) * r, .9)) return false; } return true; }
  padNear(x, z, r) { for (const p of this.pads) if (Math.hypot(p.x - x, p.z - z) < p.r + r) return true; return false; }
  reserve(x, z, r) {
    for (let k = 0; k < 10; k++) { const sx = x * (1 - k * .07), sz = z * (1 - k * .07); if (this.fits(sx, sz, r)) { const p = { x: sx, z: sz, r }; this.pads.push(p); return p; } }
    const p = { x: x * .5, z: z * .5, r }; this.pads.push(p); return p;
  }
  terrain(pal, o = {}) {
    const I = this.I, r = this.r, hills = [];
    for (let n = 0; n < (o.hills === undefined ? 4 : o.hills); n++) for (let t = 0; t < 40; t++) {
      const a = r() * 6.28, d = 2 + r() * (this.R0 - 4), hi = Math.round(Math.cos(a) * d), hj = Math.round(Math.sin(a) * d);
      if (this.padNear(hi * VX, hj * VX, VX * 3.2)) continue;
      hills.push({ i: hi, j: hj, r: 1.6 + r() * 1.8, h: 1 + Math.floor(r() * (o.hillH || 2)) }); break;
    }
    for (let i = -11; i <= 11; i++)for (let j = -11; j <= 11; j++) {
      const rr = Math.hypot(i, j), th = Math.atan2(j, i), R = this.Rat(i, j);
      if (rr > R) continue;
      const depth = 1 + Math.floor((1 - Math.pow(rr / R, 1.5)) * (o.depth || 6.5));
      let hh = 0; const nearPad = this.padNear(i * VX, j * VX, VX * 1.6);
      if (!nearPad) for (const h of hills) { const d = Math.hypot(i - h.i, j - h.j); if (d < h.r) hh = Math.max(hh, Math.round(h.h * (1 - d / h.r) + .3)); }
      const edge = rr > R - 1.1;
      const cv = !nearPad && o.carve ? o.carve(i, j, rr, edge) : 0;
      if (cv) hh = 0;
      let topY = hh * VX;
      for (let L = -(depth - 1); L <= hh; L++) {
        const dl = hh - L, pp = o.tint ? o.tint(i, j, rr, edge, dl) || null : null;
        if (cv === 'lava' && L === 0) {
          I.add({ k: 'box', x: i * VX, y: (L - 1) * VX, z: j * VX, sx: VX, sy: VX, sz: VX, m: 'core', c: 0xff5a1a, glow: true, terr: true, anchor: true, solid: false, w: 0, hp: 1e9 });
          I.lavaCells.add(i + ',' + j); topY = -VX; continue;
        }
        if (cv === 'pool' && L === 0) { topY = -VX; continue; }
        const pa = pp || (dl === 0 ? pal.top : dl === 1 ? pal.mid : pal.deep);
        const bottom = L === -(depth - 1);
        I.add({
          k: 'box', x: i * VX, y: (L - 1) * VX, z: j * VX, sx: VX, sy: VX, sz: VX, m: pa[0], c: colVar(pa[1], pal.v || .16, r), terr: true,
          anchor: !I.terrainSupport || bottom, hpMul: (bottom && I.terrainSupport ? 3 : 1) * (pal.hpMul || 1), tw: dl > 1 ? .8 : 1,
          f: o.vox ? o.vox(i, j, L, rr, th, dl) : null
        });
      }
      this.top.set(i + ',' + j, topY);
      const cell = { i, j, x: i * VX, z: j * VX, hh, edge, cv, topY }; this.cells.push(cell); this.cellMap.set(i + ',' + j, cell);
    }
  }
  cellAt(x, z) { return this.cellMap.get(Math.round(x / VX) + ',' + Math.round(z / VX)); }
  ground(x, z) { const c = this.cellAt(x, z); return c ? c.topY : 0; }
  spot(rad, o = {}) {
    for (let t = 0; t < 80; t++) {
      const a = this.r() * 6.28, d = Math.sqrt(this.r()) * this.R0 * VX * (o.f || .85), x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (this.padNear(x, z, rad)) continue; const c = this.cellAt(x, z); if (!c || c.edge || c.hh !== 0 || c.cv) continue;
      if (!this.fits(x, z, rad)) continue;
      const p = { x, z, r: rad }; if (!o.noPad) this.pads.push(p); return p;
    }
    return null;
  }
}
function mkDecor(geo, mat) { const m = new T.Mesh(geo, mat); m.userData.own = true; return m; }
const waterMat = new T.MeshPhongMaterial({ color: 0x35c8ff, transparent: true, opacity: .62, shininess: 90, specular: 0xffffff });
const lavaDecorMat = new T.MeshBasicMaterial({ color: 0xff5a1a });
let wfTex = null;
function waterfallTex() {
  if (wfTex) return wfTex; const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#6fd8ff'; g.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,255,${.25 + Math.random() * .5})`; g.fillRect(Math.random() * 64, Math.random() * 256, 1 + Math.random() * 3, 12 + Math.random() * 60); }
  wfTex = new T.CanvasTexture(c); wfTex.wrapS = wfTex.wrapT = T.RepeatWrapping; return wfTex;
}
function waterfall(I, x, z, y, w, h, nx, nz) {
  const tex = waterfallTex();
  const m = mkDecor(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: .8, side: T.DoubleSide }));
  m.position.set(I.cx + x, I.cy + y - h / 2, I.cz + z); m.rotation.y = Math.atan2(nx, nz); I.addDecor(m);
  for (let i = 0; i < 6; i++) { /* mist */ }
  I.updaters.push((dt, t) => { tex.offset.y = -t * 1.1; if (Math.random() < dt * 10 && Fx.near(m.position.x, m.position.y, m.position.z) < 150) dustP.emit(m.position.x + rnd(-w / 2, w / 2), m.position.y - h / 2 + rnd(0, 3), m.position.z, rnd(-1, 1), rnd(0, 2), rnd(-1, 1), 0xe8fbff, rnd(.8, 1.6), rnd(1.2, 2), -.2, .6); });
}
/* ---------- shared structure builders ---------- */
function building(b, x, z, o) {
  const y0 = b.ground(x, z), w = o.w || 6, d = o.d || 6, rows = o.rows || 2, wh = 1.5, fy = .5;
  b.grp(o.name || 'house');
  b.box(x, z, y0, w + .8, fy, d + .8, o.found || 'stone', o.foundC, { hpMul: o.foundHp || 1 });
  const nx = Math.max(2, Math.round(w / 2)), nz = Math.max(2, Math.round((d - 1) / 2)), bw = w / nx, bd = (d - 1) / nz, door = o.door || '+z';
  for (let r = 0; r < rows; r++) {
    const yy = y0 + fy + r * wh;
    for (let i = 0; i < nx; i++) {
      const px = x - w / 2 + bw * (i + .5);
      for (const s of [-1, 1]) {
        if (door === (s > 0 ? '+z' : '-z') && i === (nx >> 1) && r < 2) continue;
        if (o.ruin && b.r() < o.ruin) continue;
        b.box(px, z + s * (d / 2 - .25), yy, bw, wh, .5, o.wall || 'wood', o.wc && colVar(o.wc, .14, b.r), { hpMul: o.wallHp || 1 });
      }
    }
    for (let j = 0; j < nz; j++) {
      const pz = z - (d - 1) / 2 + bd * (j + .5);
      for (const s of [-1, 1]) {
        const isDoor = door === (s > 0 ? '+x' : '-x') && j === (nz >> 1) && r < 2, isWin = r === 1 && j === (nz >> 1);
        if (isDoor || isWin) continue; if (o.ruin && b.r() < o.ruin) continue;
        b.box(x + s * (w / 2 - .25), pz, yy, .5, wh, bd, o.wall || 'wood', o.wc && colVar(o.wc, .14, b.r), { hpMul: o.wallHp || 1 });
      }
    }
  }
  const ry = y0 + fy + rows * wh;
  if (!o.noRoof) {
    b.box(x, z, ry, w + 1.2, .35, d + 1.2, o.roofSlab || 'wood', o.rsc);
    b.pyr(x, z, ry + .35, w + 1.8, o.roofH || 2.4, d + 1.8, o.roof || 'wood', o.roofC);
  }
  if (o.extra) o.extra(b, x, z, y0, ry);
  return { x, z, y0, top: ry + .35 + (o.roofH || 2.4) };
}
function tower(b, x, z, o) {
  const y0 = b.ground(x, z), s = o.s || 3.6, rows = o.rows || 5, h = o.h || 1.6, m = o.m || 'stone', q = s / 2;
  b.grp(o.name || 'tower');
  for (let r = 0; r < rows; r++) for (const i of [-1, 1]) for (const j of [-1, 1]) b.box(x + i * q / 2, z + j * q / 2, y0 + r * h, q, h, q, m, o.c && colVar(o.c, .12, b.r), { hpMul: o.hpMul || 1 });
  const ty = y0 + rows * h;
  b.box(x, z, ty, s + .8, .4, s + .8, o.capM || m, o.capC);
  if (o.cap !== false) b.pyr(x, z, ty + .4, s + 1.2, o.capH || 2.6, s + 1.2, o.capM2 || o.capM || m, o.capC2 || o.capC);
  return { y: ty };
}
function treeOak(b, x, z, s, o = {}) {
  const y0 = b.ground(x, z); b.grp('tree'); const g = o.leaf || 0x3fae45;
  const tr = b.cyl(x, z, y0, .9 * s, 3.4 * s, 'wood', 0x7a4e2c, { regrow: o.regrow });
  const L = (dx, dy, dz, d) => b.ico(x + dx * s, z + dz * s, y0 + dy * s, d * s, 'leaf', colVar(g, .22, b.r), { sup: [tr], regrow: o.regrow });
  L(0, 3.1, 0, 4.6); L(1.3, 3.8, .4, 3.0); L(-1.2, 3.9, -.6, 3.2); L(0, 5.2, 0, 3.0);
  return tr;
}
function treePine(b, x, z, s, o = {}) {
  const y0 = b.ground(x, z); b.grp('tree'); const g = o.leaf || 0x2f8f4a;
  const tr = b.cyl(x, z, y0, .7 * s, 2.6 * s, 'wood', 0x5a3a22, { regrow: o.regrow });
  b.cone(x, z, y0 + 1.6 * s, 4 * s, 2.8 * s, 'leaf', colVar(g, .2, b.r), { sup: [tr], regrow: o.regrow });
  b.cone(x, z, y0 + 3.0 * s, 3.1 * s, 2.5 * s, 'leaf', colVar(o.leaf2 || g, .2, b.r), { sup: [tr], regrow: o.regrow });
  b.cone(x, z, y0 + 4.3 * s, 2.1 * s, 2.3 * s, o.snow ? 'snow' : 'leaf', o.snow ? 0xf2fbff : colVar(g, .2, b.r), { sup: [tr], regrow: o.regrow });
  return tr;
}
function stilts(b, x, z, h, w, d, o = {}) {
  const y0 = b.ground(x, z); b.grp(o.name || 'platform'); const m = o.m || 'wood', posts = [];
  for (const i of [-1, 1]) for (const j of [-1, 1]) posts.push(b.cyl(x + i * (w / 2 - .6), z + j * (d / 2 - .6), y0, .8, h, m, o.pc || 0x6e4a2a, { f: o.wash ? { washable: true } : null }));
  for (const i of [-1, 1]) for (const j of [-1, 1]) b.box(x + i * w / 4, z + j * d / 4, y0 + h, w / 2, .45, d / 2, m, o.dc && colVar(o.dc, .1, b.r), { f: o.wash ? { washable: true } : null });
  if (o.rail) for (let k = -1; k <= 1; k += 2) for (let i = 0; i < 4; i++) { b.box(x - w / 2 + .25 + i * (w - .5) / 3, z + k * (d / 2 - .2), y0 + h + .45, .25, 1, .25, m, 0x7a5430, { solid: false }); b.box(x + k * (w / 2 - .2), z - d / 2 + .25 + i * (d - .5) / 3, y0 + h + .45, .25, 1, .25, m, 0x7a5430, { solid: false }); }
  return { y: y0 + h + .45, x, z };
}
function bridge(b, ax, az, ay, bx, bz, by, o = {}) {
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), n = Math.max(3, Math.round(L / 2.2)), th = Math.atan2(dx, dz), dl = L / n;
  b.grp(o.name || 'bridge'); const m = o.m || 'wood'; let prev = null; const wash = o.wash ? { washable: true } : null;
  const pa = b.cyl(ax, az, b.ground(ax, az), .9, ay - b.ground(ax, az), m, 0x6e4a2a, { f: wash });
  const pb = b.cyl(bx, bz, b.ground(bx, bz), .9, Math.max(.2, by - b.ground(bx, bz)), m, 0x6e4a2a, { f: wash });
  for (let i = 0; i < n; i++) {
    const t = (i + .5) / n, x = ax + dx * t, z = az + dz * t, y = ay + (by - ay) * t - .1;
    const pl = b.box(x, z, y, o.w || 2.4, .35, dl * 1.02, m, o.c && colVar(o.c, .14, b.r), { ry: th, sup: prev ? [prev] : [pa], f: wash }); prev = pl;
    if (o.rail !== false) for (const s of [-1, 1]) { const px = x + Math.cos(th) * s * ((o.w || 2.4) / 2 - .15), pz = z - Math.sin(th) * s * ((o.w || 2.4) / 2 - .15); b.box(px, pz, y + .35, .22, .9, .22, m, 0x7a5430, { solid: false, sup: [pl], f: wash }); }
  }
  return { first: pa, last: pb };
}
function wallRun(b, x0, z0, x1, z1, rows, m, c, o = {}) {
  const y0 = b.ground(x0, z0), L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 2)), dl = L / n, th = Math.atan2(x1 - x0, z1 - z0);
  for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) {
    if (o.gap && o.gap(i, r)) continue; const t = (i + .5) / n;
    b.box(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, y0 + r * 1.5, Math.abs(Math.cos(th)) < .5 ? .7 : dl, 1.5, Math.abs(Math.cos(th)) < .5 ? dl : .7, m, c && colVar(c, .14, b.r), { hpMul: o.hpMul || 1 });
  }
}
function bush(b, x, z, d, c = 0x3a9a40) { b.ico(x, z, b.ground(x, z) - .1, d, 'leaf', colVar(c, .25, b.r), { w: .25 }); }
function rock(b, x, z, d, c = 0x8a8c94, mat = 'rock') { b.ico(x, z, b.ground(x, z) - d * .15, d, mat, colVar(c, .2, b.r), { solid: true, ry: b.r() * 6, w: .5 }); }
function crystalCluster(b, x, z, cols, n = 4, o = {}) {
  const y0 = b.ground(x, z); b.grp('crystals');
  for (let i = 0; i < n; i++) {
    const a = b.r() * 6.28, d = i === 0 ? 0 : b.rr(.9, 2.2), h = i === 0 ? b.rr(3.8, 5) : b.rr(1.8, 3.4), s = i === 0 ? b.rr(1.4, 1.9) : b.rr(.8, 1.3);
    b.pyr(x + Math.cos(a) * d, z + Math.sin(a) * d, y0 - .1, s, h, s, 'crystal', pick(cols), { glow: true, f: { crystal: true }, hp: o.hp || 26, w: .6, ry: b.r() * 3 });
  }
}
function finishIsland(I, b, spawnPad) {
  I.finalize();
  I.spawn.set(I.cx + spawnPad.x, I.cy + b.ground(spawnPad.x, spawnPad.z) + .1, I.cz + spawnPad.z);
  I.bld = b; I.R0 = b.R0;
  return I;
}
const GEN = {};
/* ---------- VERDANTIA ---------- */
GEN.verdantia = function (I, b, o) {
  b.initShape(7.7); const regrow = o.boss === 'forest';
  const sp = b.reserve(0, 16, 3.5), gt = b.reserve(-7, -5, 5.5);
  const hA = b.reserve(10, -3, 4.5), hB = b.reserve(-12, 6, 4.2), hC = b.reserve(10, 10, 4.2), tw1 = b.reserve(-2, -14, 3.2), tw2 = b.reserve(11, -14, 3);
  b.terrain({ top: ['grass', 0x5fbf4a], mid: ['dirt', 0x8a5a3a], deep: ['rock', 0x7d7f86], v: .2 }, { hills: 4, hillH: 2 });
  // giant tree
  b.grp('giant tree'); const gy = b.ground(gt.x, gt.z); const segs = [];
  let prev = null;
  for (let k = 0; k < 4; k++) { const s = b.cyl(gt.x, gt.z, gy + k * 3.4, 4.4 - k * .35, 3.4, 'wood', colVar(0x6a4426, .12, b.r), { hpMul: 1.6, regrow: false, w: 1.2 }); segs.push(s); }
  for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28 + .3; b.box(gt.x + Math.cos(a) * 3, gt.z + Math.sin(a) * 3, gy, 3.2, 1.1, 1.3, 'wood', 0x5a3a20, { ry: -a + 1.57, sup: [segs[0]], hpMul: 1.4 }); }
  const top = gy + 13.6, crown = [];
  for (const [dx, dy, dz, d] of [[0, 0, 0, 10], [4, 1.2, 1, 7], [-4, 1.5, -1, 7.5], [0, 3.6, 1.5, 7], [1.5, 5, -1, 5]]) crown.push(b.ico(gt.x + dx, gt.z + dz, top + dy - .5, d, 'leaf', colVar(0x2f9a44, .2, b.r), { sup: [segs[3]], hpMul: 1.3, w: 1.1, regrow: false }));
  if (o.boss === 'forest') b.ico(gt.x, gt.z, top + 1.2, 3.2, 'heart', 0xffd45a, { glow: true, sup: [crown[0]], f: { heart: true }, w: 3, hp: 240 });
  // huts
  building(b, hA.x, hA.z, { w: 6, d: 6, rows: 2, door: '-x', wall: 'wood', wc: 0xb98550, roof: 'wood', roofC: 0x9a4a38, found: 'stone', foundC: 0x8a8a90, name: 'hut' });
  building(b, hB.x, hB.z, { w: 4, d: 4, rows: 2, door: '+z', wall: 'wood', wc: 0xc29458, roof: 'leaf', roofC: 0x4f9a3a, found: 'stone', foundC: 0x8a8a90, name: 'hut' });
  building(b, hC.x, hC.z, { w: 4, d: 6, rows: 2, door: '-z', wall: 'wood', wc: 0xad7a48, roof: 'wood', roofC: 0x8a3f30, found: 'stone', foundC: 0x8a8a90, name: 'hut' });
  // watch platforms + bridge
  const p1 = stilts(b, tw1.x, tw1.z, 6.5, 5, 5, { name: 'platform', rail: true, dc: 0xa8723f }), p2 = stilts(b, tw2.x, tw2.z, 6.5, 5, 5, { name: 'platform', rail: true, dc: 0xa8723f });
  const zb = (tw1.z + tw2.z) / 2; bridge(b, tw1.x + 2.5, zb, 6.9, tw2.x - 2.5, zb, 6.9, { name: 'rope bridge', c: 0xb08850 });
  b.grp('watch hut'); b.box(tw2.x, tw2.z, p2.y, 3, 1.6, 3, 'wood', 0xc29458); b.pyr(tw2.x, tw2.z, p2.y + 1.6, 4.2, 1.8, 4.2, 'wood', 0x9a4a38);
  // trees and decor
  for (let i = 0; i < 12; i++) { const p = b.spot(2.2); if (p) treeOak(b, p.x, p.z, b.rr(.8, 1.25), { regrow }); }
  for (let i = 0; i < 4; i++) { const p = b.spot(2); if (p) treePine(b, p.x, p.z, b.rr(.9, 1.2), { regrow }); }
  b.grp('plants'); for (let i = 0; i < 16; i++) { const p = b.spot(1.1, { noPad: true }); if (p) bush(b, p.x, p.z, b.rr(1.1, 1.9)); }
  for (let i = 0; i < 7; i++) { const p = b.spot(1.1, { noPad: true }); if (p) rock(b, p.x, p.z, b.rr(1.3, 2.2)); }
  // waterfall at rim
  const a = b.r() * 6.28, wr = (b.R0 - .5) * VX; waterfall(I, Math.cos(a) * wr, Math.sin(a) * wr, -2, 4, 26, Math.cos(a), Math.sin(a));
  return sp;
};
/* ---------- IGNIS ---------- */
GEN.ignis = function (I, b, o) {
  b.initShape(7.7);
  const sp = b.reserve(5, 15, 3.5), vol = b.reserve(-9, -8, 6.5), fort = b.reserve(10, -6, 6.2), arch = b.reserve(-8, 10, 4);
  const chan = [[-2, -1], [-1, 0], [0, 0], [1, 1], [2, 1], [3, 2], [4, 3]];
  const inChan = (i, j) => chan.some(c => Math.hypot(c[0] - i, c[1] - j) < .8);
  b.terrain({ top: ['basalt', 0x2e2e3a], mid: ['basalt', 0x3a2c30], deep: ['rock', 0x2c2226], v: .22 }, {
    hills: 3, hillH: 2, carve: (i, j, rr, edge) => (!edge && inChan(i, j)) ? 'lava' : 0,
    tint: (i, j, rr, edge, dl) => { if (dl === 0 && b.r() < .12) return ['basalt', 0x50343a]; return null; }
  });
  // volcano
  b.grp('volcano'); const vy = b.ground(vol.x, vol.z); let ds = [11, 9, 7, 5], y = vy;
  for (const d of ds) { b.cyl(vol.x, vol.z, y, d, 2.4, 'basalt', colVar(0x34303c, .15, b.r), { hpMul: 1.3, w: 1.6 }); y += 2.4; }
  b.cyl(vol.x, vol.z, y, 3.6, .9, 'core', 0xff6a20, { glow: true, solid: false, hp: 80, w: .8 });
  I.volcano = { x: I.cx + vol.x, y: I.cy + y + 1, z: I.cz + vol.z };
  // fortress
  const fx = fort.x, fz = fort.z; b.grp('fortress wall');
  wallRun(b, fx - 4, fz - 4, fx + 4, fz - 4, 2, 'basalt', 0x44424e); wallRun(b, fx - 4, fz - 4, fx - 4, fz + 2, 2, 'basalt', 0x44424e); wallRun(b, fx + 4, fz - 4, fx + 4, fz + 2, 2, 'basalt', 0x44424e);
  tower(b, fx - 4, fz + 3.2, { s: 3.4, rows: 5, m: 'basalt', c: 0x3e3c48, capM: 'obsidian', name: 'fortress tower', cap: true, capC: 0x1d1830 });
  tower(b, fx + 4, fz + 3.2, { s: 3.4, rows: 6, m: 'basalt', c: 0x3e3c48, capM: 'obsidian', name: 'fortress tower', cap: true, capC: 0x1d1830 });
  b.grp('crates'); for (const [cx, cz] of [[fx - 1.5, fz - 2], [fx + .5, fz - 2.4], [fx + 2, fz - 1.2], [fx, fz]]) b.box(cx, cz, b.ground(cx, cz), 1.3, 1.3, 1.3, 'core', 0xff4a1a, { glow: true, f: { explosive: true }, hp: 14, w: .6 });
  // arch
  b.grp('obsidian arch'); const ay = b.ground(arch.x, arch.z);
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) b.box(arch.x + s * 2.6, arch.z, ay + k * 1.8, 1.5, 1.8, 1.5, 'obsidian', colVar(0x1b1626, .3, b.r));
  b.box(arch.x, arch.z, ay + 5.4, 7.2, 1.4, 1.8, 'obsidian', 0x241a38);
  // spires, columns, vents
  for (let i = 0; i < 5; i++) { const p = b.spot(2.2); if (!p) continue; b.grp('obsidian spire'); const yy = b.ground(p.x, p.z), n = 2 + (i % 2); for (let k = 0; k < n; k++) b.box(p.x, p.z, yy + k * 2.2, 2, 2.2, 2, 'obsidian', colVar(0x1d1830, .35, b.r)); b.pyr(p.x, p.z, yy + n * 2.2, 2, 2.8, 2, 'obsidian', 0x2a2048); }
  for (let i = 0; i < 4; i++) { const p = b.spot(2.2); if (!p) continue; b.grp('basalt columns'); for (let c = 0; c < 3; c++) { const cx = p.x + Math.cos(c * 2.1) * 1.3, cz = p.z + Math.sin(c * 2.1) * 1.3, yy = b.ground(cx, cz); const n = 1 + Math.floor(b.r() * 3); for (let k = 0; k < n; k++) b.cyl(cx, cz, yy + k * 1.5, 1.7, 1.5, 'basalt', colVar(0x3e3c4a, .2, b.r)); } }
  b.grp('gas vents'); for (let i = 0; i < 6; i++) { const p = b.spot(1.2, { noPad: true }); if (p) b.box(p.x, p.z, b.ground(p.x, p.z), 1.1, .9, 1.1, 'core', 0xff3a14, { glow: true, f: { explosive: true }, hp: 12, w: .5 }); }
  b.grp('rocks'); for (let i = 0; i < 7; i++) { const p = b.spot(1.2, { noPad: true }); if (p) rock(b, p.x, p.z, b.rr(1.3, 2.4), 0x4a4650, 'basalt'); }
  // bridge over the lava
  bridge(b, 0, 4.5, .5, 9, 4.5, .5, { name: 'stone bridge', m: 'stone', c: 0x7a7a86, rail: true });
  if (o.boss === 'volcano') {
    I.cores = [];
    for (const [px, pz] of [[vol.x + 4.5, vol.z + 4.5], [fx - 1, fz + 6.4], [arch.x + 1, arch.z + 4.2]]) {
      b.grp('volcanic core'); const yy = b.ground(px, pz); const pd = b.cyl(px, pz, yy, 3, 2, 'obsidian', 0x1d1830, { hpMul: 1.5, w: 1 });
      I.cores.push(b.ico(px, pz, yy + 2, 3.2, 'core', 0xff4a2a, { glow: true, sup: [pd], f: { core: true }, hp: 230, w: 3 }));
    }
  }
  I.updaters.push((dt, t) => { lavaDecorMat.color.setHSL(.04 + Math.sin(t * 2) * .01, 1, .5 + Math.sin(t * 3.1) * .05); });
  return sp;
};
/* ---------- NIVARA ---------- */
GEN.nivara = function (I, b, o) {
  b.initShape(7.7);
  const sp = b.reserve(0, 16, 3.5), glac = b.reserve(-8, -7, 6.2), hut = b.reserve(9, -4, 4.5), hut2 = b.reserve(-12, 6, 4), lake = b.reserve(8, 9, 5), tw = b.reserve(2, -13, 3);
  b.terrain({ top: ['snow', 0xf0f8ff], mid: ['ice', 0xbfe6ff], deep: ['ice', 0x86c2e8], v: .1 }, {
    hills: 4, hillH: 2, tint: (i, j, rr, edge, dl) => dl === 0 && Math.hypot(i * VX - lake.x, j * VX - lake.z) < 5.5 ? ['ice', 0x8fd8ff] : null
  });
  // glacier shelf on pillars
  b.grp('glacier shelf'); const gy = b.ground(glac.x, glac.z); const pil = [];
  for (const i of [-1, 1]) for (const j of [-1, 1]) { const pp = b.cyl(glac.x + i * 3.6, glac.z + j * 3.6, gy, 1.6, 6, 'ice', 0xa8e0ff, { hpMul: 1.4 }); pil.push(pp); }
  for (const i of [-1, 1]) for (const j of [-1, 1]) b.box(glac.x + i * 2.1, glac.z + j * 2.1, gy + 6, 4.2, 1.3, 4.2, 'ice', colVar(0xd8f2ff, .1, b.r), { w: 1.2 });
  for (let i = 0; i < 4; i++) { const p = b.pyr(glac.x + (i % 2 ? 1.5 : -1.5), glac.z + (i < 2 ? -1.5 : 1.5), gy + 7.3, 2, b.rr(2, 3.6), 2, 'ice', 0xc8ecff, { w: .6 }); }
  // huts
  building(b, hut.x, hut.z, { w: 6, d: 6, rows: 2, door: '-x', wall: 'ice', wc: 0xcdeeff, roof: 'snow', roofC: 0xffffff, found: 'stone', foundC: 0x9aa4b0, name: 'ice hut', roofSlab: 'snow', rsc: 0xf0f8ff });
  building(b, hut2.x, hut2.z, { w: 4, d: 4, rows: 2, door: '+z', wall: 'ice', wc: 0xbfe6ff, roof: 'snow', roofC: 0xffffff, found: 'stone', foundC: 0x9aa4b0, name: 'ice hut', roofSlab: 'snow', rsc: 0xf0f8ff });
  // ice towers + bridge
  tower(b, tw.x - 3, tw.z, { s: 3, rows: 6, m: 'ice', c: 0xb8e4ff, capM: 'snow', capC: 0xffffff, name: 'ice tower', cap: true });
  tower(b, tw.x + 9, tw.z, { s: 3, rows: 6, m: 'ice', c: 0xb8e4ff, capM: 'snow', capC: 0xffffff, name: 'ice tower', cap: true });
  b.grp('ice bridge'); const by = b.ground(tw.x, tw.z) + 6 * 1.6; { const n = 5; let prev = null; for (let k = 0; k < n; k++) prev = b.box(tw.x - 1.5 + 2.4 * (k + .5) * 1.0 + 0.2, tw.z, by - .3, 2.4, .5, 2, 'ice', 0xd0f0ff, { sup: prev ? [prev] : undefined, w: .5 }); }
  // spires
  for (let i = 0; i < 7; i++) { const p = b.spot(2); if (!p) continue; b.grp('ice spire'); const yy = b.ground(p.x, p.z), n = 1 + (i % 3); for (let k = 0; k < n; k++) b.box(p.x, p.z, yy + k * 1.8, 2.2 - k * .3, 1.8, 2.2 - k * .3, 'ice', colVar(0xb0e2ff, .12, b.r)); b.pyr(p.x, p.z, yy + n * 1.8, 2.2 - n * .3, 3, 2.2 - n * .3, 'ice', 0xd8f4ff); }
  for (let i = 0; i < 9; i++) { const p = b.spot(2); if (p) treePine(b, p.x, p.z, b.rr(.8, 1.2), { snow: true, leaf: 0x3c8a64 }); }
  for (let i = 0; i < 3; i++) { const p = b.spot(1.6); if (!p) continue; b.grp('snowman'); const yy = b.ground(p.x, p.z); const a1 = b.ico(p.x, p.z, yy - .1, 2, 'snow', 0xffffff, { solid: true }), a2 = b.ico(p.x, p.z, yy + 1.6, 1.5, 'snow', 0xffffff, { sup: [a1] }); b.ico(p.x, p.z, yy + 2.8, 1.1, 'snow', 0xffffff, { sup: [a2] }); }
  b.grp('rocks'); for (let i = 0; i < 6; i++) { const p = b.spot(1.2, { noPad: true }); if (p) rock(b, p.x, p.z, b.rr(1.2, 2), 0xa8c0d8, 'ice'); }
  return sp;
};
/* ---------- ARIDIA ---------- */
GEN.aridia = function (I, b, o) {
  b.initShape(7.7);
  const sp = b.reserve(0, 16, 3.5), pyr = b.reserve(-8, -7, 6.4), temple = b.reserve(9, -4, 6.4), stat = b.reserve(-11, 7, 3.6), stat2 = b.reserve(10, 10, 3.2);
  b.terrain({ top: ['sand', 0xe8c987], mid: ['sand', 0xd9b46f], deep: ['sandstone', 0xc89a58], v: .1 }, { hills: 6, hillH: 2 });
  // stepped pyramid with weak base
  b.grp('pyramid'); let py = b.ground(pyr.x, pyr.z);
  [[10, 2, .45], [7.6, 2, 1], [5.2, 2, 1], [2.8, 2, 1]].forEach(([s, h, hp], k) => { for (const i of (k === 0 ? [-1, 1] : [0])) for (const j of (k === 0 ? [-1, 1] : [0])) { const q = k === 0 ? s / 2 : s; b.box(pyr.x + i * q / 2, pyr.z + j * q / 2, py, q, h, q, 'sandstone', colVar(0xd7a867, .1, b.r), { hpMul: hp, w: 1 }); } py += h; });
  b.pyr(pyr.x, pyr.z, py, 3, 2.6, 3, 'sandstone', 0xe8c060, { w: .6 });
  // temple: steps, columns, roof
  b.grp('temple'); const ty = b.ground(temple.x, temple.z);
  for (const i of [-1, 1]) for (const j of [-1, 1]) b.box(temple.x + i * 2.7, temple.z + j * 2.7, ty, 5.4, .7, 5.4, 'sandstone', 0xe0b878, { hpMul: .5 });
  const cols = [];
  for (const i of [-1, 0, 1]) for (const j of [-1, 1]) { const cx = temple.x + i * 3, cz = temple.z + j * 3; let base = null; for (let k = 0; k < 3; k++) { const c = b.cyl(cx, cz, ty + .7 + k * 1.5, 1.3, 1.5, 'sandstone', colVar(0xe6c58c, .08, b.r), { hpMul: .7 }); if (k === 2) cols.push(c); } }
  for (const j of [-1, 1]) for (const i of [-1, 1]) b.box(temple.x + i * 2.1 * 1.5, temple.z + j * 3, ty + 5.2, 4.4, .9, 1.8, 'sandstone', 0xd9aa68, { w: 1 });
  b.box(temple.x, temple.z, ty + 6.1, 10.4, .5, 7.4, 'sandstone', 0xe8c78e, { w: 1.6 }); b.pyr(temple.x, temple.z, ty + 6.6, 10.4, 2.4, 7.4, 'sandstone', 0xd9aa68, { w: 1 });
  // giant statues
  const statue = (s, scale, name) => {
    b.grp(name); const y = b.ground(s.x, s.z), k = scale, c = () => colVar(0xdcb46e, .1, b.r);
    const l1 = b.box(s.x - 1.1 * k, s.z, y, 1.8 * k, 4.5 * k, 1.8 * k, 'sandstone', c(), { hpMul: 1.1, w: 1.5 }), l2 = b.box(s.x + 1.1 * k, s.z, y, 1.8 * k, 4.5 * k, 1.8 * k, 'sandstone', c(), { hpMul: 1.1, w: 1.5 });
    b.box(s.x, s.z, y + 4.5 * k, 5.2 * k, 1.3 * k, 2.4 * k, 'sandstone', c(), { w: 1.5 });
    b.box(s.x, s.z, y + 5.8 * k, 4.2 * k, 3.2 * k, 2.2 * k, 'sandstone', c(), { w: 2 });
    b.box(s.x - 2.7 * k, s.z, y + 5.8 * k, 1.2 * k, 3 * k, 1.4 * k, 'sandstone', c(), { w: 1 }); b.box(s.x + 2.7 * k, s.z, y + 5.8 * k, 1.2 * k, 3 * k, 1.4 * k, 'sandstone', c(), { w: 1 });
    b.box(s.x, s.z, y + 9 * k, 2 * k, 2 * k, 2 * k, 'sandstone', c(), { w: 1 }); b.pyr(s.x, s.z, y + 11 * k, 2.4 * k, 1.8 * k, 2.4 * k, 'sandstone', 0xf0c040, { w: .5 });
  };
  statue(stat, 1, 'colossus'); statue(stat2, .8, 'colossus');
  for (let i = 0; i < 4; i++) { const p = b.spot(1.6); if (!p) continue; b.grp('obelisk'); const yy = b.ground(p.x, p.z); for (let k = 0; k < 4; k++) b.box(p.x, p.z, yy + k * 1.7, 1.5 - k * .15, 1.7, 1.5 - k * .15, 'sandstone', colVar(0xdcb46e, .1, b.r), { hpMul: .8 }); b.pyr(p.x, p.z, yy + 6.8, .95, 1.4, .95, 'sandstone', 0xf0c040); }
  for (let i = 0; i < 3; i++) { const p = b.spot(3); if (p) building(b, p.x, p.z, { w: 4, d: 4, rows: 2, wall: 'sandstone', wc: 0xd7a867, found: 'sandstone', foundHp: .4, noRoof: i !== 1, ruin: .25, door: '+z', name: 'ruin', wallHp: .8 }); }
  for (let i = 0; i < 6; i++) { const p = b.spot(1.6); if (!p) continue; b.grp('palm'); const y = b.ground(p.x, p.z); const tr = b.cyl(p.x, p.z, y, .7, 4.4, 'wood', 0x9a7442, { solid: true }); for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; b.cone(p.x + Math.cos(a) * 1.2, p.z + Math.sin(a) * 1.2, y + 4.2, 2.2, 1.3, 'leaf', 0x4aa04a, { sup: [tr] }); } }
  b.grp('cacti'); for (let i = 0; i < 8; i++) { const p = b.spot(1, { noPad: true }); if (p) b.cyl(p.x, p.z, b.ground(p.x, p.z), .7, b.rr(1.4, 2.6), 'leaf', 0x4f9a5a, { solid: true, w: .3 }); }
  b.grp('rocks'); for (let i = 0; i < 6; i++) { const p = b.spot(1.2, { noPad: true }); if (p) rock(b, p.x, p.z, b.rr(1.3, 2.4), 0xc79a62, 'sandstone'); }
  return sp;
};
/* ---------- AQUARIS ---------- */
GEN.aquaris = function (I, b, o) {
  b.initShape(7.7);
  const sp = b.reserve(0, 16, 3.5), pa = b.reserve(-9, 4, 3.4), pb = b.reserve(9, 4, 3.4), lh = b.reserve(0, -4, 3.2), dam = b.reserve(0, -13.5, 3.6);
  const pools = [[-2, 2.7], [3, 1.6]];
  b.terrain({ top: ['grass', 0x58d6a0], mid: ['sand', 0xf0dca0], deep: ['rock', 0x4aa7b8], v: .14 }, {
    hills: 3, hillH: 2, carve: (i, j, rr, edge) => (!edge && pools.some(p => Math.hypot(i - p[0], j - p[1]) < 1.3)) ? 'pool' : 0,
    tint: (i, j, rr, edge, dl) => dl === 0 && rr > b.Rat(i, j) - 1.6 ? ['sand', 0xf4e4a8] : null
  });
  for (const p of pools) { const m = mkDecor(new T.CylinderGeometry(1.45 * VX, 1.45 * VX, .1, 20), waterMat); m.position.set(I.cx + p[0] * VX, I.cy - 1.2, I.cz + p[1] * VX); I.addDecor(m); }
  // dam + reservoir
  b.grp('dam'); const dy = b.ground(dam.x, dam.z);
  for (let r = 0; r < 3; r++) for (let k = -2; k <= 2; k++) b.box(dam.x + k * 2.2, dam.z + 3, dy + r * 1.6, 2.2, 1.6, 1.4, 'stone', colVar(0xb8c4cc, .1, b.r), { f: { dam: true }, hpMul: .85 });
  const res = mkDecor(new T.BoxGeometry(12, 4, 6), waterMat); res.position.set(I.cx + dam.x, I.cy + dy + 2.1, I.cz + dam.z - 0.6); I.addDecor(res); I.reservoir = res;
  I.damDir = { x: I.cx + dam.x, y: I.cy + dy, z: I.cz + dam.z };
  waterfall(I, dam.x - 3, dam.z - 3.6, dy + 4, 4, 22, 0, -1);
  // platforms and bridge
  const a = stilts(b, pa.x, pa.z, 4.5, 6, 6, { name: 'dock', rail: true, wash: true, dc: 0xc89a5a, m: 'wood' }), c = stilts(b, pb.x, pb.z, 8, 6, 6, { name: 'dock', rail: true, wash: true, dc: 0xc89a5a, m: 'wood' });
  bridge(b, pa.x + 3.1, pa.z, 4.95, pb.x - 3.1, pb.z, 8.45, { name: 'sky bridge', wash: true, c: 0xc8a068, w: 2.2 });
  b.grp('hut'); b.box(pb.x, pb.z, c.y, 3, 1.6, 3, 'wood', 0xe0b878, { f: { washable: true } }); b.pyr(pb.x, pb.z, c.y + 1.6, 4.4, 2, 4.4, 'leaf', 0x58c46a, { f: { washable: true } });
  // lighthouse
  b.grp('lighthouse'); const ly = b.ground(lh.x, lh.z);
  for (let r = 0; r < 8; r++) for (const i of [-1, 1]) for (const j of [-1, 1]) b.box(lh.x + i * .85, lh.z + j * .85, ly + r * 1.7, 1.7, 1.7, 1.7, 'stone', r % 2 ? 0xfff4ee : 0xe8505a);
  b.box(lh.x, lh.z, ly + 13.6, 4.2, .5, 4.2, 'stone', 0x7a8a96); b.box(lh.x, lh.z, ly + 14.1, 2, 1.8, 2, 'crystal', 0xfff2a0, { glow: true, hp: 25 }); b.pyr(lh.x, lh.z, ly + 15.9, 3.4, 1.8, 3.4, 'stone', 0xe8505a);
  // coral
  for (let i = 0; i < 7; i++) { const p = b.spot(2); if (!p) continue; b.grp('coral'); const y = b.ground(p.x, p.z); for (let k = 0; k < 4; k++) { const a2 = b.r() * 6.28, d = k ? b.rr(.6, 1.6) : 0; const c2 = pick([0xff6f9c, 0xff9a5a, 0xc07bff, 0xffd45a]); if (k % 2) b.cone(p.x + Math.cos(a2) * d, p.z + Math.sin(a2) * d, y - .1, b.rr(.9, 1.4), b.rr(1.6, 3.4), 'coral', c2, { f: { washable: true }, w: .4 }); else b.ico(p.x + Math.cos(a2) * d, p.z + Math.sin(a2) * d, y - .1, b.rr(1.2, 2), 'coral', c2, { f: { washable: true }, w: .4 }); } }
  for (let i = 0; i < 5; i++) { const p = b.spot(1.6); if (!p) continue; b.grp('palm'); const y = b.ground(p.x, p.z); const tr = b.cyl(p.x, p.z, y, .7, 4.6, 'wood', 0xa8804a, { solid: true }); for (let k = 0; k < 5; k++) { const a2 = k / 5 * 6.28; b.cone(p.x + Math.cos(a2) * 1.2, p.z + Math.sin(a2) * 1.2, y + 4.4, 2.4, 1.3, 'leaf', 0x3fc060, { sup: [tr] }); } }
  b.grp('rocks'); for (let i = 0; i < 6; i++) { const p = b.spot(1.2, { noPad: true }); if (p) rock(b, p.x, p.z, b.rr(1.2, 2), 0x6fb8c8); }
  const wa = b.r() * 6.28 + 2, wr = (b.R0 - .5) * VX; if (Math.abs(Math.sin(wa)) < .9) waterfall(I, Math.cos(wa) * wr, Math.sin(wa) * wr, -2, 4, 28, Math.cos(wa), Math.sin(wa));
  return sp;
};
/* ---------- NOCTYRA ---------- */
GEN.noctyra = function (I, b, o) {
  b.initShape(7.7); const isVoid = o.boss === 'void';
  const sp = b.reserve(0, 16, 3.5), circ = b.reserve(0, -1, 7), ruin = b.reserve(-11, -8, 4.6), ruin2 = b.reserve(11, 8, 4.2);
  b.terrain({ top: ['rock', 0x3a2b5e], mid: ['rock', 0x2b2147], deep: ['rock', 0x1d1638], v: .2 }, {
    hills: 3, hillH: 2,
    vox: isVoid ? (i, j, L, rr, th) => rr > 3.2 ? { voidSec: (Math.floor((th + Math.PI) / (Math.PI / 3)) % 6) } : null : null
  });
  // mystic circle
  b.grp('mystic circle'); const cy = b.ground(circ.x, circ.z);
  for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28, x = circ.x + Math.cos(a) * 5.4, z = circ.z + Math.sin(a) * 5.4; for (let r = 0; r < 3; r++) b.box(x, z, cy + r * 1.7, 1.3, 1.7, 1.3, 'stone', colVar(0x4a3f6a, .15, b.r)); b.pyr(x, z, cy + 5.1, 1.3, 1.2, 1.3, 'crystal', 0x5cf2ff, { glow: true, f: { crystal: true }, hp: 24, w: .5 }); }
  b.pyr(circ.x, circ.z, cy - .1, 3, 6.4, 3, 'crystal', 0xd07bff, { glow: true, f: { crystal: true, big: true }, hp: 70, w: 2.2 });
  // ruins
  building(b, ruin.x, ruin.z, { w: 6, d: 6, rows: 3, wall: 'stone', wc: 0x4a4068, found: 'stone', foundC: 0x3a3158, noRoof: true, ruin: .3, door: '+z', name: 'ancient ruin' });
  building(b, ruin2.x, ruin2.z, { w: 4, d: 6, rows: 3, wall: 'stone', wc: 0x4a4068, found: 'stone', foundC: 0x3a3158, noRoof: false, roof: 'stone', roofC: 0x3a3158, roofSlab: 'stone', rsc: 0x3a3158, ruin: .2, door: '-z', name: 'ancient ruin' });
  for (let i = 0; i < 4; i++) { const p = b.spot(2.2); if (!p) continue; b.grp('arch'); const y = b.ground(p.x, p.z); for (const s of [-1, 1]) for (let k = 0; k < 2; k++) b.box(p.x + s * 1.8, p.z, y + k * 1.9, 1.3, 1.9, 1.3, 'stone', colVar(0x4a4068, .2, b.r)); b.box(p.x, p.z, y + 3.8, 5, 1.1, 1.5, 'stone', 0x3e3560); b.box(p.x, p.z, y + 4.9, 1.4, 1.2, 1.2, 'crystal', 0xb36bff, { glow: true, hp: 22, f: { crystal: true } }); }
  for (let i = 0; i < 7; i++) { const p = b.spot(2.4); if (p) crystalCluster(b, p.x, p.z, [0xb36bff, 0x5cf2ff, 0xff6bd6], 3 + (i % 3)); }
  for (let i = 0; i < 10; i++) { const p = b.spot(2); if (p) treePine(b, p.x, p.z, b.rr(.8, 1.3), { leaf: 0x2a2150, leaf2: 0x3a2c6a }); }
  b.grp('mushrooms'); for (let i = 0; i < 12; i++) { const p = b.spot(.9, { noPad: true }); if (p) b.ico(p.x, p.z, b.ground(p.x, p.z), b.rr(.7, 1.2), 'crystal', 0x6bffd0, { glow: true, hp: 6, w: .15 }); }
  // monolith
  for (let i = 0; i < 2; i++) { const p = b.spot(1.6); if (!p) continue; b.grp('monolith'); const y = b.ground(p.x, p.z); b.box(p.x, p.z, y, 1.5, 2.2, 1.2, 'stone', 0x3a3158); b.box(p.x, p.z, y + 2.2, 1.2, 2.4, 1, 'crystal', 0x8a5aff, { glow: true, f: { crystal: true }, hp: 30, w: .8 }); b.box(p.x, p.z, y + 4.6, 1.5, 2.2, 1.2, 'stone', 0x3a3158); b.pyr(p.x, p.z, y + 6.8, 1.5, 1.6, 1.2, 'stone', 0x4a4068); }
  // floating rune stones
  I.floaters = [];
  for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28 + .4, d = 12 + b.rr(-2, 2); const st = b.box(Math.cos(a) * d, Math.sin(a) * d, b.rr(7, 11), 2, 1.2, 2, 'stone', 0x5a4a88, { anchor: true, w: .8, f: { floater: true } }); I.floaters.push(st); }
  I.updaters.push((dt, t) => { for (const f of I.floaters) if (f.alive && f.collapseT < 0) I.writeM(f, 0, Math.sin(t * 1.3 + f.id) * .45, 0); });
  return sp;
};
function buildIsland(kind, cx, cy, cz, opts = {}) {
  const base = kind.startsWith('boss_') ? { boss_volcano: 'ignis', boss_forest: 'verdantia', boss_void: 'noctyra' }[kind] : kind;
  const boss = kind.startsWith('boss_') ? kind.slice(5) : null;
  const I = new Island(base, cx, cy, cz, Object.assign({ terrainSupport: base === 'aridia' || base === 'nivara' }, opts));
  I.lavaCells = new Set(); I.boss = boss;
  const b = new Bld(I);
  const sp = GEN[base](I, b, { boss });
  return finishIsland(I, b, sp);
}
