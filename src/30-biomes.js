/* ============================================================
   SKYBREAK — island generators (six biomes + three boss variants)
   Coordinates: island centre is (0,0). Flat building ground sits at y = 1.2.
   ============================================================ */
const G0 = 1.2;
function bx(I, x, y, z, sx, sy, sz, mat, color, o) { return I.add(Object.assign({ kind: 'box', mat, color, x, y, z, sx, sy, sz }, o || {})); }
function ringPts(n, r, a0, fn) { for (let k = 0; k < n; k++) { const a = a0 + k / n * Math.PI * 2; fn(Math.cos(a) * r, Math.sin(a) * r, k, a); } }

/* decorative water / lava slabs + gameplay zones */
function addPool(I, x, z, w, d, y, color, op, type, em) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, .12, d), new THREE.MeshPhongMaterial({ color, transparent: op < 1, opacity: op, emissive: em || 0x000000, emissiveIntensity: em ? .9 : 0, shininess: 60 }));
  m.position.set(x, y, z); I.group.add(m); I.deco.push(m); I.zones.push({ type, x, z, hw: w / 2, hd: d / 2, y, mesh: m }); return m;
}
function edgePoint(I, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  for (let k = 9; k >= 0; k -= .25) { const x = c * k * I.cell, z = s * k * I.cell; if (I.cells.has(I.key2(Math.round(x / I.cell), Math.round(z / I.cell)))) return { x, z }; }
  return { x: 0, z: 0 };
}
function addWaterfall(I, ang, color) {
  const e = edgePoint(I, ang); const x = e.x + Math.cos(ang) * 1.6, z = e.z + Math.sin(ang) * 1.6;
  const m = new THREE.Mesh(new THREE.BoxGeometry(2.6, 40, .35), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .55 }));
  m.position.set(x, G0 - 19, z); m.rotation.y = -ang + Math.PI / 2; I.group.add(m); I.deco.push(m);
  I.fxFns.push(dt => {
    if (Math.random() < dt * 30) poolN.emit(x + rnd(-1, 1), -34, z + rnd(-1, 1), rnd(-1, 1), rnd(1, 3), rnd(-1, 1), 1, 1, 1, rnd(2, 4), rnd(1.2, 2.2), -1, .3);
    if (Math.random() < dt * 12) poolN.emit(x + rnd(-1.2, 1.2), G0 - rnd(0, 20), z + Math.cos(ang) * .3, 0, -6, 0, .75, .92, 1, rnd(.5, .9), .8, 0, 0);
  });
}
function addGlow(I, x, y, z, hex, k, d) { const L = new THREE.PointLight(hex, k, d || 30, 1.6); L.position.set(x, y, z); I.group.add(L); I.deco.push(L); return L; }

