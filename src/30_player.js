/* =====================================================================
   SKYBREAK — player, avatars, projectiles, starting kit
   ===================================================================== */
const V3 = T.Vector3;
const Game = { state: 'boot', t: 0, pi: null, islands: [], rules: {}, sens: 1, mode: null, paused: false };
window.Game = Game;

/* ---------- avatars ---------- */
function makeAvatar(col = 0x4aa8ff, hat = 0xffd45a, ghost = false) {
  const g = new T.Group(); const op = ghost ? .35 : 1;
  const M = c => new T.MeshPhongMaterial({ color: c, flatShading: true, transparent: ghost, opacity: op });
  const part = (w, h, d, c, x, y, z, parent = g, oy = 0) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), M(c)); m.position.set(x, y + oy, z); m.castShadow = !ghost; parent.add(m); return m; };
  part(.7, .9, .42, col, 0, 1.05, 0); part(.74, .22, .46, 0x2c3350, 0, .66, 0);
  const head = part(.58, .56, .56, 0xf2c9a0, 0, 1.78, 0); part(.1, .1, .02, 0x222222, -.14, 1.82, -.29, g); part(.1, .1, .02, 0x222222, .14, 1.82, -.29, g);
  part(.64, .2, .62, hat, 0, 2.12, 0); part(.3, .22, .3, hat, 0, 2.3, 0);
  const mkLimb = (x, y, w, h, c) => { const p = new T.Group(); p.position.set(x, y, 0); g.add(p); part(w, h, w, c, 0, 0, 0, p, -h / 2); return p; };
  const armL = mkLimb(-.5, 1.45, .22, .75, col), armR = mkLimb(.5, 1.45, .22, .75, col), legL = mkLimb(-.18, .7, .26, .7, 0x2c3350), legR = mkLimb(.18, .7, .26, .7, 0x2c3350);
  const tool = new T.Group(); tool.position.set(0, -.75, -.1); armR.add(tool);
  g.userData = { armL, armR, legL, legR, tool, anim: 0, toolId: null };
  return g;
}
const _toolMats = {};
function toolMat(c, e = 0) { const k = c + '_' + e; return _toolMats[k] || (_toolMats[k] = new T.MeshPhongMaterial({ color: c, emissive: e, flatShading: true })); }
function setAvatarTool(av, id) {
  const u = av.userData; if (u.toolId === id) return; u.toolId = id; while (u.tool.children.length) u.tool.remove(u.tool.children[0]);
  const add = (geo, mat, x, y, z) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; u.tool.add(m); return m; };
  const B = (w, h, d) => new T.BoxGeometry(w, h, d);
  if (id === 'hammer' || id === 'titan') { const s = id === 'titan' ? 2.2 : 1; add(B(.1 * s, .8 * s, .1 * s), toolMat(0x8a5a2c), 0, .1, -.4 * s * .3); add(B(.42 * s, .3 * s, .3 * s), toolMat(id === 'titan' ? 0xffd45a : 0x9aa0aa, id === 'titan' ? 0x553300 : 0), 0, .5 * s, -.1); u.tool.rotation.x = -1.2; }
  else if (id === 'pick') { add(B(.1, .85, .1), toolMat(0x8a5a2c), 0, .1, 0); add(B(.7, .12, .12), toolMat(0x9aa0aa), 0, .55, 0); u.tool.rotation.x = -1.2; }
  else if (id === 'bomb' || id === 'mega') { add(new T.IcosahedronGeometry(id === 'mega' ? .38 : .24, 1), toolMat(0x222831, id === 'mega' ? 0x552200 : 0), 0, 0, -.2); add(B(.04, .16, .04), toolMat(0xffaa22, 0xff6600), 0, .2, -.2); u.tool.rotation.x = 0; }
  else if (id === 'grapple') { add(B(.14, .14, .5), toolMat(0x55606e), 0, 0, -.2); add(B(.3, .06, .06), toolMat(0xcccccc), 0, 0, -.5); u.tool.rotation.x = 0; }
  else if (id === 'dash') { u.tool.rotation.x = 0; }
  else { const c = ITEM_COL[id] || 0xffffff; add(new T.OctahedronGeometry(.26, 0), toolMat(c, c), 0, 0, -.25); u.tool.rotation.x = 0; }
}
const ITEM_COL = { mega: 0xff6a2a, rod: 0xfff06a, titan: 0xffd45a, gravity: 0xb06bff, tornado: 0x9be8ff, meteor: 0xff4a2a, freeze: 0x6bd8ff, saw: 0xcfd6e0, inferno: 0xff8a1a };

