/* ============================================================
   Homerow Trainer UI
   ============================================================ */
(function(){
const E = HomerowTrainerEngine;
const WORDS = window.HOMEROW_TRAINER_WORDS || [];
const SENTENCES = window.HOMEROW_TRAINER_SENTENCES || [];
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- storage ---------- */
const store = {
  get(k, d){ try { const v = localStorage.getItem('homerow-trainer.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v){ try { localStorage.setItem('homerow-trainer.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k){ try { localStorage.removeItem('homerow-trainer.' + k); } catch (e) {} }
};
const DEFAULT_SETTINGS = { passAcc: 95, targetWpm: 20, stopOnError: true, stageLen: 90, routePref: 'layers', modPref: 'auto',
  showFingers: true, showKeyboard: true, keyHighlight: 'bright', hints: 'fade', dailyGoal: 15, unlockAll: false, theme: 'system' };

/* ---------- theme ---------- */
function applyTheme(t){
  const el = document.documentElement;
  if (t === 'light' || t === 'dark') el.setAttribute('data-theme', t);
  else el.removeAttribute('data-theme');
}

// hints replaced the hintOnMiss checkbox in 0.8.0; carry a ticked box over as 'miss'.
function loadSettings(){
  const saved = store.get('settings', {});
  if (saved.hintOnMiss && !saved.hints) saved.hints = 'miss';
  delete saved.hintOnMiss;
  return Object.assign({}, DEFAULT_SETTINGS, saved);
}

const S = {
  layouts: store.get('layouts', {}),
  activeId: store.get('active', null),
  settings: loadSettings(),
  welcomed: store.get('welcomed', false),
  view: 'learn', layerView: 0, run: null, msg: null, confirmDel: null, renaming: null, updating: null, customText: '', presetSel: 0
};

function today(){ const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function freshStats(){ return { progress: {}, keys: {}, misfires: { shift: 0, mod: 0, alt: 0 }, sessions: [], daily: {}, pairs: {} }; }

/* ---------- layout loading ---------- */
// Saved layouts are save slots: the id belongs to the slot, not the file, so updating a slot with a
// newer export keeps its progress. Older slots used the file's uuid as their id and keep it.
function newLayoutId(){ return 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function saveLayouts(){ if (!store.set('layouts', S.layouts)) S.msg = { t: 'err', m: 'Saved, but this browser blocked storage, so the layout will not be remembered after you close the page.' }; }
function loadLayoutText(text, nameHint){
  S.msg = null;
  const L = E.buildLayout(text, { name: nameHint, id: newLayoutId() });
  S.layouts[L.id] = { name: L.title, keyboard: L.keyboard, uuid: L.uuid, text, savedAt: Date.now() };
  saveLayouts();
  activate(L.id);
  return L;
}
const KNOWN_KBD = ['glove80', 'go60'];
function updateLayoutText(id, text, nameHint){
  S.msg = null;
  const rec = S.layouts[id];
  const L = E.buildLayout(text, { name: nameHint, id });
  // Custom keyboards can't be told apart reliably, so only block a switch between two known ones.
  if (KNOWN_KBD.includes(rec.keyboard) && KNOWN_KBD.includes(L.keyboard) && rec.keyboard !== L.keyboard)
    throw new Error(`This is a ${KBD_NAME[L.keyboard]} layout, but ${rec.name} is for the ${KBD_NAME[rec.keyboard]}. Add it as a new layout instead.`);
  Object.assign(rec, { keyboard: L.keyboard, uuid: L.uuid, text, savedAt: Date.now() });
  delete rec.starter;
  saveLayouts();
  if (id === S.activeId) activate(id);
  return rec;
}
// Some presets (Glove80 QWERTY, the first-run default) have no uuid, so fall back to an unchanged copy of the file.
function layoutForPreset(p){
  const ids = Object.keys(S.layouts);
  if (p.uuid) return ids.find(id => ('uuid' in S.layouts[id] ? S.layouts[id].uuid : id) === String(p.uuid));
  const txt = JSON.stringify(p);
  return ids.find(id => S.layouts[id].text === txt);
}
function activate(id){
  const rec = S.layouts[id]; if (!rec) return;
  S.layout = E.buildLayout(rec.text, { name: rec.name, id });
  S.layout.title = rec.name || S.layout.title;
  S.activeId = id; store.set('active', S.activeId);
  S.stats = Object.assign(freshStats(), store.get('stats.' + S.activeId, {}));
  // Keys typed before 0.11.0 have no date; start their clock today rather than calling them all stale.
  const t = today(); Object.values(S.stats.keys).forEach(k => { if (!k.d) k.d = t; });
  S.layerView = 0;
  rebuild();
}
function rebuild(){
  S.C = E.buildCurriculum(S.layout, S.settings.routePref, S.settings.modPref);
  // Reviews used to be numbered by position; carry their progress over to the content-based ids.
  let moved = false;
  S.C.lessons.forEach(l => { const pr = S.stats.progress; if (l.legacyId && pr[l.legacyId]) { if (!pr[l.id]) pr[l.id] = pr[l.legacyId]; delete pr[l.legacyId]; moved = true; } });
  if (moved) saveStats();
}
function saveStats(){ store.set('stats.' + S.activeId, S.stats); }

/* ---------- derived ---------- */
function lessonProg(l){ return S.stats.progress[l.id] || null; }
function isDone(l){ const p = lessonProg(l); return !!(p && p.stars > 0); }
function isUnlocked(i){
  if (S.settings.unlockAll || i === 0) return true;
  const ls = S.C.lessons;
  return isDone(ls[i - 1]) || isDone(ls[i]);
}
function nextLessonIdx(){ const i = S.C.lessons.findIndex(l => !isDone(l)); return i < 0 ? S.C.lessons.length - 1 : i; }
function unlockedChars(){
  const set = new Set([' ']);
  S.C.lessons.forEach((l, i) => {
    if (l.kind !== 'learn') return;
    if (S.settings.unlockAll || isDone(l) || i <= nextLessonIdx()) l.items.forEach(c => set.add(c));
  });
  return set;
}
function overall(){
  const ss = S.stats.sessions.filter(s => s.wpm != null);
  const recent = ss.slice(-30);
  const avg = k => recent.length ? recent.reduce((a, s) => a + s[k], 0) / recent.length : null;
  const total = S.stats.sessions.reduce((a, s) => a + (s.secs || 0), 0);
  return { wpm: avg('wpm'), acc: avg('acc'), total, todaySecs: S.stats.daily[today()] || 0 };
}
// A key is a problem when it's missed more often than the pass mark allows, or is clearly slower than your other keys:
// half again the median of its kind, since shortcuts are slower than letters by nature. Misses rank first, worst first.
// Two misses at least, so one slip in six presses doesn't flag a key.
function problemKeys(limit){
  const ks = S.stats.keys, unlocked = unlockedChars(), maxEr = (100 - S.settings.passAcc) / 100;
  const rows = Object.keys(ks).filter(k => ks[k].n >= 6 && k !== ' ' && (k.length === 1 ? unlocked.has(k) : true)).map(k => {
    const s = ks[k]; return { k, er: s.err / s.n, err: s.err, lat: s.ln >= 6 ? s.lat / s.ln : 0, n: s.n };
  });
  const median = one => { const l = rows.filter(r => r.lat && (r.k.length === 1) === one).map(r => r.lat).sort((a, b) => a - b); return l.length >= 5 ? l[l.length >> 1] : Infinity; };
  const med = { true: median(true), false: median(false) };
  rows.forEach(r => { r.miss = r.err >= 2 && r.er > maxEr; r.slow = r.lat > 1.5 * med[r.k.length === 1]; });
  return rows.filter(r => r.miss || r.slow).sort((a, b) => b.miss - a.miss || (a.miss ? b.er - a.er : b.lat - a.lat)).slice(0, limit || 4);
}
// Letter pairs missed more often than their second letter is overall, weakest first. A miss counts against the pair
// it completes. Measuring against the letter keeps one weak key from flagging every pair it's in; Problem keys covers that.
function weakPairs(limit){
  const ps = S.stats.pairs, ks = S.stats.keys, unlocked = unlockedChars();
  const keyRate = c => { const k = ks[c]; return k && k.n ? k.err / k.n : 0; };
  return Object.keys(ps).filter(p => ps[p].n >= 8 && ps[p].err >= 2 && [...p].every(c => unlocked.has(c)))
    .map(p => ({ p, n: ps[p].n, er: ps[p].err / ps[p].n, keyEr: keyRate(p[1]), score: ps[p].err / (ps[p].n + 5) - keyRate(p[1]) }))
    .filter(x => x.score > 0.05).sort((a, b) => b.score - a.score).slice(0, limit || 6);
}
const weakPairIds = () => weakPairs().map(x => x.p);
// Unlocked keys you've typed plenty but not for a week or more, longest ago first. Drills bring these back (learning principle 7).
const STALE_DAYS = 7;
function staleKeys(limit){
  const ks = S.stats.keys, unlocked = unlockedChars(), now = Date.parse(today());
  return Object.keys(ks).filter(k => k.length === 1 && k !== ' ' && unlocked.has(k) && ks[k].n >= 10 && ks[k].d && (now - Date.parse(ks[k].d)) / 864e5 >= STALE_DAYS)
    .sort((a, b) => ks[a].d < ks[b].d ? -1 : ks[a].d > ks[b].d ? 1 : 0).slice(0, limit || 6);
}
function fmtTime(s){ s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`; }
function starsHtml(n, max){ let s = ''; for (let i = 0; i < (max || 3); i++) s += `<span class="${i < n ? 'on' : ''}">★</span>`; return `<span class="stars" role="img" aria-label="${n} of ${max || 3} stars">${s}</span>`; }
function kc(c, cls){ const lab = c.length > 1 ? E.keyItemLabel(E.keyItem(c)) : E.charName(c); return `<span class="kc ${cls || ''}">${esc(lab)}</span>`; }
function itemLabel(id){ return id.length > 1 ? E.keyItemLabel(E.keyItem(id)) : E.charName(id); }

/* ---------- keyboard SVG ---------- */
const U = 60;
function keyLabels(li, p){
  const k = S.layout.layers[li] && S.layout.layers[li][p];
  if (!k || k.none) return { main: '', sub: '' };
  let main = k.tap ? k.tap.label : (k.label || '');
  if (k.inherited) main = '';
  let sub = '';
  if (k.hold && k.hold.layer != null) sub = (S.layout.layerNames[k.hold.layer] || 'L' + k.hold.layer).slice(0, 3);
  else if (k.hold && k.hold.mod) sub = E.MOD_SYM[k.hold.mod];
  return { main, sub };
}
function kbSVG(li, hl){
  hl = hl || {};
  const geo = S.layout.geo, holds = new Set((hl.holds || []).map(h => h.pos));
  const W = geo.width * U, H = geo.height * U;
  let out = `<svg class="kb ${S.settings.showFingers ? 'fingers' : ''}" viewBox="-6 -6 ${W + 12} ${H + 12}" role="img" aria-label="${esc(S.layout.layerNames[li] || '')} layer of ${esc(geo.name)}${hl.label ? esc('. ' + hl.label) : ''}">`;
  for (const g of S.layout.keys) {
    const isT = hl.target === g.pos, isH = holds.has(g.pos), soft = hl.soft ? '-soft' : '';
    const lab = isH ? keyLabels(0, g.pos) : keyLabels(li, g.pos);
    const k = S.layout.layers[li][g.pos];
    const empty = !isT && !isH && (!k || k.none || k.inherited);
    const cls = ['k', 'f-' + g.finger, g.role === 'home' && !g.thumb ? 'home' : '', isT ? 'tgt' + soft : '', isH ? 'hold' + soft : '', empty ? 'empty' : ''].join(' ');
    const x = g.x * U, y = g.y * U, s = U - 6;
    const main = lab.main, fs = main.length <= 1 ? 22 : main.length <= 3 ? 15 : main.length <= 5 ? 11 : 9;
    out += `<g class="${isT ? 'tgtg' : ''} ${isH ? 'holdg' : ''} ${soft ? 'soft' : ''}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${g.r || 0} ${s / 2} ${s / 2})">`;
    out += `<rect class="${cls}" width="${s}" height="${s}" rx="9"/>`;
    if (main) out += `<text x="${s / 2}" y="${lab.sub ? s / 2 - 5 : s / 2}" font-size="${fs}">${esc(main)}</text>`;
    if (lab.sub) out += `<text class="sub" x="${s / 2}" y="${s - 10}" font-size="10">${esc(isH ? 'hold' : lab.sub)}</text>`;
    if (g.role === 'home' && g.finger === 'index' && !g.stretch) out += `<rect class="bump" x="${s / 2 - 7}" y="${s - 5}" width="14" height="2.5" rx="1"/>`;
    out += `</g>`;
  }
  return out + `</svg>`;
}
const legendHtml = (withState, soft) => `<div class="legend">${['pinky', 'ring', 'middle', 'index', 'thumb'].map(f => `<span><i style="background:var(--f-${f})"></i>${f[0].toUpperCase() + f.slice(1)}</span>`).join('')}${withState === false ? '' : soft
  ? `<span><i class="soft"></i>Press</span><span><i class="soft hold"></i>Hold</span>`
  : `<span><i style="background:var(--go)"></i>Press</span><span><i style="background:var(--accent)"></i>Hold</span>`}</div>`;

function fingerName(p){ const g = S.layout.keys[p]; return g ? `${g.hand === 'L' ? 'left' : 'right'} ${g.finger}` : ''; }
function hintFor(item){
  const r = E.routeFor(S.layout, S.C, item, S.settings.routePref);
  if (!r) return { r: null, html: '<span class="muted">This character is not on your layout. Type it however you can.</span>' };
  const parts = r.holds.map(h => {
    const lab = keyLabels(0, h.pos);
    const what = h.kind === 'layer' ? (S.layout.layerNames[h.layer] || 'layer') : E.MOD_NAME[h.mod];
    return `Hold <span class="kc">${esc(lab.main || '?')}</span> for ${esc(what)} <span class="muted">(${fingerName(h.pos)})</span>`;
  });
  const t = keyLabels(r.layer, r.pos);
  parts.push(`${r.holds.length ? 'then press' : 'Press'} <span class="kc">${esc(t.main || '?')}</span> <span class="muted">(${fingerName(r.pos)})</span>`);
  const layer = r.layer ? `<span class="layer">${esc(S.layout.layerNames[r.layer])}</span>` : '';
  return { r, html: layer + `<span>${parts.join(', ')}</span>` };
}

/* ---------- views ---------- */
// During a run the header drops its stats, so the only numbers on screen are the drill's own.
function header(inRun){
  const o = overall(), goal = S.settings.dailyGoal * 60, pct = Math.min(1, o.todaySecs / goal), C = 2 * Math.PI * 18;
  const L = S.layout;
  return `<header class="top"><div class="bar">
    <button class="brand" data-act="home" title="Back to lessons"><span class="brand-mark" aria-hidden="true">${[0,1,2,3,4,5,6,7,8].map(i => `<i class="${i >= 3 && i < 6 ? 'on' : ''}"></i>`).join('')}</span>Homerow Trainer</button>
    ${inRun ? '<div class="layout-chip">' : '<button class="layout-chip" data-view="layout" title="Change layout">'}<b>${esc(L.title)}</b><span>${esc(L.geo.name)} · ${L.layers.length} layers</span>${inRun ? '</div>' : '</button>'}
    ${inRun ? '' : `<div class="stats">
      <div class="stat"><small>Avg accuracy</small><b>${o.acc == null ? '–' : Math.round(o.acc)}<em>%</em></b></div>
      <div class="stat"><small>Avg speed</small><b>${o.wpm == null ? '–' : Math.round(o.wpm)}<em>wpm</em></b></div>
      <div class="stat"><small>Typing time</small><b>${fmtTime(o.total)}</b></div>
      <div class="goal${pct >= 1 ? ' met' : ''}"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="ring-bg" cx="22" cy="22" r="18"/><circle class="ring" cx="22" cy="22" r="18" stroke-dasharray="${(C * pct).toFixed(1)} ${C.toFixed(1)}"/></svg>
        <div class="stat"><small>Daily goal</small><b>${fmtTime(o.todaySecs)}<em>/ ${S.settings.dailyGoal}:00</em></b></div></div>
    </div>`}
    <button class="btn ghost fb-open" data-act="feedback" data-fbtype="bug" title="Report a bug" aria-label="Report a bug"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="8" width="10" height="13" rx="5"/><path d="M9 8V7a3 3 0 0 1 6 0v1M12 12v9M7 12.5H3m14 0h4M7 17H4m13 0h3M7.6 9.6 5 7m11.4 2.6L19 7"/></svg><span>Report a bug</span></button></div></header>`;
}
function sidebar(){
  const nav = [['learn', 'Lessons'], ['practice', 'Practice'], ['layout', 'Layout'], ['settings', 'Settings']];
  const pk = problemKeys(4);
  let units = '';
  if (S.view === 'learn') units = `<div class="units"><h4>Units</h4><div class="unitlinks">${S.C.units.map(u => {
    const d = u.lessons.filter(isDone).length;
    return `<a href="#u-${u.id}" data-jump="u-${u.id}">${esc(u.title)}<span>${d}/${u.lessons.length}</span></a>`; }).join('')}</div></div>`;
  // The problem-keys card belongs with the lessons; Practice has its own panel and Layout/Settings are unrelated.
  const probCard = S.view === 'learn'
    ? `<div class="card"><h4>Your problem keys</h4>${pk.length ? `<div class="probkeys">${pk.map(r => kc(r.k, 'warn')).join('')}</div><button class="btn" data-act="practice-problem">Practice these</button>` : `<p class="muted" style="margin:0;font-size:14px">Type a few lessons and the keys you miss or hesitate on show up here.</p>`}</div>`
    : '';
  return `<aside class="side">
    <nav class="nav">${nav.map(([v, t], i) => `<button class="${S.view === v ? 'on' : ''}" data-view="${v}" aria-keyshortcuts="${i + 1}">${t}<span class="kbd" aria-hidden="true">${i + 1}</span></button>`).join('')}</nav>
    ${units}
    ${probCard}
  </aside>`;
}

// First run seeds a starter layout; say so until the user keeps it, loads their own or starts typing on it.
function welcomeCard(){
  const rec = S.layouts[S.activeId];
  if (S.welcomed || !rec || !rec.starter || Object.keys(S.stats.progress).length) return '';
  return `<section class="card welcome" aria-labelledby="welcomeHead"><h3 id="welcomeHead">You're practising ${esc(S.layout.title)} on a ${esc(S.layout.geo.name)}</h3>
    <p>It's a starter layout so you can try the course. Pick another from the Starter layouts or load your own from MoErgo's Layout Editor or your ZMK config, and the lessons rebuild around your keys.</p>
    <p class="muted">Each lesson is a few short drills: meet the new keys, then type them in words and sentences. You move on at ${S.settings.passAcc}% accuracy, and speed only earns extra stars.</p>
    <div class="actions"><button class="btn" data-view="layout">Choose a layout</button><button class="linkbtn" data-act="welcome-ok">Keep this one</button></div></section>`;
}
// The new keys across some lessons, as small chips: previews for units and the locked tail of a unit.
function keyPreview(lessons, max){
  const ks = [...new Set(lessons.filter(l => l.kind !== 'review').flatMap(l => l.items).filter(c => c !== ' '))];
  return `<span class="kpreview">${ks.slice(0, max).map(c => kc(c)).join('')}${ks.length > max ? '<span aria-hidden="true">…</span>' : ''}</span>`;
}
function learnView(){
  const ls = S.C.lessons, done = ls.filter(isDone).length, nxt = nextLessonIdx();
  const nl = ls[nxt];
  // Once today's goal is met, stopping is the default: the hero says so and Keep going loses its amber.
  const rest = done < ls.length && goalMet();
  const head = done === ls.length ? 'Every lesson complete' : rest ? 'Done for today' : 'Next: ' + esc(nl.title);
  const sub = rest ? `That's your ${S.settings.dailyGoal}-minute goal. A good place to stop and rest your hands. Next time: ${esc(nl.title)}.`
    : `${done} of ${ls.length} lessons done on ${esc(S.layout.title)}`;
  let html = (S.msg ? `<div class="msg ${S.msg.t}" role="status">${esc(S.msg.m)}</div>` : '') + whatsNew() + welcomeCard() + `<section class="hero${rest ? ' rest' : ''}"><div><h2>${head}</h2>
    <p>${sub}</p></div>
    <div class="progress" aria-hidden="true"><i style="width:${(done / ls.length * 100).toFixed(1)}%"></i></div>
    <button class="btn${rest ? '' : ' go'}" data-start="${nxt}"><span class="tri"></span>${rest ? 'Keep going' : done || resumeStage(nl) ? 'Continue' : 'Start'}</button></section>
    <p class="muted keyhint"><span class="kc">↑</span><span class="kc">↓</span> move between lessons · <span class="kc">Enter</span> starts · <span class="kc">1</span>–<span class="kc">4</span> switch tabs · <span class="kc">Esc</span> pauses a lesson</p>`;
  S.C.units.forEach(u => {
    const d = u.lessons.filter(isDone).length;
    const containsNext = u.lessons.includes(ls[nxt]);
    // Keep the page short: open only the current unit and any that are part-done; collapse finished and not-yet-reached ones.
    const open = containsNext || (d > 0 && d < u.lessons.length), all = d === u.lessons.length;
    // A finished unit says so in green; one not reached yet previews its keys instead of a bare "0 of 8".
    const status = all ? `<span class="udone">✓ All ${d} done</span>` : `${!d && !containsNext ? keyPreview(u.lessons, 8) : ''}<span>${d} of ${u.lessons.length} done</span>`;
    html += `<details class="unit" id="u-${u.id}"${open ? ' open' : ''}><summary aria-label="${esc(u.title)}. ${esc(u.blurb)} ${d} of ${u.lessons.length} done"><div class="uhead"><div><h3>${esc(u.title)}</h3><p>${esc(u.blurb)}</p></div><div class="uright">${status}<span class="chev" aria-hidden="true"></span></div></div></summary><div class="lessons">`;
    // Lessons not unlocked yet fold into one line at the end, so a fresh course isn't a wall of locked rows.
    const locked = u.lessons.filter(l => !isUnlocked(ls.indexOf(l)));
    u.lessons.filter(l => !locked.includes(l)).forEach(l => {
      const i = ls.indexOf(l), p = lessonProg(l), isNext = i === nxt;
      const verb = isDone(l) ? 'Redo' : resumeStage(l) ? 'Continue' : 'Start';
      const segN = (p && p.stageCount) || (l.kind === 'review' ? 6 : l.kind === 'learn' ? 8 : 4);
      const segDone = p ? (p.stars > 0 ? segN : (p.stagesDone || 0)) : 0;
      const keys = l.kind === 'review' ? '' : l.items.filter(c => c !== ' ' || l.items.length === 1).map(c => kc(c)).join('') + (l.items.includes(' ') ? kc(' ') : '');
      const title = l.kind === 'review' || l.title.startsWith('Capitals') || l.kind === 'keys' || l.kind === 'chords' ? esc(l.title) : '';
      html += `<div class="lesson ${isDone(l) ? 'done' : ''} ${isNext ? 'next' : ''}">
        <div class="num">${isDone(l) ? '✓' : l.num}</div>
        <div class="ttl"><b>${title}${title && keys ? ' ' : ''}${l.kind === 'review' ? '' : (title ? '' : keys)}</b>
          <div class="meta">${l.kind === 'review' ? '<span class="badge">Review</span>' : ''}${(l.kind === 'keys' || l.kind === 'chords') ? keys : ''}<span class="segs" role="img" aria-label="${segDone} of ${segN} stages done">${Array.from({ length: segN }, (_, k) => `<i class="${k < segDone ? 'on' : ''}"></i>`).join('')}</span>${p && p.stars ? starsHtml(p.stars) : ''}</div></div>
        <div class="act"><button class="btn ghost" data-start="${i}" aria-label="${verb} lesson ${l.num}: ${esc(l.title)}"><span class="tri"></span>${verb}</button></div>
      </div>`;
    });
    if (locked.length) html += `<div class="lesson locked more"><div class="ttl"><b>${locked.length} more ${locked.length === 1 ? 'lesson' : 'lessons'}</b>${keyPreview(locked, 12)}</div><div class="act"><span class="locked-tag">Locked</span></div></div>`;
    html += `</div></details>`;
  });
  return html;
}

// A weak pair as two keycaps, so "th" doesn't read as one key.
const pairKc = p => `<span class="kpair">${kc(p[0])}${kc(p[1])}</span>`;
// A heading's count, worded for screen readers and in tabular figures for everyone else.
const countHtml = n => n ? ` <span class="count" aria-hidden="true">${n}</span><span class="sr-only">(${n} listed)</span>` : '';
// One session to do now and why. Keys you've stopped typing fade first, then pairs, then single keys (learning
// principles 7, 5 and 6). Once today's goal is met it suggests resting instead, like Lessons (principle 3).
function suggestion(){
  if (goalMet()) return { rest: true };
  const stale = staleKeys(), wp = weakPairs(3), pk = problemKeys(4);
  if (stale.length) return { act: 'practice-stale', btn: 'Bring them back',
    why: `You haven't typed ${stale.map(c => kc(c)).join(' ')} in a week. Two short stages of words and sentences bring them back.` };
  if (wp.length) return { act: 'practice-pairs', btn: 'Practice weak pairs',
    why: `You miss ${wp.map(x => pairKc(x.p)).join(' ')} more often than their second letter on its own. Two short stages of common combos and sentences work on them.` };
  if (pk.length) return { act: 'practice-problem', btn: 'Practice problem keys',
    why: `You miss or hesitate on ${pk.map(r => kc(r.k, 'warn')).join(' ')} more than your other keys. A short focus drill, then words and sentences that use them.` };
  return { act: 'practice-free', btn: 'Start free practice', why: Object.keys(S.stats.keys).length
    ? 'Nothing needs extra work right now. Free practice mixes words and sentences from every key you have unlocked.'
    : 'Once you have typed a few lessons, this suggests what to work on. For now, free practice mixes words from the keys you have unlocked.' };
}
function suggestCard(){
  const sg = suggestion();
  if (sg.rest) return `<section class="card suggest rest" aria-labelledby="sgHead"><div><h3 id="sgHead">Done for today</h3>
    <p>That's your ${S.settings.dailyGoal}-minute goal. A good place to stop and rest your hands.</p></div></section>`;
  return `<section class="card suggest" aria-labelledby="sgHead"><div><h3 id="sgHead">Suggested now</h3><p>${sg.why}</p></div>
    <button class="btn go" data-act="${sg.act}"><span class="tri"></span>${sg.btn}</button></section>`;
}
// Pasted prose brings typographic quotes and dashes that no keymap has; drill them as the ASCII keys you'd type.
const TYPO = { '‘': "'", '’': "'", '“': '"', '”': '"', '–': '-', '—': '-', '…': '...' };
const cleanText = s => (s || '').replace(/[‘’“”–—…]/g, c => TYPO[c]).replace(/\s+/g, ' ').trim();
// Characters in your own text that have no hint (not on the layout), that lessons haven't reached, or that no key
// event can produce (emoji and the like), which would stall the drill.
function textCheck(t){
  const unlocked = unlockedChars(), off = new Set(), locked = new Set(), bad = new Set();
  for (const c of t) { if (c === ' ') continue; if (c.length > 1) bad.add(c); else if (!S.C.routes.chars[c]) off.add(c); else if (!unlocked.has(c)) locked.add(c); }
  return { off: [...off], locked: [...locked], bad: [...bad] };
}
function customNote(empty){
  const t = cleanText(S.customText), { off, locked, bad } = textCheck(t);
  const list = (a, cls) => a.slice(0, 12).map(c => `<span class="kc ${cls || ''}">${esc(E.charName(c))}</span>`).join(' ') + (a.length > 12 ? ` and ${a.length - 12} more` : '');
  return (empty && !t ? `<p class="msg err">There's no text to type yet. Paste or write some above, then press Type this text.</p>` : '')
    + (bad.length ? `<p class="msg err">${list(bad)} can't be typed in a drill. Take ${bad.length === 1 ? 'it' : 'them'} out to start.</p>` : '')
    + (off.length ? `<p class="muted">Not on your layout, so there's no hint for ${list(off, 'warn')}</p>` : '')
    + (locked.length ? `<p class="muted">Your lessons haven't reached ${list(locked)} yet. The hint shows where they are.</p>` : '');
}
function paintCustomNote(empty){ const el = $('#customCheck'), h = customNote(empty); if (el && el._h !== h) { el.innerHTML = h; el._h = h; } }
function practiceView(){
  const pk = problemKeys(20), wp = weakPairs(), stale = staleKeys(), drills = pk.slice(0, 4);
  const misf = S.stats.misfires, pass = S.settings.passAcc;
  // Left column = things you start; right column = how you're doing. Problem keys can grow longest (its table
  // scrolls past 320px); the misfires card, often empty, sits at the very bottom.
  const freeCard = `<div class="card field pcard"><h3>Free practice</h3>
      <p class="muted">Words and sentences from all your unlocked keys.</p>
      ${stale.length ? `<p class="newkeys">Starts with keys you haven't typed in a week ${stale.map(c => kc(c)).join('')}</p>` : ''}
      <div class="actions"><button class="btn" data-act="practice-free"><span class="tri"></span>Start free practice</button></div></div>`;
  const textCard = `<div class="card field pcard"><h3>Your own text</h3>
      <label for="customText" class="muted">Paste code, notes or anything you type often. It can use any key, unlocked or not.</label>
      <textarea id="customText" placeholder="e.g. const total = items.reduce((a, b) => a + b, 0);">${esc(S.customText)}</textarea>
      <div id="customCheck" class="ccheck" role="status">${customNote(false)}</div>
      <div class="actions"><button class="btn" data-act="practice-custom"><span class="tri"></span>Type this text</button></div></div>`;
  const pkCard = `<div class="card field pcard"><h3 id="pkHead">Problem keys${countHtml(pk.length)}</h3>
      ${pk.length ? `<div class="ptable-scroll"><table class="ptable" aria-labelledby="pkHead"><thead><tr><th>Key</th><th>Miss rate</th><th>Avg time</th><th>Typed</th></tr></thead><tbody>${pk.map(r => `<tr><td>${kc(r.k)}</td><td class="${r.miss ? 'flag' : ''}">${(r.er * 100).toFixed(0)}%</td><td class="${r.slow ? 'flag' : ''}">${r.lat ? Math.round(r.lat) + ' ms' : '–'}</td><td>${r.n}</td></tr>`).join('')}</tbody></table></div>
      <p class="muted note">Listed when a key is missed on more than ${100 - pass}% of presses (your pass mark is ${pass}%), or takes half again as long as your typical key. The bold number is why.</p>
      <div class="actions"><button class="btn" data-act="practice-problem"><span class="tri"></span>Practice problem keys</button><span class="newkeys">Drills ${drills.map(r => kc(r.k, 'warn')).join('')}</span></div>`
      : `<p class="muted">No problem keys right now. A key shows up here once it's missed on more than ${100 - pass}% of presses, above your ${pass}% pass mark, or is clearly slower than your other keys.</p>`}
    </div>`;
  // "Letter alone" is the second letter's miss rate everywhere, which is what makes the pair count as weak.
  const pairCard = `<div class="card field pcard"><h3 id="wpHead">Weak letter pairs${countHtml(wp.length)}</h3>
      ${wp.length ? `<table class="ptable" aria-labelledby="wpHead"><thead><tr><th>Pair</th><th>Miss rate</th><th>Letter alone</th><th>Typed</th></tr></thead><tbody>${wp.map(x => `<tr><td>${pairKc(x.p)}</td><td>${(x.er * 100).toFixed(0)}%</td><td>${(x.keyEr * 100).toFixed(0)}%</td><td>${x.n}</td></tr>`).join('')}</tbody></table>
      <p class="muted note">Common combos in free practice and reviews drill these more often.</p>
      <div class="actions"><button class="btn" data-act="practice-pairs"><span class="tri"></span>Practice weak pairs</button></div>`
      : `<p class="muted">No weak pairs yet. Pairs you miss more often than their second letter on its own show up here, and Common combos drills them more often.</p>`}
    </div>`;
  const mf = [['Accidental Shift', misf.shift], ['Accidental ⌘ or ⌃', misf.mod], ['Accidental ⌥', misf.alt]];
  const misfCard = `<div class="card field pcard"><h3 id="mfHead">Home-row mod misfires</h3>
      ${mf.some(x => x[1]) ? `<p class="muted">Counts each modifier that fires while you meant to type a letter.</p>
      <table class="ptable" aria-labelledby="mfHead"><tbody>${mf.map(([t, n]) => `<tr><th scope="row">${t}</th><td>${n || 0}</td></tr>`).join('')}</tbody></table>
      <p class="muted note">If one keeps climbing, type that finger's key a little more crisply or raise its tapping term.</p>`
      : `<p class="muted">No misfires yet. When Shift, ⌘, ⌃ or ⌥ fires while you meant to type a letter, it's counted here.</p>`}
    </div>`;
  return `<div class="section-title"><h2>Practice</h2></div>
  ${suggestCard()}
  <div class="pcols">
    <div class="pcol">${freeCard}${textCard}</div>
    <div class="pcol">${pairCard}${pkCard}${misfCard}</div>
  </div>`;
}

const KBD_NAME = { go60: 'Go60', glove80: 'Glove80' };
function presetsCard(){
  const presets = window.HOMEROW_TRAINER_PRESETS || [];
  if (!presets.length) return '';
  const groups = {};
  presets.forEach((p, i) => { (groups[p.keyboard] = groups[p.keyboard] || []).push(i); });
  const sel = +S.presetSel >= 0 && +S.presetSel < presets.length ? +S.presetSel : 0;
  const opt = i => { const p = presets[i], added = layoutForPreset(p);
    return `<option value="${i}" ${i === sel ? 'selected' : ''}>${esc(p.title || 'Layout')}${added ? ' ✓' : ''}</option>`; };
  const order = ['go60', 'glove80'];
  const keys = Object.keys(groups).sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
  const optgroups = keys.map(k =>
    `<optgroup label="${esc(KBD_NAME[k] || k)}">${groups[k].map(opt).join('')}</optgroup>`).join('');
  const curId = presets[sel] && layoutForPreset(presets[sel]);
  const btn = curId && curId === S.activeId ? '<span class="badge" style="align-self:center">In use</span>'
    : curId ? `<button class="btn primary" data-use="${esc(curId)}">Switch to it</button>`
    : `<button class="btn primary" data-act="add-selected">Add to my layouts</button>`;
  return `<div class="card field"><h3 style="font-size:19px">Starter layouts</h3>
    <small>Official MoErgo layouts from the Go60 and Glove80 editors (✓ = already added). Adding one switches to it; your current layout stays saved, and you can remove it below.</small>
    <div style="display:flex;gap:10px;margin-top:12px;align-items:stretch;flex-wrap:wrap">
      <div style="flex:1;min-width:240px"><select id="presetSel" aria-label="Choose a starter layout">${optgroups}</select></div>
      ${btn}
    </div></div>`;
}

function layoutView(){
  const L = S.layout;
  const tabs = L.layerNames.map((n, i) => `<button class="${S.layerView === i ? 'on' : ''}" data-layer="${i}">${esc(n)}</button>`).join('');
  const chars = Object.keys(S.C.routes.chars).filter(c => c !== ' ').sort();
  const onlyOne = Object.keys(S.layouts).length <= 1;
  const saved = Object.entries(S.layouts).map(([id, r]) => S.renaming === id
    ? `<div class="row ${id === S.activeId ? 'on' : ''}"><input type="text" id="renameInput" maxlength="80" value="${esc(r.name)}" aria-label="Layout name" style="flex:1;min-width:180px">
    <div style="display:flex;gap:8px"><button class="btn primary" data-act="rename-save">Save</button><button class="btn ghost" data-act="rename-cancel">Cancel</button></div></div>`
    : `<div class="row ${id === S.activeId ? 'on' : ''}"><div><b>${esc(r.name)}</b><div class="muted" style="font-size:13px">${esc(KBD_NAME[r.keyboard] || r.keyboard || 'keyboard')} · updated ${new Date(r.savedAt).toLocaleDateString()}</div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${id === S.activeId ? '<span class="badge">In use</span>' : `<button class="btn" data-use="${esc(id)}">Use</button>`}
    <button class="btn ghost" data-rename="${esc(id)}">Rename</button>
    <button class="btn ghost" data-update="${esc(id)}" title="Replace this layout's file with a newer export and keep its progress">Update</button>
    <button class="btn ghost danger" data-del="${esc(id)}"${onlyOne ? ' disabled title="Keep at least one layout. Add another before removing this one."' : ''}>${S.confirmDel === id ? 'Confirm remove' : 'Remove'}</button></div></div>`).join('');
  return `<div class="section-title"><h2>${esc(L.title)}</h2><span class="muted">${esc(L.geo.name)} · ${L.n} keys · ${L.format === 'moergo' ? 'MoErgo layout' : 'ZMK keymap'}</span></div>
  <div class="tabs">${tabs}</div>
  <div class="kbwrap">${kbSVG(S.layerView, {})}${legendHtml(false)}</div>
  ${L.geo.name.includes('grid') ? '<p class="msg ok">This keyboard has no built-in shape, so keys are drawn as a plain grid. Lessons still follow your keymap.</p>' : ''}
  <div class="card"><h3 style="font-size:19px">Characters you can type <span class="muted" style="font-size:14px;font-weight:400">${chars.length}</span></h3>
    <div class="charmap" style="margin-top:10px">${chars.map(c => kc(c)).join('')}</div></div>
  ${presetsCard()}
  <div class="grid2">
    <div class="card field"><h3 style="font-size:19px">Load a layout</h3>
      <small>MoErgo Layout Editor export (.json) for Go60 or Glove80, or a ZMK .keymap file. Layouts are saved in this browser.</small>
      <input type="file" id="layoutFile" accept=".json,.keymap,.dtsi,.txt">
      <label for="layoutPaste">Or paste the file contents</label>
      <textarea id="layoutPaste" placeholder='{"keyboard":"go60","layers":[…]}'></textarea>
      <div class="actions"><button class="btn primary" data-act="load-paste">Load pasted layout</button></div>
      ${S.msg ? `<div class="msg ${S.msg.t}">${esc(S.msg.m)}</div>` : ''}
    </div>
    <div class="card"><h3 style="font-size:19px">Saved layouts</h3><div class="saved" style="margin-top:10px">${saved}</div>
      <input type="file" id="updateFile" accept=".json,.keymap,.dtsi,.txt" hidden>
      <p class="muted" style="font-size:13px">Each layout keeps its own progress and key stats, like a save file. Update one with a newer export to keep its progress: lessons are rebuilt from the new keymap, and any lesson that still covers the same keys keeps its stars.</p></div>
  </div>`;
}

function settingsView(){
  const s = S.settings;
  const sel = (id, opts, v) => `<select id="${id}">${opts.map(([val, t]) => `<option value="${val}" ${String(v) === String(val) ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
  return `<div class="section-title"><h2>Settings</h2></div>
  <div class="grid2">
    <div class="card field"><h3 style="font-size:19px">Key routing</h3>
      <label for="routePref">Numbers &amp; symbols</label>
      ${sel('routePref', [['layers', 'Thumb layers (Miryoku style)'], ['reach', 'Number row and reach keys']], s.routePref)}
      <small>Changes where lessons send you for digits, brackets and punctuation when your layout has both.</small>
      ${S.C.routes.bothModKinds ? `<label for="modPref">Shift and other modifiers</label>
      ${sel('modPref', [['auto', 'Easiest to reach'], ['dedicated', 'Dedicated modifier keys'], ['homerow', 'Home row mods']], s.modPref)}
      <small>Your layout has both, so pick which ones lessons tell you to hold.</small>` : ''}</div>
    <div class="card field"><h3 style="font-size:19px">Scoring</h3>
      <label for="passAcc">Accuracy needed to pass</label>
      ${sel('passAcc', [[90, '90%'], [95, '95%'], [97, '97%'], [98, '98%']], s.passAcc)}
      <label for="targetWpm">Speed for the second star (wpm)</label>
      <input type="number" id="targetWpm" min="5" max="150" value="${s.targetWpm}"></div>
    <div class="card field"><h3 style="font-size:19px">Drills &amp; goal</h3>
      <label for="stageLen">Drill length</label>
      ${sel('stageLen', [[60, 'Short'], [90, 'Normal'], [140, 'Long']], s.stageLen)}
      <label for="dailyGoal">Daily goal (minutes)</label>
      <input type="number" id="dailyGoal" min="1" max="120" value="${s.dailyGoal}"></div>
    <div class="card field"><h3 style="font-size:19px">During a lesson</h3>
      <div class="check"><input type="checkbox" id="stopOnError" ${s.stopOnError ? 'checked' : ''}><label for="stopOnError">Stop on errors<br><small>You must type the right key before moving on.</small></label></div>
      <div class="check"><input type="checkbox" id="showKeyboard" ${s.showKeyboard ? 'checked' : ''}><label for="showKeyboard">Show the keyboard during lessons</label></div>
      <label for="keyHighlight">Next-key highlight</label>
      ${sel('keyHighlight', [['bright', 'Fill the key'], ['subtle', 'Outline the key'], ['off', 'Off']], s.keyHighlight)}
      <label for="hints">Hints</label>
      ${sel('hints', [['fade', 'Fade as you learn each key'], ['always', 'Always show'], ['miss', 'Only after a miss']], s.hints)}
      <small>Fading hides the hint and key highlight for keys you type accurately until you pause or miss, so you recall them from memory.</small>
      <div class="check"><input type="checkbox" id="showFingers" ${s.showFingers ? 'checked' : ''}><label for="showFingers">Colour keys by finger</label></div>
      <div class="check"><input type="checkbox" id="unlockAll" ${s.unlockAll ? 'checked' : ''}><label for="unlockAll">Unlock every lesson</label></div></div>
    <div class="card field"><h3 style="font-size:19px">Appearance</h3>
      <label for="theme">Theme</label>
      ${sel('theme', [['system', 'Match system'], ['light', 'Light'], ['dark', 'Dark']], s.theme)}
      <small>Choose a light or dark colour scheme, or follow your device setting.</small></div>
    <div class="card field"><h3 style="font-size:19px">Reset</h3><small>Clears lesson progress and key stats for your active layout, ${esc(S.layout.title)}. Your other saved layouts keep theirs.</small>
      <div class="actions"><button class="btn danger" data-act="reset">${S.confirmDel === '__reset' ? 'Confirm reset' : 'Reset progress'}</button></div></div>
  </div>`;
}

const BUILD = window.HOMEROW_TRAINER_BUILD || { version: 'dev', commit: '', date: '', repo: 'https://github.com/jdg2896/homerow-trainer', notes: [] };
const repoFile = f => `${BUILD.repo}/blob/main/${f}`;
// Credits live in CREDITS.md so the footer stays one line as sources are added; a link satisfies the CC BY attributions.
function footer(){
  const a = (href, text, cls) => `<a href="${href}" target="_blank" rel="noopener"${cls ? ` class="${cls}"` : ''}>${text}</a>`;
  const commit = BUILD.commit ? ' · ' + a(`${BUILD.repo}/commit/${BUILD.commit}`, BUILD.commit, 'mono') : '';
  return `<footer class="credits"><p class="ver">${a(repoFile('CHANGELOG.md'), `Homerow Trainer v${esc(BUILD.version)}`)}${commit} · © 2026 Jasper Gabriel · ${a(repoFile('CREDITS.md'), 'Credits &amp; licenses')} · <button class="linkbtn" data-act="feedback" data-fbtype="feedback">Send feedback</button> · <button class="linkbtn" data-act="feedback" data-fbtype="bug">Report a bug</button></p></footer>`;
}
function whatsNew(){
  if (!S.whatsNew) return '';
  return `<section class="card whatsnew" aria-labelledby="wnHead"><div class="wn-top"><h3 id="wnHead">What's new in v${esc(BUILD.version)}</h3><button class="btn ghost" data-act="whats-new-ok">Got it</button></div>
    <ul>${BUILD.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>
    <a href="${repoFile('CHANGELOG.md')}" target="_blank" rel="noopener">Full changelog</a></section>`;
}
function render(){
  if (S.run) { renderRun(true); return; }
  const main = S.view === 'learn' ? learnView() : S.view === 'practice' ? practiceView() : S.view === 'layout' ? layoutView() : settingsView();
  $('#app').innerHTML = header() + `<div class="shell">${sidebar()}<main class="main">${main}</main></div>` + footer();
  // Land on Start/Continue so Enter begins the next lesson, instead of tabbing past the header and sidebar first.
  // Not once the goal is met: Enter shouldn't start another lesson by default.
  const go = S.view === 'learn' && $('.hero .btn.go'); if (go) go.focus({ preventScroll: true });
}

/* ---------- running a lesson ---------- */
function computeStars(acc, wpm, kind){
  const s = S.settings;
  if (acc < s.passAcc) return 0;
  if (kind === 'keys' || kind === 'chords') return acc >= 100 ? 3 : acc >= 97 ? 2 : 1;
  if (wpm < s.targetWpm) return 1;
  return acc >= 98 && wpm >= s.targetWpm * 1.25 ? 3 : 2;
}
// A lesson left part-way resumes at its first unpassed stage; a finished one starts over (Redo).
function resumeStage(l){ const p = lessonProg(l); return p && !p.stars && p.stagesDone ? p.stagesDone : 0; }
function startLesson(i){
  const l = S.C.lessons[i], p = lessonProg(l);
  const stages = E.makeStages(S.C, l, WORDS, +S.settings.stageLen, SENTENCES, weakPairIds(), staleKeys());
  // Clamped so a lesson saved with every stage passed but never finished (before 0.3.1) redoes its last stage instead of restarting.
  let si = Math.min(resumeStage(l), stages.length - 1), results = [];
  if (si && p.stageCount === stages.length) results = (p.stageRes || []).map(x => x && Object.assign({ pass: true }, x));
  else si = 0;
  beginRun({ lesson: l, lessonIdx: i, stages, si, results, title: `Lesson ${l.num}: ${l.title}` });
}
function beginRun(o){
  S.run = Object.assign({ si: 0, results: [] }, o);
  resetStage();
  renderRun(true);
}
function resetStage(){
  const r = S.run;
  Object.assign(r, { items: r.stages[r.si].items, idx: 0, tried: new Set(), wrong: new Set(), errCount: 0, t0: null, last: null,
    misfires: { shift: 0, mod: 0, alt: 0 }, result: null, note: null, saidNote: null, paused: null, awayAt: null, escPaused: false });
}
// Pausing (Esc, or the window losing focus) stops the clock, so the rest doesn't count toward speed, key latency or the daily goal.
function pauseClock(){ const r = S.run; if (r.t0 != null && !r.result && r.awayAt == null) r.awayAt = performance.now(); }
function resumeClock(){
  const r = S.run; if (r.awayAt == null) return;
  const d = performance.now() - r.awayAt; if (r.t0 != null) r.t0 += d; if (r.last != null) r.last += d; r.awayAt = null;
}
const itemText = it => it.t === 'k' ? E.keyItemLabel(it) + ' ' : it.ch;
function renderRun(full){
  const r = S.run;
  if (full) {
    r.shown = null;
    const newKeys = r.lesson && r.lesson.kind !== 'review' ? r.lesson.items.map(c => kc(c, 'big')).join('') : '';
    // Speed stays off screen until the result: a ticking wpm and clock push you to rush, and passing is about accuracy.
    $('#app').innerHTML = header(true) + `<div class="wrap" style="padding-block:20px 60px"><div class="run">
      <div class="runbar"><button class="btn ghost" data-act="exit">← ${r.lesson ? 'Lessons' : 'Practice'}</button><h2>${esc(r.title)}</h2>
        <div class="live"><div class="stat"><small>Accuracy</small><b id="lvA">100<em>%</em></b></div></div></div>
      <div class="stagechips" id="chips"></div>
      ${newKeys ? `<div class="newkeys">New keys ${newKeys}</div>` : ''}
      <div class="typebox" id="typebox"><div class="viewport" aria-hidden="true"><div class="textline" id="textline"></div></div><p class="sr-only">Text to type: ${esc(r.items.map(itemText).join(''))}</p><div id="overlay"></div></div>
      <div class="hint" id="hint"></div>
      ${S.settings.showKeyboard ? `<div class="kbwrap" id="kb"></div>` : ''}
      <p class="sr-only" id="runSr" aria-live="polite"></p>
      <p class="muted" style="font-size:13px;margin:0"><span class="kc">Esc</span> pauses, and <span class="kc">Esc</span> again leaves the lesson. Homerow Trainer can't block every browser shortcut, like ⌘W, so watch for accidental Command holds.</p>
    </div></div>` + footer();
    paintText();
    // A live region inserted with its text is often skipped, so announce the stage once it's in the page.
    const stage = r.stages[r.si];
    setTimeout(() => { if (S.run === r && !r.result) say(`Stage ${r.si + 1} of ${r.stages.length}, ${stage.name}. Type: ${r.items.map(itemText).join('')}`); }, 150);
  }
  paintChips();
  paintState();
}
function paintChips(){
  const r = S.run;
  $('#chips').innerHTML = r.stages.map((s, i) => `<span class="${i === r.si ? 'on' : ''} ${i < r.si || (r.results[i] && r.results[i].pass) ? 'done' : ''}">${i + 1}. ${esc(s.name)}</span>`).join('');
}
function paintText(){
  const r = S.run;
  let html = '<span class="w">';
  r.items.forEach((it, i) => {
    if (it.t === 'k') { html += `</span><span class="w"><span class="c kchip" id="c${i}">${esc(E.keyItemLabel(it))}</span></span><span class="w">`; return; }
    if (it.ch === ' ') html += `<span class="c sp" id="c${i}">&nbsp;</span></span><span class="w">`;
    else html += `<span class="c" id="c${i}">${esc(it.ch)}</span>`;
  });
  html += '</span>';
  $('#textline').innerHTML = html;
}
function paintState(){
  const r = S.run;
  const tl = $('#textline'); if (!tl) return;
  r.items.forEach((_, i) => {
    const el = document.getElementById('c' + i); if (!el) return;
    const cls = ['c'];
    if (r.items[i].t === 'k') cls.push('kchip');
    if (r.items[i].ch === ' ') cls.push('sp');
    if (i < r.idx) cls.push(r.wrong.has(i) ? (S.settings.stopOnError ? 'fixed' : 'bad') : 'ok');
    if (i === r.idx) { cls.push('cur'); if (r.wrong.has(i)) cls.push('bad'); }
    el.className = cls.join(' ');
  });
  const cur = document.getElementById('c' + Math.min(r.idx, r.items.length - 1));
  if (cur) { const lh = cur.offsetHeight || 40; tl.style.transform = `translateY(${-Math.max(0, cur.offsetTop - lh * 0.95)}px)`; }
  updateLive();
  // hint + keyboard
  const it = r.items[r.idx];
  // Once a stage ends there's nothing left to press, so clear the hint and leave the keyboard unlit.
  if (r.result) paintHint({ html: '' });
  else if (it) paintHint(hintFor(it));
  // overlay
  $('#typebox').classList.toggle('done', !!r.result);
  const ov = $('#overlay');
  if (r.result) {
    // Only on a new result, so a window blur/focus repaint doesn't yank focus back from Retry.
    if (r.shown !== r.result) { r.shown = r.result; ov.innerHTML = resultCard(); announceResult(); }
  }
  else if (r.escPaused) ov.innerHTML = `<button class="focusveil" data-act="resume"><span>Paused. Press any key to keep typing, or <span class="kc">Esc</span> again to leave the lesson.</span></button>`;
  else if (!document.hasFocus()) ov.innerHTML = `<button class="focusveil" data-act="focus">Paused while this window is in the background. Click here or switch back to keep typing.</button>`;
  else ov.innerHTML = '';
  if (r.note && r.note !== r.saidNote) say(htmlText(r.note.html));
  r.saidNote = r.note;
}
function say(text){ const el = $('#runSr'); if (el) el.textContent = text; }
function htmlText(html){ const tmp = document.createElement('div'); tmp.innerHTML = html; return tmp.textContent.replace(/\s+/g, ' ').trim(); }
function announceResult(){
  const card = $('#overlay .result'); if (!card) return;
  const res = S.run.result;
  say([card.querySelector('h3').textContent, res.stars ? `${res.stars} of 3 stars` : '',
    `Accuracy ${Math.round(res.acc)} percent`, `Speed ${Math.round(res.wpm)} words per minute`,
    ...[...card.querySelectorAll('p, .newkeys')].map(el => el.textContent.replace(/\s+/g, ' ').trim().replace(/\.$/, ''))
  ].filter(Boolean).join('. ') + '.');
  const go = card.querySelector('.btn'); if (go) go.focus({ preventScroll: true });
}
// keyHighlight: 'bright' fills the keys, 'subtle' outlines them, 'off' leaves them unlit.
// hints: 'fade' holds the hint and highlight back for keys you already know until a miss or a pause, 'miss' holds them back
// for every key until a miss, 'always' never does. Fading is what moves you from reading the hint to recalling the key.
const PAUSE_MS = 1500;
let pauseTimer = null;
function knownKey(it){
  const s = S.stats.keys[it.t === 'c' ? it.ch : E.keyId(it)];
  return !!s && s.n >= 40 && s.err / s.n <= 0.04 && (!s.ln || s.lat / s.ln <= 800);
}
function hintState(){
  const r = S.run, it = r.items[r.idx], mode = S.settings.hints;
  if (mode === 'always' || r.wrong.has(r.idx)) return 'show';
  if (mode === 'miss') return 'hide';
  return !it || r.paused === r.idx || !knownKey(it) ? 'show' : 'fade';
}
function paintHint(h){
  const r = S.run, st = r.result ? 'show' : hintState(), show = st === 'show', kh = S.settings.keyHighlight, soft = kh === 'subtle';
  clearTimeout(pauseTimer);
  if (st === 'fade') {
    const at = r.idx;
    pauseTimer = setTimeout(() => { if (S.run === r && !r.result && r.idx === at) { r.paused = at; paintHint(hintFor(r.items[at])); } }, PAUSE_MS);
  }
  $('#hint').innerHTML = (show ? h.html : st === 'fade' ? '<span class="muted">From memory. Pause for a hint.</span>' : '')
    + (r.note && !r.result ? `<span class="${r.note.err ? 'misfire' : 'note'}">${r.note.html}</span>` : '');
  const kb = $('#kb'); if (!kb) return;
  // The hint as plain text, so the keyboard's accessible name says what to press, not just which layer is shown.
  const label = show ? htmlText(h.html) : '';
  // A hidden hint also hides the target's layer, since switching the diagram to it would give the answer away.
  kb.innerHTML = kbSVG(h.r && show ? h.r.layer : 0, h.r && show && kh !== 'off' ? { target: h.r.pos, holds: h.r.holds, soft, label } : { label }) + legendHtml(kh !== 'off', soft);
  // On narrow screens the keyboard scrolls horizontally; keep the target key in view.
  const tg = kb.querySelector('.tgtg');
  if (tg && kb.scrollWidth > kb.clientWidth + 4) {
    const t = tg.getBoundingClientRect(), k = kb.getBoundingClientRect();
    kb.scrollLeft += (t.left + t.width / 2) - (k.left + k.width / 2);
  }
}
function updateLive(){
  const r = S.run, n = r.tried.size, a = $('#lvA');
  if (a) a.innerHTML = `${Math.round(n ? (n - r.errCount) / n * 100 : 100)}<em>%</em>`;
}

const numsHtml = res => `<div class="nums"><div class="stat"><small>Accuracy</small><b>${Math.round(res.acc)}<em>%</em></b></div><div class="stat"><small>Speed</small><b>${Math.round(res.wpm)}<em>wpm</em></b></div></div>`;
// Once today's goal is met, the lesson end steers toward stopping rather than chaining into the next lesson.
function goalMet(){ return overall().todaySecs >= S.settings.dailyGoal * 60; }
function resultCard(){
  const r = S.run, res = r.result;
  const lastStage = r.si === r.stages.length - 1;
  const mf = res.misfires, mfParts = [['⌘ or ⌃', mf.mod], ['Shift', mf.shift], ['⌥', mf.alt]].filter(x => x[1]).map(([m, n]) => `${m} ${n}×`);
  if (res.lessonDone) {
    const hasNext = r.lesson && r.lessonIdx < S.C.lessons.length - 1, rest = goalMet(), today = overall().todaySecs;
    const learned = r.lesson && r.lesson.kind === 'learn' ? `<div class="newkeys">Learned ${r.lesson.items.map(c => kc(c)).join('')}</div>` : '';
    const change = ` <button class="linkbtn" data-act="change-goal">Change goal</button>`;
    const goal = rest ? `<p class="muted" style="margin:0">That's your ${S.settings.dailyGoal}-minute goal for today. A good place to stop and rest your hands.${change}</p>`
      : `<p class="muted" style="margin:0">${fmtTime(today)} of your ${S.settings.dailyGoal} minutes today.${change}</p>`;
    const next = hasNext ? `<button class="btn ${rest ? '' : 'go'}" data-act="next-lesson">${rest ? '' : '<span class="tri"></span>'}Next lesson${rest ? '' : ' (Enter)'}</button>` : '';
    const back = `<button class="btn ${rest || !hasNext ? 'go' : 'ghost'}" data-act="exit">Back to ${r.lesson ? 'lessons' : 'practice'}${rest || !hasNext ? ' (Enter)' : ''}</button>`;
    return `<div class="result"><h3>${res.stars ? 'Lesson complete' : 'Lesson finished'}</h3>${res.stars ? starsHtml(res.stars) : ''}
      ${numsHtml(res)}${learned}${goal}
      <div class="row">${rest ? back + next : next + back}<button class="btn ghost" data-act="redo-lesson">Redo lesson</button></div></div>`;
  }
  return `<div class="result"><h3>${res.pass ? 'Stage passed' : 'Not quite'}</h3>${res.pass ? starsHtml(res.stars) : ''}
    ${numsHtml(res)}
    ${res.pass ? '' : `<p class="muted" style="margin:0">You need ${S.settings.passAcc}% accuracy to move on. Slow down a little.</p>`}
    ${res.missed.length ? `<div class="newkeys">Missed ${res.missed.map(c => kc(c, 'warn')).join('')}</div>` : ''}
    ${mfParts.length ? `<p class="muted" style="margin:0">Modifiers fired by accident: ${mfParts.join(', ')}. Tap home-row keys and let go before the next key.</p>` : ''}
    <div class="row">${res.pass ? `<button class="btn go" data-act="next-stage"><span class="tri"></span>${lastStage ? 'Finish lesson' : 'Next stage'} (Enter)</button><button class="btn" data-act="retry-stage">Retry</button>` : `<button class="btn go" data-act="retry-stage"><span class="tri"></span>Try again (Enter)</button>`}</div></div>`;
}

function finishStage(now){
  const r = S.run;
  const secs = Math.max(1, (now - r.t0) / 1000);
  const n = r.items.length;
  const acc = (n - r.errCount) / n * 100;
  const wpm = (n / 5) / (secs / 60);
  const kind = r.lesson ? (r.lesson.kind === 'review' ? r.lesson.reviewKind : r.lesson.kind) : 'practice';
  const stars = computeStars(acc, wpm, kind);
  const missed = [...new Set([...r.wrong].map(i => { const it = r.items[i]; return it.t === 'c' ? it.ch : E.keyId(it); }))].filter(c => c !== ' ').slice(0, 8);
  r.result = { acc, wpm, stars, pass: acc >= S.settings.passAcc, misfires: r.misfires, missed, secs };
  r.results[r.si] = r.result;
  const st = S.stats;
  st.sessions.push({ d: today(), wpm: kind === 'keys' || kind === 'chords' ? null : wpm, acc, secs, n });
  if (st.sessions.length > 600) st.sessions = st.sessions.slice(-600);
  st.daily[today()] = (st.daily[today()] || 0) + secs;
  if (r.lesson && r.result.pass) {
    const p = st.progress[r.lesson.id] || { stars: 0 };
    p.stageCount = r.stages.length; p.stagesDone = Math.max(p.stagesDone || 0, r.si + 1);
    // Kept so a resumed lesson still scores over every stage, not just the ones typed after resuming.
    if (!p.stars) (p.stageRes = p.stageRes || [])[r.si] = { acc, wpm };
    st.progress[r.lesson.id] = p;
    // Record the lesson as soon as its last stage passes, so leaving before clicking through to the summary keeps it.
    if (r.si === r.stages.length - 1) recordLesson();
  }
  saveStats();
  renderRun(false);
  paintChips();
}
function recordLesson(){
  const r = S.run;
  const res = r.results.filter(Boolean);
  const acc = res.reduce((a, x) => a + x.acc, 0) / res.length, wpm = res.reduce((a, x) => a + x.wpm, 0) / res.length;
  const kind = r.lesson ? (r.lesson.kind === 'review' ? r.lesson.reviewKind : r.lesson.kind) : 'practice';
  const stars = Math.max(1, computeStars(acc, wpm, kind));
  if (r.lesson) {
    const p = S.stats.progress[r.lesson.id] || {};
    p.stars = Math.max(p.stars || 0, stars); p.bestWpm = Math.max(p.bestWpm || 0, kind === 'keys' || kind === 'chords' ? 0 : wpm);
    p.bestAcc = Math.max(p.bestAcc || 0, acc); p.stageCount = r.stages.length; p.stagesDone = r.stages.length; delete p.stageRes;
    S.stats.progress[r.lesson.id] = p; saveStats();
  }
  return { acc, wpm, stars };
}
function finishLesson(){
  S.run.result = Object.assign({ lessonDone: true, misfires: { shift: 0, mod: 0, alt: 0 }, missed: [] }, recordLesson());
  paintState();
}
function nextStage(){
  const r = S.run;
  if (r.si >= r.stages.length - 1) { finishLesson(); return; }
  r.si++; resetStage(); renderRun(true);
}
function exitRun(){ S.run = null; render(); }

/* ---------- keyboard navigation (outside a run) ---------- */
const VIEW_KEYS = { 1: 'learn', 2: 'practice', 3: 'layout', 4: 'settings' };
// Visible stops in the lesson list, in page order: hero button, unit headers, then each open unit's Start/Redo buttons.
function navTargets(){
  return [...document.querySelectorAll('.main .hero .btn, .main details.unit > summary, .main .lesson .act .btn:not(:disabled)')]
    .filter(el => el.getClientRects().length);
}
function onNavKey(e){
  if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest('input, textarea, select')) return;
  const k = e.key;
  if (VIEW_KEYS[k]) {
    e.preventDefault(); S.view = VIEW_KEYS[k]; S.msg = null; S.confirmDel = null; render();
    if (S.view !== 'learn') $('.nav button.on').focus();
    return;
  }
  if (S.view !== 'learn') return;
  if (k === 'Enter' && document.activeElement === document.body) { e.preventDefault(); startLesson(nextLessonIdx()); return; }
  const dir = k === 'ArrowDown' ? 1 : k === 'ArrowUp' ? -1 : 0;
  if (!dir && k !== 'Home' && k !== 'End') return;
  const ts = navTargets(); if (!ts.length) return;
  e.preventDefault();
  let i = ts.indexOf(document.activeElement);
  if (i < 0) i = Math.max(0, ts.indexOf($('.lesson.next .act .btn'))); // focus is off the list: start from the next lesson
  else i = k === 'Home' ? 0 : k === 'End' ? ts.length - 1 : Math.max(0, Math.min(ts.length - 1, i + dir));
  ts[i].focus({ preventScroll: true }); ts[i].scrollIntoView({ block: 'nearest' });
}

// macOS swaps ` and § when it thinks the keyboard is ISO, which it often guesses for new keyboards.
const ISO_SWAP = { '`': '§', '~': '±' };

// Name the key behind a misfire, so the fix is about one finger rather than "a modifier".
const cap = lab => `<span class="kc">${esc(lab || '?')}</span>`;
function modKeys(mod){
  return S.layout.keys.filter(g => { const k = S.layout.layers[0][g.pos]; return k && k.hold && k.hold.mod === mod && !k.hold.sticky; })
    .map(g => cap(keyLabels(0, g.pos).main));
}
function misfireHtml(kind, it){
  const want = kc(it.ch);
  if (kind === 'wrongmod') return `Wrong modifier held. This shortcut is ${cap(E.keyItemLabel(it))}.`;
  if (kind === 'shift-missing') {
    const rt = E.routeFor(S.layout, S.C, it, S.settings.routePref), h = rt && rt.holds.find(x => x.mod === 'shift');
    return h ? `Shift wasn't held. Hold ${cap(keyLabels(0, h.pos).main)} (${fingerName(h.pos)}) for ${want}.` : `Shift wasn't held for ${want}.`;
  }
  const mod = kind === 'shift-extra' ? 'shift' : kind, sym = mod === 'shift' ? 'Shift' : E.MOD_SYM[mod];
  // A home-row key held a little too long fires its own modifier instead of its letter.
  const rt = E.routeFor(S.layout, S.C, it, S.settings.routePref), own = rt && !rt.layer && !rt.holds.length && S.layout.layers[0][rt.pos];
  if (own && own.hold && own.hold.mod === mod) return `${sym} fired instead of ${want}: it was held a little long. Tap it and let go before the next key.`;
  const ks = modKeys(mod);
  return ks.length ? `${sym} fired: ${ks.join(' or ')} was still held when you pressed ${want}. Let it go before the next key.` : `${sym} was held when you pressed ${want}.`;
}

function onKey(e){
  if (fbOpen()) return;
  const r = S.run; if (!r) { onNavKey(e); return; }
  if (r.result) {
    // A focused button (Retry, Redo, Back) handles its own Enter; only an Enter with nothing focused means the primary action.
    if (e.key === 'Enter' && document.activeElement.closest('button, a')) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (r.result.lessonDone) { if (r.lesson && r.lessonIdx < S.C.lessons.length - 1 && !goalMet()) startLesson(r.lessonIdx + 1); else exitRun(); }
      else if (r.result.pass) nextStage(); else { resetStage(); renderRun(true); }
    } else if (e.key === 'Escape') { e.preventDefault(); exitRun(); }
    return;
  }
  // Esc sits next to A on many split layouts, so the first press only pauses; a second one leaves.
  if (e.key === 'Escape') {
    e.preventDefault();
    if (r.escPaused) { exitRun(); return; }
    r.escPaused = true; pauseClock(); paintState(); say('Paused. Press any key to keep typing, or Escape again to leave the lesson.');
    return;
  }
  if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Fn', 'Hyper', 'Super', 'OS', 'AltGraph'].includes(e.key)) return;
  if (r.escPaused) { e.preventDefault(); r.escPaused = false; resumeClock(); paintState(); return; }
  const it = r.items[r.idx]; if (!it) return;
  e.preventDefault();
  const now = performance.now();
  let ok = false, misfire = null, note = null;
  if (it.t === 'c') {
    if (e.key === 'Backspace') {
      if (!S.settings.stopOnError && r.idx > 0 && r.wrong.has(r.idx - 1)) { r.idx--; paintState(); }
      return;
    }
    let typed = e.key === 'Enter' ? '\n' : e.key;
    if (e.metaKey || e.ctrlKey) misfire = e.metaKey ? 'meta' : 'ctrl';
    else if (e.key === 'Dead' || (e.altKey && typed !== it.ch)) misfire = 'alt';
    else if (typed.length === 1 && typed !== it.ch && typed.toLowerCase() === it.ch.toLowerCase() && /[a-z]/i.test(typed)) misfire = typed === typed.toUpperCase() ? 'shift-extra' : 'shift-missing';
    if (typed.length !== 1 && !misfire) return; // stray navigation key: ignore
    ok = !misfire && typed === it.ch;
    if (!misfire && ISO_SWAP[it.ch] === typed) note = { err: false, html: `Your Mac typed ${esc(typed)}: it thinks this keyboard is ISO. Set the keyboard type to ANSI in System Settings › Keyboard.` };
    if (misfire) { const t = misfire === 'meta' || misfire === 'ctrl' ? 'mod' : misfire === 'alt' ? 'alt' : 'shift'; r.misfires[t]++; S.stats.misfires[t] = (S.stats.misfires[t] || 0) + 1; }
  } else {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const want = new Set(it.mods);
    const modsOk = ['ctrl', 'alt', 'meta', 'shift'].every(m => !!e[m + 'Key'] === want.has(m));
    ok = k === it.key && modsOk;
    if (k === it.key && !modsOk) misfire = 'wrongmod';
  }
  r.note = misfire ? { err: true, html: misfireHtml(misfire, it) } : note;
  if (!r.t0) { r.t0 = now; r.last = now; }
  const id = it.t === 'c' ? it.ch : E.keyId(it);
  const ks = S.stats.keys[id] || (S.stats.keys[id] = { n: 0, err: 0, lat: 0, ln: 0 });
  if (!r.tried.has(r.idx)) {
    r.tried.add(r.idx); ks.n++; ks.d = today();
    if (!ok) { ks.err++; r.errCount++; }
    // In-word pairs only: the previous item and this one are both letters, so "th" in "the" but not "e t".
    const prev = r.items[r.idx - 1];
    if (prev && prev.t === 'c' && it.t === 'c' && /[a-z]/i.test(prev.ch) && /[a-z]/i.test(it.ch)) {
      const pair = (prev.ch + it.ch).toLowerCase(), pr = S.stats.pairs[pair] || (S.stats.pairs[pair] = { n: 0, err: 0 });
      pr.n++; if (!ok) pr.err++;
    }
    else if (r.idx > 0) { const lat = now - r.last; if (lat < 3000) { ks.lat += lat; ks.ln++; } }
  }
  if (ok) { r.idx++; r.last = now; }
  else {
    r.wrong.add(r.idx);
    const tb = $('#typebox'); if (tb) { tb.classList.remove('shake'); void tb.offsetWidth; tb.classList.add('shake'); }
    if (!S.settings.stopOnError) { r.idx++; r.last = now; }
  }
  if (r.idx >= r.items.length) finishStage(now); else paintState();
}

/* ---------- practice ---------- */
function startPractice(kind){
  const unlocked = unlockedChars();
  let stages, title;
  if (kind === 'problem') {
    const pk = problemKeys(4).map(r => r.k);
    const chars = pk.filter(k => k.length === 1);
    const keys = pk.filter(k => k.length > 1);
    stages = chars.length ? E.practiceStages(S.C, unlocked, chars, WORDS, +S.settings.stageLen, SENTENCES, weakPairIds()) : [];
    if (keys.length) stages.push({ name: 'Focus keys', items: Array.from({ length: 12 }, () => E.keyItem(keys[Math.floor(Math.random() * keys.length)])) });
    title = 'Problem keys: ' + pk.map(itemLabel).join(' ');
  } else if (kind === 'stale' || kind === 'pairs') {
    // The suggested sessions: free practice cut to the stage that works on the weak spot, then sentences.
    const want = kind === 'stale' ? 'Not typed lately' : 'Common combos';
    stages = E.practiceStages(S.C, unlocked, [], WORDS, +S.settings.stageLen, SENTENCES, weakPairIds(), kind === 'stale' ? staleKeys() : [])
      .filter(s => s.name === want || s.name === 'Sentences');
    title = kind === 'stale' ? 'Not typed lately' : 'Weak letter pairs';
  } else if (kind === 'free') {
    stages = E.practiceStages(S.C, unlocked, [], WORDS, +S.settings.stageLen * 1.5, SENTENCES, weakPairIds(), staleKeys());
    title = 'Free practice';
  } else {
    const t = cleanText(S.customText);
    if (!t || textCheck(t).bad.length) { paintCustomNote(true); const ta = $('#customText'); if (ta) ta.focus(); return; }
    stages = [];
    for (let i = 0; i < t.length; i += 160) {
      let end = Math.min(t.length, i + 160);
      stages.push({ name: 'Part ' + (stages.length + 1), items: E.textItems(t.slice(i, end).trim()) });
    }
    title = 'Your text';
  }
  if (!stages.length) return;
  beginRun({ lesson: null, stages, title });
}

/* ---------- events ---------- */
/* ---------- feedback ----------
   No backend: the form builds a prefilled GitHub "new issue" link. Each type has a matching
   .github/ISSUE_TEMPLATE file whose frontmatter applies the label, since the labels query
   parameter is ignored for people without triage access. */
const FB_TYPES = {
  bug: { name: 'Bug', template: 'bug.md', label: 'bug', ask: 'What went wrong?' },
  feedback: { name: 'Feedback', template: 'feedback.md', label: 'feedback', ask: 'What’s your idea or feedback?' }
};
const MAX_URL = 8000; // GitHub rejects much longer issue URLs; longer reports go via the clipboard
const MAX_BODY = 65000; // GitHub's issue body limit is 65,536 characters
let fbDialog = null;
function fbOpen(){ return !!(fbDialog && fbDialog.open); }

function diagnostics(){
  const L = S.layout, r = S.run, errs = window.HOMEROW_TRAINER_ERRORS || [];
  const lines = [
    `Version: v${BUILD.version}${BUILD.commit ? ' (' + BUILD.commit + ')' : ''}${BUILD.date ? ', built ' + BUILD.date : ''}`,
    `Page: ${location.origin}${location.pathname}`,
    `Browser: ${navigator.userAgent}`,
    `Screen: viewport ${innerWidth}x${innerHeight} @${devicePixelRatio}x, language ${navigator.language}, theme ${S.settings.theme}`,
    `Layout: ${L.title} (${L.geo.name}, ${L.layers.length} layers, keyboard ${L.keyboard || '?'}, id ${L.id})`,
    `View: ${r ? `lesson "${r.title}", stage ${r.si + 1}/${r.stages.length} (${r.stages[r.si].name}), item ${r.idx}/${r.items.length}` : S.view}`,
    `Progress: ${S.C.lessons.filter(isDone).length}/${S.C.lessons.length} lessons done, ${S.stats.sessions.length} sessions`,
    `Settings: ${JSON.stringify(S.settings)}`,
    errs.length ? 'Recent errors:\n' + errs.map(x => `  [${x.at}] ${x.kind}: ${x.msg}${x.where ? ' @ ' + x.where : ''}`).join('\n') : 'Recent errors: none'
  ];
  return lines.join('\n');
}

// The active layout as stored (MoErgo JSON is re-serialized compactly; ZMK keymaps stay as written).
function layoutFile(){
  const rec = S.layouts[S.activeId], text = rec ? rec.text : '';
  try { return { lang: 'json', text: JSON.stringify(JSON.parse(text)) }; } catch (e) { return { lang: 'c', text }; }
}
function fbBody(f, withLayout){
  const T = FB_TYPES[f.type];
  const sec = (h, v) => v ? `### ${h}\n\n${v}\n\n` : '';
  const fold = (summary, lang, text) => `<details><summary>${summary}</summary>\n\n\`\`\`\`${lang}\n${text}\n\`\`\`\`\n\n</details>`;
  const lf = withLayout && layoutFile();
  return sec('Type', T.name)
    + sec(f.type === 'bug' ? 'What happened' : 'Details', f.details)
    + (f.type === 'bug' ? sec('Steps to reproduce', f.steps) + sec('Expected behavior', f.expected) : '')
    + sec('Screenshots', '_Paste or drag screenshots and files here, if any._')
    + (lf ? sec('Layout file', fold(`${esc(S.layout.title)} (${Math.ceil(lf.text.length / 1024)} KB)`, lf.lang, lf.text)) : '')
    + (f.diag ? sec('Diagnostics', fold('App, browser and layout state (auto-collected)', '', diagnostics())) : '')
    + '_Sent from the in-app feedback form._';
}
function fbUrl(f, body){
  const T = FB_TYPES[f.type];
  const q = new URLSearchParams({ template: T.template, labels: T.label, title: f.title, body });
  return `${BUILD.repo}/issues/new?${q}`;
}

function fbFields(){
  const v = id => (fbDialog.querySelector('#' + id) || {}).value || '';
  const type = (fbDialog.querySelector('input[name=fbType]:checked') || {}).value || 'bug';
  return { type, title: v('fbTitle').trim(), details: v('fbDetails').trim(), steps: v('fbSteps').trim(), expected: v('fbExpected').trim(),
    diag: fbDialog.querySelector('#fbDiag').checked, layout: type === 'bug' && fbDialog.querySelector('#fbLayout').checked };
}
function fbSync(){
  const type = fbFields().type;
  if (fbDialog.dataset.type !== type) fbDialog.querySelector('#fbDiag').checked = type === 'bug';
  fbDialog.dataset.type = type;
  fbDialog.querySelector('#fbHead').textContent = type === 'bug' ? 'Report a bug' : 'Send feedback';
  fbDialog.querySelector('label[for=fbDetails]').textContent = FB_TYPES[type].ask;
  fbDialog.querySelector('#fbDiagText').textContent = diagnostics();
}
function openFeedback(type){
  if (!fbDialog) {
    fbDialog = document.createElement('dialog');
    fbDialog.className = 'fb';
    fbDialog.setAttribute('aria-labelledby', 'fbHead');
    fbDialog.innerHTML = `<form class="field">
      <h3 id="fbHead">Send feedback</h3>
      <div class="seg" role="radiogroup" aria-label="Type">${Object.entries(FB_TYPES).map(([k, T], i) =>
        `<label><input type="radio" name="fbType" value="${k}" ${i ? '' : 'checked'}><span>${T.name}</span></label>`).join('')}</div>
      <label for="fbTitle">Title</label>
      <input type="text" id="fbTitle" maxlength="120" placeholder="A short summary" autocomplete="off">
      <label for="fbDetails"></label>
      <textarea id="fbDetails" rows="4"></textarea>
      <div class="bug-only field">
        <label for="fbSteps">Steps to reproduce</label>
        <textarea id="fbSteps" rows="3" placeholder="1. Open Lessons&#10;2. Start lesson 3&#10;3. …"></textarea>
        <label for="fbExpected">What did you expect?</label>
        <input type="text" id="fbExpected" autocomplete="off">
      </div>
      <div class="check bug-only"><input type="checkbox" id="fbLayout" checked><label for="fbLayout">Attach my active layout file<br><small>So the bug can be reproduced with your exact keymap.</small></label></div>
      <div class="check"><input type="checkbox" id="fbDiag" checked><label for="fbDiag">Include diagnostics<br><small>Version, browser, active layout name, current screen, settings and recent errors. No typing history.</small></label></div>
      <details class="fbdiag"><summary>See what gets included</summary><pre id="fbDiagText"></pre></details>
      <div class="msg err" id="fbErr" hidden></div>
      <small>Opens a prefilled issue on GitHub in a new tab, where you can add screenshots or files, then press Submit (needs a GitHub account). Long reports, like ones with a layout file, are copied to your clipboard to paste there.</small>
      <div class="actions"><button type="button" class="btn ghost" data-act="fb-cancel">Cancel</button><button type="button" class="btn primary" data-act="fb-submit">Continue on GitHub</button></div>
    </form>`;
    document.body.appendChild(fbDialog);
    fbDialog.addEventListener('click', e => { if (e.target === fbDialog) fbDialog.close(); }); // backdrop
    fbDialog.addEventListener('change', e => { if (e.target.name === 'fbType') fbSync(); });
    fbDialog.addEventListener('submit', e => e.preventDefault());
  }
  const radio = fbDialog.querySelector(`input[name=fbType][value=${FB_TYPES[type] ? type : 'bug'}]`);
  radio.checked = true;
  fbSync();
  fbDialog.querySelector('#fbErr').hidden = true;
  fbDialog.showModal();
  fbDialog.querySelector('#fbTitle').focus();
}
function submitFeedback(){
  const f = fbFields(), err = fbDialog.querySelector('#fbErr');
  const fail = m => { err.textContent = m; err.hidden = false; };
  if (!f.title || !f.details) { fail('Add a title and a few words of detail first.'); return; }
  let body = fbBody(f, f.layout);
  if (body.length > MAX_BODY) body = fbBody(f, false).replace('### Screenshots', '_The layout file was too large to include. Please attach it below._\n\n### Screenshots');
  const done = () => { fbDialog.querySelector('form').reset(); fbSync(); fbDialog.close(); };
  const url = fbUrl(f, body);
  if (url.length <= MAX_URL) { window.open(url, '_blank', 'noopener'); done(); return; }
  // Too long for a link: copy the report, then open a short placeholder to paste over.
  // Copy first, synchronously: once the new tab opens this page loses focus and async clipboard writes are refused.
  if (!copyText(body)) {
    fail(f.layout ? 'This report is too long for a link and copying it failed. Untick “Attach my active layout file” and attach it on GitHub instead.' : 'This report is too long for a link. Shorten the details and try again.');
    return;
  }
  window.open(fbUrl(f, 'Your full report is on your clipboard. Select this line and paste (⌘V / Ctrl+V) to replace it.'), '_blank', 'noopener');
  done();
}
function copyText(text){
  // Inside the dialog, since a modal dialog makes the rest of the page unselectable.
  const ta = document.createElement('textarea');
  ta.value = text; ta.readOnly = true; ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
  fbDialog.appendChild(ta); ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) {}
  ta.remove();
  return ok;
}

document.addEventListener('keydown', onKey);
window.addEventListener('focus', () => {
  const r = S.run; if (!r) return;
  if (!r.escPaused) resumeClock();
  paintState();
});
window.addEventListener('blur', () => {
  const r = S.run; if (!r) return;
  pauseClock();
  paintState();
});
document.addEventListener('click', e => {
  const t = e.target.closest('button, a[data-jump]'); if (!t) return;
  const d = t.dataset;
  if (d.jump) { e.preventDefault(); const el = document.getElementById(d.jump); if (el) { if (el.tagName === 'DETAILS') el.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
  if (d.view) { S.view = d.view; S.msg = null; S.confirmDel = null; S.renaming = null; render(); return; }
  if (d.start != null) { startLesson(+d.start); return; }
  if (d.layer != null) { S.layerView = +d.layer; render(); return; }
  if (d.use) { activate(d.use); S.msg = null; render(); return; }
  if (d.rename) { S.renaming = d.rename; S.confirmDel = null; render(); const i = $('#renameInput'); if (i) { i.focus(); i.select(); } return; }
  if (d.update) { S.updating = d.update; const f = $('#updateFile'); if (f) { f.value = ''; f.click(); } return; }
  if (d.del) {
    if (Object.keys(S.layouts).length <= 1) { S.confirmDel = null; render(); return; }
    if (S.confirmDel !== d.del) { S.confirmDel = d.del; render(); return; }
    delete S.layouts[d.del]; store.set('layouts', S.layouts); store.del('stats.' + d.del); S.confirmDel = null;
    if (d.del === S.activeId) activate(Object.keys(S.layouts)[0]);
    render(); return;
  }
  switch (d.act) {
    case 'home': S.run = null; S.view = 'learn'; S.msg = null; S.confirmDel = null; render(); scrollTo(0, 0); break;
    case 'welcome-ok': store.set('welcomed', true); S.welcomed = true; render(); break;
    case 'whats-new-ok': store.set('seenVersion', BUILD.version); S.whatsNew = false; render(); break;
    case 'feedback': openFeedback(d.fbtype); break;
    case 'fb-cancel': fbDialog.close(); break;
    case 'fb-submit': submitFeedback(); break;
    case 'exit': exitRun(); break;
    case 'change-goal': S.run = null; S.view = 'settings'; render(); $('#dailyGoal').focus(); break;
    case 'focus': window.focus(); paintState(); break;
    case 'resume': S.run.escPaused = false; resumeClock(); paintState(); break;
    case 'next-stage': nextStage(); break;
    case 'retry-stage': resetStage(); renderRun(true); break;
    case 'next-lesson': startLesson(S.run.lessonIdx + 1); break;
    case 'redo-lesson': if (S.run.lesson) startLesson(S.run.lessonIdx); else { S.run.si = 0; S.run.results = []; resetStage(); renderRun(true); } break;
    case 'practice-problem': startPractice('problem'); break;
    case 'practice-free': startPractice('free'); break;
    case 'practice-stale': startPractice('stale'); break;
    case 'practice-pairs': startPractice('pairs'); break;
    case 'practice-custom': S.customText = ($('#customText') || {}).value || ''; startPractice('custom'); break;
    case 'add-selected': {
      const i = ($('#presetSel') || {}).value, p = (window.HOMEROW_TRAINER_PRESETS || [])[+i];
      S.presetSel = +i || 0;
      const have = p && layoutForPreset(p);
      if (have) { activate(have); S.msg = null; render(); break; }
      if (p) { try { const L = loadLayoutText(JSON.stringify(p)); S.msg = S.msg && S.msg.t === 'err' ? S.msg : { t: 'ok', m: `Added ${L.title} and switched to it.` }; } catch (err) { S.msg = { t: 'err', m: err.message }; } }
      render(); break;
    }
    case 'load-paste': {
      const txt = ($('#layoutPaste') || {}).value || '';
      if (!txt.trim()) { S.msg = { t: 'err', m: 'Paste the contents of a layout file first.' }; render(); break; }
      try { const L = loadLayoutText(txt); S.msg = S.msg && S.msg.t === 'err' ? S.msg : { t: 'ok', m: `Loaded ${L.title}. Lessons rebuilt for this layout.` }; }
      catch (err) { S.msg = { t: 'err', m: err.message }; }
      render(); break;
    }
    case 'rename-save': saveRename(); break;
    case 'rename-cancel': S.renaming = null; render(); break;
    case 'reset':
      if (S.confirmDel !== '__reset') { S.confirmDel = '__reset'; render(); break; }
      S.stats = freshStats(); saveStats(); S.confirmDel = null; render(); break;
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'presetSel') { S.presetSel = +t.value || 0; render(); return; }
  if (t.id === 'updateFile' && t.files && t.files[0] && S.layouts[S.updating]) {
    const f = t.files[0], id = S.updating, rd = new FileReader();
    rd.onload = () => { try { const r = updateLayoutText(id, String(rd.result), f.name.replace(/\.[^.]+$/, '')); S.msg = S.msg && S.msg.t === 'err' ? S.msg : { t: 'ok', m: `Updated ${r.name} from ${f.name}. Lessons rebuilt, and your progress is kept.` }; } catch (err) { S.msg = { t: 'err', m: `${f.name}: ${err.message}` }; } S.updating = null; render(); };
    rd.readAsText(f); return;
  }
  if (t.id === 'layoutFile' && t.files && t.files[0]) {
    const f = t.files[0], rd = new FileReader();
    rd.onload = () => { try { const L = loadLayoutText(String(rd.result), f.name.replace(/\.[^.]+$/, '')); S.msg = S.msg && S.msg.t === 'err' ? S.msg : { t: 'ok', m: `Loaded ${L.title} from ${f.name}. Lessons rebuilt for this layout.` }; } catch (err) { S.msg = { t: 'err', m: `${f.name}: ${err.message}` }; } render(); };
    rd.readAsText(f); return;
  }
  const keys = ['routePref', 'modPref', 'passAcc', 'targetWpm', 'stageLen', 'dailyGoal', 'stopOnError', 'showKeyboard', 'keyHighlight', 'hints', 'showFingers', 'unlockAll', 'theme'];
  if (keys.includes(t.id)) {
    const v = t.type === 'checkbox' ? t.checked : (t.tagName === 'SELECT' && ['routePref', 'modPref', 'keyHighlight', 'hints', 'theme'].includes(t.id)) ? t.value : Math.max(1, +t.value || DEFAULT_SETTINGS[t.id]);
    S.settings[t.id] = v; store.set('settings', S.settings);
    if (t.id === 'routePref' || t.id === 'modPref') rebuild();
    if (t.id === 'theme') applyTheme(v);
    render();
  }
});
function saveRename(){
  const rec = S.layouts[S.renaming], i = $('#renameInput');
  if (rec && i) {
    // An empty name falls back to the title in the layout file.
    rec.name = i.value.trim() || E.buildLayout(rec.text).title;
    saveLayouts();
    if (S.renaming === S.activeId) S.layout.title = rec.name;
  }
  S.renaming = null; render();
}
document.addEventListener('keydown', e => {
  if (e.target.id !== 'renameInput') return;
  if (e.key === 'Enter') { e.preventDefault(); saveRename(); }
  else if (e.key === 'Escape') { e.preventDefault(); S.renaming = null; render(); }
});
document.addEventListener('input', e => { if (e.target.id === 'customText') { S.customText = e.target.value; paintCustomNote(false); } });

/* ---------- boot ---------- */
applyTheme(S.settings.theme);
// Glove80 QWERTY from the Starter layouts catalog (data/presets/): the most common board and the layout
// most people already know. It has no uuid, so it's found by keyboard and title.
function defaultPreset(){
  const ps = window.HOMEROW_TRAINER_PRESETS || [];
  if (!ps.length) return null;
  const g = ps.filter(p => p.keyboard === 'glove80');
  return g.find(p => p.title === 'QWERTY (Default)') || g.find(p => /qwerty/i.test(p.title)) || ps[0];
}
function seedDefault(){
  const p = defaultPreset();
  if (!p) return;
  const txt = JSON.stringify(p);
  const L = E.buildLayout(txt);
  S.layouts[L.id] = { name: L.title, keyboard: L.keyboard, uuid: L.uuid, text: txt, savedAt: Date.now(), starter: true };
  if (!store.set('layouts', S.layouts)) S.msg = { t: 'err', m: 'This browser blocked storage, so your layouts, progress and stats will not be remembered after you close the page.' };
  activate(L.id);
}
// Returning users see the newest changelog notes once per version; first-time visitors start as caught up.
const seenVersion = store.get('seenVersion', null), returning = Object.keys(S.layouts).length > 0;
if (!returning && !seenVersion) store.set('seenVersion', BUILD.version);
S.whatsNew = returning && seenVersion !== BUILD.version && BUILD.notes.length > 0;
try {
  if (S.activeId && S.layouts[S.activeId]) activate(S.activeId);
  else if (Object.keys(S.layouts).length) activate(Object.keys(S.layouts)[0]);
  else seedDefault();
} catch (err) {
  console.error(err); S.layouts = {}; seedDefault();
}
render();
})();
