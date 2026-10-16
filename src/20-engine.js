/* ============================================================
   SKYBREAK — rendering setup, particles, destructible islands
   ============================================================ */
let renderer, scene, camera, sun, hemi, skyMat, cloudGroup, starsMat;
const GRAV = 24;
const timers = [];
function later(sec, fn) { timers.push({ t: sec, fn }); }
function tickTimers(dt) {
  for (let i = timers.length - 1; i >= 0; i--) {
    const T = timers[i]; T.t -= dt;
    if (T.t <= 0) { timers.splice(i, 1); try { T.fn(); } catch (e) { console.error(e); } }
  }
}

/* ---------------- graphics bootstrap ---------------- */
function initGfx() {
  const canvas = $('view');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfeeff, 90, 520);
  camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1600);
  hemi = new THREE.HemisphereLight(0xbfe3ff, 0x4a7a3a, 0.75); scene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff0cf, 0.95); sun.position.set(34, 56, 22); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 5; sc.far = 150;
  sun.shadow.bias = -0.0006; scene.add(sun); scene.add(sun.target);
  // sky dome
  skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x4aa8ff) }, bot: { value: new THREE.Color(0xd5f0ff) }, stars: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform vec3 top; uniform vec3 bot; uniform float stars; varying vec3 vP;' +
      'float h(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453); }' +
      'void main(){ vec3 d=normalize(vP); float t=smoothstep(-0.25,0.75,d.y); vec3 c=mix(bot,top,t);' +
      'vec3 q=floor(d*180.0); float s=step(0.9975,h(q))*stars*smoothstep(0.0,0.4,d.y); c+=vec3(s);' +
      'gl_FragColor=vec4(c,1.0);}'
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), skyMat); sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);
  // clouds
  cloudGroup = new THREE.Group(); scene.add(cloudGroup);
  const cg = new THREE.IcosahedronGeometry(1, 1); const cm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .93 });
  const rg = mulberry(42);
  const N = 170, inst = new THREE.InstancedMesh(cg, cm, N); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const a = rg() * Math.PI * 2, r = 70 + rg() * 520, base = -62 - rg() * 22 + (rg() < .22 ? 40 + rg() * 20 : 0);
    const sc2 = 14 + rg() * 30; v.set(Math.cos(a) * r, base, Math.sin(a) * r); s.set(sc2 * 1.5, sc2 * .55, sc2 * 1.1);
    m4.compose(v, q, s); inst.setMatrixAt(i, m4);
  }
  inst.frustumCulled = false; cloudGroup.add(inst);
  fxInit();
  window.addEventListener('resize', onResize); onResize();
  applyQuality();
}
function applyQuality() {
  const hi = Save.d.quality === 'high';
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, hi ? 1.75 : 1));
  sun.castShadow = hi; renderer.shadowMap.enabled = hi;
  scene.traverse(o => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => m.needsUpdate = true); } });
  onResize();
}
function onResize() {
  if (!renderer) return;
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  const sc = renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360));
  if (poolN) poolN.mat.uniforms.uScale.value = sc; if (poolA) poolA.mat.uniforms.uScale.value = sc;
}
function applyBiome(key) {
  const c = ISLANDS[key];
  skyMat.uniforms.top.value.setHex(c.sky[0]); skyMat.uniforms.bot.value.setHex(c.sky[1]);
  skyMat.uniforms.stars.value = key === 'noctyra' ? 1 : key === 'ignis' ? .25 : 0;
  scene.fog.color.setHex(c.fog); sun.color.setHex(c.sun); hemi.color.setHex(c.hemi[0]); hemi.groundColor.setHex(c.hemi[1]);
  sun.intensity = key === 'noctyra' ? .7 : key === 'ignis' ? .85 : 1;
  hemi.intensity = key === 'noctyra' ? .9 : .75;
}