/* ---------- player ---------- */
const PR = .42, PH = 1.7;
const P = {
  pos: new V3(), vel: new V3(), yaw: 0, camYaw: 0, camPitch: .38, camDist: 8.5, onGround: false, gp: null, coyote: 0, jumpBuf: 0,
  dashT: 0, dashCd: 0, grap: null, grapCd: 0, swing: 0, swingT: 0, hitDone: true, aimT: 0, slots: [], sel: 0, avatar: null, aim: { hit: false, x: 0, y: 0, z: 0 },
  secret: null, stun: 0, cam: new V3(), fwd: new V3(), color: 0x4aa8ff, hat: 0xffd45a, windX: 0, windZ: 0, lastGroundY: 0, holdUse: false, ropeLine: null
};
const KIT = [
  { id: 'hammer', name: 'Hammer', icon: '🔨', cd: .42, desc: 'Reliable, low damage.' },
  { id: 'pick', name: 'Pickaxe', icon: '⛏️', cd: .46, desc: 'Strong against rock and ice.' },
  { id: 'bomb', name: 'Small Bomb', icon: '💣', cd: 2.0, desc: 'Limited area damage.' },
  { id: 'grapple', name: 'Grappling Hook', icon: '🪝', cd: .9, desc: 'Pull yourself to any surface.' },
  { id: 'dash', name: 'Dash', icon: '💨', cd: 1.5, desc: 'Rapid movement.' }
];
function resetLoadout() {
  P.slots = KIT.map(k => ({ id: k.id, kit: true, uses: Infinity, cdEnd: 0, cdDur: k.cd }));
  P.sel = 0; P.secret = null;
}
function slotDef(s) { return s.kit ? KIT.find(k => k.id === s.id) : ITEMS[s.id]; }
function giveItem(id, uses) {
  const d = ITEMS[id]; const ex = P.slots.find(s => s.id === id && !s.kit);
  if (ex) { ex.uses += uses || d.uses; return ex; }
  const s = { id, kit: false, uses: uses || d.uses, cdEnd: 0, cdDur: d.cd }; P.slots.push(s); return s;
}
function spawnPlayer() {
  const I = Game.pi; P.pos.copy(I.spawn); P.vel.set(0, 0, 0); P.grap = null; P.dashT = 0; P.stun = 0;
  P.camYaw = 0; P.camPitch = .4; P.yaw = P.camYaw;
  P.lastGroundY = P.pos.y;
}
function playerFall(reason) {
  const I = Game.pi; I.stats.falls++; Snd.play(reason === 'lava' ? 'fire' : 'whoosh', .8);
  if (reason === 'lava') { Fx.explosion(P.pos.x, P.pos.y + 1, P.pos.z, 2, { col: 0xff5a1a }); }
  P.pos.copy(I.spawn); P.vel.set(0, 0, 0); P.grap = null; P.stun = .5;
  if (window.UI) UI.toast(reason === 'lava' ? 'BURNED — respawning' : 'YOU FELL — respawning', 'warn');
}
/* ---------- aim ---------- */
function updateAim() {
  const I = Game.pi, a = P.aim, f = P.fwd;
  const cd = P.fp ? .35 : P.camDist * .8, ox = P.cam.x + f.x * cd, oy = P.cam.y + f.y * cd, oz = P.cam.z + f.z * cd;
  const r = I.rayHit(ox, oy, oz, f.x, f.y, f.z, 130, .3);
  if (r) { a.hit = true; a.x = r.x; a.y = r.y; a.z = r.z; a.piece = r.p; a.px = r.px; a.py = r.py; a.pz = r.pz; }
  else { a.hit = false; a.piece = null; a.x = ox + f.x * 60; a.y = oy + f.y * 60; a.z = oz + f.z * 60; a.px = a.x; a.py = a.y; a.pz = a.z; }
  a.dist = Math.hypot(a.x - P.pos.x, a.y - P.pos.y - 1, a.z - P.pos.z);
}
/* ---------- projectiles ---------- */
const projs = [], projGeo = new T.IcosahedronGeometry(1, 1);
function launch(o) {
  const dx = o.tx - o.x, dy = o.ty - o.y, dz = o.tz - o.z, dist = Math.hypot(dx, dy, dz), g = o.g === undefined ? 24 : o.g;
  const Tf = o.T || clamp(dist / (o.speed || 26), .28, 1.5);
  const mesh = new T.Mesh(projGeo, new T.MeshPhongMaterial({ color: o.color || 0x222831, emissive: o.emissive || 0x331100, flatShading: true }));
  mesh.scale.setScalar(o.size || .32); mesh.position.set(o.x, o.y, o.z); mesh.castShadow = true; scene.add(mesh);
  projs.push({ I: o.I, x: o.x, y: o.y, z: o.z, vx: dx / Tf, vy: dy / Tf + .5 * g * Tf, vz: dz / Tf, g, age: 0, Tf, mesh, onHit: o.onHit, trail: o.trail || 0xffaa44, fuse: o.fuse || Tf + .4, noClip: o.noClip });
}
function updateProjs(dt) {
  for (let i = projs.length - 1; i >= 0; i--) {
    const p = projs[i]; p.age += dt; p.vy -= p.g * dt;
    const steps = Math.ceil(Math.hypot(p.vx, p.vy, p.vz) * dt / .5) || 1; let hit = false;
    for (let s = 0; s < steps; s++) {
      p.x += p.vx * dt / steps; p.y += p.vy * dt / steps; p.z += p.vz * dt / steps;
      if (p.age > .05 && !p.noClip && p.I.pointSolid(p.x, p.y, p.z, true)) { hit = true; break; }
    }
    p.mesh.position.set(p.x, p.y, p.z); p.mesh.rotation.x += dt * 8;
    if (Math.random() < .8) glowP.emit(p.x, p.y, p.z, rnd(-.5, .5), rnd(-.5, .5), rnd(-.5, .5), p.trail, .2, .3, 0, 2);
    if (hit || p.age >= p.fuse || p.y < p.I.minY - 70) {
      scene.remove(p.mesh); p.mesh.material.dispose(); projs.splice(i, 1);
      if (p.y > p.I.minY - 60) p.onHit(p.x, p.y, p.z, p);
    }
  }
}
/* ---------- explosions ---------- */
function knockPlayer(x, y, z, r, k) {
  const dx = P.pos.x - x, dy = P.pos.y + 1 - y, dz = P.pos.z - z, d = Math.hypot(dx, dy, dz) || 1, R = r + 3.5;
  if (d > R) return; const f = (1 - d / R) * 22 * k; P.vel.x += dx / d * f; P.vel.z += dz / d * f; P.vel.y += Math.max(0, dy / d) * f * .6 + f * .35; P.grap = null;
}
function explode(I, x, y, z, r, dmg, o = {}) {
  Fx.explosion(x, y, z, r, o.fx || {});
  if (Game.pi === I && Game.state === 'play') knockPlayer(x, y, z, r, o.knock === undefined ? (o.stat === false ? 1 : .4) : o.knock);
  const k = I.blast(x, y, z, r, dmg, o.type || 'x', o.cause || 'tool', { terrMul: o.terrMul, ignite: o.ignite, freeze: o.freeze });
  if (o.stat !== false) I.stats.explosives++;
  return k;
}
/* ---------- tools ---------- */
function facingDir(out) { out.set(-Math.sin(P.camYaw), 0, -Math.cos(P.camYaw)); return out; }
const _fd = new V3();
function meleeHit(type, dmg, splash, reach = 5.4) {
  const I = Game.pi, a = P.aim; facingDir(_fd);
  let hit = null;
  if (a.hit && a.dist <= reach) hit = { x: a.x, y: a.y, z: a.z, p: a.piece };
  else {
    let r = I.rayHit(P.pos.x, P.pos.y + 1.2, P.pos.z, _fd.x, 0, _fd.z, reach - .6, .2) ||
      I.rayHit(P.pos.x + _fd.x * .6, P.pos.y + 1.6, P.pos.z + _fd.z * .6, _fd.x * .55, -.85, _fd.z * .55, 3.4, .2);
    if (r) hit = r;
  }
  if (!hit) { Snd.play('swing', .6); return false; }
  const c = hit.p.base.getHex();
  I.damagePiece(hit.p, dmg, type, 'tool', _fd.x, .3, _fd.z);
  if (splash > 0) I.blast(hit.x, hit.y, hit.z, splash, dmg * .55, type, 'tool', { terrMul: .8 });
  Fx.hitSparks(hit.x, hit.y, hit.z, 7, c); Snd.play('hit', .9); camShake.v = Math.max(camShake.v, .12); I.stats.tools++;
  return true;
}
function throwBomb(I, from, to, o = {}) {
  const r = o.r || 4.6, dmg = o.dmg || 70;
  launch({
    I, x: from.x, y: from.y, z: from.z, tx: to.x, ty: to.y, tz: to.z, size: o.size || .3, color: o.color || 0x222831,
    onHit: (x, y, z) => explode(I, x, y, z, r, dmg, o.opts || {})
  });
  Snd.play('whoosh', .5);
}
function handPos(out) {
  if (P.fp) { const sy = Math.sin(P.camYaw), cy = Math.cos(P.camYaw); out.set(P.cam.x + P.fwd.x * .6 + cy * .3, P.cam.y + P.fwd.y * .6 - .22, P.cam.z + P.fwd.z * .6 - sy * .3); return out; }
  facingDir(_fd); out.set(P.pos.x + _fd.x * .5 + Math.cos(P.camYaw) * .4, P.pos.y + 1.5, P.pos.z + _fd.z * .5 - Math.sin(P.camYaw) * .4); return out; }