/* tree: trunk of stacked cylinders + leaf blobs; returns top segment */
function tree(I, x, z, o) {
  o = o || {}; const g = I.surfaceY(x, z); if (g === null) return null; let y = g;
  const n = o.seg || 3, w = o.w || 1.0, h = o.h || 1.7, segs = [];
  for (let k = 0; k < n; k++) { segs.push(I.add({ kind: 'cyl', mat: 'wood', color: o.trunk || 0x7a4e2d, x, y, z, sx: w * (1 - k * .06), sy: h, sz: w * (1 - k * .06), tag: 'tree', collide: true, hp: o.hp || 40 })); y += h; }
  const top = segs[segs.length - 1];
  const big = I.add({ kind: 'ico', mat: 'leaf', color: pick(o.leaf), x, y: y - .5, z, sx: o.cw || 3.4, sy: o.ch || 2.6, sz: o.cw || 3.4, tag: 'tree', collide: false, em: o.em || 0, emi: .5 });
  I.edge(top, big);
  const nb = o.blobs === undefined ? 2 : o.blobs;
  for (let k = 0; k < nb; k++) {
    const a = rnd(0, 6.28), d = (o.cw || 3.4) * .38;
    const b = I.add({ kind: 'ico', mat: 'leaf', color: pick(o.leaf), x: x + Math.cos(a) * d, y: y + .5 + rnd(-.1, .5), z: z + Math.sin(a) * d, sx: (o.cw || 3.4) * .62, sy: (o.ch || 2.6) * .7, sz: (o.cw || 3.4) * .62, tag: 'tree', collide: false, em: o.em || 0, emi: .5 });
    I.edge(big, b);
  }
  return top;
}
/* hut: four walls (front wall split for a doorway), flat roof, cone cap */
function hut(I, x, z, y0, o) {
  o = o || {}; const g = y0 === undefined ? I.surfaceY(x, z) : y0; if (g === null) return;
  const w = o.w || 3.6, h = o.h || 2.5, t = .45, mat = o.mat || 'wood', col = o.color || 0xc08a55, hp = o.hp;
  const wl = (cx, cz, sx, sz) => I.add({ kind: 'box', mat, color: col, x: cx, y: g, z: cz, sx, sy: h, sz, hp, tag: o.tag || '' });
  wl(x, z - w / 2 + t / 2, w, t); wl(x - w / 2 + t / 2, z, t, w - 2 * t); wl(x + w / 2 - t / 2, z, t, w - 2 * t);
  const dw = 1.3, seg = (w - dw) / 2; wl(x - dw / 2 - seg / 2, z + w / 2 - t / 2, seg, t); wl(x + dw / 2 + seg / 2, z + w / 2 - t / 2, seg, t);
  const lintel = I.add({ kind: 'box', mat, color: col, x, y: g + h - .7, z: z + w / 2 - t / 2, sx: dw + .2, sy: .7, sz: t, hp, tag: o.tag || '' });
  const roof = I.add({ kind: 'box', mat, color: o.roof || 0x9a5a35, x, y: g + h, z, sx: w + .5, sy: .4, sz: w + .5, hp: hp ? hp * 1.2 : undefined, tag: o.tag || '' });
  const cap = I.add({ kind: 'cone', mat: o.capMat || 'wood', color: o.cap || 0xd2573f, x, y: g + h + .4, z, sx: w * 1.05, sy: o.capH || 1.9, sz: w * 1.05, collide: false, tag: o.tag || '', hp: hp ? hp * .8 : undefined });
  I.edge(roof, cap); return roof;
}
function rock(I, x, z, s, color, mat) {
  const g = I.surfaceY(x, z); if (g === null) return; return I.add({ kind: 'ico', mat: mat || 'rock', color: color || 0x8a8a90, x, y: g - .2, z, sx: s, sy: s * .8, sz: s * .9, collide: true, hp: s * 28 });
}
/* axis-aligned plank bridge along x between two posts */
function bridgeX(I, x1, x2, z, y, color, tag) {
  const g1 = I.surfaceY(x1 - 1.2, z), g2 = I.surfaceY(x2 + 1.2, z); if (g1 === null || g2 === null) return;
  const n = Math.max(2, Math.ceil((x2 - x1) / 1.3)), len = (x2 - x1) / n, planks = [];
  for (let k = 0; k < n; k++) planks.push(I.add({ kind: 'box', mat: 'wood', color, x: x1 + len * (k + .5), y, z, sx: len * .96, sy: .25, sz: 2.0, tag: tag || 'bridge', hp: 34 }));
  for (let k = 1; k < n; k++) I.link(planks[k - 1], planks[k]);
  const p1 = I.add({ kind: 'cyl', mat: 'wood', color: 0x6a4428, x: x1 - .7, y: g1, z: z, sx: .8, sy: y - g1, sz: .8, tag: 'bridge', hp: 55 });
  const p2 = I.add({ kind: 'cyl', mat: 'wood', color: 0x6a4428, x: x2 + .7, y: g2, z: z, sx: .8, sy: y - g2, sz: .8, tag: 'bridge', hp: 55 });
  const e1 = I.add({ kind: 'box', mat: 'wood', color, x: x1 - .35, y, z, sx: .9, sy: .25, sz: 2.0, tag: 'bridge', hp: 34 });
  const e2 = I.add({ kind: 'box', mat: 'wood', color, x: x2 + .35, y, z, sx: .9, sy: .25, sz: 2.0, tag: 'bridge', hp: 34 });
  I.edge(p1, e1); I.edge(p2, e2); I.link(e1, planks[0]); I.link(planks[n - 1], e2);
  return planks;
}
function platform(I, cx, cz, h, size, color, postColor) {
  const g = I.surfaceY(cx, cz); if (g === null) return null; const posts = [];
  const s = size / 2 - .55;
  for (const [dx, dz] of [[-s, -s], [s, -s], [-s, s], [s, s]]) posts.push(I.add({ kind: 'cyl', mat: 'wood', color: postColor || 0x6a4428, x: cx + dx, y: g, z: cz + dz, sx: .75, sy: h, sz: .75, tag: 'tree', hp: 60 }));
  return I.add({ kind: 'box', mat: 'wood', color, x: cx, y: g + h, z: cz, sx: size, sy: .4, sz: size, hp: 80, tag: 'tree' });
}
function ironbarrel(I, x, z, y0, R, D) {
  const g = y0 === undefined ? I.surfaceY(x, z) : y0; if (g === null) return;
  return I.add({ kind: 'cyl', mat: 'barrel', color: 0xc8402a, x, y: g, z, sx: 1.2, sy: 1.5, sz: 1.2, hp: 22, exR: R || 4.6, exD: D || 85, em: 0x551100, emi: .6, collide: true });
}