/* ---------------- particles ---------------- */
let poolN, poolA;
class Pool {
  constructor(n, additive) {
    this.n = n; this.i = 0;
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.size = new Float32Array(n); this.alpha = new Float32Array(n);
    this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n); this.grav = new Float32Array(n); this.drag = new Float32Array(n); this.s0 = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    this.aP = new THREE.BufferAttribute(this.pos, 3); this.aC = new THREE.BufferAttribute(this.col, 3); this.aS = new THREE.BufferAttribute(this.size, 1); this.aA = new THREE.BufferAttribute(this.alpha, 1);
    this.aP.setUsage(THREE.DynamicDrawUsage); this.aC.setUsage(THREE.DynamicDrawUsage); this.aS.setUsage(THREE.DynamicDrawUsage); this.aA.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aP); g.setAttribute('aColor', this.aC); g.setAttribute('aSize', this.aS); g.setAttribute('aAlpha', this.aA);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 600 } }, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: 'attribute vec3 aColor; attribute float aSize; attribute float aAlpha; varying vec3 vC; varying float vA; uniform float uScale;' +
        'void main(){ vC=aColor; vA=aAlpha; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=aSize*uScale/max(0.1,-mv.z); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'varying vec3 vC; varying float vA; void main(){ float d=length(gl_PointCoord-vec2(.5)); if(d>.5) discard; gl_FragColor=vec4(vC, vA*smoothstep(.5,.12,d)); }'
    });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; scene.add(this.pts);
    for (let i = 0; i < n; i++) this.pos[i * 3 + 1] = -9999;
  }
  emit(x, y, z, vx, vy, vz, r, g, b, size, life, grav, drag) {
    const i = this.i; this.i = (i + 1) % this.n; const k = i * 3;
    this.pos[k] = x; this.pos[k + 1] = y; this.pos[k + 2] = z; this.vel[k] = vx; this.vel[k + 1] = vy; this.vel[k + 2] = vz;
    this.col[k] = r; this.col[k + 1] = g; this.col[k + 2] = b; this.s0[i] = size; this.size[i] = size; this.life[i] = life; this.max[i] = life; this.alpha[i] = 1; this.grav[i] = grav || 0; this.drag[i] = drag || 0;
  }
  update(dt) {
    const n = this.n, P = this.pos, V = this.vel, L = this.life;
    for (let i = 0; i < n; i++) {
      if (L[i] <= 0) continue;
      L[i] -= dt; const k = i * 3;
      if (L[i] <= 0) { this.alpha[i] = 0; this.size[i] = 0; P[k + 1] = -9999; continue; }
      const dr = 1 - this.drag[i] * dt; V[k] *= dr; V[k + 1] = V[k + 1] * dr - this.grav[i] * dt; V[k + 2] *= dr;
      P[k] += V[k] * dt; P[k + 1] += V[k + 1] * dt; P[k + 2] += V[k + 2] * dt;
      const t = L[i] / this.max[i]; this.alpha[i] = Math.min(1, t * 2.2); this.size[i] = this.s0[i] * (.55 + .45 * t);
    }
    this.aP.needsUpdate = true; this.aC.needsUpdate = true; this.aS.needsUpdate = true; this.aA.needsUpdate = true;
  }
  clear() { this.life.fill(0); this.alpha.fill(0); this.size.fill(0); for (let i = 0; i < this.n; i++) this.pos[i * 3 + 1] = -9999; }
}
const _c = new THREE.Color();
function rgb(hex) { _c.setHex(hex); return [_c.r, _c.g, _c.b]; }
const tmpFx = [];
let sphereGeo, ringGeo, shakeAmt = 0;
function fxInit() {
  poolN = new Pool(3200, false); poolA = new Pool(2600, true);
  sphereGeo = new THREE.SphereGeometry(1, 16, 12); ringGeo = new THREE.RingGeometry(.86, 1, 40);
}
function dust(x, y, z, hex, n, spread, speed, size) {
  const c = rgb(hex);
  for (let i = 0; i < n; i++) {
    const a = rnd(0, 6.283), e = rnd(-.2, 1), s = rnd(.3, 1) * speed;
    poolN.emit(x + rnd(-spread, spread), y + rnd(-spread, spread) * .6, z + rnd(-spread, spread), Math.cos(a) * s, e * s + 1, Math.sin(a) * s,
      c[0] * rnd(.75, 1.1), c[1] * rnd(.75, 1.1), c[2] * rnd(.75, 1.1), (size || .5) * rnd(.6, 1.2), rnd(.5, 1.2), 9, .8);
  }
}
function sparks(x, y, z, hex, n, speed, size, life) {
  const c = rgb(hex);
  for (let i = 0; i < n; i++) {
    const a = rnd(0, 6.283), e = rnd(-.4, 1), s = rnd(.4, 1) * speed;
    poolA.emit(x, y, z, Math.cos(a) * s, e * s, Math.sin(a) * s, c[0], c[1], c[2], (size || .35) * rnd(.6, 1.2), (life || .7) * rnd(.6, 1.1), 10, .6);
  }
}
function flameAt(x, y, z, n) {
  for (let i = 0; i < n; i++) poolA.emit(x + rnd(-.4, .4), y, z + rnd(-.4, .4), rnd(-.6, .6), rnd(1.5, 3.4), rnd(-.6, .6), 1, rnd(.35, .6), .08, rnd(.5, .9), rnd(.35, .7), -2.5, .5);
}
function fireworks(x, y, z) {
  const cols = [0xffc857, 0xff5d73, 0x3de0c5, 0x7fb7ff, 0xffffff, 0xc96bff];
  for (let b = 0; b < 7; b++) {
    later(b * .22, () => {
      const ox = x + rnd(-6, 6), oy = y + rnd(3, 12), oz = z + rnd(-6, 6), c = rgb(pick(cols));
      Sfx.firework();
      for (let i = 0; i < 70; i++) {
        const a = rnd(0, 6.283), e = Math.acos(rnd(-1, 1)), s = rnd(7, 13);
        poolA.emit(ox, oy, oz, Math.sin(e) * Math.cos(a) * s, Math.cos(e) * s, Math.sin(e) * Math.sin(a) * s, c[0], c[1], c[2], .55, rnd(1, 1.7), 6, 1.4);
      }
    });
  }
}
function flashSphere(x, y, z, r, hex, life) {
  const m = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: .85, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.position.set(x, y, z); m.scale.setScalar(.2); scene.add(m);
  tmpFx.push({ m, t: 0, life: life || .45, r, kind: 'sphere' });
}
function ringAt(x, y, z, r, hex, life, flat) {
  const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: .9, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  m.position.set(x, y, z); if (flat !== false) m.rotation.x = -Math.PI / 2; m.scale.setScalar(.3); scene.add(m);
  tmpFx.push({ m, t: 0, life: life || .6, r, kind: 'ring' });
}
function boltFx(x, z, topY, botY, hex) {
  const pts = []; const segs = 9;
  for (let k = 0; k < 3; k++) {
    pts.length = 0; let px = x + rnd(-1, 1), pz = z + rnd(-1, 1);
    const arr = [];
    for (let i = 0; i <= segs; i++) { const y = lerp(topY, botY, i / segs); arr.push(i === segs ? x : px, y, i === segs ? z : pz); px += rnd(-2.2, 2.2); pz += rnd(-2.2, 2.2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: hex || 0xdff3ff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
    l.frustumCulled = false; scene.add(l); tmpFx.push({ m: l, t: 0, life: .22, kind: 'bolt' });
  }
}
function updateTmpFx(dt) {
  for (let i = tmpFx.length - 1; i >= 0; i--) {
    const f = tmpFx[i]; f.t += dt; const k = f.t / f.life;
    if (k >= 1) { scene.remove(f.m); if (f.m.material) f.m.material.dispose(); if (f.kind === 'bolt') f.m.geometry.dispose(); tmpFx.splice(i, 1); continue; }
    if (f.kind === 'sphere') { f.m.scale.setScalar(.2 + f.r * Math.sqrt(k)); f.m.material.opacity = .85 * (1 - k); }
    else if (f.kind === 'ring') { f.m.scale.setScalar(.3 + f.r * Math.sqrt(k)); f.m.material.opacity = .9 * (1 - k); }
    else if (f.kind === 'bolt') { f.m.material.opacity = 1 - k; }
  }
}
function clearFx() {
  poolN.clear(); poolA.clear();
  while (tmpFx.length) { const f = tmpFx.pop(); scene.remove(f.m); }
  timers.length = 0; shakeAmt = 0;
}
function addShake(a) { shakeAmt = Math.min(1.4, Math.max(shakeAmt, a)); }

/* ---------------- geometry / material caches ---------------- */
const geoCache = new Map();
function getGeo(kind, sx, sy, sz) {
  const key = kind + sx.toFixed(2) + '|' + sy.toFixed(2) + '|' + sz.toFixed(2);
  let g = geoCache.get(key); if (g) return g;
  switch (kind) {
    case 'cyl': g = new THREE.CylinderGeometry(sx / 2 * .82, sx / 2, sy, 8); break;
    case 'cone': g = new THREE.ConeGeometry(sx / 2, sy, 7); break;
    case 'ico': g = new THREE.IcosahedronGeometry(1, 0); g.scale(sx / 2, sy / 2, sz / 2); break;
    case 'oct': g = new THREE.OctahedronGeometry(1, 0); g.scale(sx / 2, sy / 2, sz / 2); break;
    case 'sph': g = new THREE.SphereGeometry(1, 12, 9); g.scale(sx / 2, sy / 2, sz / 2); break;
    default: g = new THREE.BoxGeometry(sx, sy, sz);
  }
  geoCache.set(key, g); return g;
}
const matCache = new Map();
const LVL = [1, .82, .62];
function getMat(color, lvl, o) {
  o = o || {}; const key = color + '|' + lvl + '|' + (o.em || 0) + '|' + (o.op || 1) + '|' + (o.emi || 0);
  let m = matCache.get(key); if (m) return m;
  const c = new THREE.Color(color).multiplyScalar(LVL[lvl || 0]);
  m = new THREE.MeshPhongMaterial({ color: c, flatShading: true, shininess: o.shin || 8, specular: 0x222222 });
  if (o.em) { m.emissive = new THREE.Color(o.em); m.emissiveIntensity = o.emi || .8; }
  if (o.op && o.op < 1) { m.transparent = true; m.opacity = o.op; }
  matCache.set(key, m); return m;
}
const tileCache = new Map();
function getTileMats(top, side, lvl) {
  const key = top + '|' + side + '|' + lvl; let a = tileCache.get(key); if (a) return a;
  const s = getMat(side, lvl), t = getMat(top, lvl); a = [s, s, t, s, s, s]; tileCache.set(key, a); return a;
}
const FROZEN_COL = 0xb4ecff;

/* ---------------- spatial helpers ---------------- */
function distToBox(px, py, pz, p) {
  const dx = Math.max(p.cx - p.hx - px, 0, px - (p.cx + p.hx)), dy = Math.max(p.cy - p.hy - py, 0, py - (p.cy + p.hy)), dz = Math.max(p.cz - p.hz - pz, 0, pz - (p.cz + p.hz));
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
function rayBox(ox, oy, oz, dx, dy, dz, p, k) {
  k = k || 1; let tmin = 0, tmax = 1e9;
  const hx = p.hx * k, hy = p.hy * k, hz = p.hz * k;
  let o, d, mn, mx, t1, t2, t;
  o = ox; d = dx; mn = p.cx - hx; mx = p.cx + hx;
  if (Math.abs(d) < 1e-9) { if (o < mn || o > mx) return -1; } else { t1 = (mn - o) / d; t2 = (mx - o) / d; if (t1 > t2) { t = t1; t1 = t2; t2 = t; } if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) return -1; }
  o = oy; d = dy; mn = p.cy - hy; mx = p.cy + hy;
  if (Math.abs(d) < 1e-9) { if (o < mn || o > mx) return -1; } else { t1 = (mn - o) / d; t2 = (mx - o) / d; if (t1 > t2) { t = t1; t1 = t2; t2 = t; } if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) return -1; }
  o = oz; d = dz; mn = p.cz - hz; mx = p.cz + hz;
  if (Math.abs(d) < 1e-9) { if (o < mn || o > mx) return -1; } else { t1 = (mn - o) / d; t2 = (mx - o) / d; if (t1 > t2) { t = t1; t1 = t2; t2 = t; } if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) return -1; }
  return tmin;
}

