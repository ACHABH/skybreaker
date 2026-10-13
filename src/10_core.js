/* =====================================================================
   SKYBREAK — engine core
   ===================================================================== */
'use strict';
const T = THREE;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const $ = id => document.getElementById(id);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const fmt = s => { s = Math.max(0, Math.ceil(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const fmtP = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return String(m).padStart(2, '0') + ':' + r.toFixed(1).padStart(4, '0'); };
const memStore = {};
const store = {
  get(k, d) { try { const v = localStorage.getItem('skybreak.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return k in memStore ? memStore[k] : d; } },
  set(k, v) { try { localStorage.setItem('skybreak.' + k, JSON.stringify(v)); } catch (e) { memStore[k] = v; } }
};

/* ---------- renderer / scene ---------- */
const canvas = $('c');
const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
const scene = new T.Scene();
const camera = new T.PerspectiveCamera(72, 1, 0.25, 2500);
scene.add(camera);
scene.fog = new T.Fog(0xcfe9fa, 120, 620);
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

const hemi = new T.HemisphereLight(0xcfe8ff, 0x7a8f5a, 0.85); scene.add(hemi);
const sun = new T.DirectionalLight(0xfff0cf, 1.25);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 260 });
sun.shadow.bias = -0.0007; sun.shadow.normalBias = 0.04;
scene.add(sun); scene.add(sun.target);
const sunDir = new T.Vector3(0.5, 0.7, 0.35).normalize();
const flashLight = new T.PointLight(0xffaa55, 0, 70, 1.6); scene.add(flashLight);
let flashI = 0;

/* ---------- sky ---------- */
const skyMat = new T.ShaderMaterial({
  side: T.BackSide, depthWrite: false, fog: false,
  uniforms: {
    top: { value: new T.Color() }, mid: { value: new T.Color() }, bot: { value: new T.Color() },
    sunDir: { value: sunDir }, sunCol: { value: new T.Color(1, .9, .7) }, stars: { value: 0 }
  },
  vertexShader: 'varying vec3 vd; void main(){ vd=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
  fragmentShader: `varying vec3 vd; uniform vec3 top,mid,bot,sunDir,sunCol; uniform float stars;
  float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  void main(){ vec3 d=normalize(vd); float h=d.y;
    vec3 c=mix(bot,mid,smoothstep(-0.30,0.10,h)); c=mix(c,top,smoothstep(0.08,0.85,h));
    float s=max(dot(d,sunDir),0.0); c+=sunCol*(pow(s,700.0)*2.4+pow(s,14.0)*0.28);
    if(stars>0.0){ vec2 g=floor(vec2(atan(d.x,d.z)*90.0,d.y*180.0)); float r=h21(g); c+=vec3(step(0.9972,r))*stars*smoothstep(0.02,0.3,h)*(0.4+0.6*h21(g+3.0)); }
    gl_FragColor=vec4(c,1.0);} `
});
const sky = new T.Mesh(new T.SphereGeometry(1, 32, 18), skyMat);
sky.scale.setScalar(1500); sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);

const THEMES = {
  verdantia: { top: 0x2f7de0, mid: 0x7ec8f5, bot: 0xeaf6ff, fog: 0xcfe9fa, sun: 0xfff0cf, sunI: 1.25, hs: 0xcfe8ff, hg: 0x7a8f5a, hi: 0.85, cloud: 0xffffff, stars: 0, dir: [.5, .7, .35] },
  ignis: { top: 0x1c0a18, mid: 0x7a2630, bot: 0xff9a55, fog: 0x8a3a28, sun: 0xffa868, sunI: 1.1, hs: 0xff9a70, hg: 0x4a1f1a, hi: 0.8, cloud: 0xc77a6e, stars: 0, dir: [-.6, .32, .5] },
  nivara: { top: 0x4a8bd6, mid: 0xa8d6f6, bot: 0xf4fbff, fog: 0xdcf0ff, sun: 0xf6fbff, sunI: 1.25, hs: 0xd8eeff, hg: 0x90a8c0, hi: 0.95, cloud: 0xf4fbff, stars: 0, dir: [.4, .55, -.5] },
  aridia: { top: 0x3b9be0, mid: 0xf1d598, bot: 0xffe7b4, fog: 0xf5dcaa, sun: 0xfff2c8, sunI: 1.45, hs: 0xffe8c0, hg: 0xc79a5a, hi: 0.85, cloud: 0xfff1d8, stars: 0, dir: [.3, .85, .2] },
  aquaris: { top: 0x0f7fd8, mid: 0x58d3e8, bot: 0xd9fbff, fog: 0xbdeff7, sun: 0xffffff, sunI: 1.25, hs: 0xcff7ff, hg: 0x3aa0a0, hi: 0.9, cloud: 0xffffff, stars: 0, dir: [-.4, .75, .4] },
  noctyra: { top: 0x04020e, mid: 0x28144c, bot: 0x7a3fb0, fog: 0x2b1b4c, sun: 0xb99cff, sunI: 0.85, hs: 0x8a7aff, hg: 0x1f1538, hi: 0.95, cloud: 0x6a4aa8, stars: 1, dir: [.3, .5, -.6] },
  menu: { top: 0x1a3f9c, mid: 0xf08a6e, bot: 0xffd9a0, fog: 0xf3b890, sun: 0xffe0b0, sunI: 1.2, hs: 0xffd9c0, hg: 0x7a6a8a, hi: 0.85, cloud: 0xfff0e8, stars: 0, dir: [-.7, .22, .6] }
};
let curTheme = 'verdantia';
function applyTheme(name) {
  const t = THEMES[name] || THEMES.verdantia; curTheme = name;
  const u = skyMat.uniforms;
  u.top.value.setHex(t.top); u.mid.value.setHex(t.mid); u.bot.value.setHex(t.bot); u.sunCol.value.setHex(t.sun); u.stars.value = t.stars;
  sunDir.set(t.dir[0], t.dir[1], t.dir[2]).normalize();
  scene.fog.color.setHex(t.fog); sun.color.setHex(t.sun); sun.intensity = t.sunI;
  hemi.color.setHex(t.hs); hemi.groundColor.setHex(t.hg); hemi.intensity = t.hi;
  cloudMat.color.setHex(t.cloud);
}

/* ---------- cloud sea ---------- */
const cloudMat = new T.MeshLambertMaterial({ color: 0xffffff });
const CLOUDN = 170;
const cloudMesh = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), cloudMat, CLOUDN);
cloudMesh.frustumCulled = false; scene.add(cloudMesh);
const clouds = [];
for (let i = 0; i < CLOUDN; i++) {
  const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 520;
  const hi = i > CLOUDN * 0.82;
  clouds.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: hi ? rnd(-30, 30) : rnd(-110, -75), s: hi ? rnd(10, 22) : rnd(30, 62), sp: rnd(0.4, 1.4) });
  if (hi && r < 150) { clouds[i].x += Math.sign(clouds[i].x || 1) * 150; }
}
const _cd = new T.Object3D();
function updateClouds(t) {
  for (let i = 0; i < CLOUDN; i++) {
    const c = clouds[i];
    _cd.position.set(c.x + Math.sin(t * 0.03 * c.sp + i) * 14, c.y, c.z + Math.cos(t * 0.025 * c.sp + i * 2) * 10);
    _cd.scale.set(c.s, c.s * 0.34, c.s * 0.82); _cd.updateMatrix(); cloudMesh.setMatrixAt(i, _cd.matrix);
  }
  cloudMesh.instanceMatrix.needsUpdate = true;
}