/* ================= VERDANTIA ================= */
function genVerdantia(I) {
  const v = I.variant, boss = v === 'boss-forest';
  I.opts.regrow = boss; if (boss) I.opts.noSeal = false;
  I.buildTerrain({
    top: 0x6fcf5a, topColors: [0x6fcf5a, 0x62c452, 0x7ad45f, 0x58b848], side: 0x8a6140, rock: 0x7a6a58, under: 0x6b5a4a, glow: 0x7dff9a,
    heightFn: (i, j, r) => r < 4.5 ? 0 : ((Math.sin(i * .9 + 1) + Math.cos(j * .8) + Math.sin((i + j) * .5)) > 1.15 ? (r > 5.4 ? 2 : 1) : 0),
    holeFn: (i, j) => (i === 2 && j === -3) || (i === 3 && j === -3)
  });
  addPool(I, 6.25, -7.5, 5, 2.5, .55, 0x4cc3ff, .72, 'water');
  const leaf = [0x3fae4f, 0x2f9a5b, 0x7bd36a, 0x46b85a];
  // giant tree (and the heart in the boss variant)
  let y0 = G0, below = null;
  if (boss) {
    below = I.add({ kind: 'sph', mat: 'core', color: 0x2e8f4a, em: 0x7dff9a, emi: 1.1, x: 0, y: G0, z: 0, sx: 3.8, sy: 3.8, sz: 3.8, hp: 520, weight: 7, tag: 'heart', collide: true, rayK: 1 });
    y0 = G0 + 3.4; addGlow(I, 0, 4, 0, 0x7dff9a, 1.1, 26);
  }
  let y = y0, prev = below, segs = [];
  for (let k = 0; k < 5; k++) { const w = 2.7 - k * .18; const s = I.add({ kind: 'cyl', mat: 'wood', color: 0x7a4e2d, x: 0, y, z: 0, sx: w, sy: 2.4, sz: w, tag: 'tree', hp: 130, collide: true }); y += 2.4; segs.push(s); }
  const topSeg = segs[4]; const bigL = I.add({ kind: 'ico', mat: 'leaf', color: 0x2f9a5b, x: 0, y: y - 1, z: 0, sx: 8.5, sy: 5.2, sz: 8.5, tag: 'tree', collide: false, hp: 90, weight: 2.4 }); I.edge(topSeg, bigL);
  ringPts(6, 3.4, .3, (x, z, k) => { const b = I.add({ kind: 'ico', mat: 'leaf', color: leaf[k % 4], x, y: y - .2 + (k % 2) * .6, z, sx: 4.4, sy: 3.2, sz: 4.4, tag: 'tree', collide: false, hp: 50 }); I.edge(bigL, b); });
  // roots around the base (they hold the base against the ground)
  [[2.7, 0, 3.2, .7], [-2.7, 0, 3.2, .7], [0, 2.7, .7, 3.2], [0, -2.7, .7, 3.2]].forEach(([x, z, sx, sz]) => bx(I, x, G0, z, sx, .5, sz, 'wood', 0x5a3a20, { hp: 48, tag: 'root' }));
  // ordinary trees
  [[10.2, -2], [-10, -2.5], [-8, -6.5], [0.5, -10.4], [5.8, 1.2], [-5.4, -3.2], [9.5, 6.8], [-4.5, 5.5]].forEach(([x, z]) => tree(I, x, z, { leaf, seg: rint(3, 4), cw: rnd(3.2, 4.2), ch: rnd(2.4, 3), blobs: 2 }));
  // huts
  hut(I, -7.8, 2.6, undefined, {}); hut(I, 8.3, 3.2, undefined, { color: 0xb77a47 }); hut(I, -2.6, -8.6, undefined, { color: 0xc99560 });
  // treehouse + rope bridge (planks hold each other up; the platforms stand on posts)
  const A = platform(I, -3.4, 8.8, 4, 4.2, 0xb88455), B = platform(I, 4.6, 8.8, 4, 4.2, 0xb88455);
  if (A && B) {
    bridgeX2(I, -1.3, 2.5, 8.8, G0 + 4.4, A, B, 0xa8794a);
    hut(I, -3.4, 8.8, G0 + 4.4, { w: 3, h: 2.1, color: 0xc99560, capH: 1.5 });
    // vines from the canopy-sized leaf on a tree near B hang to the platform
    const t = tree(I, 7.4, 10.0, { leaf, seg: 4, cw: 4.4 });
  }
  [[-6, 8, 2.2], [3, -4.8, 1.9], [-9.5, 0, 1.7], [9, -6, 2.1], [-1, 5.2, 1.6]].forEach(([x, z, s]) => rock(I, x, z, s, 0x8a8f86));
  addWaterfall(I, 3.6, 0xbfe8ff); addWaterfall(I, 0.5, 0xbfe8ff);
  I.finalize();
}
function bridgeX2(I, x1, x2, z, y, A, B, color) {
  const n = Math.ceil((x2 - x1) / 1.2), len = (x2 - x1) / n, pl = [];
  for (let k = 0; k < n; k++) pl.push(I.add({ kind: 'box', mat: 'wood', color, x: x1 + len * (k + .5), y: y - .0, z, sx: len * .96, sy: .25, sz: 1.8, tag: 'bridge', hp: 30 }));
  for (let k = 1; k < n; k++) I.link(pl[k - 1], pl[k]);
  I.link(A, pl[0]); I.link(pl[n - 1], B);
}

