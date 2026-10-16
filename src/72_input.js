/* =====================================================================
   SKYBREAK — touch controls, gamepad support, graphics quality
   ===================================================================== */
const Quality = {
  get() { const q = Save.d.q; return q === 'low' || q === 'high' ? q : (Input.touch ? 'low' : 'high'); },
  apply() {
    const low = this.get() === 'low', dpr = window.devicePixelRatio || 1;
    renderer.setPixelRatio(low ? Math.min(dpr, 1) : Math.min(dpr, 1.75)); sun.castShadow = !low; resize();
  }
};

/* ---------- touch ---------- */
const Touch = {
  mode() { return Save.d.touch === 'on' ? true : Save.d.touch === 'off' ? false : this.auto; },
  auto: false, shown: false,
  setTouch(v) { if (Input.touch === v) return; Input.touch = v; document.body.classList.toggle('touch', v); if (v) unlockPointer(); if (v) Input.pad = false; if (!v) this.releaseAll(); },
  init() {
    const ui = Q('#ui'), d = document.createElement('div'); d.id = 'touch'; d.className = 'hide';
    d.innerHTML = `<div id="tz-move"></div><div id="tz-look"></div><div id="joy"><i></i></div>
<button class="tbn" id="tb-fire" data-k="fire">FIRE</button><button class="tbn" id="tb-jump" data-k="jump">JUMP</button><button class="tbn" id="tb-dash" data-k="dash">DASH</button><button class="tbn" id="tb-hook" data-k="hook">HOOK</button>
<button class="tbn hide" id="tb-secret" data-k="secret">SECRET</button><button class="tbn hide" id="tb-climb" data-k="climb">CLIMB</button>
<div id="tcorner"><button data-k="pause" aria-label="Pause">II</button><button data-k="view" aria-label="Switch view">POV</button><button data-k="fs" aria-label="Fullscreen">[ ]</button></div>`;
    ui.insertBefore(d, Q('#hud')); this.el = d;
    const rot = document.createElement('div'); rot.id = 'rot'; rot.innerHTML = '<div>Rotate your device<br><small>SKYBREAK plays in landscape</small></div>'; ui.appendChild(rot);
    this.auto = !!(window.matchMedia && matchMedia('(pointer:coarse)').matches && navigator.maxTouchPoints > 0);
    window.addEventListener('touchstart', () => this.setTouch(this.mode() === false ? false : true), { capture: true, passive: true });
    window.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') this.setTouch(this.mode() === false ? false : true); else if (e.pointerType === 'mouse') { if (Save.d.touch !== 'on') this.setTouch(false); Input.pad = false; } }, true);
    this.setTouch(this.mode());
    const joy = Q('#joy'), knob = Q('#joy i'), mv = Q('#tz-move'), lk = Q('#tz-look');
    /* Gesture adapter. Real Touch Events are the primary source on touch devices: some browsers/emulators
       report clientX/clientY = 0 on touch *pointer* events (the stick then jumped to the screen corner), while
       Touch Events always carry the right coordinates. Mouse/pen (and touch without Touch Events) use Pointer Events. */
    const hasTE = 'ontouchstart' in window;
    const bind = (el, h) => {
      if (hasTE) {
        el.addEventListener('touchstart', e => { e.preventDefault(); for (const t of e.changedTouches) h.down('t' + t.identifier, t.clientX, t.clientY); }, { passive: false });
        el.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) h.move('t' + t.identifier, t.clientX, t.clientY); }, { passive: false });
        const end = e => { for (const t of e.changedTouches) h.up('t' + t.identifier); };
        el.addEventListener('touchend', end); el.addEventListener('touchcancel', end);
      }
      const ok = e => !(e.pointerType === 'touch' && hasTE) && !(e.pointerType === 'touch' && !e.clientX && !e.clientY);
      el.addEventListener('pointerdown', e => { if (!ok(e)) return; e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (x) { } h.down('p' + e.pointerId, e.clientX, e.clientY); });
      el.addEventListener('pointermove', e => { if (!ok(e)) return; h.move('p' + e.pointerId, e.clientX, e.clientY); });
      for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(t, e => { if (!ok(e)) return; h.up('p' + e.pointerId); });
    };
    // floating joystick
    let mid = null, ox = 0, oy = 0; const R = 56;
    const upd = (x, y) => { const dx = x - ox, dy = y - oy, len = Math.hypot(dx, dy) || 1, k = Math.min(1, len / R); const dz = len < 7 ? 0 : 1; Input.ax = dx / len * k * dz; Input.ay = dy / len * k * dz; knob.style.transform = `translate(${dx / len * Math.min(len, R)}px,${dy / len * Math.min(len, R)}px)`; };
    const endMove = id => { if (id !== mid) return; mid = null; Input.ax = Input.ay = 0; joy.classList.remove('on'); joy.style.left = ''; joy.style.top = ''; knob.style.transform = ''; };
    bind(mv, {
      down: (id, x, y) => { if (mid !== null) return; mid = id; ox = x; oy = y; const r = this.el.getBoundingClientRect(); joy.style.left = (x - r.left) + 'px'; joy.style.top = (y - r.top) + 'px'; joy.classList.add('on'); upd(x, y); },
      move: (id, x, y) => { if (id === mid) upd(x, y); }, up: endMove
    });
    this.endMove = () => endMove(mid); this.dbg = () => [mid, ox, oy];
    // look
    let lid = null, lx = 0, ly = 0; const K = 1.6;
    bind(lk, {
      down: (id, x, y) => { if (lid !== null) return; lid = id; lx = x; ly = y; },
      move: (id, x, y) => { if (id !== lid) return; Input.dx += (x - lx) * K; Input.dy += (y - ly) * K; lx = x; ly = y; },
      up: id => { if (id === lid) lid = null; }
    });
    // buttons
    const A = {
      fire: [() => { Input.mouse.l = true; Input.mpress.l = true; }, () => { Input.mouse.l = false; }],
      jump: [() => { Input.keys.Space = true; Input.pressed.Space = true; }, () => { Input.keys.Space = false; }],
      dash: [() => { Input.pressed.ShiftLeft = true; }],
      hook: [() => { Input.pressed.KeyE = true; }],
      secret: [() => { Input.keys.KeyQ = true; Input.pressed.KeyQ = true; Input.mouse.r = true; }, () => { Input.keys.KeyQ = false; Input.mouse.r = false; }],
      climb: [() => { Input.pressed.KeyT = true; }],
      pause: [() => { if (Game.state === 'play') Game.pause(true); }],
      view: [() => { if (Game.state === 'play') toggleView(); }],
      fs: [() => UI.fs()]
    };
    this.release = {};
    d.querySelectorAll('[data-k]').forEach(b => {
      const k = b.dataset.k, a = A[k]; let pid = null, bx = 0, by = 0;
      bind(b, {
        down: (id, x, y) => { if (pid !== null) return; pid = id; bx = x; by = y; b.classList.add('down'); a[0](); Snd.init(); },
        move: (id, x, y) => { if (k === 'fire' && id === pid) { Input.dx += (x - bx) * K; Input.dy += (y - by) * K; bx = x; by = y; } },
        up: id => { if (id !== pid) return; pid = null; b.classList.remove('down'); if (a[1]) a[1](); }
      });
      this.release[k] = () => { if (pid !== null) { pid = null; b.classList.remove('down'); if (a[1]) a[1](); } };
    });
    d.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('gesturestart', e => e.preventDefault());
  },
  releaseAll() { if (this.release) for (const k in this.release) this.release[k](); if (this.endMove) this.endMove(); Input.ax = Input.ay = 0; },
  sync() {
    if (!this.el) return;
    const st = Game.state, on = Input.touch && (st === 'play' || st === 'intro') && !Game.paused;
    if (on !== this.shown) { this.shown = on; this.el.classList.toggle('hide', !on); if (!on) this.releaseAll(); }
    document.body.classList.toggle('playing', Input.touch && (st === 'play' || st === 'intro'));
    if (on) { Q('#tb-secret').classList.toggle('hide', !P.secret); Q('#tb-climb').classList.toggle('hide', !P.onFloor); }
  }
};