/* ---------- input ---------- */
const Input = {
  keys: {}, pressed: {}, mouse: { l: false, r: false }, mpress: { l: false, r: false }, dx: 0, dy: 0, wheel: 0, locked: false, nx: 0, ny: 0, captureWanted: false,
  endFrame() { this.pressed = {}; this.mpress.l = this.mpress.r = false; this.dx = 0; this.dy = 0; this.wheel = 0; }
};
window.addEventListener('keydown', e => {
  if (e.repeat) { if (Input.captureWanted) e.preventDefault(); return; }
  Input.keys[e.code] = true; Input.pressed[e.code] = true;
  if (Input.captureWanted && ['Space', 'Tab', 'F5', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => { Input.keys[e.code] = false; });
window.addEventListener('blur', () => { Input.keys = {}; Input.mouse.l = Input.mouse.r = false; });
canvas.addEventListener('mousedown', e => {
  if (!Input.captureWanted) return;
  if (!Input.locked && canvas.requestPointerLock) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (err) { } }
  if (e.button === 0) { Input.mouse.l = true; Input.mpress.l = true; }
  if (e.button === 2) { Input.mouse.r = true; Input.mpress.r = true; }
  e.preventDefault();
});
window.addEventListener('mouseup', e => { if (e.button === 0) Input.mouse.l = false; if (e.button === 2) Input.mouse.r = false; });
window.addEventListener('contextmenu', e => { if (Input.captureWanted) e.preventDefault(); });
window.addEventListener('mousemove', e => {
  Input.nx = e.clientX / window.innerWidth * 2 - 1; Input.ny = e.clientY / window.innerHeight * 2 - 1;
  if (Input.locked) { Input.dx += e.movementX || 0; Input.dy += e.movementY || 0; }
});
window.addEventListener('wheel', e => { if (Input.captureWanted) Input.wheel += Math.sign(e.deltaY); }, { passive: true });
document.addEventListener('pointerlockchange', () => {
  Input.locked = document.pointerLockElement === canvas;
  if (!Input.locked && Input.captureWanted && window.Game && Game.state === 'play') Game.pause(true);
});

/* ---------- audio (synth) ---------- */
const Snd = {
  ctx: null, master: null, vol: 0.6, muted: false, noiseBuf: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : this.vol; this.master.connect(this.ctx.destination);
      const n = this.ctx.sampleRate * 1.5, b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; this.noiseBuf = b;
    } catch (e) { this.ctx = null; }
  },
  setVol(v) { this.vol = v; if (this.master) this.master.gain.value = this.muted ? 0 : v; },
  setMute(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : this.vol; },
  noise(dur, f0, f1, vol, type = 'lowpass') {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.playbackRate.value = rnd(0.8, 1.2);
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, rnd(0, 0.5), dur + 0.05);
  },
  tone(f0, f1, dur, vol, type = 'sine', delay = 0) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  play(name, v = 1) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'boom': this.noise(0.9, 900, 60, 0.9 * v); this.tone(90, 30, 0.6, 0.7 * v, 'sine'); break;
      case 'bigboom': this.noise(1.4, 1400, 40, 1.0 * v); this.tone(70, 22, 1.1, 0.9 * v, 'sine'); break;
      case 'pop': this.noise(0.25, 1800, 200, 0.5 * v); this.tone(160, 60, 0.15, 0.4 * v, 'triangle'); break;
      case 'hit': this.noise(0.12, 2600, 400, 0.45 * v, 'bandpass'); this.tone(220, 110, 0.08, 0.25 * v, 'square'); break;
      case 'swing': this.noise(0.18, 600, 1800, 0.18 * v, 'bandpass'); break;
      case 'crumble': this.noise(0.7, 700, 90, 0.5 * v); break;
      case 'zap': this.noise(0.35, 5000, 400, 0.7 * v, 'highpass'); this.tone(900, 80, 0.3, 0.3 * v, 'sawtooth'); break;
      case 'whoosh': this.noise(0.5, 300, 1500, 0.25 * v, 'bandpass'); break;
      case 'grapple': this.tone(300, 900, 0.12, 0.25 * v, 'square'); break;
      case 'dash': this.noise(0.25, 2400, 300, 0.3 * v, 'bandpass'); break;
      case 'ui': this.tone(660, 880, 0.08, 0.25 * v, 'triangle'); break;
      case 'pick': this.tone(520, 1040, 0.12, 0.3 * v, 'triangle'); this.tone(780, 1560, 0.14, 0.25 * v, 'triangle', 0.08); break;
      case 'drop': this.tone(440, 440, 0.12, 0.3 * v, 'square'); this.tone(660, 660, 0.12, 0.3 * v, 'square', 0.14); this.tone(880, 880, 0.25, 0.3 * v, 'square', 0.28); break;
      case 'secret': for (let i = 0; i < 6; i++) this.tone(400 * Math.pow(1.26, i), 400 * Math.pow(1.26, i) * 1.01, 0.3, 0.22 * v, 'triangle', i * 0.08); break;
      case 'fire': this.noise(0.4, 1200, 300, 0.25 * v); break;
      case 'ice': this.tone(1800, 2600, 0.15, 0.2 * v, 'sine'); this.noise(0.2, 6000, 2000, 0.2 * v, 'highpass'); break;
      case 'win': for (let i = 0; i < 5; i++) this.tone(330 * Math.pow(1.335, i * 0.8), 330 * Math.pow(1.335, i * 0.8), 0.4, 0.28 * v, 'triangle', i * 0.12); break;
      case 'lose': this.tone(300, 80, 0.8, 0.35 * v, 'sawtooth'); break;
      case 'tick': this.tone(1000, 1000, 0.05, 0.2 * v, 'square'); break;
      case 'chain': this.tone(500, 1000, 0.18, 0.28 * v, 'square'); break;
    }
  }
};