/* ================= IGNIS ================= */
function genIgnis(I) {
  const v = I.variant, boss = v === 'boss-volcano';
  const chan = (i, j, r) => { if (r < 1.6) return false; const a = Math.atan2(j, i); for (let k = 0; k < 3; k++) { let d = Math.atan2(Math.sin(a - (.5 + k * 2.094)), Math.cos(a - (.5 + k * 2.094))); if (Math.abs(d) * r < .62) return true; } return false; };
  I.buildTerrain({
    top: 0x3b3340, topColors: [0x3b3340, 0x332d3a, 0x443a47, 0x2f2937], side: 0x1b161d, rock: 0x2a2330, under: 0x241d2b, topMat: 'basalt', glow: 0xff7a3a, topHp: 96,
    heightFn: (i, j, r) => r < 1.2 ? 2 : r < 2.3 ? 2 : r < 3.2 ? 1 : 0,
    holeFn: (i, j) => (i === 0 && j === 0) || chan(i, j, Math.hypot(i, j)) && Math.hypot(i, j) < 6.8
  });
  // lava: crater + channels
  addPool(I, 0, 0, 2.4, 2.4, .5, 0xff5a1f, 1, 'lava', 0xff3a00);
  for (const cv of I.cells.values()) if (cv.hole && !(cv.i === 0 && cv.j === 0)) addPool(I, cv.x, cv.z, I.cell * .98, I.cell * .98, .35, 0xff5a1f, 1, 'lava', 0xff3a00);
  addGlow(I, 0, 4, 0, 0xff6a2a, 1.6, 40);
  const ob = 0x241038, bas = 0x3d3548;
  // obsidian spires
  [[6.5, 6.3], [-6.8, 6], [-7, -6.2], [6.8, -6.4], [0, 9.8], [0, -9.8]].forEach(([x, z], k) => {
    const g = I.surfaceY(x, z); if (g === null) return; let y = g;
    for (let s = 0; s < 3; s++) { I.add({ kind: 'cyl', mat: 'obsidian', color: ob, x, y, z, sx: 1.7 - s * .3, sy: 2.0, sz: 1.7 - s * .3, em: 0x3a1470, emi: .35, hp: 120 }); y += 2.0; }
    I.add({ kind: 'cone', mat: 'obsidian', color: 0x32104e, x, y, z, sx: 1.2, sy: 2.4, sz: 1.2, em: 0x6a2ab4, emi: .5, hp: 60, collide: false });
  });
  // basalt gates & fort walls
  const gate = (x, z, along) => {
    const g = I.surfaceY(x, z); if (g === null) return;
    const d = 2.2; const pa = along === 'x' ? [x - d, z] : [x, z - d], pb = along === 'x' ? [x + d, z] : [x, z + d];
    const L = I.add({ kind: 'box', mat: 'basalt', color: bas, x: pa[0], y: g, z: pa[1], sx: 1.4, sy: 4.2, sz: 1.4, hp: 150 });
    const R = I.add({ kind: 'box', mat: 'basalt', color: bas, x: pb[0], y: g, z: pb[1], sx: 1.4, sy: 4.2, sz: 1.4, hp: 150 });
    I.add({ kind: 'box', mat: 'basalt', color: 0x4a4056, x, y: g + 4.2, z, sx: along === 'x' ? 6.2 : 1.6, sy: 1.1, sz: along === 'x' ? 1.6 : 6.2, hp: 170 });
  };
  gate(-8.5, 0.2, 'z'); gate(8.5, -.4, 'z'); gate(1, 8.4, 'x');
  [[-4, -8, 'x'], [4.5, 7, 'x'], [-9.5, 8, 'z'], [9.8, -8.4, 'z']].forEach(([x, z, a]) => {
    const g = I.surfaceY(x, z); if (g === null) return; for (let s = 0; s < 3; s++) for (let k = 0; k < 3; k++) bx(I, x + (a === 'x' ? (k - 1) * 1.6 : 0), g + s * .9, z + (a === 'z' ? (k - 1) * 1.6 : 0), a === 'x' ? 1.55 : 1.2, .9, a === 'z' ? 1.55 : 1.2, 'basalt', s % 2 ? 0x453b4f : bas, { hp: 60 });
  });
  // magma sacs: glowing, volatile
  [[-5, 5], [5, 5.5], [-5.5, -4.8], [5.5, -5], [2.8, -9], [-2.8, 9.2], [9.8, 3], [-9.8, -2.5]].forEach(([x, z]) => {
    const g = I.surfaceY(x, z); if (g === null) return;
    I.add({ kind: 'sph', mat: 'barrel', color: 0xff5a1f, em: 0xff3a00, emi: 1, x, y: g, z, sx: 1.7, sy: 1.7, sz: 1.7, hp: 24, exR: 5.4, exD: 120, collide: true });
  });
  rock(I, -9, -7, 2, 0x2b2430, 'basalt'); rock(I, 8, 8, 2.2, 0x2b2430, 'basalt'); rock(I, 9.6, -3, 1.8, 0x2b2430, 'basalt');
  if (boss) {
    I.opts.noSeal = false; I.lavaLevel = .15;
    [[-8.2, 8.4], [8.9, 7.2], [0.2, -9.6]].forEach(([x, z]) => {
      const g = I.surfaceY(x, z); if (g === null) return;
      ringPts(6, 2.2, 0, (rx, rz, k) => { if (k === 2) return; bx(I, x + rx, g, z + rz, 1.5, 3.4, 1.5, 'obsidian', 0x1e0c30, { hp: 130, em: 0x3a1470, emi: .4 }); });
      I.add({ kind: 'sph', mat: 'core', color: 0xff3a1a, em: 0xff2a00, emi: 1.3, x, y: g, z, sx: 2.2, sy: 2.2, sz: 2.2, hp: 240, weight: 4, tag: 'core', collide: true });
      addGlow(I, x, g + 2, z, 0xff4a1a, 1.2, 18);
    });
  }
  I.fxFns.push(dt => { if (Math.random() < dt * 14) poolA.emit(rnd(-1, 1), 1.2, rnd(-1, 1), rnd(-1.5, 1.5), rnd(4, 8), rnd(-1.5, 1.5), 1, .45, .1, rnd(.4, .8), rnd(1, 1.8), 4, .2); });
  I.finalize();
}