/* ---------- gamepad ---------- */
const Pad = {
  prev: [], navT: 0, focus: null, connected: false,
  clearFocus() { if (this.focus) this.focus.classList.remove('padf'); this.focus = null; },
  items() {
    return Array.from(document.querySelectorAll('#scr:not(.hide) [data-a], #scr:not(.hide) input[type=range], #ovl:not(.hide) [data-a]')).filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  },
  setFocus(el) {
    if (this.focus) this.focus.classList.remove('padf'); this.focus = el; if (!el) return; el.classList.add('padf');
    try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { }
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  },
  move(dx, dy) {
    const list = this.items(); if (!list.length) return;
    if (!this.focus || !document.contains(this.focus) || !list.includes(this.focus)) { this.setFocus(list.find(e => e.classList.contains('go')) || list[0]); return; }
    if (this.focus.type === 'range' && dx) { const r = this.focus, st = (+r.step || 1) * 2; r.value = clamp(+r.value + dx * st, +r.min, +r.max); r.dispatchEvent(new Event('input', { bubbles: true })); return; }
    const a = this.focus.getBoundingClientRect(), ax = a.x + a.width / 2, ay = a.y + a.height / 2; let best = null, bs = 1e9;
    for (const el of list) {
      if (el === this.focus) continue; const r = el.getBoundingClientRect(), cx = r.x + r.width / 2, cy = r.y + r.height / 2, vx = cx - ax, vy = cy - ay;
      const along = vx * dx + vy * dy, perp = Math.abs(vx * dy - vy * dx); if (along <= 4) continue;
      const sc = along + perp * 2.2; if (sc < bs) { bs = sc; best = el; }
    }
    if (best) this.setFocus(best);
  },
  poll(dt) {
    const gps = navigator.getGamepads ? navigator.getGamepads() : []; let gp = null; for (const g of gps) if (g && g.connected) { gp = g; break; }
    if (!gp) { this.connected = false; Input.px = Input.py = 0; if (this.focus) this.clearFocus(); return; }
    this.connected = true;
    const b = i => { const x = gp.buttons[i]; return !!x && (x.pressed || x.value > .5); }, dn = i => b(i) && !this.prev[i], up = i => !b(i) && this.prev[i];
    const dz = v => { v = v || 0; return Math.abs(v) < .18 ? 0 : (v - Math.sign(v) * .18) / .82; };
    const lx = dz(gp.axes[0]), ly = dz(gp.axes[1]), rx = dz(gp.axes[2]), ry = dz(gp.axes[3]);
    let any = lx || ly || rx || ry; for (let i = 0; i < gp.buttons.length; i++) if (b(i)) any = true;
    if (any) { if (!Input.pad) { Input.pad = true; Touch.setTouch(false); } Snd.init(); }
    const st = Game.state, play = (st === 'play' || st === 'intro') && !Game.paused;
    const ovlOpen = !UI.ovl.classList.contains('hide');
    const menuLike = st === 'menu' || Game.paused || (st === 'ended' && ovlOpen);
    if (menuLike) {
      Input.px = Input.py = 0;
      this.navT -= dt; let dx = 0, dy = 0;
      if (dn(12)) dy = -1; else if (dn(13)) dy = 1; else if (dn(14)) dx = -1; else if (dn(15)) dx = 1;
      else if (this.navT <= 0) { if (Math.abs(gp.axes[1]) > .6) dy = Math.sign(gp.axes[1]); else if (Math.abs(gp.axes[0]) > .6) dx = Math.sign(gp.axes[0]); if (dx || dy) this.navT = .22; }
      if (dx || dy) { this.move(dx, dy); if (dn(12) || dn(13) || dn(14) || dn(15)) this.navT = .3; }
      else if (!this.focus && (dn(0) || any)) this.move(0, 1);
      if (dn(0) && this.focus && document.contains(this.focus)) { const f = this.focus; if (f.type !== 'range') { f.click(); Snd.play('ui', .4); } }
      if (dn(1)) { const back = Q('#scr:not(.hide) .back .btn'); if (back) back.click(); else if (Game.paused) Game.pause(false); }
      if (dn(9) && Game.paused) Game.pause(false);
    } else {
      if (this.focus) this.clearFocus();
      if (play) {
        Input.px = lx; Input.py = ly;
        const curve = v => v * Math.abs(v) * 1.15 + v * .15;
        Input.dx += curve(rx) * 1150 * dt; Input.dy += curve(ry) * 800 * dt;
        const draft = Game.draftKeys && Game.draft;
        if (draft) { for (let i = 0; i < 4; i++) if (dn(i)) Game.pickDraft(i); if (dn(12)) Game.pickDraft(4); if (dn(13)) Game.pickDraft(5); }
        else {
          if (dn(0)) { Input.keys.Space = true; Input.pressed.Space = true; } if (up(0)) Input.keys.Space = false;
          if (dn(1)) Input.pressed.ShiftLeft = true;
          if (dn(2)) Input.pressed.KeyE = true;
          if (dn(3)) { Input.keys.KeyQ = true; Input.pressed.KeyQ = true; Input.mouse.r = true; } if (up(3)) { Input.keys.KeyQ = false; Input.mouse.r = false; }
          if (dn(12)) { Input.pressed.KeyT = true; }
        }
        const fire = b(7) || (gp.buttons[7] && gp.buttons[7].value > .4);
        if (fire && !this.prev[7]) { Input.mouse.l = true; Input.mpress.l = true; } if (!fire && this.prev[7]) Input.mouse.l = false;
        if (dn(5) || (!draft && dn(15))) selectSlot((P.sel + 1) % P.slots.length);
        if (dn(4) || (!draft && dn(14))) selectSlot((P.sel + P.slots.length - 1) % P.slots.length);
        if (dn(6)) Input.pressed.KeyT = true;
        if (dn(8) && st === 'play') toggleView();
        if (dn(9) && st === 'play') Game.pause(true);
      } else Input.px = Input.py = 0;
    }
    this.prev = gp.buttons.map((x, i) => (x.pressed || x.value > .5) || (i === 7 && x.value > .4));
  }
};