/* ---------- instanced particles ---------- */
class Particles {
  constructor(max, additive, opacity = 1) {
    this.max = max; this.next = 0;
    this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max); this.ml = new Float32Array(max); this.size = new Float32Array(max);
    this.grav = new Float32Array(max); this.drag = new Float32Array(max);
    const mat = new T.MeshBasicMaterial({ transparent: true, opacity, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending });
    this.mesh = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), mat, max);
    this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.mesh.instanceColor = new T.InstancedBufferAttribute(new Float32Array(max * 3).fill(1), 3);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = additive ? 5 : 4;
    const a = this.mesh.instanceMatrix.array; for (let i = 0; i < max; i++) { a[i * 16] = a[i * 16 + 5] = a[i * 16 + 10] = 0; a[i * 16 + 15] = 1; }
    scene.add(this.mesh);
  }
  emit(x, y, z, vx, vy, vz, col, size, life, grav = 0, drag = 0) {
    const i = this.next; this.next = (this.next + 1) % this.max;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.life[i] = this.ml[i] = life; this.size[i] = size; this.grav[i] = grav; this.drag[i] = drag;
    const c = this.mesh.instanceColor.array; c[i * 3] = ((col >> 16) & 255) / 255; c[i * 3 + 1] = ((col >> 8) & 255) / 255; c[i * 3 + 2] = (col & 255) / 255;
  }
  update(dt) {
    const a = this.mesh.instanceMatrix.array, p = this.pos, v = this.vel;
    for (let i = 0; i < this.max; i++) {
      const o = i * 16;
      if (this.life[i] <= 0) { if (a[o] !== 0) { a[o] = a[o + 5] = a[o + 10] = 0; } continue; }
      this.life[i] -= dt;
      if (this.life[i] <= 0) { a[o] = a[o + 5] = a[o + 10] = 0; continue; }
      const d = 1 - this.drag[i] * dt; v[i * 3] *= d; v[i * 3 + 1] = v[i * 3 + 1] * d - this.grav[i] * dt; v[i * 3 + 2] *= d;
      p[i * 3] += v[i * 3] * dt; p[i * 3 + 1] += v[i * 3 + 1] * dt; p[i * 3 + 2] += v[i * 3 + 2] * dt;
      const s = this.size[i] * Math.min(1, this.life[i] / this.ml[i] * 2.2);
      a[o] = s; a[o + 5] = s; a[o + 10] = s; a[o + 12] = p[i * 3]; a[o + 13] = p[i * 3 + 1]; a[o + 14] = p[i * 3 + 2];
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
const glowP = new Particles(3500, true, 0.95);
const dustP = new Particles(2200, false, 0.55);

/* ---------- debris physics (instanced, lit) ---------- */
const GRAV = { scale: 1 };
class Debris {
  constructor(max) {
    this.max = max; this.next = 0;
    const f = n => new Float32Array(n);
    this.px = f(max); this.py = f(max); this.pz = f(max); this.vx = f(max); this.vy = f(max); this.vz = f(max);
    this.rx = f(max); this.ry = f(max); this.rz = f(max); this.wx = f(max); this.wy = f(max); this.wz = f(max);
    this.sx = f(max); this.sy = f(max); this.sz = f(max); this.life = f(max); this.maxL = f(max); this.heavy = new Uint8Array(max); this.mass = f(max); this.rest = f(max); this.grace = f(max);
    this.isl = new Array(max).fill(null); this.held = new Uint8Array(max);
    const mat = new T.MeshPhongMaterial({ flatShading: true, shininess: 8 });
    this.mesh = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), mat, max);
    this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.mesh.instanceColor = new T.InstancedBufferAttribute(new Float32Array(max * 3).fill(1), 3);
    this.mesh.frustumCulled = false; this.mesh.castShadow = true;
    this.dummy = new T.Object3D(); this.dummy.rotation.order = 'YXZ';
    this.dummy.scale.set(0, 0, 0); this.dummy.updateMatrix();
    for (let i = 0; i < max; i++) this.mesh.setMatrixAt(i, this.dummy.matrix);
    scene.add(this.mesh);
    this.activeCount = 0;
  }
  spawn(o) {
    const i = this.next; this.next = (this.next + 1) % this.max;
    this.px[i] = o.x; this.py[i] = o.y; this.pz[i] = o.z; this.vx[i] = o.vx || 0; this.vy[i] = o.vy || 0; this.vz[i] = o.vz || 0;
    this.rx[i] = o.rx || rnd(6.28); this.ry[i] = o.ry === undefined ? rnd(6.28) : o.ry; this.rz[i] = o.rz || rnd(6.28);
    const sp = o.spin === undefined ? 5 : o.spin;
    this.wx[i] = rnd(-sp, sp); this.wy[i] = rnd(-sp, sp); this.wz[i] = rnd(-sp, sp);
    this.sx[i] = o.sx; this.sy[i] = o.sy; this.sz[i] = o.sz;
    this.life[i] = this.maxL[i] = o.life || 3; this.heavy[i] = o.heavy ? 1 : 0; this.mass[i] = o.mass || 1; this.rest[i] = 0; this.grace[i] = o.grace === undefined ? 0.12 : o.grace;
    this.isl[i] = o.isl || null; this.held[i] = o.held ? 1 : 0;
    const c = o.col, a = this.mesh.instanceColor.array; a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
    return i;
  }
  update(dt) {
    const d = this.dummy, g = 26 * GRAV.scale; let act = 0;
    const m = this.mesh;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      act++;
      this.life[i] -= dt; const isl = this.isl[i];
      if (this.life[i] <= 0) { this.kill(i); continue; }
      const ox = this.px[i], oy = this.py[i], oz = this.pz[i];
      if (!this.held[i]) this.vy[i] -= g * dt;
      this.px[i] += this.vx[i] * dt; this.py[i] += this.vy[i] * dt; this.pz[i] += this.vz[i] * dt;
      if (this.rest[i] <= 0) { this.rx[i] += this.wx[i] * dt; this.ry[i] += this.wy[i] * dt; this.rz[i] += this.wz[i] * dt; }
      if (this.grace[i] > 0) this.grace[i] -= dt;
      const y = this.py[i];
      if (isl && isl.alive !== false && this.grace[i] <= 0 && y > isl.minY - 4 && y < isl.maxY + 40) {
        const x = this.px[i], z = this.pz[i], hh = this.sy[i] * 0.5;
        if (this.heavy[i]) {
          const speed = Math.sqrt(this.vx[i] * this.vx[i] + this.vy[i] * this.vy[i] + this.vz[i] * this.vz[i]);
          if (speed > 2.5 && this.rest[i] <= 0) {
            let p = isl.pointSolid(x, y - hh * 0.8, z, true) || isl.pointSolid(x, y, z, true);
            if (p) {
              const dmg = this.mass[i] * speed * 1.0;
              const killed = isl.damagePiece(p, dmg, 'c', 'crush');
              Fx.hitSparks(x, y - hh, z, 4, p.base.getHex());
              if (killed) { this.vy[i] *= 0.82; this.vx[i] *= 0.9; this.vz[i] *= 0.9; this.mass[i] *= 0.85; }
              else { Fx.shatter(this, i); this.kill(i); continue; }
            }
          } else if (isl.pointSolid(x, y - hh, z)) { Fx.shatter(this, i); this.kill(i); continue; }
        } else if (this.held[i] === 0) {
          const p = isl.pointSolid(x, y, z);
          if (p) {
            this.px[i] = ox; this.py[i] = oy; this.pz[i] = oz;
            if (this.vy[i] < 0) { this.vy[i] *= -0.32; } else this.vy[i] *= -0.2;
            this.vx[i] *= 0.6; this.vz[i] *= 0.6; this.wx[i] *= 0.5; this.wy[i] *= 0.5; this.wz[i] *= 0.5;
            if (Math.abs(this.vy[i]) < 1.2) { this.rest[i] = 1; this.vy[i] = 0; this.vx[i] *= 0.3; this.vz[i] *= 0.3; if (this.life[i] > 2.2) this.life[i] = 2.2; }
          }
        }
      } else if (y < -190) { this.kill(i); continue; }
      const f = this.life[i] < 0.5 ? this.life[i] / 0.5 : 1;
      d.position.set(this.px[i], this.py[i], this.pz[i]); d.rotation.set(this.rx[i], this.ry[i], this.rz[i]);
      d.scale.set(this.sx[i] * f, this.sy[i] * f, this.sz[i] * f); d.updateMatrix(); m.setMatrixAt(i, d.matrix);
    }
    this.activeCount = act;
    m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true;
  }
  kill(i) { this.life[i] = 0; const d = this.dummy; d.scale.set(0, 0, 0); d.updateMatrix(); this.mesh.setMatrixAt(i, d.matrix); this.isl[i] = null; this.held[i] = 0; }
}
const debris = new Debris(2600);