/* ================= NIVARA ================= */
function genNivara(I) {
  const lake = (i, j) => Math.hypot(i - 1.6, j + 1.8) < 1.9;
  I.buildTerrain({
    top: 0xeef6ff, topColors: [0xf4f9ff, 0xe6f1fb, 0xdbeaf7], side: 0xa9d4ee, rock: 0x6f8fb0, under: 0x5a7a9a, glow: 0x8fe8ff, topMat: 'snow',
    heightFn: (i, j, r) => r < 4.5 ? 0 : ((Math.sin(i * 1.1) + Math.cos(j * .9) + Math.sin((i - j) * .6)) > .9 ? (r > 5.3 ? 2 : 1) : 0),
    tileFn: (i, j) => lake(i, j) ? { mat: 'ice', color: 0x8fd8ff, hp: 18, side: 0x6fb8e8 } : null
  });
  const ice = 0xa8e4ff, slab = 0xcdf1ff, snow = 0xf2f8ff;
  // ice towers: stacked blocks
  const tower = (x, z, n) => { const g = I.surfaceY(x, z); if (g === null) return; let y = g; for (let k = 0; k < n; k++) { const s = 2.6 - k * .22; I.add({ kind: 'box', mat: 'ice', color: k % 2 ? ice : 0x93d8f5, x, y, z, sx: s, sy: 1.5, sz: s, op: .92, hp: 38 }); y += 1.5; } I.add({ kind: 'cone', mat: 'ice', color: 0xdff6ff, x, y, z, sx: 1.8, sy: 2.4, sz: 1.8, collide: false, hp: 20 }); };
  tower(-7.5, -4, 5); tower(7.5, 4.5, 6); tower(-2, 9, 4); tower(9.5, -5.5, 4);
  // glacier gates: heavy slabs on brittle pillars (cut the pillars, the slab falls)
  const gate = (x, z, along, hh) => {
    const g = I.surfaceY(x, z); if (g === null) return; const d = 3.3;
    const a = along === 'x' ? [x - d, z] : [x, z - d], b = along === 'x' ? [x + d, z] : [x, z + d];
    const p1 = I.add({ kind: 'box', mat: 'ice', color: ice, x: a[0], y: g, z: a[1], sx: 1.5, sy: hh, sz: 1.5, op: .92, hp: 46 });
    const p2 = I.add({ kind: 'box', mat: 'ice', color: ice, x: b[0], y: g, z: b[1], sx: 1.5, sy: hh, sz: 1.5, op: .92, hp: 46 });
    const sl = I.add({ kind: 'box', mat: 'ice', color: slab, x, y: g + hh, z, sx: along === 'x' ? 8.4 : 2.6, sy: 1.4, sz: along === 'x' ? 2.6 : 8.4, hp: 150, op: .95, weight: 2 });
    const top = I.add({ kind: 'box', mat: 'snow', color: snow, x, y: g + hh + 1.4, z, sx: along === 'x' ? 6 : 1.8, sy: .7, sz: along === 'x' ? 1.8 : 6, hp: 30 });
  };
  gate(0, -8.6, 'x', 4.8); gate(-9, 3.2, 'z', 4.2);
  // snow houses
  hut(I, 4.6, 1.2, undefined, { mat: 'ice', color: 0xbfe9ff, roof: 0xe9f7ff, cap: 0xffffff, capMat: 'snow', hp: 42 });
  hut(I, -5.0, 3.0, undefined, { mat: 'ice', color: 0xb2e2fa, roof: 0xe9f7ff, cap: 0xffffff, capMat: 'snow', hp: 42 });
  // ice bridge between two spires
  const g1 = I.surfaceY(-4.5, -9.6), g2 = I.surfaceY(4, -9.6);
  // spikes
  ringPts(11, 10.6, .4, (x, z) => { const g = I.surfaceY(x, z); if (g === null) return; I.add({ kind: 'cone', mat: 'ice', color: 0xbfeaff, x, y: g, z, sx: rnd(1, 1.7), sy: rnd(2, 3.8), sz: 1.2, op: .9, collide: false, hp: 14 }); });
  [[6.5, -2.6], [-3.6, -4.2], [-8.8, 7.5], [1.5, 6]].forEach(([x, z]) => rock(I, x, z, 1.8, 0x7c92ad));
  I.fxFns.push(dt => { if (Math.random() < dt * 22) poolN.emit(rnd(-14, 14), rnd(8, 22), rnd(-14, 14), rnd(-1, 1), rnd(-2, -1), rnd(-1, 1), 1, 1, 1, rnd(.3, .5), rnd(3, 5), 0, 0); });
  I.finalize();
}

