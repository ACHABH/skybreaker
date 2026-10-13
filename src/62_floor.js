/* =====================================================================
   SKYBREAK — the Unbreakable Layer (meme floor), hearts and the revenge break
   ===================================================================== */
const MEMES = [
  { face: 'smug', top: 'SKILL ISSUE', bot: 'THE FLOOR SAYS HI' },
  { face: 'laugh', top: 'NICE TRY', bot: 'NOT TODAY' },
  { face: 'stare', top: 'IS THAT ALL YOU GOT?', bot: '' },
  { face: 'shades', top: 'FALLING AGAIN?', bot: 'NOPE. FLOOR.' },
  { face: 'angry', top: 'GIT GUD', bot: 'I AM UNBREAKABLE' },
  { face: 'cat', top: 'NO.', bot: 'YOU CANNOT BREAK THIS' },
  { face: 'cry', top: 'BREAK ME', bot: 'I DARE YOU (YOU CANT)' },
  { face: 'smug', top: 'BONK!', bot: 'GO BACK TO BREAKING' }
];
function memeFace(c, kind, x, y, r) {
  const skin = kind === 'cat' ? '#f0a95a' : '#ffd23f';
  c.save(); c.translate(x, y);
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(8, 14, r, 0, 7); c.fill();
  c.fillStyle = skin; c.strokeStyle = '#2a1a05'; c.lineWidth = r * .05; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); c.stroke();
  if (kind === 'cat') { for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * r * .95, -r * .3); c.lineTo(s * r * .78, -r * 1.25); c.lineTo(s * r * .22, -r * .9); c.closePath(); c.fill(); c.stroke(); } }
  c.fillStyle = '#2a1a05'; c.lineCap = 'round'; c.lineJoin = 'round';
  const eye = (ex, ey, w, h) => { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex, ey, w, h, 0, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#2a1a05'; c.beginPath(); c.arc(ex + w * .15, ey + h * .1, w * .45, 0, 7); c.fill(); };
  const mouth = (path) => { c.beginPath(); path(); c.stroke(); };
  c.lineWidth = r * .07;
  if (kind === 'smug') {
    eye(-r * .38, -r * .15, r * .2, r * .2); eye(r * .38, -r * .15, r * .2, r * .2);
    c.fillStyle = skin; for (const s of [-1, 1]) { c.fillRect(s * r * .38 - r * .24, -r * .4, r * .48, r * .24); }
    c.strokeStyle = '#2a1a05'; c.beginPath(); c.moveTo(-r * .66, -r * .17); c.lineTo(-r * .12, -r * .17); c.moveTo(r * .12, -r * .17); c.lineTo(r * .66, -r * .17); c.stroke();
    mouth(() => { c.moveTo(-r * .45, r * .42); c.quadraticCurveTo(r * .1, r * .62, r * .55, r * .2); });
  } else if (kind === 'laugh') {
    c.beginPath(); c.moveTo(-r * .6, -r * .1); c.lineTo(-r * .2, -r * .3); c.lineTo(-r * .6, -r * .5); c.moveTo(r * .6, -r * .1); c.lineTo(r * .2, -r * .3); c.lineTo(r * .6, -r * .5); c.stroke();
    c.fillStyle = '#7a1b12'; c.beginPath(); c.moveTo(-r * .55, r * .15); c.quadraticCurveTo(0, r * .95, r * .55, r * .15); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#5fc8ff'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * r * .72, r * .1, r * .1, r * .17, 0, 0, 7); c.fill(); }
  } else if (kind === 'stare') {
    eye(-r * .36, -r * .12, r * .26, r * .3); eye(r * .36, -r * .12, r * .26, r * .3);
    mouth(() => { c.moveTo(-r * .4, r * .5); c.lineTo(r * .4, r * .5); });
  } else if (kind === 'shades') {
    c.fillStyle = '#111'; c.beginPath(); c.roundRect ? c.roundRect(-r * .72, -r * .38, r * .6, r * .36, r * .1) : c.rect(-r * .72, -r * .38, r * .6, r * .36); c.fill();
    c.beginPath(); c.roundRect ? c.roundRect(r * .12, -r * .38, r * .6, r * .36, r * .1) : c.rect(r * .12, -r * .38, r * .6, r * .36); c.fill(); c.fillRect(-r * .14, -r * .32, r * .28, r * .07);
    mouth(() => { c.moveTo(-r * .45, r * .38); c.quadraticCurveTo(0, r * .72, r * .5, r * .32); });
  } else if (kind === 'angry') {
    eye(-r * .36, -r * .1, r * .2, r * .2); eye(r * .36, -r * .1, r * .2, r * .2);
    c.lineWidth = r * .1; c.beginPath(); c.moveTo(-r * .66, -r * .52); c.lineTo(-r * .1, -r * .28); c.moveTo(r * .66, -r * .52); c.lineTo(r * .1, -r * .28); c.stroke(); c.lineWidth = r * .07;
    mouth(() => { c.moveTo(-r * .45, r * .6); c.quadraticCurveTo(0, r * .3, r * .45, r * .6); });
  } else if (kind === 'cry') {
    eye(-r * .36, -r * .1, r * .2, r * .24); eye(r * .36, -r * .1, r * .2, r * .24);
    c.fillStyle = '#5fc8ff'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * r * .36, r * .1); c.quadraticCurveTo(s * r * .7, r * .5, s * r * .52, r * .9); c.quadraticCurveTo(s * r * .3, r * .5, s * r * .36, r * .1); c.fill(); }
    mouth(() => { c.moveTo(-r * .4, r * .55); c.quadraticCurveTo(0, r * .3, r * .4, r * .55); });
  } else if (kind === 'cat') {
    eye(-r * .36, -r * .12, r * .2, r * .24); eye(r * .36, -r * .12, r * .2, r * .24);
    c.fillStyle = '#e0607a'; c.beginPath(); c.moveTo(-r * .08, r * .12); c.lineTo(r * .08, r * .12); c.lineTo(0, r * .24); c.closePath(); c.fill();
    mouth(() => { c.moveTo(0, r * .24); c.quadraticCurveTo(-r * .1, r * .45, -r * .3, r * .38); c.moveTo(0, r * .24); c.quadraticCurveTo(r * .1, r * .45, r * .3, r * .38); });
    c.beginPath(); for (const s of [-1, 1]) for (const k of [-.1, .1]) { c.moveTo(s * r * .3, r * .22 + k * r); c.lineTo(s * r * .9, r * .16 + k * r * 2); } c.stroke();
  } else if (kind === 'devil') {
    c.fillStyle = '#c4182c'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * r * .55, -r * .78); c.lineTo(s * r * .9, -r * 1.3); c.lineTo(s * r * .22, -r * .95); c.closePath(); c.fill(); c.stroke(); }
    eye(-r * .36, -r * .1, r * .2, r * .2); eye(r * .36, -r * .1, r * .2, r * .2);
    c.lineWidth = r * .1; c.beginPath(); c.moveTo(-r * .66, -r * .5); c.lineTo(-r * .1, -r * .28); c.moveTo(r * .66, -r * .5); c.lineTo(r * .1, -r * .28); c.stroke(); c.lineWidth = r * .07;
    c.fillStyle = '#7a1b12'; c.beginPath(); c.moveTo(-r * .62, r * .2); c.quadraticCurveTo(0, r * .98, r * .62, r * .2); c.quadraticCurveTo(0, r * .36, -r * .62, r * .2); c.fill(); c.stroke();
    c.fillStyle = '#fff'; for (let i = -2; i <= 2; i++) c.fillRect(i * r * .17 - r * .05, r * .33 + (2 - Math.abs(i)) * r * .02, r * .1, r * .12);
  }
  c.restore();
}
function memeText(c, txt, y, size, maxW) {
  if (!txt) return; c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
  let s = size; const fam = "Impact,'Arial Black','Anton',sans-serif";
  do { c.font = '900 ' + s + 'px ' + fam; s -= 4; } while (c.measureText(txt).width > maxW && s > 24);
  c.lineJoin = 'round'; c.lineWidth = s * .22; c.strokeStyle = '#000'; c.strokeText(txt, 512, y); c.fillStyle = '#fff'; c.fillText(txt, 512, y); c.restore();
}
function drawMeme(m, S) {
  const cv = document.createElement('canvas'); cv.width = cv.height = S || 1024; const c = cv.getContext('2d'); c.scale(cv.width / 1024, cv.width / 1024);
  const h = Math.random() * 360, g = c.createRadialGradient(512, 512, 40, 512, 512, 560);
  g.addColorStop(0, `hsl(${h},70%,48%)`); g.addColorStop(1, `hsl(${(h + 50) % 360},70%,22%)`); c.fillStyle = g; c.fillRect(0, 0, 1024, 1024);
  c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 6; for (let r = 80; r < 520; r += 70) { c.beginPath(); c.arc(512, 512, r, 0, 7); c.stroke(); }
  c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 26; c.beginPath(); c.arc(512, 512, 499, 0, 7); c.stroke();
  memeFace(c, m.face, 512, 520, 255);
  memeText(c, m.top, 190, 118, 700); memeText(c, m.bot, 858, m.bot.length > 18 ? 74 : 96, 700);
  return cv;
}
const Floor = {
  mesh: null, shards: null, tex: null, tops: null, mats: null,
  build(I) {
    this.remove(); if (!I || I.kind === 'boss_void' || I.kind === 'boss_volcano') { if (I) I.floor = null; return; }
    const FR = 27.5, top = I.minY - .35, m = MEMES[(Math.random() * MEMES.length) | 0], cv = drawMeme(m, 1024);
    const tex = new T.CanvasTexture(cv); tex.anisotropy = 4; this.tex = tex; this.meme = m;
    const g = new T.Group(), side = new T.MeshLambertMaterial({ color: 0x2b2a3a });
    const topM = new T.MeshBasicMaterial({ map: tex }), botM = new T.MeshBasicMaterial({ map: tex });
    this.mats = { side, topM, botM };
    const body = new T.Mesh(new T.CylinderGeometry(FR, FR * .985, 1.3, 64), side); body.position.set(I.cx, top - .65, I.cz); g.add(body);
    const tg = new T.CircleGeometry(FR, 64); tg.rotateX(-Math.PI / 2); const tm = new T.Mesh(tg, topM); tm.position.set(I.cx, top + .015, I.cz); g.add(tm);
    const bg = new T.CircleGeometry(FR * .985, 64); bg.rotateX(Math.PI / 2); const bm = new T.Mesh(bg, botM); bm.position.set(I.cx, top - 1.31, I.cz); g.add(bm);
    body.receiveShadow = true; scene.add(g); this.mesh = g; I.floor = { top, r: FR - .25, cx: I.cx, cz: I.cz, mesh: g, size: FR };
    this.I = I; this.brokeT = -1;
  },
  remove() {
    if (this.mesh) { scene.remove(this.mesh); this.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); }); this.mesh = null; }
    if (this.shards) { for (const s of this.shards) { scene.remove(s.m); s.m.geometry.dispose(); } this.shards = null; }
    if (this.mats) { this.mats.side.dispose(); this.mats.topM.dispose(); this.mats.botM.dispose(); this.mats = null; }
    if (this.tex) { this.tex.dispose(); this.tex = null; }
    this.brokeT = -1;
  },
  shatter() {
    const I = this.I, f = I && I.floor; if (!f || !this.mesh || this.shards) return;
    scene.remove(this.mesh); const N = 8, w = f.size * 2 / N, list = []; const mats = [this.mats.side, this.mats.side, this.mats.topM, this.mats.botM, this.mats.side, this.mats.side];
    for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) {
      const dx = (a + .5) * w - f.size, dz = (b + .5) * w - f.size; if (Math.hypot(dx, dz) > f.size + w * .25) continue;
      const geo = new T.BoxGeometry(w * .96, 1.3, w * .96), uv = geo.attributes.uv, pos = geo.attributes.position;
      for (const grp of [2, 3]) for (let k = 0; k < 4; k++) { const vi = grp * 4 + k, x = pos.getX(vi) + dx, z = pos.getZ(vi) + dz; uv.setXY(vi, x / f.size * .5 + .5, -z / f.size * .5 + .5); }
      const m = new T.Mesh(geo, mats); m.position.set(f.cx + dx, f.top - .65, f.cz + dz); scene.add(m);
      const d = Math.hypot(dx, dz) || 1, sp = 6 + Math.random() * 7;
      list.push({ m, vx: dx / d * sp * (.6 + d / f.size * .5) + rnd(-2, 2), vy: rnd(6, 17), vz: dz / d * sp * (.6 + d / f.size * .5) + rnd(-2, 2), rx: rnd(-4, 4), ry: rnd(-4, 4), rz: rnd(-4, 4), delay: d / f.size * .25 });
    }
    this.shards = list; this.brokeT = 0;
    Fx.explosion(f.cx, f.top, f.cz, 9, { col: 0xffd070, col2: 0xffffff }); camShake.v = Math.max(camShake.v, 1); Snd.play('bigboom', 1);
    for (let i = 0; i < 6; i++) Fx.dust(f.cx + rnd(-14, 14), f.top + .5, f.cz + rnd(-14, 14), 10, 0xcfc8e8, 3, 2.4);
  },
  update(dt) {
    if (!this.shards) return; this.brokeT += dt; let alive = 0;
    for (const s of this.shards) {
      if (this.brokeT < s.delay) { alive++; continue; }
      s.vy -= 30 * dt; s.m.position.x += s.vx * dt; s.m.position.y += s.vy * dt; s.m.position.z += s.vz * dt;
      s.m.rotation.x += s.rx * dt; s.m.rotation.y += s.ry * dt; s.m.rotation.z += s.rz * dt;
      if (s.m.position.y > this.I.cy - 140) alive++; else s.m.visible = false;
    }
    if (this.brokeT > 7 || !alive) { for (const s of this.shards) { scene.remove(s.m); s.m.geometry.dispose(); } this.shards = []; }
  },
  revengeURL() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 640; const c = cv.getContext('2d'); c.scale(.625, .625);
    const g = c.createLinearGradient(0, 0, 0, 1024); g.addColorStop(0, '#2a0f3d'); g.addColorStop(1, '#8a1d2e'); c.fillStyle = g; c.fillRect(0, 0, 1024, 1024);
    c.strokeStyle = 'rgba(255,255,255,.1)'; c.lineWidth = 10; for (let i = -1024; i < 1024; i += 70) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 1024, 1024); c.stroke(); }
    // cracked floor shards falling
    c.fillStyle = '#4a4660'; c.strokeStyle = '#111'; c.lineWidth = 8;
    for (let i = 0; i < 9; i++) { const x = 90 + i * 105 + Math.sin(i * 7) * 30, y = 590 + Math.sin(i * 3.1) * 90 + (i % 3) * 40, s = 55 + (i * 37) % 40; c.save(); c.translate(x, y); c.rotate(i * 1.3); c.fillRect(-s / 2, -s / 2, s, s * .8); c.strokeRect(-s / 2, -s / 2, s, s * .8); c.restore(); }
    memeFace(c, 'devil', 512, 420, 230);
    memeText(c, 'YOU WIN!', 120, 130, 760); memeText(c, 'THIS IS MY REVENGE', 880, 110, 900);
    return cv.toDataURL('image/png');
  }
};
Game.addFloor = function (I) { Floor.build(I); };
Game.removeFloor = function () { Floor.remove(); };
Game.updateFloorBreak = function (dt) {
  const fb = Game.floorBreak; if (!fb) return; fb.t += dt;
  if (!fb.done && fb.t > 1.4) { fb.done = true; Floor.shatter(); if (window.UI) UI.banner('THE UNBREAKABLE LAYER…', 'was breakable all along. This is my revenge.', 4200); }
  if (fb.done && P.avatar) { fb.fv = (fb.fv || 0) + 30 * dt; P.avatar.position.y -= fb.fv * dt; P.avatar.rotation.z += dt * 3; P.avatar.rotation.x += dt * 2; }
  Floor.update(dt);
};
/* Player standing on the layer: called from movePlayer. Returns true if landed. */
function floorLand(I, prevY) {
  const f = I.floor; if (!f || Floor.brokeT >= 0) return false;
  const dx = P.pos.x - f.cx, dz = P.pos.z - f.cz;
  if (dx * dx + dz * dz > f.r * f.r) return false;
  if (P.pos.y <= f.top && prevY >= f.top - .6 && P.vel.y <= 0.001 + 12) { P.pos.y = f.top; if (P.vel.y < 0) P.vel.y = 0; P.onGround = true; P.gp = null; return true; }
  return false;
}