/* ---------- FX helpers ---------- */
const camShake = { v: 0 };
const _fc = new T.Color();
const Fx = {
  near(x, y, z) { const dx = x - camera.position.x, dy = y - camera.position.y, dz = z - camera.position.z; return Math.sqrt(dx * dx + dy * dy + dz * dz); },
  hitSparks(x, y, z, n, col) {
    const d = this.near(x, y, z); if (d > 120) return; n = Math.ceil(n * (d > 60 ? 0.5 : 1));
    for (let i = 0; i < n; i++) glowP.emit(x, y, z, rnd(-5, 5), rnd(1, 7), rnd(-5, 5), 0xffe9a8, rnd(0.12, 0.26), rnd(0.2, 0.45), 18, 0.5);
    for (let i = 0; i < Math.ceil(n / 2); i++) dustP.emit(x, y, z, rnd(-2, 2), rnd(0.5, 3), rnd(-2, 2), col, rnd(0.25, 0.5), rnd(0.4, 0.8), 3, 1);
  },
  dust(x, y, z, n, col = 0xb9a98c, spread = 2, size = 0.8) {
    const d = this.near(x, y, z); if (d > 140) return; n = Math.ceil(n * (d > 70 ? 0.5 : 1));
    for (let i = 0; i < n; i++) dustP.emit(x + rnd(-1, 1), y, z + rnd(-1, 1), rnd(-spread, spread), rnd(0.2, spread), rnd(-spread, spread), col, rnd(size * 0.5, size * 1.4), rnd(0.8, 1.8), -0.4, 1.4);
  },
  flash(x, y, z, col = 0xffaa55, inten = 3) { flashLight.position.set(x, y + 2, z); flashLight.color.setHex(col); flashI = Math.max(flashI, inten); },
  explosion(x, y, z, r, opt = {}) {
    const d = this.near(x, y, z); const lod = d > 150 ? 0.25 : d > 80 ? 0.55 : 1;
    const col = opt.col || 0xff7a2a, col2 = opt.col2 || 0xffd070;
    const n = Math.ceil((14 + r * 9) * lod);
    for (let i = 0; i < n; i++) {
      const a = rnd(6.28), b = rnd(-0.3, 1.2), s = rnd(0.5, 1) * r * 2.6;
      glowP.emit(x, y, z, Math.cos(a) * Math.cos(b) * s, Math.sin(b) * s + 2, Math.sin(a) * Math.cos(b) * s, Math.random() < 0.5 ? col : col2, rnd(0.3, 0.7) * (0.6 + r * 0.08), rnd(0.35, 0.9), 14, 1.1);
    }
    for (let i = 0; i < Math.ceil((8 + r * 3) * lod); i++) {
      const a = rnd(6.28), s = rnd(0.2, 0.9) * r * 1.4;
      dustP.emit(x + rnd(-1, 1), y + rnd(0, 1), z + rnd(-1, 1), Math.cos(a) * s, rnd(0.5, 3), Math.sin(a) * s, opt.smoke || 0x5a5048, rnd(0.8, 1.6) * (0.7 + r * 0.12), rnd(1.0, 2.2), -0.6, 1.2);
    }
    for (let i = 0; i < Math.ceil(r * 2 * lod); i++) { // shock ring
      const a = i / (r * 2) * 6.28; glowP.emit(x, y + 0.3, z, Math.cos(a) * r * 3.2, 0.5, Math.sin(a) * r * 3.2, 0xffffff, 0.45, 0.3, 0, 2.2);
    }
    this.flash(x, y, z, col, Math.min(6, 2 + r * 0.5));
    const sh = Math.max(0, 1 - d / (60 + r * 8)) * Math.min(1.2, 0.25 + r * 0.07); camShake.v = Math.max(camShake.v, sh);
    if (d < 220) Snd.play(r > 7 ? 'bigboom' : 'boom', Math.max(0.12, 1 - d / 220) * Math.min(1.1, 0.5 + r * 0.08));
  },
  shatter(db, i) {
    const x = db.px[i], y = db.py[i], z = db.pz[i], s = Math.max(db.sx[i], db.sy[i], db.sz[i]);
    const c = _fc.setRGB(db.mesh.instanceColor.array[i * 3], db.mesh.instanceColor.array[i * 3 + 1], db.mesh.instanceColor.array[i * 3 + 2]);
    const n = Math.min(5, 2 + Math.floor(s * 0.8));
    for (let k = 0; k < n; k++) debris.spawn({ x, y, z, vx: rnd(-5, 5), vy: rnd(1, 6), vz: rnd(-5, 5), sx: s * 0.3, sy: s * 0.3, sz: s * 0.3, col: c, life: 2, isl: db.isl[i] });
    this.dust(x, y, z, 4, 0xb8aa94, 3, 1);
  },
  fireworks(x, y, z) {
    const cols = [0xff4d6d, 0xffd45a, 0x5be7ff, 0x9dff6b, 0xc27bff, 0xffffff];
    for (let b = 0; b < 7; b++) {
      const cx = x + rnd(-6, 6), cy = y + rnd(5, 13), cz = z + rnd(-6, 6), col = pick(cols);
      setTimeout(() => {
        for (let i = 0; i < 70; i++) {
          const a = rnd(6.28), e = Math.acos(rnd(-1, 1)), s = rnd(8, 15);
          glowP.emit(cx, cy, cz, Math.sin(e) * Math.cos(a) * s, Math.cos(e) * s, Math.sin(e) * Math.sin(a) * s, col, rnd(0.25, 0.5), rnd(1.0, 1.7), 9, 1.4);
        }
        this.flash(cx, cy, cz, col, 3); Snd.play('pop', 0.6);
      }, b * 170);
    }
  }
};

function updateFx(dt, t) {
  flashI = Math.max(0, flashI - dt * 9); flashLight.intensity = flashI;
  camShake.v = Math.max(0, camShake.v - dt * 1.6);
  glowP.update(dt); dustP.update(dt); debris.update(dt);
  updateClouds(t);
}

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