/* ================= ARIDIA ================= */
function genAridia(I) {
  I.buildTerrain({
    top: 0xe8c27a, topColors: [0xe8c27a, 0xe0b86c, 0xecca86], side: 0xc9944f, rock: 0xa8743c, under: 0x8a5f30, glow: 0xffd070, topMat: 'sand',
    heightFn: (i, j, r) => r < 4.5 ? 0 : ((Math.sin(i * .8 + 2) + Math.cos(j * 1.0) + Math.sin((i + j) * .45)) > 1.0 ? (r > 5.4 ? 2 : 1) : 0)
  });
  const ss = 0xc98f4f, ss2 = 0xd9a45f, dark = 0x9e6a38;
  // temple: stepped base, columns on weak foundations, heavy roof slab
  const T = { x: -4, z: -4 };
  bx(I, T.x, G0, T.z, 6.8, .7, 6.8, 'sandstone', ss2, { hp: 90 }); bx(I, T.x, G0 + .7, T.z, 5.2, .7, 5.2, 'sandstone', ss2, { hp: 80 });
  const colH = 3.6, cy = G0 + 1.4; const cols = [];
  [[-1.7, -1.7], [1.7, -1.7], [-1.7, 1.7], [1.7, 1.7], [0, -1.7], [0, 1.7]].forEach(([dx, dz]) => {
    const f = I.add({ kind: 'box', mat: 'sand', color: dark, x: T.x + dx, y: cy, z: T.z + dz, sx: 1.5, sy: .55, sz: 1.5, hp: 20, tag: 'found' });
    cols.push(I.add({ kind: 'cyl', mat: 'sandstone', color: ss, x: T.x + dx, y: cy + .55, z: T.z + dz, sx: 1.15, sy: colH, sz: 1.15, hp: 70 }));
  });
  I.add({ kind: 'box', mat: 'sandstone', color: ss2, x: T.x, y: cy + .55 + colH, z: T.z, sx: 5.6, sy: .9, sz: 5.2, hp: 160, weight: 2 });
  I.add({ kind: 'box', mat: 'sandstone', color: ss, x: T.x, y: cy + 1.45 + colH, z: T.z, sx: 3.4, sy: .6, sz: 3.0, hp: 80 });
  // giant statue on a weak pedestal
  const S = { x: 6.2, z: 3.8 }; let y = G0;
  I.add({ kind: 'box', mat: 'sand', color: dark, x: S.x, y, z: S.z, sx: 4.2, sy: 1.6, sz: 4.2, hp: 38, tag: 'found', weight: 1 }); y += 1.6;
  I.add({ kind: 'box', mat: 'sandstone', color: ss, x: S.x - .9, y, z: S.z, sx: 1.2, sy: 2.6, sz: 1.6, hp: 70 }); I.add({ kind: 'box', mat: 'sandstone', color: ss, x: S.x + .9, y, z: S.z, sx: 1.2, sy: 2.6, sz: 1.6, hp: 70 }); y += 2.6;
  I.add({ kind: 'box', mat: 'sandstone', color: ss2, x: S.x, y, z: S.z, sx: 3.2, sy: 3.0, sz: 2.0, hp: 120, weight: 2 }); y += 3.0;
  I.add({ kind: 'box', mat: 'sandstone', color: ss, x: S.x, y, z: S.z, sx: 1.8, sy: 1.9, sz: 1.8, hp: 70 }); y += 1.9;
  I.add({ kind: 'cone', mat: 'sandstone', color: 0xe6c25a, x: S.x, y, z: S.z, sx: 2.0, sy: 1.8, sz: 2.0, hp: 40, collide: false });
  // obelisk
  { const g = I.surfaceY(0, 0); let yy = g; for (let k = 0; k < 4; k++) { I.add({ kind: 'box', mat: 'sandstone', color: ss, x: 0, y: yy, z: 0, sx: 1.8 - k * .3, sy: 1.7, sz: 1.8 - k * .3, hp: 60 }); yy += 1.7; } I.add({ kind: 'cone', mat: 'sandstone', color: 0xe6c25a, x: 0, y: yy, z: 0, sx: .9, sy: 1.2, sz: .9, collide: false, hp: 20 }); }
  // loose dunes: columns of sand blocks that slump
  [[-8, 5.5], [-6.5, 7.4], [3, 8.8], [9, -3], [8, -7], [-9.5, -1], [1.5, -8.5], [-1.5, 4.6]].forEach(([x, z]) => {
    const g = I.surfaceY(x, z); if (g === null) return; const n = rint(2, 4);
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { const h = Math.max(0, n - (Math.abs(a - 1) + Math.abs(b - 1))); for (let k = 0; k < h; k++) I.add({ kind: 'box', mat: 'sand', color: k % 2 ? 0xe9c47f : 0xdcb36a, x: x + (a - 1) * 1.4, y: g + k * 1.0, z: z + (b - 1) * 1.4, sx: 1.38, sy: 1.0, sz: 1.38, hp: 15 }); }
  });
  // broken walls
  [[-9, 8.5, 'x'], [7.5, 8.2, 'x'], [9.6, 1, 'z'], [-2, -9.8, 'x']].forEach(([x, z, a]) => { const g = I.surfaceY(x, z); if (g === null) return; for (let k = 0; k < 4; k++) for (let h = 0; h < 3 - (k % 2); h++) bx(I, x + (a === 'x' ? (k - 1.5) * 1.5 : 0), g + h * 1.0, z + (a === 'z' ? (k - 1.5) * 1.5 : 0), a === 'x' ? 1.46 : .9, 1.0, a === 'z' ? 1.46 : .9, 'sandstone', (h + k) % 2 ? ss : ss2, { hp: 34 }); });
  // cacti
  [[-10, 3], [10, 6], [2.5, -5.5], [-3, 9.8]].forEach(([x, z]) => { const g = I.surfaceY(x, z); if (g === null) return; const a = I.add({ kind: 'cyl', mat: 'leaf', color: 0x4fa05a, x, y: g, z, sx: .8, sy: 2.6, sz: .8, hp: 20, tag: 'cactus' }); const b = I.add({ kind: 'cyl', mat: 'leaf', color: 0x4fa05a, x: x + .7, y: g + 1.2, z, sx: .5, sy: 1.1, sz: .5, hp: 12 }); I.edge(a, b); });
  rock(I, 4, -9, 2.2, 0xb08a60, 'sandstone'); rock(I, -9, 9, 1.8, 0xb08a60, 'sandstone');
  I.fxFns.push(dt => { if (Math.random() < dt * 12) poolN.emit(rnd(-16, 16), rnd(1.5, 4), rnd(-16, 16), rnd(2, 4), rnd(.2, .8), rnd(-.5, .5), .93, .78, .5, rnd(.5, 1), rnd(2, 3), 0, 0); });
  I.finalize();
}