/* ---------------- Piece ---------------- */
class Piece {
  constructor(isl, o) {
    this.isl = isl; this.mat = o.mat; this.kind = o.kind || 'box'; this.color = o.color; this.side = o.side || null;
    this.sx = o.sx; this.sy = o.sy; this.sz = o.sz === undefined ? o.sx : o.sz;
    this.cx = o.x; this.cy = o.y + this.sy / 2; this.cz = o.z; this.bx = this.cx; this.by = this.cy; this.bz = this.cz;
    this.hx = this.sx / 2; this.hy = this.sy / 2; this.hz = this.sz / 2;
    const M = MAT[this.mat]; const vol = this.sx * this.sy * this.sz * (this.kind === 'box' ? 1 : .55);
    this.maxHp = o.hp || Math.max(9, vol * (M.hpK || 10)); this.hp = this.maxHp;
    this.mass = Math.max(.2, vol * M.dens);
    this.weight = o.weight !== undefined ? o.weight : Math.max(.3, vol * .35);
    this.collide = o.collide !== undefined ? o.collide : (this.kind === 'box' || this.kind === 'cyl');
    this.rayK = this.kind === 'box' ? 1 : .78;
    this.layer = o.layer || 0; this.terrain = !!o.terrain; this.root = !!o.root; this.tag = o.tag || ''; this.hang = !!o.hang;
    this.em = o.em || 0; this.emi = o.emi || .8; this.op = o.op || 1;
    this.exR = o.exR || 0; this.exD = o.exD || 0;
    this.float = o.float || 0; this.phase = Math.random() * 6.28;
    this.state = 'static'; this.sup = []; this.sub = []; this.links = []; this.vis = 0;
    this.frozen = 0; this.burn = 0; this.lvl = 0; this.shake = 0; this.void = 0; this.counted = false; this.visited = 0; this.delay = 0;
    this.mesh = this.build(o);
  }
  matFor(lvl) {
    if (this.frozen > 0) return this.kind === 'box' && this.terrain && this.side ? getTileMats(FROZEN_COL, FROZEN_COL, lvl) : getMat(FROZEN_COL, lvl, { op: .92 });
    if (this.terrain && this.side && this.layer === 0) return getTileMats(this.color, this.side, lvl);
    return getMat(this.color, lvl, { em: this.em, emi: this.emi, op: this.op });
  }
  build(o) {
    const g = getGeo(this.kind, this.sx, this.sy, this.sz);
    const m = new THREE.Mesh(g, this.matFor(0)); m.position.set(this.cx, this.cy, this.cz);
    if (o.rotY) m.rotation.y = o.rotY;
    m.castShadow = !o.noShadow; m.receiveShadow = true; m.matrixAutoUpdate = true;
    return m;
  }
  setLvl(l) { if (l !== this.lvl) { this.lvl = l; this.mesh.material = this.matFor(l); } }
  refreshMat() { this.mesh.material = this.matFor(this.lvl); }
}

