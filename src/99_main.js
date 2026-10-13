/* =====================================================================
   SKYBREAK — boot + main loop
   ===================================================================== */
window.SBT = { buildIsland, camera, renderer, scene, applyTheme, Game, P, Save, UI, ITEMS, Input };
document.addEventListener('pointerlockerror', () => { Input.lockFailed = true; });
window.addEventListener('keydown', e => {
  if (e.repeat) return;
  if ((e.code === 'Escape' || e.code === 'KeyP') && Game.state === 'play' && !Game.paused) Game.pause(true);
});
function pollDraftKeys() {
  if (!Game.draftKeys || !Game.draft || Game.paused) return;
  for (let i = 0; i < 6; i++) if (Input.pressed['Digit' + (i + 1)]) Game.pickDraft(i);
}
let lastT = performance.now(), fpsAcc = 0, fpsN = 0;
window.stepGame = function (dt) { pollDraftKeys(); Game.frame(dt); UI.setEnded(Game.state === 'ended'); };
function loop(now) {
  requestAnimationFrame(loop);
  let dt = (now - lastT) / 1000; lastT = now; if (!(dt > 0)) dt = .016; dt = Math.min(dt, .05);
  try {
    if (!window.__manual) { pollDraftKeys(); Game.frame(dt); UI.setEnded(Game.state === 'ended'); }
  } catch (err) { const m = String(err && err.stack || err).slice(0, 400); if (window.__lastErr !== m) { window.__lastErr = m; console.error(m); } }
  renderer.render(scene, camera);
}
function boot() {
  UI.init();
  Game.showMenu('verdantia'); Game.menuKind = 'title';
  applyTheme('menu');
  requestAnimationFrame(loop);
}
boot();