/* ================= AQUARIS ================= */
function genAquaris(I) {
  const pool = (i, j) => (Math.abs(i + 2) <= 1 && j === 0) || (Math.abs(i - 2.5) < 1.2 && j === 3) || (i === 0 && j === -3);
  I.buildTerrain({
    top: 0x46d6a4, topColors: [0x46d6a4, 0x3ecf9e, 0x52dfae, 0x38c595], side: 0xf0e0a8, rock: 0x6a7f9a, under: 0x4a6a8a, glow: 0x8ff0ff,
    heightFn: (i, j, r) => r < 4.5 ? 0 : ((Math.sin(i * 1.0 + 1) + Math.cos(j * .9 + 2) + Math.sin((i + j) * .55)) > 1.1 ? (r > 5.3 ? 2 : 1) : 0),
    holeFn: (i, j) => pool(i, j)
  });
  // pools (water slows you down)
  for (const cv of I.cells.values()) if (cv.hole) addPool(I, cv.x, cv.z, I.cell * .98, I.cell * .98, .6, 0x36b6ff, .7, 'water');
  const coralCols = [0xff7fa0, 0xffa04d, 0xc06aff, 0xff6a6a];
  // bridges over the long pool (x from -5 to 0)
  bridgeX(I, -8.4, -1.6, 0, G0 + .5, 0xb88455, 'bridge');
  bridgeX(I, 3.9, 8.6, 7.5, G0 + .5, 0xc4935f, 'bridge');
  // water towers: pylon + tank (tank bursts => flood)
  const wt = (x, z, h) => { const g = I.surfaceY(x, z); if (g === null) return; let y = g; for (let k = 0; k < 3; k++) { I.add({ kind: 'cyl', mat: 'wood', color: 0x9a6a40, x, y, z, sx: 1.3, sy: h / 3, sz: 1.3, hp: 44 }); y += h / 3; } I.add({ kind: 'box', mat: 'wood', color: 0x7a4e2d, x, y, z, sx: 3.6, sy: .4, sz: 3.6, hp: 60 }); y += .4; I.add({ kind: 'cyl', mat: 'ice', color: 0x7ad4ff, x, y, z, sx: 3.0, sy: 2.4, sz: 3.0, op: .8, hp: 48, tag: 'tank', weight: 2 }); };
  wt(-8, -5.5, 6); wt(8.6, 3, 5.4); wt(-3, 8.8, 6.6);
  // tiki huts
  hut(I, 3, -6, undefined, { color: 0xd8a868, roof: 0xb88455, cap: 0x7fcf62, capMat: 'leaf', capH: 2.3 }); hut(I, -8.5, 4.5, undefined, { color: 0xd8a868, roof: 0xb88455, cap: 0x7fcf62, capMat: 'leaf', capH: 2.3 });
  // coral
  ringPts(16, 5.2, .1, (x, z, k) => { const g = I.surfaceY(x + 1, z + 1); if (g === null || g < 1) return; const kind = k % 3 === 0 ? 'cone' : 'ico'; I.add({ kind, mat: 'coral', color: coralCols[k % 4], x: x + 1, y: g, z: z + 1, sx: rnd(1, 1.8), sy: rnd(1.3, 2.8), sz: rnd(1, 1.6), collide: false, tag: 'coral' }); });
  ringPts(10, 10.2, .6, (x, z, k) => { const g = I.surfaceY(x, z); if (g === null || g < 1) return; I.add({ kind: k % 2 ? 'cone' : 'ico', mat: 'coral', color: coralCols[(k + 1) % 4], x, y: g, z, sx: rnd(1.1, 2), sy: rnd(1.4, 3.2), sz: rnd(1, 1.7), collide: false, tag: 'coral' }); });
  // palms
  [[9.6, -6], [-10, 0], [1, 10], [-5, -9.4], [5.6, -2.5]].forEach(([x, z]) => {
    const g = I.surfaceY(x, z); if (g === null) return; let y = g, top = null;
    for (let k = 0; k < 4; k++) { top = I.add({ kind: 'cyl', mat: 'wood', color: 0xb48a58, x: x + k * .12, y, z, sx: .8, sy: 1.6, sz: .8, hp: 38, tag: 'tree' }); y += 1.6; }
    const f = I.add({ kind: 'ico', mat: 'leaf', color: 0x4fcf6a, x: x + .4, y: y - .2, z, sx: 4.6, sy: 1.0, sz: 4.6, collide: false, tag: 'tree', hp: 30 }); I.edge(top, f);
    const f2 = I.add({ kind: 'ico', mat: 'leaf', color: 0x3fb85a, x: x + .4, y: y + .4, z, sx: 2.6, sy: 1.2, sz: 2.6, collide: false, tag: 'tree', hp: 24 }); I.edge(f, f2);
  });
  rock(I, 9.4, 8, 2, 0x7a8f9c); rock(I, -9.2, -8.8, 1.9, 0x7a8f9c);
  addWaterfall(I, 1.2, 0xbfeaff); addWaterfall(I, 3.9, 0xbfeaff); addWaterfall(I, 5.4, 0xbfeaff);
  I.fxFns.push(dt => { if (Math.random() < dt * 8) poolN.emit(rnd(-9, 9), 1.0, rnd(-9, 9), rnd(-.5, .5), rnd(1, 2.4), rnd(-.5, .5), .8, .95, 1, rnd(.3, .5), rnd(1, 1.8), 0, 0); });
  I.finalize();
}

