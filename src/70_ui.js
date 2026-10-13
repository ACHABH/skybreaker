/* =====================================================================
   SKYBREAK — menus, HUD, overlays
   ===================================================================== */
const Q = (s, r) => (r || document).querySelector(s);
const UI = {
  cfg: { island: 'verdantia', ranked: false, diff: 'normal' }, pend: null, cur: 'title', timers: {},
  init() {
    const ui = Q('#ui');
    ui.innerHTML = `
<div id="scr"></div>
<div id="hud" class="hide">
  <div id="race" class="pan"><div class="hd"><span id="rhd">ISLAND INTEGRITY</span><span id="rsub"></span></div>
    <div id="mine"><span class="big">100%</span><span class="lb">REMAINING</span></div>
    <div class="ibar"><i></i><u class="hide"></u></div><div id="gh" class="hide"></div><div id="sb" class="hide"></div><div id="rows"></div></div>
  <div id="timer" class="pan"><div class="t">0:00</div><div class="p"></div></div>
  <div id="chain"><div class="n">x0</div><div class="l">CHAIN REACTION</div></div>
  <div id="cross"></div>
  <div id="hotbar"></div>
  <div id="toasts"></div>
  <div id="banner"><h1></h1><p></p></div>
  <div id="count"></div><div id="hint"></div>
  <div id="draft" class="pan hide"><div class="hd"><span></span><small></small></div><div class="tb"><i></i></div><div class="dc"></div></div>
  <div id="sec"><div class="a"></div><div class="b"></div><div class="c"></div></div>
  <div id="secbar" class="pan hide"></div>
  <div id="flash"></div>
</div>
<div id="ovl" class="hide"></div>`;
    this.scr = Q('#scr'); this.hudEl = Q('#hud'); this.ovl = Q('#ovl');
    this.el = { mine: Q('#mine .big'), bar: Q('.ibar i'), goal: Q('.ibar u'), rows: Q('#rows'), rhd: Q('#rhd'), rsub: Q('#rsub'), gh: Q('#gh'), sb: Q('#sb'), race: Q('#race'), t: Q('#timer .t'), p: Q('#timer .p'), chain: Q('#chain'), cn: Q('#chain .n'), cl: Q('#chain .l'), hot: Q('#hotbar'), toasts: Q('#toasts'), ban: Q('#banner'), bh: Q('#banner h1'), bp: Q('#banner p'), count: Q('#count'), hint: Q('#hint'), draft: Q('#draft'), sec: Q('#sec'), secbar: Q('#secbar'), cross: Q('#cross') };
    ui.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b) { Snd.init(); UI.act(b.dataset.a, b.dataset.v, b); } });
    ui.addEventListener('mouseover', e => { const b = e.target.closest('[data-isl]'); if (b) UI.preview(b.dataset.isl); });
    ui.addEventListener('input', e => { const b = e.target; if (b.dataset.rng === 'sens') { Save.d.sens = Game.sens = +b.value; Save.save(); } if (b.dataset.rng === 'vol') { Save.d.vol = Snd.vol = +b.value; if (Snd.master) Snd.master.gain.value = Snd.vol; Save.save(); } });
    this.screen('title');
  },
  /* ---------- menu screens ---------- */
  preview(k) { if (!k || Game.menuKind === k || Game.state !== 'menu') return; clearTimeout(this.timers.pv); this.timers.pv = setTimeout(() => { if (Game.state === 'menu' && Game.menuKind !== k) Game.restartMenuScene(k); }, 140); },
  btn(a, label, small, cls, v) { return `<button class="btn ${cls || ''}" data-a="${a}"${v !== undefined ? ` data-v="${v}"` : ''}><span>${label}${small ? `<small>${small}</small>` : ''}</span></button>`; },
  islCards(sel, withRandom) {
    let h = '<div class="grid">';
    for (const k of ISLAND_ORDER) { const d = ISLES[k]; h += `<button class="card ${sel === k ? 'sel' : ''}" style="--c:${d.col}" data-a="isl" data-v="${k}" data-isl="${k}"><div class="ic">${d.icon}</div><h3>${d.name}</h3><div class="sb">${d.sub}</div><p>${d.desc}</p><div class="tg">${d.tags}</div></button>`; }
    if (withRandom) h += `<button class="card ${sel === 'random' ? 'sel' : ''}" style="--c:#ffd45a" data-a="isl" data-v="random"><div class="ic">🎲</div><h3>Random</h3><div class="sb">Surprise me</div><p>A random island is chosen for you.</p></button>`;
    return h + '</div>';
  },
  screen(name, arg) {
    this.cur = name; this.hideOvl(); this.scr.classList.remove('hide'); const S = Save.d; let h = '';
    const back = (to) => `<div class="back">${this.btn('go:' + to, '← Back', '', 'sm')}</div>`;
    if (name === 'title') {
      if (Game.menuKind !== 'title' && Game.state === 'menu') { /* keep the preview island */ }
      h = `<h1 class="logo">SKY<br>BREAK</h1><p class="tag"><b>Six floating islands. One goal:</b> break yours down to nothing before anybody else does. Smash, blast and collapse everything &mdash; chain reactions win matches.</p>
      <div class="menu">${this.btn('go:mp', 'Multiplayer Match', '6-player race · 8 minutes · vs AI rivals', 'go')}${this.btn('go:sp', 'Single Player', 'Solo Break · Campaign · Challenges · Endless')}${this.btn('go:locker', 'Locker', 'Cosmetics · ' + Save.total() + ' ★ earned')}${this.btn('go:controls', 'Controls')}${this.btn('go:settings', 'Settings')}</div>
      <p class="note">Best with keyboard + mouse. Click a mode to begin &mdash; your mouse will be captured, press Esc to pause.</p>`;
    } else if (name === 'mp') {
      const c = this.cfg;
      h = `<h2 class="sec">Multiplayer Match</h2><p class="sub">Six islands, six breakers, eight minutes. Reach 0% integrity first &mdash; or have the most destruction when time runs out. Item drops at 2:00, 4:00 and 6:00; the sky starts breaking at 7:00.</p>
      <div class="chips"><span class="lb">Mode</span><button class="chip ${!c.ranked ? 'on' : ''}" data-a="ranked" data-v="0">Casual · random rival islands</button><button class="chip ${c.ranked ? 'on' : ''}" data-a="ranked" data-v="1">Ranked · every island type</button></div>
      <div class="chips"><span class="lb">Rivals</span>${['rookie', 'normal', 'expert'].map(d => `<button class="chip ${c.diff === d ? 'on' : ''}" data-a="diff" data-v="${d}">${d.toUpperCase()}</button>`).join('')}</div>
      <div class="chips"><span class="lb">Your island</span></div>${this.islCards(c.island, true)}
      <div class="row" style="margin-top:16px">${this.btn('startmp', 'Start match', ISLES[c.island] ? ISLES[c.island].name : 'Random island', 'go')}</div>
      <p class="warnbox">Rivals in this build are AI bots playing on their own destructible islands &mdash; there is no online matchmaking.</p>${back('title')}`;
    } else if (name === 'sp') {
      h = `<h2 class="sec">Single Player</h2><p class="sub">Practise, progress and chase personal records. Progress only unlocks cosmetics &mdash; never power.</p>
      <div class="menu">${this.btn('pick:solo', 'Solo Break', '5 minutes · 3 item choices · ghost of your best run', 'go')}${this.btn('go:campaign', 'Campaign', '6 chapters · 3 boss islands · star ranking')}${this.btn('go:challenges', 'Challenges', '7 special rule sets')}${this.btn('pick:endless', 'Endless Island', 'Survive escalating waves')}${this.btn('pick:free', 'Free Break', 'Sandbox · unlimited items · no timer')}</div>${back('title')}`;
    } else if (name === 'pick') {
      const p = this.pend || { mode: 'solo' }; const titles = { solo: 'Solo Break', endless: 'Endless Island', free: 'Free Break', challenge: 'Challenge' };
      h = `<h2 class="sec">${titles[p.mode]}${p.challenge ? ' · ' + CHALLENGES.find(c => c.id === p.challenge).name : ''}</h2><p class="sub">Choose an island.</p>${this.islCards('', true)}${back(p.mode === 'challenge' ? 'challenges' : 'sp')}`;
    } else if (name === 'campaign') {
      h = `<h2 class="sec">Campaign</h2><p class="sub">Earn <b>★</b> for completing, for beating the target time, and for the special objective. Clear a mission to unlock the next. Stars: ${Save.total()} / ${MISSIONS.length * 3}</p><div class="mlist">`;
      MISSIONS.forEach((m, i) => {
        const un = Save.unlocked(i), st = S.stars[m.id] || 0, col = ISLES[m.island] ? ISLES[m.island].col : '#ff5d7a'; const b = S.best['campaign:' + m.id];
        h += `<button class="mis ${m.boss ? 'boss' : ''} ${un ? '' : 'lock'}" style="--c:${col}" data-a="mission" data-v="${i}"><div class="ch">${m.ch}</div><div><h4>${m.name}${m.boss ? ' ☠' : ''}</h4><p>${m.teach}</p><p>★ Under ${fmt(m.target)} &nbsp; ★ ${m.special}${b && b.time ? ' &nbsp;·&nbsp; best ' + fmtP(b.time) : ''}</p></div><div class="st">${un ? '★'.repeat(st) + '<span style="opacity:.3">' + '★'.repeat(3 - st) + '</span>' : '🔒'}</div></button>`;
      });
      h += `</div><div class="row" style="margin-top:14px">${this.btn('unlockall', S.unlockAll ? 'Lock progression again' : 'Unlock all missions', '', 'sm')}</div>${back('sp')}`;
    } else if (name === 'challenges') {
      h = `<h2 class="sec">Challenges</h2><p class="sub">Special rule sets. Scores are saved per island.</p><div class="grid">`;
      for (const c of CHALLENGES) { const best = Math.max(0, ...Object.entries(S.best).filter(([k]) => k.startsWith('challenge:' + c.id + ':')).map(([, v]) => v.score || 0)); h += `<button class="card" data-a="chal" data-v="${c.id}"><div class="ic">${c.icon}</div><h3>${c.name}</h3><p>${c.desc}</p><div class="tg">${fmt(c.time)} limit${best ? ' · best ' + best : ''}</div></button>`; }
      h += `</div>${back('sp')}`;
    } else if (name === 'locker') {
      const tot = Save.total(), sw = (list, key, col) => list.map(o => { const ok = Save.d.unlockAll || tot >= o.need, on = key === 'trail' ? S.cos.trail === o.id : S.cos[key] === o.id, c = key === 'trail' ? (o.col ? '#' + o.col.toString(16).padStart(6, '0') : '#222') : '#' + o.id.toString(16).padStart(6, '0'); return `<button class="sw ${on ? 'on' : ''} ${ok ? '' : 'lock'}" style="background:${c}" data-need="${o.need}★" title="${o.name}" data-a="cos" data-v="${key}:${o.id}">${o.name}</button>`; }).join('');
      h = `<h2 class="sec">Locker</h2><p class="sub">Cosmetics only &mdash; they never change gameplay. You have <b>${tot}</b> ★.</p>
      <div class="chips"><span class="lb">Body</span></div><div class="opt">${sw(BODIES, 'body')}</div><div class="chips" style="margin-top:16px"><span class="lb">Hat</span></div><div class="opt">${sw(HATS, 'hat')}</div><div class="chips" style="margin-top:16px"><span class="lb">Trail</span></div><div class="opt">${sw(TRAILS, 'trail')}</div>
      <div class="chips" style="margin-top:22px"><span class="lb">Records</span><span class="chip">Wins ${S.wins}</span><span class="chip">Matches ${S.plays}</span><span class="chip">Endless best ${S.endless || 0}</span></div>${back('title')}`;
    } else if (name === 'controls') {
      h = `<h2 class="sec">Controls</h2><div class="kv">
      <b>W A S D</b><span>Move</span><b>Mouse</b><span>Look &amp; aim (arrow keys also turn the camera)</span><b>Space</b><span>Jump (hold while falling to glide a little with Dash)</span><b>Left click</b><span>Use selected tool / item (hold for beams &amp; held items)</span>
      <b>1&ndash;9, 0 / Wheel / Tab</b><span>Select tool or item</span><b>Shift</b><span>Dash</span><b>E</b><span>Grappling hook (aim at any surface)</span><b>Q</b><span>Activate a Secret Power &mdash; some need Hold Q + Right click</span>
      <b>1&ndash;6</b><span>Claim an item during a drop (first come, first served in multiplayer)</span><b>R</b><span>Free Break: rebuild the island</span><b>Esc</b><span>Pause</span></div>
      <p class="sub" style="margin-top:16px">Tip: don't just hit things &mdash; cut the supports. Unsupported structures fall, heavy debris crushes what's below, and long chains win matches. Secret Powers hide inside item drops and last only 5 seconds.</p>${back('title')}`;
    } else if (name === 'settings') {
      h = `<h2 class="sec">Settings</h2><div class="set"><label>Mouse sensitivity</label><input type="range" min=".3" max="2.5" step=".05" value="${S.sens}" data-rng="sens"><label>Volume</label><input type="range" min="0" max="1" step=".05" value="${S.vol}" data-rng="vol"></div>
      <div class="row" style="margin-top:22px">${this.btn('reset', 'Reset all progress', 'Stars, records and ghosts', 'sm')}</div>${back('title')}`;
    }
    this.scr.innerHTML = h; this.scr.scrollTop = 0;
    if (Game.state === 'menu') { const want = name === 'mp' ? this.cfg.island : null; if (want && want !== 'random') this.preview(want); }
  },
  act(a, v, el) {
    const [k, arg] = a.split(':');
    if (k === 'go') { this.screen(arg); return; }
    if (k === 'ranked') { this.cfg.ranked = v === '1'; this.screen('mp'); return; }
    if (k === 'diff') { this.cfg.diff = v; this.screen('mp'); return; }
    if (k === 'isl') {
      if (this.cur === 'mp') { this.cfg.island = v; this.screen('mp'); return; }
      const p = this.pend; if (p) this.start(Object.assign({}, p, { island: v })); return;
    }
    if (k === 'startmp') { this.start({ mode: 'mp', island: this.cfg.island, ranked: this.cfg.ranked, diff: this.cfg.diff }); return; }
    if (k === 'pick') { this.pend = { mode: arg }; this.screen('pick'); return; }
    if (k === 'chal') { this.pend = { mode: 'challenge', challenge: v }; this.screen('pick'); return; }
    if (k === 'mission') { const i = +v; if (Save.unlocked(i)) this.start({ mode: 'campaign', mission: i, island: MISSIONS[i].island }); return; }
    if (k === 'unlockall') { Save.d.unlockAll = !Save.d.unlockAll; Save.save(); this.screen('campaign'); return; }
    if (k === 'cos') { const [key, id] = v.split(':'); const list = key === 'body' ? BODIES : key === 'hat' ? HATS : TRAILS; const o = list.find(x => String(x.id) === id); if (o && (Save.d.unlockAll || Save.total() >= o.need)) { Save.d.cos[key] = o.id; Save.save(); } this.screen('locker'); return; }
    if (k === 'reset') { if (el.dataset.sure) { try { localStorage.clear(); } catch (e) { } const cos = { body: 0x4aa8ff, hat: 0xffd45a, trail: 'none' }; Save.d = Object.assign(Save.d, { stars: {}, best: {}, wins: 0, plays: 0, cos, endless: 0, unlockAll: false }); Save.save(); this.screen('settings'); } else { el.dataset.sure = 1; el.querySelector('span').firstChild.textContent = 'Click again to confirm'; } return; }
    if (k === 'resume') { Game.pause(false); return; }
    if (k === 'restart') { this.start(Game.cfg); return; }
    if (k === 'menu') { this.quit(); return; }
    if (k === 'next') { const i = Game.cfg.mission + 1; this.start({ mode: 'campaign', mission: i, island: MISSIONS[i].island }); return; }
  },
  start(cfg) { this.cfg.island = cfg.island === undefined ? this.cfg.island : (cfg.mode === 'mp' ? cfg.island : this.cfg.island); Game.begin(Object.assign({}, cfg)); },
  quit() { this.hideOvl(); this.hudEl.classList.add('hide'); Game.showMenu('verdantia'); Game.menuKind = 'verdantia'; this.screen('title'); },
  startGame() {
    this.scr.classList.add('hide'); this.hideOvl(); this.hudEl.classList.remove('hide'); this.hudEl.classList.remove('ended');
    const e = this.el; e.chain.classList.remove('on'); e.toasts.innerHTML = ''; e.ban.classList.remove('on'); e.count.textContent = ''; this.hideDraft(); e.sec.classList.remove('on'); e.secbar.classList.add('hide');
    this.hotSig = ''; this.lastRace = ''; const mp = Game.cfg.mode === 'mp'; e.race.classList.remove('hide');
    e.rhd.textContent = mp ? 'RACE TO 0%' : 'ISLAND INTEGRITY'; e.rows.innerHTML = '';
    e.hint.textContent = Game.hint || ''; e.hint.style.opacity = 1;
    const g = Game.rules.goal; if (g && g < 100) { e.goal.classList.remove('hide'); e.goal.style.left = (100 - g) + '%'; } else e.goal.classList.add('hide');
  },
  /* ---------- HUD ---------- */
  hud(h) {
    const e = this.el, c = Game.cfg; if (!c) return;
    const integ = Math.max(0, h.integ), txt = integ < 10 ? integ.toFixed(1) : Math.round(integ);
    if (this.lastInteg !== txt) { e.mine.textContent = txt + '%'; this.lastInteg = txt; }
    e.bar.style.width = clamp(integ, 0, 100) + '%';
    const tt = fmt(h.label === 'TIME' ? Math.ceil(h.t) : Math.floor(h.t)); if (this.lastT !== tt) { e.t.textContent = tt; this.lastT = tt; e.t.classList.toggle('low', h.label === 'TIME' && h.t < 30 && h.t > 0); }
    const pt = h.phase || ''; if (this.lastP !== pt) { e.p.textContent = pt; this.lastP = pt; e.p.classList.toggle('hot', /FINAL/.test(pt)); }
    if (h.sub) { e.sb.classList.remove('hide'); e.sb.textContent = h.sub; } else e.sb.classList.add('hide');
    if (h.ghost !== undefined && h.ghost !== null && Game.ghost) { e.gh.classList.remove('hide'); const d = h.ghost; e.gh.textContent = 'GHOST ' + (d > .3 ? 'BEHIND you by ' + d.toFixed(1) + '%' : d < -.3 ? 'AHEAD by ' + (-d).toFixed(1) + '%' : 'level with you'); } else e.gh.classList.add('hide');
    if (h.race) {
      const sig = h.race.map(r => r.name + Math.round(r.integ)).join(','); if (sig !== this.lastRace) {
        this.lastRace = sig; e.rows.innerHTML = h.race.map(r => `<div class="rr ${r.me ? 'me' : ''}"><span>${r.name}</span><div class="bar" style="--cc:${r.col}"><i style="width:${clamp(r.integ, 0, 100)}%"></i></div><span class="pc">${Math.round(r.integ)}%</span></div>`).join('');
      }
    }
    // hint fade
    if (Game.t > 7 && e.hint.style.opacity !== '0') e.hint.style.opacity = 0;
    // crosshair
    e.cross.classList.toggle('hit', !!(P.aim && P.aim.hit));
    // hotbar
    const sig = P.slots.map(s => s.id + ':' + (s.uses === Infinity ? 'i' : Math.ceil(s.uses))).join('|') + '@' + P.sel;
    if (sig !== this.hotSig) {
      this.hotSig = sig;
      const keys = '1234567890-='.split('');
      e.hot.innerHTML = P.slots.map((s, i) => { const d = slotDef(s); return `<div class="slot ${i === P.sel ? 'sel' : ''}" style="${s.kit ? '' : 'border-color:' + (i === P.sel ? '' : d.col + '99')}"><span class="k">${keys[i] || ''}</span><span class="i">${d.icon}</span>${s.uses !== Infinity ? `<span class="u">${s.uses > 99 ? '∞' : Math.ceil(s.uses)}</span>` : ''}<span class="nm">${d.name}</span><span class="cd"></span></div>`; }).join('');
      this.cds = Array.from(e.hot.querySelectorAll('.cd'));
    }
    if (this.cds) P.slots.forEach((s, i) => { const el = this.cds[i]; if (!el) return; const f = clamp((s.cdEnd - Game.t) / (s.cdDur || 1), 0, 1); const v = f > 0 ? (f * 100).toFixed(0) + '%' : '0'; if (el._v !== v) { el.style.height = v; el._v = v; } });
    // secret bar
    const sc = P.secret;
    if (sc) { e.secbar.classList.remove('hide'); const left = sc.def.hold ? Math.max(0, sc.left) : Math.max(0, sc.expire - Game.t); const s = '★ ' + sc.def.name + ' — ' + (sc.def.hold ? 'HOLD Q + RIGHT CLICK' : 'PRESS Q') + '  ' + left.toFixed(1) + 's'; if (this._sb !== s) { e.secbar.textContent = s; this._sb = s; } } else e.secbar.classList.add('hide');
  },
  toast(text, kind) {
    const e = this.el; if (!e || !e.toasts) return; const last = e.toasts.lastElementChild; if (last && last.textContent === text && Date.now() - (last._t || 0) < 1500) return;
    const d = document.createElement('div'); d.className = 'toast ' + (kind || ''); d.textContent = text; d._t = Date.now(); e.toasts.appendChild(d);
    while (e.toasts.children.length > 4) e.toasts.firstChild.remove();
    setTimeout(() => d.remove(), 2800);
  },
  banner(title, sub, ms) {
    const e = this.el; if (!e || !e.ban) return; e.bh.textContent = title; e.bp.textContent = sub || ''; e.ban.classList.add('on'); clearTimeout(this.timers.ban); this.timers.ban = setTimeout(() => e.ban.classList.remove('on'), ms || 2200);
  },
  secretBanner(name, def) {
    const e = this.el; e.sec.querySelector('.a').textContent = '✦ SECRET POWER FOUND ✦'; e.sec.querySelector('.b').textContent = def.name; e.sec.querySelector('.c').textContent = def.text + (def.hold ? '' : '  (5 seconds)'); e.sec.classList.add('on'); clearTimeout(this.timers.sec); this.timers.sec = setTimeout(() => e.sec.classList.remove('on'), 3200);
  },
  chain(n) {
    const e = this.el; if (!e || !e.chain) return; if (n < 2) return; e.chain.classList.add('on'); e.cn.textContent = 'x' + n; e.cl.textContent = n >= 20 ? 'MEGA CHAIN!' : n >= 10 ? 'CHAIN REACTION!' : 'CHAIN'; e.cn.classList.remove('pop'); void e.cn.offsetWidth; e.cn.classList.add('pop'); clearTimeout(this.timers.ch); Snd.play('chain', .3);
  },
  chainEnd(n, lost) {
    const e = this.el; if (!e || !e.chain || n < 2) { if (e && e.chain) e.chain.classList.remove('on'); return; }
    e.cl.textContent = 'FINAL CHAIN' + (lost ? '  −' + Math.round(lost) + '%' : ''); clearTimeout(this.timers.ch); this.timers.ch = setTimeout(() => e.chain.classList.remove('on'), 1700);
  },
  countdown(text) {
    const e = this.el; if (!e || !e.count) return; if (e.count.textContent === text) return; e.count.textContent = text; if (text === 'GO!') { clearTimeout(this.timers.go); this.timers.go = setTimeout(() => { if (e.count.textContent === 'GO!') e.count.textContent = ''; }, 800); } else if (text) Snd.play('tick', .5);
  },
  /* ---------- draft ---------- */
  showDraft(d) {
    const e = this.el.draft; e.classList.remove('hide'); e.querySelector('.hd span').textContent = 'ITEM DROP #' + d.round; e.querySelector('.hd small').textContent = d.race ? 'FIRST COME, FIRST SERVED' : 'CHOOSE ONE';
    e.querySelector('.dc').innerHTML = d.items.map((id, i) => { const it = ITEMS[id]; return `<button class="it" style="--c:${it.col}" data-d="${i}"><span class="k">${i + 1}</span><div class="i">${it.icon}</div><div class="n">${it.name}</div><div class="d">${it.desc}</div></button>`; }).join('');
    e.querySelectorAll('.it').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); Game.pickDraft(+b.dataset.d); }));
    e.querySelector('.tb i').style.width = '100%';
  },
  updateDraft(d) {
    const e = this.el.draft; e.querySelectorAll('.it').forEach((b, i) => {
      const t = d.taken[d.items[i]]; b.classList.toggle('tk', !!t && !t.me); b.classList.toggle('me', !!t && t.me);
      let by = b.querySelector('.by'); if (t && !by) { by = document.createElement('div'); by.className = 'by'; b.appendChild(by); } if (t) by.textContent = t.me ? '✔ YOU' : t.by;
    });
    if (!d.race && d.picked) e.classList.add('picked');
  },
  draftTick(d, el) { const i = this.el.draft.querySelector('.tb i'); if (i) i.style.width = clamp(100 - el / d.dur * 100, 0, 100) + '%'; },
  hideDraft() { const e = this.el && this.el.draft; if (e) { e.classList.add('hide'); e.classList.remove('picked'); } },
  /* ---------- overlays ---------- */
  hideOvl() { this.ovl.classList.add('hide'); this.ovl.innerHTML = ''; },
  pause(on) {
    if (!on) { this.hideOvl(); return; }
    this.ovl.className = 'ovl'; this.ovl.innerHTML = `<div class="box" style="width:min(420px,100%)"><h1>PAUSED</h1><p class="rs">${Game.cfg && Game.cfg.mode === 'mp' ? 'The match keeps its clock stopped for you only in this offline build.' : 'Take a breath.'}</p><div class="menu" style="width:100%">${this.btn('resume', 'Resume', 'Click to recapture the mouse', 'go')}${this.btn('restart', 'Restart')}${this.btn('menu', 'Quit to menu')}</div></div>`;
  },
  showResults(r) {
    const stars = r.stars !== null && r.stars !== undefined ? `<div class="stars">${'★'.repeat(r.stars)}<span class="o">${'★'.repeat(3 - r.stars)}</span></div>` : '';
    const sr = (r.starRows || []).map(([t, ok]) => `<div class="chk ${ok ? 'y' : ''}">${t}</div>`).join('');
    const rows = `<div class="res">${r.rows.map(([a, b]) => `<span>${a}</span><span>${b}</span>`).join('')}</div>`;
    const tbl = r.table ? `<table class="tbl"><tr><th>#</th><th>BREAKER</th><th>ISLAND</th><th>DESTROYED</th><th>CHAIN</th></tr>${r.table.map(t => `<tr class="${t.me ? 'me' : ''} ${t.win ? 'w' : ''}"><td>${t.rank}</td><td>${t.name}</td><td>${t.kind}</td><td>${t.dmg}</td><td>${t.chain}</td></tr>`).join('')}</table>` : '';
    const aw = r.awards.length ? `<div class="aw">${r.awards.map(([t, who, d]) => `<div><em>${t}</em><b>${who}</b>${d}</div>`).join('')}</div>` : '';
    const nb = r.newBest.map(n => `<div class="nb">★ NEW RECORD — ${n}</div>`).join('');
    const c = Game.cfg, hasNext = c.mode === 'campaign' && r.win && c.mission + 1 < MISSIONS.length && Save.unlocked(c.mission + 1);
    this.ovl.className = 'ovl'; this.ovl.innerHTML = `<div class="box"><h1 class="${r.win ? 'win' : ''}">${r.title}</h1>${r.mname ? `<div class="rs" style="margin:0">${r.mname}</div>` : ''}<p class="rs">${r.reason || ''}</p>${stars}${sr}${nb}${tbl}${r.table ? `<div class="chips" style="margin:10px 0 0"><span class="lb">${r.rowsTitle === 'YOU' ? 'YOUR' : r.rowsTitle + "'S"} STATS</span></div>` : ''}${rows}${aw}
      <div class="acts">${hasNext ? this.btn('next', 'Next mission', '', 'go') : ''}${this.btn('restart', 'Play again', '', hasNext ? '' : 'go')}${this.btn('menu', 'Main menu')}</div></div>`;
    this.ovl.scrollTop = 0;
  },
  setEnded(on) { this.hudEl.classList.toggle('ended', on); }
};
window.UI = UI;