const _hp = new V3();
function doDash() {
  if (P.dashCd > 0 || P.stun > 0) return false;
  const k = Input.keys; let ix = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0), iz = (k.KeyS ? 1 : 0) - (k.KeyW ? 1 : 0);
  const sy = Math.sin(P.camYaw), cy = Math.cos(P.camYaw);
  // forward=(-sin,-cos), right=(cos,-sin); wish = right*ix + fwd*(-iz)
  let wx = cy * ix + (-sy) * (-iz), wz = -sy * ix + (-cy) * (-iz);
  if (!ix && !iz) { wx = -sy; wz = -cy; }
  const L = Math.hypot(wx, wz) || 1; P.vel.x = wx / L * 30; P.vel.z = wz / L * 30; if (!P.onGround) P.vel.y = Math.max(P.vel.y, 2);
  P.dashT = .2; P.dashCd = KIT[4].cd; P.grap = null; Snd.play('dash', .8);
  for (let i = 0; i < 12; i++) glowP.emit(P.pos.x + rnd(-.3, .3), P.pos.y + rnd(.2, 1.5), P.pos.z + rnd(-.3, .3), -wx / L * rnd(2, 6), rnd(-1, 1), -wz / L * rnd(2, 6), 0xbfe8ff, .25, .4, 0, 3);
  return true;
}
function doGrapple() {
  if (P.grapCd > 0 || P.stun > 0) return false; const a = P.aim;
  if (!a.hit || a.dist > 70) { window.UI && UI.toast('No grapple target in range', 'info'); P.grapCd = .25; return false; }
  P.grap = { x: a.x, y: a.y, z: a.z, t: 0 }; P.grapCd = KIT[3].cd; Snd.play('grapple', .8); return true;
}
function selectSlot(i) { if (i >= 0 && i < P.slots.length) { P.sel = i; Snd.play('ui', .3); } }
function useSelected(press, held) {
  const s = P.slots[P.sel]; if (!s || P.stun > 0) return;
  const d = slotDef(s);
  if (s.kit) {
    if (!press && !(held && (s.id === 'hammer' || s.id === 'pick'))) return;
    if (Game.t < s.cdEnd) return;
    if (s.id === 'dash') { if (doDash()) s.cdEnd = Game.t + s.cdDur; return; }
    if (s.id === 'grapple') { if (doGrapple()) s.cdEnd = Game.t + s.cdDur; return; }
    s.cdEnd = Game.t + s.cdDur; P.swing = .3; P.swingT = 0; P.hitDone = false; P.aimT = .6; P.pendingTool = s.id;
    if (s.id === 'bomb') { P.hitDone = true; handPos(_hp); const a = P.aim; throwBomb(Game.pi, _hp, a, { r: 4.8, dmg: 80 }); Game.pi.stats.tools++; P.swing = .35; }
    return;
  }
  // item
  if (Game.t < s.cdEnd) return;
  if (d.hold || !press) return;
  if (d.use(Game.pi, ctxFor('player'), s)) {
    s.cdEnd = Game.t + s.cdDur;
    s.uses--; Game.pi.stats.major++; P.aimT = .6; P.swing = .3; P.swingT = 0; P.hitDone = true;
    if (s.uses <= 0) { P.slots.splice(P.slots.indexOf(s), 1); P.sel = Math.min(P.sel, P.slots.length - 1); }
  }
}
function ctxFor(who) {
  if (who === 'player') { handPos(_hp); facingDir(_fd); return { who, from: _hp, aim: P.aim, dir: P.fwd, face: _fd, pos: P.pos, secret: false }; }
}
/* ---------- movement ---------- */
const cand = [];
function movePlayer(dt) {
  const I = Game.pi, k = Input.keys;
  if (P.stun > 0) P.stun -= dt;
  P.dashCd = Math.max(0, P.dashCd - dt); P.grapCd = Math.max(0, P.grapCd - dt);
  let ix = P.stun > 0 ? 0 : (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0), iz = P.stun > 0 ? 0 : (k.KeyS ? 1 : 0) - (k.KeyW ? 1 : 0);
  const sy = Math.sin(P.camYaw), cy = Math.cos(P.camYaw);
  let wx = cy * ix + (-sy) * (-iz), wz = -sy * ix + (-cy) * (-iz); const wl = Math.hypot(wx, wz); if (wl > 1) { wx /= wl; wz /= wl; }
  const moving = wl > .01;
  const slip = P.gp && P.gp.m === 'ice' ? 1.6 : 1;
  const speed = 9.2;
  if (P.dashT > 0) P.dashT -= dt;
  else if (!P.grap) {
    const kk = P.onGround ? 15 / slip : 3.2;
    P.vel.x += (wx * speed - P.vel.x) * Math.min(1, kk * dt); P.vel.z += (wz * speed - P.vel.z) * Math.min(1, kk * dt);
  }
  P.vel.x += P.windX * dt; P.vel.z += P.windZ * dt;
  if (Input.pressed.Space) P.jumpBuf = .12; P.jumpBuf -= dt; P.coyote -= dt;
  if (P.onGround) P.coyote = .1;
  if (P.jumpBuf > 0 && P.coyote > 0 && P.stun <= 0) { P.vel.y = 11.8; P.jumpBuf = 0; P.coyote = 0; P.onGround = false; Fx.dust(P.pos.x, P.pos.y, P.pos.z, 3, 0xcccccc, 1.2, .4); }
  if (P.grap) {
    const g = P.grap; g.t += dt; const dx = g.x - P.pos.x, dy = g.y - (P.pos.y + 1), dz = g.z - P.pos.z, d = Math.hypot(dx, dy, dz);
    if (d < 2.4 || g.t > 2.2 || Input.pressed.Space) { if (Input.pressed.Space) { P.vel.y = 10; } else { P.vel.multiplyScalar(.5); P.vel.y = Math.max(P.vel.y, 3); } P.grap = null; }
    else { const sp = 34; P.vel.set(dx / d * sp, dy / d * sp, dz / d * sp); }
  } else if (P.dashT <= 0) P.vel.y -= 31 * GRAV.scale * dt;
  P.vel.y = Math.max(P.vel.y, -55);
  // candidate solids
  cand.length = 0; const ex = 2.5 + Math.abs(P.vel.x) * dt, ez = 2.5 + Math.abs(P.vel.z) * dt;
  I.queryBox(P.pos.x - ex, P.pos.y - 2.5 - Math.max(0, -P.vel.y * dt), P.pos.z - ez, P.pos.x + ex, P.pos.y + PH + 2, P.pos.z + ez, p => { if (p.solid && !p.phased) cand.push(p); });
  P.onGround = false; P.gp = null;
  const sub = Math.max(1, Math.ceil(Math.max(Math.abs(P.vel.x), Math.abs(P.vel.z), Math.abs(P.vel.y)) * dt / .4));
  const sdt = dt / sub;
  for (let s = 0; s < sub; s++) {
    stepAxis('x', P.vel.x * sdt); stepAxis('z', P.vel.z * sdt); stepAxis('y', P.vel.y * sdt);
  }
  // facing
  if (P.aimT > 0) { P.aimT -= dt; P.yaw = lerpAngle(P.yaw, P.camYaw, Math.min(1, dt * 20)); }
  else if (moving) { const ty = Math.atan2(-wx, -wz); P.yaw = lerpAngle(P.yaw, ty, Math.min(1, dt * 14)); }
  // hazards
  if (P.pos.y < I.minY - 28) playerFall('void');
  if (I.lavaCells.size) { const ci = Math.round((P.pos.x - I.cx) / VX), cj = Math.round((P.pos.z - I.cz) / VX); if (I.lavaCells.has(ci + ',' + cj) && P.pos.y < I.cy + .3 && !P.grap) playerFall('lava'); }
  if (I.lavaLevel > -900 && P.pos.y < I.cy + I.lavaLevel) playerFall('lava');
  if (P.onGround) P.lastGroundY = P.pos.y;
}
function lerpAngle(a, b, t) { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; }
function stepAxis(axis, d) {
  if (!d) return;
  if (axis === 'x') P.pos.x += d; else if (axis === 'z') P.pos.z += d; else P.pos.y += d;
  const px = P.pos.x, pz = P.pos.z;
  for (let n = 0; n < cand.length; n++) {
    const p = cand[n]; if (!p.alive || p.phased) continue;
    const py = P.pos.y;
    if (P.pos.x + PR <= p.minX + .001 || P.pos.x - PR >= p.maxX - .001 || P.pos.z + PR <= p.minZ + .001 || P.pos.z - PR >= p.maxZ - .001 || py + PH <= p.minY + .001 || py >= p.maxY - .03) continue;
    if (axis === 'y') {
      if (d <= 0) { P.pos.y = p.maxY; P.vel.y = 0; P.onGround = true; P.gp = p; } else { P.pos.y = p.minY - PH; P.vel.y = Math.min(P.vel.y, 0); }
    } else {
      const step = p.maxY - py;
      if (step <= .95 && (P.onGround || P.coyote > -.15 || P.vel.y <= 0.1) && P.stun <= 0 && stepFree(p)) { P.pos.y = p.maxY + .001; P.gp = p; }
      else if (axis === 'x') { if (d > 0) P.pos.x = p.minX - PR; else P.pos.x = p.maxX + PR; P.vel.x = 0; }
      else { if (d > 0) P.pos.z = p.minZ - PR; else P.pos.z = p.maxZ + PR; P.vel.z = 0; }
    }
  }
}
function stepFree(top) {
  const ny = top.maxY + .001;
  for (let n = 0; n < cand.length; n++) {
    const q = cand[n]; if (q === top || !q.alive) continue;
    if (P.pos.x + PR > q.minX && P.pos.x - PR < q.maxX && P.pos.z + PR > q.minZ && P.pos.z - PR < q.maxZ && ny + PH > q.minY + .05 && ny < q.maxY - .05) return false;
  }
  return true;
}
/* ---------- camera ---------- */
function updateCamera(dt) {
  const I = Game.pi, k = Input.keys;
  const sens = .0022 * Game.sens;
  P.camYaw -= Input.dx * sens; P.camPitch += Input.dy * sens;
  const ka = ((k.ArrowLeft ? 1 : 0) - (k.ArrowRight ? 1 : 0)) * 2.2 * dt, kb = ((k.ArrowDown ? 1 : 0) - (k.ArrowUp ? 1 : 0)) * 1.6 * dt;
  P.camYaw += ka; P.camPitch += kb;
  if (!Input.locked && Input.lockFailed) { if (Math.abs(Input.nx) > .72) P.camYaw -= Math.sign(Input.nx) * (Math.abs(Input.nx) - .72) * 5 * dt; if (Math.abs(Input.ny) > .72) P.camPitch += Math.sign(Input.ny) * (Math.abs(Input.ny) - .72) * 3 * dt; }
  P.camPitch = P.fp ? clamp(P.camPitch, -1.45, 1.45) : clamp(P.camPitch, -.75, 1.25);
  const cp = Math.cos(P.camPitch), sp = Math.sin(P.camPitch), sy = Math.sin(P.camYaw), cy = Math.cos(P.camYaw);
  const bx = sy * cp, by = sp, bz = cy * cp, rx = cy, rz = -sy;
  const tx = P.pos.x + rx * .9, ty = P.pos.y + 1.6, tz = P.pos.z + rz * .9;
  let dist = P.camDist;
  if (P.fp) { const ex = P.pos.x, ey = P.pos.y + 1.62, ez = P.pos.z; P.cam.set(ex, ey, ez); P.fwd.set(-bx, -by, -bz); const sh = camShake.v * .35; camera.position.set(ex + rnd(-sh, sh), ey + rnd(-sh, sh), ez + rnd(-sh, sh)); camera.lookAt(camera.position.x + P.fwd.x * 10, camera.position.y + P.fwd.y * 10, camera.position.z + P.fwd.z * 10); const fv = P.dashT > 0 ? 94 : 82; camera.fov += (fv - camera.fov) * Math.min(1, dt * 10); camera.updateProjectionMatrix(); return; }
  for (let t = 1.4; t < dist; t += .5) { if (I.pointSolid(tx + bx * t, ty + by * t, tz + bz * t)) { dist = Math.max(1.4, t - .6); break; } }
  P.cam.set(tx + bx * dist, ty + by * dist, tz + bz * dist);
  P.fwd.set(-bx, -by, -bz);
  const sh = camShake.v * .5;
  camera.position.set(P.cam.x + rnd(-sh, sh), P.cam.y + rnd(-sh, sh), P.cam.z + rnd(-sh, sh));
  camera.lookAt(camera.position.x + P.fwd.x * 10, camera.position.y + P.fwd.y * 10, camera.position.z + P.fwd.z * 10);
  const fovT = P.dashT > 0 ? 82 : 72; camera.fov += (fovT - camera.fov) * Math.min(1, dt * 10); camera.updateProjectionMatrix();
}
function updateAvatar(av, dt, speed, swing, t) {
  const u = av.userData; u.anim += dt * (1 + speed * 1.1); const s = Math.sin(u.anim * 7) * Math.min(1, speed / 6) * .9;
  u.legL.rotation.x = s; u.legR.rotation.x = -s; u.armL.rotation.x = -s * .8;
  if (swing > 0) { u.armR.rotation.x = -1.6 + (1 - swing / .3) * 2.4; } else u.armR.rotation.x = s * .8;
}
/* ---------- first-person view ---------- */
const VM = (() => {
  const g = new T.Group(); g.visible = false; g.renderOrder = 10;
  const skin = new T.MeshPhongMaterial({ color: 0x4aa8ff, flatShading: true });
  const arm = new T.Mesh(new T.BoxGeometry(.17, .17, .75), skin); arm.position.set(0, 0, .12); g.add(arm);
  const hand = new T.Mesh(new T.BoxGeometry(.2, .2, .2), new T.MeshPhongMaterial({ color: 0xf2c9a0, flatShading: true })); hand.position.set(0, 0, -.27); g.add(hand);
  const tool = new T.Group(); tool.position.set(0, .02, -.36); g.add(tool);
  g.scale.setScalar(.5); g.position.set(.3, -.27, -.55); camera.add(g);
  return { g, tool, skin, ud: { tool, toolId: null }, base: .34 };
})();
function toggleView() {
  P.fp = !P.fp; Save.d.fp = P.fp; Save.save();
  P.camPitch = P.fp ? clamp(P.camPitch, -1.45, 1.45) : clamp(P.camPitch, -.75, 1.25);
  if (window.UI) UI.toast(P.fp ? 'FIRST PERSON  (F5 to switch)' : 'THIRD PERSON  (F5 to switch)', 'info');
}
function updateViewmodel(dt, slot) {
  const vm = VM.g; vm.visible = !!P.fp && Game.state === 'play';
  if (!vm.visible) return;
  const id = slot ? slot.id : 'hammer';
  VM.skin.color.setHex(Save.d.cos.body);
  if (VM.ud.toolId !== id) { setAvatarTool({ userData: VM.ud }, id); const r = VM.ud.tool.rotation.x; VM.tool.rotation.x = (id === 'hammer' || id === 'titan' || id === 'pick') ? r + .95 : r; VM.tool.children.forEach(m => { m.castShadow = false; }); }
  const sp = Math.hypot(P.vel.x, P.vel.z) * (P.onGround ? 1 : .2), t = Game.t;
  const sw = P.swing > 0 ? Math.sin((1 - P.swing / .3) * Math.PI) : 0;
  vm.position.set(.3 + Math.sin(t * 9) * .006 * Math.min(1, sp / 6), -.27 + Math.abs(Math.sin(t * 9)) * .012 * Math.min(1, sp / 6) - sw * .04, -.55 - sw * .08);
  vm.rotation.set(-sw * 1.1, sw * .25, 0);
}
function updatePlayer(dt) {
  const I = Game.pi;
  if (Input.pressed.F5) toggleView();
  if (Input.pressed.KeyE && P.slots.length) doGrapple();
  if (Input.pressed.ShiftLeft || Input.pressed.ShiftRight) doDash();
  for (let i = 0; i < 10; i++) { const code = i < 9 ? 'Digit' + (i + 1) : 'Digit0'; if (Input.pressed[code] && !Game.draftKeys) selectSlot(i); }
  if (Input.pressed.Minus) selectSlot(10); if (Input.pressed.Equal) selectSlot(11);
  if (Input.pressed.BracketRight || Input.pressed.Tab) selectSlot((P.sel + 1) % P.slots.length); if (Input.pressed.BracketLeft) selectSlot((P.sel + P.slots.length - 1) % P.slots.length);
  if (Input.wheel) selectSlot((P.sel + Input.wheel + P.slots.length) % P.slots.length);
  movePlayer(dt); updateCamera(dt); updateAim();
  if (!Game.menuLock) useSelected(Input.mpress.l, Input.mouse.l);
  // pending melee hit
  if (P.swing > 0) {
    P.swingT += dt; P.swing -= dt;
    if (!P.hitDone && P.swingT > .1) { P.hitDone = true; if (P.pendingTool === 'hammer') { if (meleeHit('b', 24, 1.5)) { } } else if (P.pendingTool === 'pick') meleeHit('p', 17, .9); P.pendingTool = null; }
  }
  const s = P.slots[P.sel]; setAvatarTool(P.avatar, s ? s.id : 'hammer');
  const av = P.avatar; av.position.set(P.pos.x, P.pos.y, P.pos.z); av.rotation.y = P.yaw; av.visible = !P.fp; updateViewmodel(dt, s);
  updateAvatar(av, dt, Math.hypot(P.vel.x, P.vel.z), P.swing, Game.t);
  // grapple rope
  if (P.grap) {
    if (!P.ropeLine) { const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3)); P.ropeLine = new T.Line(g, new T.LineBasicMaterial({ color: 0xffe9a8 })); P.ropeLine.frustumCulled = false; scene.add(P.ropeLine); }
    const a = P.ropeLine.geometry.attributes.position.array; if (P.fp) { handPos(_hp); a[0] = _hp.x; a[1] = _hp.y; a[2] = _hp.z; } else { a[0] = P.pos.x; a[1] = P.pos.y + 1.4; a[2] = P.pos.z; } a[3] = P.grap.x; a[4] = P.grap.y; a[5] = P.grap.z; P.ropeLine.geometry.attributes.position.needsUpdate = true; P.ropeLine.visible = true;
  } else if (P.ropeLine) P.ropeLine.visible = false;
  // dash trail
  if (P.dashT > 0) glowP.emit(P.pos.x, P.pos.y + 1, P.pos.z, 0, 0, 0, 0x9fe0ff, .5, .35, 0, 2);
  // landing dust
  if (P.onGround && !P._wasGround && P._fallV < -12) { Fx.dust(P.pos.x, P.pos.y, P.pos.z, 6, 0xcdbfa0, 2, .6); camShake.v = Math.max(camShake.v, .1); }
  P._fallV = P.vel.y; P._wasGround = P.onGround;
}