/* ================= NOCTYRA ================= */
function genNoctyra(I) {
  const v = I.variant, boss = v === 'boss-void'; I.opts.voidFlicker = boss;
  I.buildTerrain({
    top: 0x2c2650, topColors: [0x2c2650, 0x332b5c, 0x28224a, 0x38306a], side: 0x15112e, rock: 0x1c1738, under: 0x161230, glow: 0xb88bff,
    heightFn: (i, j, r) => r < 4.5 ? 0 : ((Math.sin(i * 1.0) + Math.cos(j * 1.1 + 1) + Math.sin((i + j) * .5)) > 1.0 ? (r > 5.4 ? 2 : 1) : 0)
  });
  addGlow(I, 0, 3, 0, 0x9b6bff, 1.5, 38);
  const cc = [0x8a5bff, 0x42e0ff, 0xff5bd0];
  const crystal = (x, z, h, c, g0) => { const g = g0 === undefined ? I.surfaceY(x, z) : g0; if (g === null) return null; return I.add({ kind: 'oct', mat: 'crystal', color: c, em: c, emi: .9, x, y: g, z, sx: 1.5, sy: h, sz: 1.5, collide: true, hp: 28 + h * 6, tag: 'crystal', weight: .7 }); };
  // crystal clusters
  [[-6, 6], [6.5, 6.5], [-7, -5.5], [7, -6], [0, 9.5], [0, -9.8], [-10, 0.5], [10, 0.2]].forEach(([x, z], k) => {
    crystal(x, z, rnd(3.4, 5.2), cc[k % 3]); crystal(x + 1.5, z + .5, rnd(2, 3.2), cc[(k + 1) % 3]); crystal(x - 1.2, z - 1.1, rnd(1.8, 3), cc[(k + 2) % 3]);
  });
  // levitating monoliths on crystal stems
  [[-3.5, -3.2], [3.6, 3.4], [3.8, -3.8], [-3.4, 3.8]].forEach(([x, z], k) => {
    const st = crystal(x, z, 2.4, cc[k % 3]); if (!st) return;
    const top = st.cy + st.hy; const m = I.add({ kind: 'box', mat: 'stone', color: 0x4d4470, x, y: top + .35, z, sx: 2.6, sy: 4.2, sz: .9, hp: 90, float: .16, weight: 1.4, tag: 'monolith' }); I.edge(st, m); I.bobbers.push(m);
    const cap = I.add({ kind: 'box', mat: 'stone', color: 0x5e5488, x, y: top + 4.55, z, sx: 3.2, sy: .5, sz: 1.3, hp: 60, float: .16 }); I.edge(m, cap); I.bobbers.push(cap);
  });
  // ruins: arches and walls
  const arch = (x, z, a) => { const g = I.surfaceY(x, z); if (g === null) return; const d = 2.2; const pa = a === 'x' ? [x - d, z] : [x, z - d], pb = a === 'x' ? [x + d, z] : [x, z + d]; I.add({ kind: 'box', mat: 'stone', color: 0x4d4470, x: pa[0], y: g, z: pa[1], sx: 1.3, sy: 4.4, sz: 1.3, hp: 90 }); I.add({ kind: 'box', mat: 'stone', color: 0x4d4470, x: pb[0], y: g, z: pb[1], sx: 1.3, sy: 4.4, sz: 1.3, hp: 90 }); I.add({ kind: 'box', mat: 'stone', color: 0x60568a, x, y: g + 4.4, z, sx: a === 'x' ? 5.9 : 1.5, sy: 1, sz: a === 'x' ? 1.5 : 5.9, hp: 100 }); };
  arch(-9, -7.5, 'x'); arch(8.8, -9, 'z'); arch(-1.5, 6.4, 'x');
  [[-8.5, 7.6], [9.4, 7], [4.8, -9.6]].forEach(([x, z]) => { const g = I.surfaceY(x, z); if (g === null) return; for (let k = 0; k < 4; k++) for (let h = 0; h < 2 + (k % 2); h++) bx(I, x + (k - 1.5) * 1.5, g + h * 1.1, z, 1.46, 1.1, 1.2, 'stone', (h + k) % 2 ? 0x4d4470 : 0x40375f, { hp: 40 }); });
  // dark forest
  [[10.2, -3.2], [-5.5, -9.4], [3.2, 8.6], [-10, -4.6], [5.4, -6.4], [-6, 1.2]].forEach(([x, z]) => tree(I, x, z, { trunk: 0x1c1830, leaf: [0x2a1a5a, 0x331f6e, 0x241650], em: 0x6a3cff, seg: 4, w: .9, cw: 3.6, ch: 2.8, blobs: 2 }));
  // energy ring over the centre (decor)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5.4, .12, 8, 48), new THREE.MeshBasicMaterial({ color: 0xb88bff, transparent: true, opacity: .75, blending: THREE.AdditiveBlending }));
  ring.position.set(0, 9.5, 0); ring.rotation.x = Math.PI / 2; I.group.add(ring); I.deco.push(ring);
  I.fxFns.push(dt => { ring.rotation.z += dt * .4; ring.position.y = 9.5 + Math.sin(I.t) * .4; if (Math.random() < dt * 16) poolA.emit(rnd(-14, 14), rnd(1.5, 3), rnd(-14, 14), 0, rnd(1, 2.5), 0, .6, .4, 1, rnd(.3, .5), rnd(1.5, 2.5), 0, 0); });
  rock(I, 0, 4.2, 1.8, 0x3a3358, 'stone');
  I.finalize();
}
const GENS = { verdantia: genVerdantia, ignis: genIgnis, nivara: genNivara, aridia: genAridia, aquaris: genAquaris, noctyra: genNoctyra };
function buildIsland(key, opts) {
  opts = opts || {};
  const I = new Island(key, opts); I.fxFns = []; GENS[key](I); return I;
}