/* ---------------- Island ---------------- */
let ISL_ID = 0;
class Island {
  constructor(key, opts) {
    opts = opts || {};
    this.id = ++ISL_ID; this.key = key; this.cfg = ISLANDS[key]; this.variant = opts.variant || '';
    this.rng = mulberry(opts.seed || (key.length * 7919 + 13)); this.opts = opts;
    this.group = new THREE.Group(); scene.add(this.group);
    this.pieces = []; this.statics = []; this.pendingList = []; this.falling = []; this.held = []; this.roots = []; this.cells = new Map();
    this.deco = []; this.zones = []; this.tagged = {}; this.burning = new Set(); this.shaking = new Set(); this.regrow = [];
    this.totalW = 0; this.lostW = 0; this.dirty = false; this.stale = false; this.collapsing = false; this.collapseT = 0;
    this.chain = { n: 0, t: 0, startLost: 0 }; this.coresDestroyed = 0; this.heartDead = false; this.flood = 0; this.t = 0; this.bobbers = [];
    this.cell = 2.5; this.R = 6.2; this.stamp = 0; this.unstableAtStart = 0; this.lavaLevel = -9; this.finished = false;
    this.spawn = { x: 0, y: 3, z: 0 }; this.fxFns = []; this.growing = [];
  }
  tag(p) { if (p.tag) (this.tagged[p.tag] = this.tagged[p.tag] || []).push(p); }
  add(o) {
    const p = new Piece(this, o); this.pieces.push(p); this.statics.push(p); this.group.add(p.mesh); this.tag(p);
    if (p.weight > 0) this.totalW += p.weight; return p;
  }
  edge(a, b) { a.sub.push(b); b.sup.push(a); }
  link(a, b) { a.links.push(b); b.links.push(a); }
  key2(i, j) { return i + ',' + j; }
  /* terrain: two layers of tiles plus tapering underside; heightFn gives hill level 0..2, holeFn removes the top tile */
  buildTerrain(o) {
    const c = this.cell, R = this.R, rng = this.rng, ph = rng() * 6.28, ph2 = rng() * 6.28;
    const cells = [];
    for (let i = -8; i <= 8; i++) for (let j = -8; j <= 8; j++) {
      const a = Math.atan2(j, i), lim = R * (1 + .11 * Math.sin(3 * a + ph) + .07 * Math.sin(5 * a + ph2));
      if (Math.hypot(i, j) <= lim) cells.push([i, j]);
    }
    for (const [i, j] of cells) {
      const x = i * c, z = j * c, rr = Math.hypot(i, j);
      const level = o.heightFn ? o.heightFn(i, j, rr) : 0; const hole = o.holeFn ? o.holeFn(i, j, x, z) : false;
      const H = 1.2 + .8 * level; const cv = { i, j, x, z, level, H, top: null, bot: null, hole };
      const bot = this.add({ kind: 'box', mat: 'rock', color: o.rock, x, y: -1.4, z, sx: c * .99, sy: 1.4, sz: c * .99, hp: 150, weight: 1, layer: 1, terrain: true, root: rr <= 1.5, em: 0 });
      bot.cell = cv; cv.bot = bot; if (bot.root) { this.roots.push(bot); bot.rootGlow = o.glow || 0xffc857; }
      if (!hole) {
        const ov = o.tileFn ? o.tileFn(i, j) : null;
        const col = ov ? ov.color : ((o.topColors && o.topColors[(Math.abs(i * 7 + j * 13 + (i * j)) % o.topColors.length)]) || o.top);
        const top = this.add({ kind: 'box', mat: ov ? ov.mat : (o.topMat || 'grass'), color: col, side: ov ? ov.side : o.side, x, y: 0, z, sx: c * .99, sy: H, sz: c * .99, hp: ov ? ov.hp : (o.topHp || (62 + level * 10)), weight: 1, layer: 0, terrain: true, em: 0, op: ov && ov.op });
        top.cell = cv; cv.top = top; this.edge(bot, top);
      }
      this.cells.set(this.key2(i, j), cv);
    }
    for (const cv of this.cells.values()) {
      for (const [di, dj] of [[1, 0], [0, 1]]) { const n = this.cells.get(this.key2(cv.i + di, cv.j + dj)); if (n) this.link(cv.bot, n.bot); }
    }
    // underside
    const layers = [[.62, 2.8, .9], [.42, 2.8, .8], [.2, 2.4, .6]];
    let y = -1.4;
    layers.forEach((ly, k) => {
      y -= ly[1]; const lim = R * ly[0];
      for (const cv of this.cells.values()) {
        const rr = Math.hypot(cv.i, cv.j); if (rr > lim) continue;
        const p = this.add({ kind: 'box', mat: 'rock', color: shade(o.under, 1 - k * .1), x: cv.x, y, z: cv.z, sx: c * ly[2], sy: ly[1], sz: c * ly[2], hp: 220, weight: .08, layer: 2 + k, terrain: true, hang: true, noShadow: false });
        cv['u' + k] = p;
      }
    });
    // under links: each under tile hangs from the piece directly above it
    for (const cv of this.cells.values()) {
      let above = cv.bot;
      for (let k = 0; k < 3; k++) { const u = cv['u' + k]; if (!u) break; this.edge(above, u); above = u; }
    }
  }
  surfaceY(x, z) {
    const i = Math.round(x / this.cell), j = Math.round(z / this.cell); const cv = this.cells.get(this.key2(i, j));
    if (!cv) return null; if (cv.top && cv.top.state === 'static') return cv.top.cy + cv.top.hy; if (cv.hole && !cv.top) return null; return cv.bot && cv.bot.state === 'static' ? 0 : null;
  }
  /* auto-detect "A rests on B" relationships for everything that isn't terrain */
  finalize() {
    const P = this.pieces;
    for (const p of P) {
      if (p.terrain || p.hang) continue;
      for (const q of P) {
        if (q === p || q.hang || q.cy >= p.cy) continue;
        const dx = Math.abs(p.cx - q.cx) - (p.hx + q.hx), dz = Math.abs(p.cz - q.cz) - (p.hz + q.hz);
        if (dx > -.05 || dz > -.05) continue;
        const ovY = Math.min(p.cy + p.hy, q.cy + q.hy) - Math.max(p.cy - p.hy, q.cy - q.hy);
        if (ovY < -.28 || ovY > .5 * Math.min(p.sy, q.sy) + .1) continue;
        this.edge(q, p);
      }
    }
    this.totalW = 0; for (const p of P) if (p.weight > 0) this.totalW += p.weight;
    this.recompute(true);
    this.statics = this.pieces.filter(p => p.state === 'static');
    this.unstableAtStart = this.pieces.filter(p => p.state === 'pending').length;
    // anything unstable at generation time is simply removed (generator mistake safety net)
    for (const p of this.pieces) if (p.state === 'pending') { p.state = 'dead'; this.group.remove(p.mesh); p.counted = true; }
    this.pendingList.length = 0; this.statics = this.pieces.filter(p => p.state === 'static');
    this.totalW = 0; for (const p of this.statics) if (p.weight > 0) this.totalW += p.weight;
    this.lostW = 0;
    // spawn point: highest flat surface near centre
    this.findSpawn();
  }
  findSpawn() {
    let best = null, bd = 1e9;
    for (const p of this.statics) {
      if (!p.terrain || p.layer !== 0) continue; const d = Math.hypot(p.cx, p.cz) - (p.cy + p.hy) * .2;
      if (d < bd) { bd = d; best = p; }
    }
    if (best) this.spawn = { x: best.cx, y: best.cy + best.hy + .05, z: best.cz };
    return this.spawn;
  }
  /* breadth-first search from roots; whatever is not reached has lost its support */
  recompute(initial) {
    this.dirty = false; this.stamp++; const S = this.stamp; const q = [];
    for (const r of this.roots) if (r.state === 'static') { r.visited = S; q.push(r); }
    for (let h = 0; h < q.length; h++) {
      const p = q[h];
      for (const s of p.sub) if (s.visited !== S && (s.state === 'static')) { s.visited = S; q.push(s); }
      for (const s of p.links) if (s.visited !== S && (s.state === 'static')) { s.visited = S; q.push(s); }
    }
    let n = 0;
    for (const p of this.statics) {
      if (p.state !== 'static' || p.visited === S) continue;
      p.state = 'pending'; p.delay = initial ? 0 : .08 + (p.cy > 0 ? p.cy * .035 : 0) + Math.random() * .3; this.pendingList.push(p); n++;
    }
    return n;
  }
  integrity() { return clamp(1 - this.lostW / this.totalW, 0, 1); }
  coreOpen() { return this.integrity() <= .5 || this.opts.noSeal; }
  countLost(p) { if (!p.counted) { p.counted = true; this.lostW += Math.max(0, p.weight); if (p.weight > .25 && !p.terrain) Game.onStructure(p); } }
  chainHit(cause) {
    const c = this.chain; if (c.n === 0) c.startLost = this.lostW - 0;
    c.n++; c.t = 1.05; Game.onChain(c.n);
  }
  endChain() {
    const c = this.chain; if (c.n > 0) { const drop = (this.lostW - c.startLost) / this.totalW; Game.onChainEnd(c.n, drop); }
    c.n = 0; c.t = 0;
  }
  /* ---- damage ---- */
  damage(p, amt, cause, vel) {
    if (p.state !== 'static' && p.state !== 'pending') return false;
    if (p.root && !this.coreOpen()) { amt *= .04; sparks(p.cx, p.cy + p.hy, p.cz, 0xffc857, 2, 4, .3, .3); }
    if (p.frozen > 0) amt *= 2.4;
    if (this.opts.fragile) amt *= this.opts.fragile;
    p.hp -= amt; p.shake = .14; this.shaking.add(p);
    const r = p.hp / p.maxHp; const l = r < .34 ? 2 : r < .67 ? 1 : 0; if (l > p.lvl) p.setLvl(l);
    if (p.hp <= 0) { this.destroy(p, cause, vel); return true; }
    return false;
  }
  destroy(p, cause, vel) {
    if (p.state !== 'static' && p.state !== 'pending') return;
    const wasPending = p.state === 'pending'; p.state = 'dead'; this.stale = true; this.dirty = true;
    this.countLost(p); this.burning.delete(p); this.shaking.delete(p);
    if (cause === 'support' || cause === 'impact' || cause === 'chain') this.chainHit(cause);
    const col = p.frozen > 0 ? FROZEN_COL : (p.color || 0x888888);
    const launch = vel && this.falling.length < 70 && Math.random() < .75 && !p.terrain || (vel && p.terrain && this.falling.length < 50 && Math.random() < .35);
    if (launch) {
      p.state = 'falling'; p.vx = vel[0]; p.vy = vel[1]; p.vz = vel[2]; p.age = 0; p.pen = 0;
      p.sx2 = rnd(-4, 4); p.sy2 = rnd(-4, 4); p.sz2 = rnd(-4, 4); p.ign = this.overlapping(p); this.falling.push(p);
      p.mesh.material = p.matFor(2); p.shake = 0; p.mesh.position.set(p.cx, p.cy, p.cz);
    } else {
      this.group.remove(p.mesh);
      Game.sfxLimited(p.mat === 'rock' || p.terrain ? 'crack' : 'crack');
    }
    const n = clamp(Math.floor(p.mass * .8) + 4, 4, 16);
    dust(p.cx, p.cy, p.cz, col, n, Math.min(p.hx, 1.2), 4 + Math.min(4, p.sy), .45 + Math.min(.5, p.sx * .12));
    if (p.em) sparks(p.cx, p.cy, p.cz, p.color, 6, 6, .3, .6);
    this.onDeath(p, cause);
  }
  overlapping(f) {
    const out = new Set();
    for (const q of this.statics) {
      if (q.state === 'dead' || q === f) continue;
      if (Math.abs(f.cx - q.cx) < f.hx + q.hx + .05 && Math.abs(f.cy - q.cy) < f.hy + q.hy + .05 && Math.abs(f.cz - q.cz) < f.hz + q.hz + .05) out.add(q);
    }
    return out;
  }
  onDeath(p, cause) {
    const M = MAT[p.mat];
    if (p.exR) { later(.09, () => this.explode(p.cx, p.cy, p.cz, p.exR, p.exD, { cause: 'chain', color: p.mat === 'barrel' ? 0xffa43a : 0xff5a1f })); }
    if (M.crystal) {
      Game.crystalPulse(p);
      later(.2, () => { for (const q of this.statics) if (MAT[q.mat].crystal && q.state === 'static' && Math.hypot(q.cx - p.cx, q.cy - p.cy, q.cz - p.cz) < 7.5) { this.damage(q, 48, 'chain'); beamFx(p, q, 0xb88bff); } });
    }
    if (M.shatter) {
      later(.07, () => { for (const q of this.statics) if (q.state === 'static' && MAT[q.mat].shatter && Math.hypot(q.cx - p.cx, q.cy - p.cy, q.cz - p.cz) < 2.7) this.damage(q, 16, 'chain'); });
    }
    if (M.slump) {
      later(.11, () => { for (const q of this.statics) if (q.state === 'static' && MAT[q.mat].slump && q.cy >= p.cy - .3 && Math.hypot(q.cx - p.cx, q.cz - p.cz) < 2.4 && Math.abs(q.cy - p.cy) < 2.5) this.damage(q, 11, 'chain'); });
    }
    if (p.tag === 'tank') this.floodFrom(p);
    if (p.tag === 'core') { this.coresDestroyed++; Game.onCore(p); this.explode(p.cx, p.cy, p.cz, 6, 120, { cause: 'chain', color: 0xff5a1f }); }
    if (p.tag === 'heart') { this.heartDead = true; Game.onHeart(p); this.explode(p.cx, p.cy, p.cz, 8, 160, { cause: 'chain', color: 0x7dff9a }); }
    if (p.tag === 'tree' && this.opts.regrow && !this.heartDead) this.regrow.push(p);
  }
  floodFrom(p) {
    Game.toast('💧 FLOOD! Water is washing the bridges away', 1);
    Sfx.whoosh(); addShake(.5);
    for (let k = 0; k < 90; k++) {
      const a = rnd(0, 6.283), s = rnd(4, 12);
      poolN.emit(p.cx, p.cy + 1, p.cz, Math.cos(a) * s, rnd(2, 6), Math.sin(a) * s, .25, .7, 1, rnd(.5, .9), rnd(.8, 1.6), 9, .3);
    }
    later(.25, () => {
      for (const q of this.statics) {
        if (q.state !== 'static') continue;
        if ((q.tag === 'bridge' || q.tag === 'coral' || q.mat === 'coral') && Math.hypot(q.cx - p.cx, q.cz - p.cz) < 11) this.damage(q, 90, 'chain', [(q.cx - p.cx) * .5, 4, (q.cz - p.cz) * .5]);
      }
    });
  }
  explode(x, y, z, r, dmg, o) {
    o = o || {}; const cause = o.cause || 'blast';
    flashSphere(x, y, z, r * 1.1, o.color || 0xffb84a, .5); ringAt(x, y - .2, z, r * 1.3, 0xffe2a0, .55);
    sparks(x, y, z, o.color || 0xffb84a, Math.floor(10 + r * 5), 8 + r, .45, .8); dust(x, y, z, 0x6a5a50, Math.floor(8 + r * 4), r * .3, 6 + r, 1.0);
    Sfx.boom(clamp(r / 6, .3, 1.2)); addShake(clamp(r / 11, .15, .9) * (o.shake === undefined ? 1 : o.shake));
    Game.onExplosion(x, y, z, r);
    const list = this.statics.concat(this.held);
    for (const p of list) {
      if (p.state !== 'static' && p.state !== 'pending' && p.state !== 'held') continue;
      const d = distToBox(x, y, z, p); if (d >= r) continue;
      const f = Math.pow(1 - d / r, .7); let a = dmg * f * (MAT[p.mat].bl || 1);
      const dx = p.cx - x, dy = p.cy - y + .5, dz = p.cz - z, L = Math.hypot(dx, dy, dz) || 1; const sp = (5 + 10 * f);
      const vel = [dx / L * sp, Math.abs(dy / L * sp) + 4 + 4 * f, dz / L * sp];
      if (p.state === 'held') { p.hp -= a * 3; if (p.hp <= 0) this.shatterHeld(p); continue; }
      this.damage(p, a, cause === 'chain' ? 'chain' : 'blast', vel);
    }
    if (o.fire) this.igniteArea(x, y, z, r * .8);
  }
  shatterHeld(p) {
    if (p.state !== 'held') return; p.state = 'dead'; this.group.remove(p.mesh); this.held.splice(this.held.indexOf(p), 1);
    dust(p.cx, p.cy, p.cz, p.color, 5, .8, 6, .5); this.chainHit('chain');
  }
  igniteArea(x, y, z, r) {
    for (const p of this.statics) {
      if (p.state !== 'static' && p.state !== 'pending') continue; const M = MAT[p.mat];
      if (M.flam > 0 && distToBox(x, y, z, p) < r) { p.burn = 7; this.burning.add(p); }
    }
    Sfx.fire();
  }
  freezeArea(x, y, z, r, dur) {
    let n = 0;
    for (const p of this.statics) {
      if (p.state !== 'static' && p.state !== 'pending') continue;
      if (distToBox(x, y, z, p) < r) { p.frozen = dur; p.refreshMat(); n++; }
    }
    ringAt(x, y, z, r, 0x9fe8ff, .8); sparks(x, y + 1, z, 0xcff4ff, 30, 8, .4, 1);
    return n;
  }
  /* pull structures into a tight floating cluster (gravity gun) */
  pull(x, y, z, r, hold) {
    let n = 0;
    for (const p of this.statics) {
      if (p.state !== 'static' || p.root || p.layer > 0 || p.weight < .2) continue;
      if (Math.hypot(p.cx - x, p.cz - z) > r || Math.abs(p.cy - y) > r) continue;
      p.state = 'held'; this.stale = true; this.dirty = true; this.countLost(p);
      p.tx = x + rnd(-1.4, 1.4); p.ty = y + 1.5 + rnd(-1.2, 1.2); p.tz = z + rnd(-1.4, 1.4); p.hold = hold; p.age = 0;
      p.mesh.material = p.matFor(1); this.burning.delete(p); this.held.push(p); n++;
    }
    ringAt(x, y, z, r, 0xb18bff, .9); flashSphere(x, y + 1.5, z, 2.2, 0x9b6bff, .6);
    return n;
  }
  /* ---- update ---- */
  update(dt) {
    this.t += dt;
    if (this.stale) { this.statics = this.statics.filter(p => p.state === 'static' || p.state === 'pending'); this.stale = false; }
    // pending → falling
    for (let i = this.pendingList.length - 1; i >= 0; i--) {
      const p = this.pendingList[i];
      if (p.state !== 'pending') { this.pendingList.splice(i, 1); continue; }
      p.delay -= dt; p.mesh.position.x = p.cx + rnd(-.04, .04); p.mesh.position.z = p.cz + rnd(-.04, .04);
      if (p.delay <= 0) { this.pendingList.splice(i, 1); this.startFall(p); }
    }
    if (this.dirty) this.recompute();
    this.updateFalling(dt); this.updateHeld(dt);
    for (const f of this.fxFns) f(dt);
    // shake
    for (const p of this.shaking) {
      p.shake -= dt; if (p.state !== 'static') { this.shaking.delete(p); continue; }
      if (p.shake <= 0) { p.mesh.position.set(p.cx, p.cy, p.cz); this.shaking.delete(p); }
      else p.mesh.position.set(p.cx + rnd(-.06, .06), p.cy + rnd(-.04, .04), p.cz + rnd(-.06, .06));
    }
    // burning
    if (this.burning.size) {
      const arr = Array.from(this.burning);
      for (const p of arr) {
        if (p.state !== 'static' && p.state !== 'pending') { this.burning.delete(p); continue; }
        p.burn -= dt; if (p.burn <= 0) { this.burning.delete(p); continue; }
        this.damage(p, 15 * dt * MAT[p.mat].flam * (p.frozen > 0 ? 0 : 1) + (p.frozen > 0 ? 40 * dt : 0), 'fire');
        if (Math.random() < dt * 9) flameAt(p.cx + rnd(-p.hx, p.hx), p.cy + p.hy * .7, p.cz + rnd(-p.hz, p.hz), 1);
        if (Math.random() < dt * 1.6) {
          for (const q of this.statics) {
            if (q.state !== 'static' || q.burn > 0 || !MAT[q.mat].flam) continue;
            if (Math.abs(q.cx - p.cx) < 2.6 && Math.abs(q.cy - p.cy) < 2.6 && Math.abs(q.cz - p.cz) < 2.6 && Math.random() < MAT[q.mat].flam * .35) { q.burn = 7; this.burning.add(q); break; }
          }
        }
      }
    }
    // frozen timers
    if (this.t % .5 < dt) for (const p of this.statics) if (p.frozen > 0) { p.frozen -= .5; if (p.frozen <= 0) { p.frozen = 0; p.refreshMat(); } }
    // levitating ruins
    for (const b of this.bobbers) if (b.state === 'static') b.mesh.position.y = b.cy + Math.sin(this.t * 1.6 + b.phase) * b.float;
    // chain timer
    if (this.chain.n > 0) { this.chain.t -= dt; if (this.chain.t <= 0 && this.falling.length < 4) this.endChain(); else if (this.chain.t <= -3) this.endChain(); }
    // regrow (boss forest)
    if (this.opts.regrow && !this.heartDead) {
      this.regrowT = (this.regrowT || 0) - dt;
      if (this.regrowT <= 0 && this.regrow.length) {
        this.regrowT = .5;
        this.regrow.sort((a, b) => a.cy - b.cy);
        for (let i = 0; i < this.regrow.length; i++) {
          const p = this.regrow[i]; if (p.state !== 'dead' && p.state !== 'falling') { this.regrow.splice(i, 1); i--; continue; }
          if (p.sup.some(s => s.state === 'static') || p.sup.length === 0) { this.revive(p); this.regrow.splice(i, 1); break; }
        }
      }
    }
    // final collapse condition
    if (!this.collapsing && this.integrity() <= .07) this.finalCollapse();
    if (this.collapsing) {
      this.collapseT += dt;
      if (!this.finished && this.lostW >= this.totalW - .01 && this.pendingList.length === 0) { this.finished = true; Game.onIslandDone(this); }
    }
  }
  revive(p) {
    p.state = 'static'; p.hp = p.maxHp; p.lvl = 0; p.counted = false; this.lostW -= Math.max(0, p.weight); p.frozen = 0; p.burn = 0;
    const idx = this.falling.indexOf(p); if (idx >= 0) this.falling.splice(idx, 1);
    p.cx = p.bx; p.cy = p.by; p.cz = p.bz; p.mesh.position.set(p.cx, p.cy, p.cz); p.mesh.rotation.set(0, 0, 0); p.mesh.scale.setScalar(.2); p.refreshMat();
    this.group.add(p.mesh); this.statics.push(p); p.grow = 0; this.growing = this.growing || []; this.growing.push(p); this.dirty = true;
    sparks(p.cx, p.cy, p.cz, 0x7dff9a, 8, 3, .3, .6);
  }
  startFall(p) {
    if (p.state !== 'pending') return;
    this.countLost(p); this.chainHit('support'); p.state = 'falling'; this.stale = true;
    p.vx = rnd(-1, 1); p.vy = 0; p.vz = rnd(-1, 1); p.age = 0; p.pen = 0; p.sx2 = rnd(-1.5, 1.5); p.sy2 = rnd(-1, 1); p.sz2 = rnd(-1.5, 1.5);
    p.ign = this.overlapping(p); this.falling.push(p); this.burning.delete(p);
    if (this.falling.length > 160) { this.shatterFalling(p, false); }
    else dust(p.cx, p.cy - p.hy, p.cz, p.color, 3, p.hx, 2, .45);
  }
  updateFalling(dt) {
    if (this.growing && this.growing.length) {
      for (let i = this.growing.length - 1; i >= 0; i--) { const p = this.growing[i]; p.grow += dt * 3; p.mesh.scale.setScalar(Math.min(1, .2 + p.grow)); if (p.grow >= .8) { p.mesh.scale.setScalar(1); this.growing.splice(i, 1); } }
    }
    const F = this.falling;
    for (let i = F.length - 1; i >= 0; i--) {
      const f = F[i]; if (f.state !== 'falling') { F.splice(i, 1); continue; }
      f.age += dt; f.vy -= GRAV * Game.gravMul * dt; f.cx += f.vx * dt; f.cy += f.vy * dt; f.cz += f.vz * dt;
      const m = f.mesh; m.position.set(f.cx, f.cy, f.cz); m.rotation.x += f.sx2 * dt; m.rotation.y += f.sy2 * dt; m.rotation.z += f.sz2 * dt;
      if (f.cy < -48) { f.state = 'dead'; this.group.remove(m); F.splice(i, 1); continue; }
      if (f.age < .1) continue;
      const speed = Math.hypot(f.vx, f.vy, f.vz); const k = .8;
      for (const q of this.statics) {
        if (q.state === 'dead' || f.ign.has(q)) continue;
        if (Math.abs(f.cx - q.cx) >= f.hx * k + q.hx || Math.abs(f.cy - q.cy) >= f.hy * k + q.hy || Math.abs(f.cz - q.cz) >= f.hz * k + q.hz) continue;
        let killed = false;
        if (speed > 3.2) {
          const dmg = Math.min(420, f.mass * speed * 1.25); killed = this.damage(q, dmg, 'impact', [f.vx * .4, 2 + Math.abs(f.vy) * .2, f.vz * .4]);
        }
        if (killed && f.pen < 3 && f.mass > q.mass * .5) { f.pen++; f.vx *= .7; f.vy *= .7; f.vz *= .7; f.ign.add(q); continue; }
        this.shatterFalling(f, true, speed); F.splice(i, 1); break;
      }
    }
  }
  shatterFalling(f, fx, speed) {
    if (f.state !== 'falling') return; f.state = 'dead'; this.group.remove(f.mesh);
    if (fx !== false) { dust(f.cx, f.cy, f.cz, f.color, 6, f.hx, 4, .55); if ((speed || 0) > 6) Game.sfxLimited('crack'); }
  }
  updateHeld(dt) {
    for (let i = this.held.length - 1; i >= 0; i--) {
      const p = this.held[i]; if (p.state !== 'held') { this.held.splice(i, 1); continue; }
      p.age += dt;
      const k = Math.min(1, dt * 4.5); p.cx = lerp(p.cx, p.tx + Math.sin(this.t * 3 + p.phase) * .5, k); p.cy = lerp(p.cy, p.ty + Math.cos(this.t * 2.4 + p.phase) * .5, k); p.cz = lerp(p.cz, p.tz + Math.cos(this.t * 3 + p.phase) * .5, k);
      p.mesh.position.set(p.cx, p.cy, p.cz); p.mesh.rotation.x += dt * 2; p.mesh.rotation.y += dt * 3;
      if (p.age > p.hold) { // release: drop into the clouds
        this.held.splice(i, 1); p.state = 'falling'; p.vx = rnd(-2, 2); p.vy = 2; p.vz = rnd(-2, 2); p.age = 0; p.pen = 0; p.sx2 = rnd(-3, 3); p.sy2 = rnd(-3, 3); p.sz2 = rnd(-3, 3); p.ign = new Set(); this.falling.push(p);
      }
    }
  }
  finalCollapse() {
    if (this.collapsing) return; this.collapsing = true; this.collapseT = 0; Sfx.rumble(); addShake(1.1);
    Game.onFinalCollapse(this);
    for (const p of this.statics) {
      if (p.state !== 'static') continue; p.state = 'pending';
      p.delay = Math.hypot(p.cx, p.cz) * .035 + rnd(0, .35) + (p.layer >= 1 ? .1 : 0); this.pendingList.push(p);
    }
    for (const p of this.held.slice()) p.hold = 0;
  }
  /* ---- queries ---- */
  ray(ox, oy, oz, dx, dy, dz, max) {
    let best = null, bt = max;
    for (const p of this.statics) {
      if (p.void > 0) continue; const t = rayBox(ox, oy, oz, dx, dy, dz, p, p.rayK);
      if (t >= 0 && t < bt) { bt = t; best = p; }
    }
    return best ? { p: best, t: bt } : null;
  }
  colliders(x, y, z, r, out) {
    out.length = 0;
    for (const p of this.statics) {
      if (!p.collide || p.void > 0) continue;
      if (p.cx + p.hx < x - r || p.cx - p.hx > x + r || p.cz + p.hz < z - r || p.cz - p.hz > z + r || p.cy + p.hy < y - 1 || p.cy - p.hy > y + 3) continue;
      out.push(p);
    }
    return out;
  }
  dispose() {
    scene.remove(this.group); this.group = null; this.pieces.length = 0; this.statics.length = 0; this.falling.length = 0; this.held.length = 0;
  }
}
function beamFx(a, b, hex) {
  const c = rgb(hex); const n = 10;
  for (let i = 0; i <= n; i++) { const t = i / n; poolA.emit(lerp(a.cx, b.cx, t), lerp(a.cy, b.cy, t), lerp(a.cz, b.cz, t), 0, .3, 0, c[0], c[1], c[2], .5, .35, 0, 0); }
}
function shade(hex, k) { const c = new THREE.Color(hex); c.multiplyScalar(k); return c.getHex(); }
