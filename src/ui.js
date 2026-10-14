/* ============================================================
   Homerow UI
   ============================================================ */
(function(){
const E = HomerowEngine;
const WORDS = window.HOMEROW_WORDS || [];
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- storage ---------- */
const store = {
  get(k, d){ try { const v = localStorage.getItem('homerow.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v){ try { localStorage.setItem('homerow.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k){ try { localStorage.removeItem('homerow.' + k); } catch (e) {} }
};
const DEFAULT_SETTINGS = { passAcc: 95, targetWpm: 20, stopOnError: true, stageLen: 90, routePref: 'layers',
  showFingers: true, showKeyboard: true, dailyGoal: 15, unlockAll: false, theme: 'system' };

/* ---------- theme ---------- */
function applyTheme(t){
  const el = document.documentElement;
  if (t === 'light' || t === 'dark') el.setAttribute('data-theme', t);
  else el.removeAttribute('data-theme');
}

const S = {
  layouts: store.get('layouts', {}),
  activeId: store.get('active', null),
  settings: Object.assign({}, DEFAULT_SETTINGS, store.get('settings', {})),
  view: 'learn', layerView: 0, run: null, msg: null, confirmDel: null, customText: '', presetSel: 0
};

function today(){ const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function freshStats(){ return { progress: {}, keys: {}, misfires: { shift: 0, mod: 0, alt: 0 }, sessions: [], daily: {} }; }

/* ---------- layout loading ---------- */
function loadLayoutText(text, nameHint){
  const L = E.buildLayout(text, { name: nameHint });
  S.layouts[L.id] = { name: L.title, keyboard: L.keyboard, text, savedAt: Date.now() };
  if (!store.set('layouts', S.layouts)) S.msg = { t: 'err', m: 'Loaded, but this browser blocked storage, so the layout will not be remembered after you close the page.' };
  activate(L.id);
  return L;
}
function activate(id){
  const rec = S.layouts[id]; if (!rec) return;
  S.layout = E.buildLayout(rec.text, { name: rec.name, id });
  S.activeId = S.layout.id; store.set('active', S.activeId);
  S.stats = Object.assign(freshStats(), store.get('stats.' + S.activeId, {}));
  S.layerView = 0;
  rebuild();
}
function rebuild(){ S.C = E.buildCurriculum(S.layout, S.settings.routePref); }
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
function problemKeys(limit){
  const ks = S.stats.keys, unlocked = unlockedChars();
  const rows = Object.keys(ks).filter(k => ks[k].n >= 6 && k !== ' ' && (k.length === 1 ? unlocked.has(k) : true)).map(k => {
    const s = ks[k]; const er = s.err / s.n; const lat = s.ln ? s.lat / s.ln : 0;
    return { k, er, lat, n: s.n };
  });
  if (!rows.length) return [];
  const lats = rows.map(r => r.lat).filter(Boolean).sort((a, b) => a - b);
  const med = lats.length ? lats[Math.floor(lats.length / 2)] : 0;
  rows.forEach(r => { r.score = r.er * 100 + Math.max(0, r.lat - med) / 40; });
  return rows.filter(r => r.score > 1.5).sort((a, b) => b.score - a.score).slice(0, limit || 4);
}
function fmtTime(s){ s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`; }
function starsHtml(n, max){ let s = ''; for (let i = 0; i < (max || 3); i++) s += `<span class="${i < n ? 'on' : ''}">★</span>`; return `<span class="stars" aria-label="${n} of 3 stars">${s}</span>`; }
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
  let out = `<svg class="kb ${S.settings.showFingers ? 'fingers' : ''}" viewBox="-6 -6 ${W + 12} ${H + 12}" role="img" aria-label="${esc(S.layout.layerNames[li] || '')} layer of ${esc(geo.name)}">`;
  for (const g of S.layout.keys) {
    const isT = hl.target === g.pos, isH = holds.has(g.pos);
    const lab = isH ? keyLabels(0, g.pos) : keyLabels(li, g.pos);
    const k = S.layout.layers[li][g.pos];
    const empty = !isT && !isH && (!k || k.none || k.inherited);
    const cls = ['k', 'f-' + g.finger, g.role === 'home' && !g.thumb ? 'home' : '', isT ? 'tgt' : '', isH ? 'hold' : '', empty ? 'empty' : ''].join(' ');
    const x = g.x * U, y = g.y * U, s = U - 6;
    const main = lab.main, fs = main.length <= 1 ? 22 : main.length <= 3 ? 15 : main.length <= 5 ? 11 : 9;
    out += `<g class="${isT ? 'tgtg' : ''} ${isH ? 'holdg' : ''}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${g.r || 0} ${s / 2} ${s / 2})">`;
    out += `<rect class="${cls}" width="${s}" height="${s}" rx="9"/>`;
    if (main) out += `<text x="${s / 2}" y="${lab.sub ? s / 2 - 5 : s / 2}" font-size="${fs}">${esc(main)}</text>`;
    if (lab.sub) out += `<text class="sub" x="${s / 2}" y="${s - 10}" font-size="10">${esc(isH ? 'hold' : lab.sub)}</text>`;
    if (g.role === 'home' && g.finger === 'index' && !g.stretch) out += `<rect class="bump" x="${s / 2 - 7}" y="${s - 5}" width="14" height="2.5" rx="1"/>`;
    out += `</g>`;
  }
  return out + `</svg>`;
}
const legendHtml = (withState) => `<div class="legend">${['pinky', 'ring', 'middle', 'index', 'thumb'].map(f => `<span><i style="background:var(--f-${f})"></i>${f[0].toUpperCase() + f.slice(1)}</span>`).join('')}${withState === false ? '' : `<span><i style="background:var(--go)"></i>Press</span><span><i style="background:var(--accent)"></i>Hold</span>`}</div>`;

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
  return { r, html: layer + parts.join(', ') };
}

/* ---------- views ---------- */
function header(){
  const o = overall(), goal = S.settings.dailyGoal * 60, pct = Math.min(1, o.todaySecs / goal), C = 2 * Math.PI * 18;
  const L = S.layout;
  return `<header class="top"><div class="bar">
    <div class="brand"><span class="brand-mark" aria-hidden="true">${[0,1,2,3,4,5,6,7,8].map(i => `<i class="${i >= 3 && i < 6 ? 'on' : ''}"></i>`).join('')}</span>Homerow</div>
    <div class="layout-chip"><b title="${esc(L.title)}">${esc(L.title)}</b><span>${esc(L.geo.name)} · ${L.layers.length} layers</span></div>
    <div class="stats">
      <div class="stat"><small>Avg speed</small><b>${o.wpm == null ? '–' : Math.round(o.wpm)}<em>wpm</em></b></div>
      <div class="stat"><small>Avg accuracy</small><b>${o.acc == null ? '–' : Math.round(o.acc)}<em>%</em></b></div>
      <div class="stat"><small>Typing time</small><b>${fmtTime(o.total)}</b></div>
      <div class="goal"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="ring-bg" cx="22" cy="22" r="18"/><circle class="ring" cx="22" cy="22" r="18" stroke-dasharray="${(C * pct).toFixed(1)} ${C.toFixed(1)}"/></svg>
        <div class="stat"><small>Daily goal</small><b>${fmtTime(o.todaySecs)}<em>/ ${S.settings.dailyGoal}:00</em></b></div></div>
    </div></div></header>`;
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
    <nav class="nav">${nav.map(([v, t]) => `<button class="${S.view === v ? 'on' : ''}" data-view="${v}">${t}</button>`).join('')}</nav>
    ${units}
    ${probCard}
  </aside>`;
}

function learnView(){
  const ls = S.C.lessons, done = ls.filter(isDone).length, nxt = nextLessonIdx();
  const nl = ls[nxt];
  let html = `<section class="hero"><div><h2>${done === ls.length ? 'Every lesson complete' : 'Next: ' + esc(nl.title)}</h2>
    <p>${done} of ${ls.length} lessons done on ${esc(S.layout.title)}</p></div>
    <div class="progress" aria-label="${Math.round(done / ls.length * 100)}% complete"><i style="width:${(done / ls.length * 100).toFixed(1)}%"></i></div>
    <button class="btn go" data-start="${nxt}"><span class="tri"></span>${done ? 'Continue' : 'Start'}</button></section>`;
  S.C.units.forEach(u => {
    const d = u.lessons.filter(isDone).length;
    const containsNext = u.lessons.includes(ls[nxt]);
    // Keep the page short: open only the current unit and any that are part-done; collapse finished and not-yet-reached ones.
    const open = containsNext || (d > 0 && d < u.lessons.length);
    html += `<details class="unit" id="u-${u.id}"${open ? ' open' : ''}><summary><div class="uhead"><div><h3>${esc(u.title)}</h3><p>${esc(u.blurb)}</p></div><div class="uright"><span>${d} of ${u.lessons.length} done</span><span class="chev" aria-hidden="true"></span></div></div></summary><div class="lessons">`;
    u.lessons.forEach(l => {
      const i = ls.indexOf(l), p = lessonProg(l), un = isUnlocked(i), isNext = i === nxt;
      const segN = (p && p.stageCount) || (l.kind === 'review' ? 6 : l.kind === 'learn' ? 8 : 4);
      const segDone = p ? (p.stars > 0 ? segN : (p.stagesDone || 0)) : 0;
      const keys = l.kind === 'review' ? '' : l.items.filter(c => c !== ' ' || l.items.length === 1).map(c => kc(c)).join('') + (l.items.includes(' ') ? kc(' ') : '');
      const title = l.kind === 'review' || l.title.startsWith('Capitals') || l.kind === 'keys' || l.kind === 'chords' ? esc(l.title) : '';
      html += `<div class="lesson ${isDone(l) ? 'done' : ''} ${isNext ? 'next' : ''} ${un ? '' : 'locked'}">
        <div class="num">${isDone(l) ? '✓' : l.num}</div>
        <div class="ttl"><b>${title}${title && keys ? ' ' : ''}${l.kind === 'review' ? '' : (title ? '' : keys)}</b>
          <div class="meta">${l.kind === 'review' ? '<span class="badge">Review</span>' : ''}${(l.kind === 'keys' || l.kind === 'chords') ? keys : ''}<span class="segs">${Array.from({ length: segN }, (_, k) => `<i class="${k < segDone ? 'on' : ''}"></i>`).join('')}</span>${p && p.stars ? starsHtml(p.stars) + `<span>${Math.round(p.bestWpm || 0)} wpm · ${Math.round(p.bestAcc || 0)}%</span>` : ''}</div></div>
        <div class="act">${un ? `<button class="btn ${isNext ? 'go' : 'ghost'}" data-start="${i}"><span class="tri"></span>${isDone(l) ? 'Redo' : 'Start'}</button>` : `<button class="btn ghost" disabled>Locked</button>`}</div>
      </div>`;
    });
    html += `</div></details>`;
  });
  return html;
}

function practiceView(){
  const pk = problemKeys(20);
  const misf = S.stats.misfires;
  // Left column = things you start; right column = how you're doing. Problem keys is the only card that
  // changes height (its table grows, then scrolls), so it goes at the bottom of its column where it can
  // grow downward freely; the fixed-height misfires card sits above it. Columns keep natural heights.
  const freeCard = `<div class="card field"><h3 style="font-size:19px">Free practice</h3>
      <p class="muted" style="margin:0 0 4px">Words and sentences from all your unlocked keys.</p>
      <div class="actions"><button class="btn go" data-act="practice-free"><span class="tri"></span>Start free practice</button></div></div>`;
  const textCard = `<div class="card field"><h3 style="font-size:19px">Your own text</h3>
      <label for="customText" class="muted" style="font-weight:400">Paste code, notes or anything you type often.</label>
      <textarea id="customText" placeholder="const total = items.reduce((a, b) => a + b, 0);">${esc(S.customText)}</textarea>
      <div class="actions"><button class="btn go" data-act="practice-custom"><span class="tri"></span>Type this text</button></div></div>`;
  const pkCard = `<div class="card field"><h3 style="font-size:19px">Problem keys${pk.length ? ` <span class="muted" style="font-size:14px;font-weight:400">${pk.length}</span>` : ''}</h3>
      ${pk.length ? `<div class="ptable-scroll"><table class="ptable"><thead><tr><th>Key</th><th>Miss rate</th><th>Avg time</th><th>Typed</th></tr></thead><tbody>${pk.map(r => `<tr><td>${kc(r.k)}</td><td>${(r.er * 100).toFixed(0)}%</td><td>${Math.round(r.lat)} ms</td><td>${r.n}</td></tr>`).join('')}</tbody></table></div>
      <div class="actions"><button class="btn go" data-act="practice-problem"><span class="tri"></span>Practice problem keys</button></div>` : `<p class="muted" style="margin:4px 0 0">No problem keys yet. They appear once you have typed each key a few times.</p>`}
    </div>`;
  const misfCard = `<div class="card"><h3 style="font-size:19px">Home-row mod misfires</h3>
      <p class="muted" style="margin-top:4px">Counts each modifier that fires while you meant to type a letter.</p>
      <table class="ptable"><tbody>
        <tr><td>Accidental Shift</td><td>${misf.shift || 0}</td></tr>
        <tr><td>Accidental ⌘ or ⌃</td><td>${misf.mod || 0}</td></tr>
        <tr><td>Accidental ⌥</td><td>${misf.alt || 0}</td></tr></tbody></table>
      <p class="muted" style="font-size:13px">If one keeps climbing, type that finger's key a little more crisply or raise its tapping term.</p>
    </div>`;
  return `<div class="section-title"><h2>Practice</h2><span class="muted">Uses only the keys you have unlocked</span></div>
  <div class="pcols">
    <div class="pcol">${freeCard}${textCard}</div>
    <div class="pcol">${misfCard}${pkCard}</div>
  </div>`;
}

const KBD_NAME = { go60: 'Go60', glove80: 'Glove80' };
function presetsCard(){
  const presets = window.HOMEROW_PRESETS || [];
  if (!presets.length) return '';
  const groups = {};
  presets.forEach((p, i) => { (groups[p.keyboard] = groups[p.keyboard] || []).push(i); });
  const sel = +S.presetSel >= 0 && +S.presetSel < presets.length ? +S.presetSel : 0;
  const opt = i => { const p = presets[i], added = p.uuid && S.layouts[String(p.uuid)];
    return `<option value="${i}" ${i === sel ? 'selected' : ''}>${esc(p.title || 'Layout')}${added ? ' ✓' : ''}</option>`; };
  const order = ['go60', 'glove80'];
  const keys = Object.keys(groups).sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
  const optgroups = keys.map(k =>
    `<optgroup label="${esc(KBD_NAME[k] || k)}">${groups[k].map(opt).join('')}</optgroup>`).join('');
  const cur = presets[sel], curId = cur && String(cur.uuid || '');
  const inUse = curId && curId === S.activeId;
  const btn = inUse ? '<span class="badge" style="align-self:center">In use</span>'
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
  const saved = Object.entries(S.layouts).map(([id, r]) => `<div class="row ${id === S.activeId ? 'on' : ''}"><div><b>${esc(r.name)}</b><div class="muted" style="font-size:13px">${esc(r.keyboard || 'keyboard')} · saved ${new Date(r.savedAt).toLocaleDateString()}</div></div>
    <div style="display:flex;gap:8px">${id === S.activeId ? '<span class="badge">In use</span>' : `<button class="btn" data-use="${esc(id)}">Use</button>`}
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
      <p class="muted" style="font-size:13px">Progress and key stats are kept separately for each layout.</p></div>
  </div>`;
}

function settingsView(){
  const s = S.settings;
  const sel = (id, opts, v) => `<select id="${id}">${opts.map(([val, t]) => `<option value="${val}" ${String(v) === String(val) ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
  return `<div class="section-title"><h2>Settings</h2></div>
  <div class="grid2">
    <div class="card field"><h3 style="font-size:19px">Numbers &amp; symbols</h3>
      <label for="routePref">Where lessons route them</label>
      ${sel('routePref', [['layers', 'Thumb layers (Miryoku style)'], ['reach', 'Number row and reach keys']], s.routePref)}
      <small>Changes where lessons send you for digits, brackets and punctuation when your layout has both.</small></div>
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

const CREDITS = [['moosytype', 'https://github.com/moosylog/moosytype'], ['typing.com', 'https://www.typing.com'], ['keybr.com', 'https://www.keybr.com'],
  ['Miryoku', 'https://github.com/manna-harbour/miryoku'], ['MoErgo', 'https://www.moergo.com'], ['ZMK', 'https://zmk.dev'], ['wordfreq (CC BY-SA 4.0)', 'https://github.com/rspeer/wordfreq']];
function footer(){
  return `<footer class="credits"><p>Inspired by ${CREDITS.slice(0, 3).map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${n}</a>`).join(', ')}. Layout and keymap formats from ${CREDITS.slice(3, 6).map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${n}</a>`).join(', ')}. Word list from <a href="${CREDITS[6][1]}" target="_blank" rel="noopener">${CREDITS[6][0]}</a>. Fonts: Atkinson Hyperlegible, Bricolage Grotesque, IBM Plex Mono <span style="white-space:nowrap">(SIL OFL)</span>.</p></footer>`;
}
function render(){
  if (S.run) { renderRun(true); return; }
  const main = S.view === 'learn' ? learnView() : S.view === 'practice' ? practiceView() : S.view === 'layout' ? layoutView() : settingsView();
  $('#app').innerHTML = header() + `<div class="shell">${sidebar()}<main class="main">${main}</main></div>` + footer();
}

/* ---------- running a lesson ---------- */
function computeStars(acc, wpm, kind){
  const s = S.settings;
  if (acc < s.passAcc) return 0;
  if (kind === 'keys' || kind === 'chords') return acc >= 100 ? 3 : acc >= 97 ? 2 : 1;
  if (wpm < s.targetWpm) return 1;
  return acc >= 98 && wpm >= s.targetWpm * 1.25 ? 3 : 2;
}
function startLesson(i){
  const l = S.C.lessons[i];
  const stages = E.makeStages(S.C, l, WORDS, +S.settings.stageLen);
  beginRun({ lesson: l, lessonIdx: i, stages, title: `Lesson ${l.num}: ${l.title}` });
}
function beginRun(o){
  S.run = Object.assign({ si: 0, results: [] }, o);
  resetStage();
  renderRun(true);
}
function resetStage(){
  const r = S.run;
  Object.assign(r, { items: r.stages[r.si].items, idx: 0, tried: new Set(), wrong: new Set(), errCount: 0, t0: null, last: null,
    misfires: { shift: 0, mod: 0, alt: 0 }, result: null, lastMisfire: null });
}
function liveNums(){
  const r = S.run;
  const secs = r.t0 ? ((r.result ? r.tEnd : performance.now()) - r.t0) / 1000 : 0;
  const n = r.tried.size;
  const wpm = secs > 1 ? (r.idx / 5) / (secs / 60) : 0;
  const acc = n ? (n - r.errCount) / n * 100 : 100;
  return { secs, wpm, acc };
}
function renderRun(full){
  const r = S.run;
  if (full) {
    const newKeys = r.lesson && r.lesson.kind !== 'review' ? r.lesson.items.map(c => kc(c, 'big')).join('') : '';
    $('#app').innerHTML = header() + `<div class="wrap" style="padding-block:20px 60px"><div class="run">
      <div class="runbar"><button class="btn ghost" data-act="exit">← Lessons</button><h2>${esc(r.title)}</h2>
        <div class="live"><div class="stat"><small>Speed</small><b id="lvW">0<em>wpm</em></b></div><div class="stat"><small>Accuracy</small><b id="lvA">100<em>%</em></b></div><div class="stat"><small>Time</small><b id="lvT">0:00</b></div></div></div>
      <div class="stagechips" id="chips"></div>
      ${newKeys ? `<div class="newkeys">New keys ${newKeys}</div>` : ''}
      <div class="typebox" id="typebox"><div class="viewport"><div class="textline" id="textline"></div></div><div id="overlay"></div></div>
      <div class="hint" id="hint"></div>
      ${S.settings.showKeyboard ? `<div class="kbwrap" id="kb"></div>` : ''}
      <p class="muted" style="font-size:13px;margin:0">Esc leaves the lesson. Homerow can't block every browser shortcut, like ⌘W, so watch for accidental Command holds.</p>
    </div></div>`;
    paintText();
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
  if (it && !r.result) {
    const h = hintFor(it);
    $('#hint').innerHTML = h.html + (r.lastMisfire ? ` <span class="misfire">${esc(r.lastMisfire)}</span>` : '');
    const kb = $('#kb');
    if (kb) {
      kb.innerHTML = kbSVG(h.r ? h.r.layer : 0, h.r ? { target: h.r.pos, holds: h.r.holds } : {}) + legendHtml();
      // On narrow screens the keyboard scrolls horizontally; keep the target key in view.
      const tg = kb.querySelector('.tgtg');
      if (tg && kb.scrollWidth > kb.clientWidth + 4) {
        const t = tg.getBoundingClientRect(), k = kb.getBoundingClientRect();
        kb.scrollLeft += (t.left + t.width / 2) - (k.left + k.width / 2);
      }
    }
  }
  // overlay
  const ov = $('#overlay');
  if (r.result) ov.innerHTML = resultCard();
  else if (!document.hasFocus()) ov.innerHTML = `<button class="focusveil" data-act="focus">Click here, then start typing</button>`;
  else ov.innerHTML = r.t0 ? '' : '';
}
function updateLive(){
  const n = liveNums();
  const w = $('#lvW'), a = $('#lvA'), t = $('#lvT');
  if (w) w.innerHTML = `${Math.round(n.wpm)}<em>wpm</em>`;
  if (a) a.innerHTML = `${Math.round(n.acc)}<em>%</em>`;
  if (t) t.textContent = fmtTime(n.secs);
}
// Tick the live speed/accuracy readout only while a timed run is in progress; self-stops otherwise.
let liveTimer = null;
function startLiveTimer(){ if (liveTimer == null) liveTimer = setInterval(() => { if (S.run && S.run.t0 && !S.run.result) updateLive(); else stopLiveTimer(); }, 500); }
function stopLiveTimer(){ if (liveTimer != null) { clearInterval(liveTimer); liveTimer = null; } }

function resultCard(){
  const r = S.run, res = r.result;
  const lastStage = r.si === r.stages.length - 1;
  const mf = res.misfires.shift + res.misfires.mod + res.misfires.alt;
  if (res.lessonDone) {
    return `<div class="result"><h3>${res.stars ? 'Lesson complete' : 'Lesson finished'}</h3>${starsHtml(res.stars)}
      <div class="nums"><div class="stat"><small>Speed</small><b>${Math.round(res.wpm)}<em>wpm</em></b></div><div class="stat"><small>Accuracy</small><b>${Math.round(res.acc)}<em>%</em></b></div></div>
      <div class="row">${r.lesson && r.lessonIdx < S.C.lessons.length - 1 ? `<button class="btn go" data-act="next-lesson"><span class="tri"></span>Next lesson (Enter)</button>` : ''}<button class="btn" data-act="redo-lesson">Redo lesson</button><button class="btn ghost" data-act="exit">Back to lessons</button></div></div>`;
  }
  return `<div class="result"><h3>${res.pass ? 'Stage passed' : 'Not quite'}</h3>${starsHtml(res.stars)}
    <div class="nums"><div class="stat"><small>Speed</small><b>${Math.round(res.wpm)}<em>wpm</em></b></div><div class="stat"><small>Accuracy</small><b>${Math.round(res.acc)}<em>%</em></b></div>${mf ? `<div class="stat"><small>Mod misfires</small><b>${mf}</b></div>` : ''}</div>
    ${res.pass ? '' : `<p class="muted" style="margin:0">You need ${S.settings.passAcc}% accuracy to move on. Slow down a little.</p>`}
    ${res.missed.length ? `<div class="newkeys">Missed ${res.missed.map(c => kc(c, 'warn')).join('')}</div>` : ''}
    <div class="row">${res.pass ? `<button class="btn go" data-act="next-stage"><span class="tri"></span>${lastStage ? 'Finish lesson' : 'Next stage'} (Enter)</button><button class="btn" data-act="retry-stage">Retry</button>` : `<button class="btn go" data-act="retry-stage"><span class="tri"></span>Try again (Enter)</button>`}</div></div>`;
}

function finishStage(now){
  const r = S.run; r.tEnd = now;
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
    st.progress[r.lesson.id] = p;
  }
  saveStats();
  renderRun(false);
  paintChips();
}
function finishLesson(){
  const r = S.run;
  const res = r.results.filter(Boolean);
  const acc = res.reduce((a, x) => a + x.acc, 0) / res.length, wpm = res.reduce((a, x) => a + x.wpm, 0) / res.length;
  const kind = r.lesson ? (r.lesson.kind === 'review' ? r.lesson.reviewKind : r.lesson.kind) : 'practice';
  const stars = Math.max(1, computeStars(acc, wpm, kind));
  if (r.lesson) {
    const p = S.stats.progress[r.lesson.id] || {};
    p.stars = Math.max(p.stars || 0, stars); p.bestWpm = Math.max(p.bestWpm || 0, kind === 'keys' || kind === 'chords' ? 0 : wpm);
    p.bestAcc = Math.max(p.bestAcc || 0, acc); p.stageCount = r.stages.length; p.stagesDone = r.stages.length;
    S.stats.progress[r.lesson.id] = p; saveStats();
  }
  r.result = { lessonDone: true, acc, wpm, stars, misfires: { shift: 0, mod: 0, alt: 0 }, missed: [] };
  paintState();
}
function nextStage(){
  const r = S.run;
  if (r.si >= r.stages.length - 1) { finishLesson(); return; }
  r.si++; resetStage(); renderRun(true);
}
function exitRun(){ stopLiveTimer(); S.run = null; render(); }

function onKey(e){
  const r = S.run; if (!r) return;
  if (r.result) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (r.result.lessonDone) { if (r.lesson && r.lessonIdx < S.C.lessons.length - 1) startLesson(r.lessonIdx + 1); else exitRun(); }
      else if (r.result.pass) nextStage(); else { resetStage(); renderRun(true); }
    } else if (e.key === 'Escape') { e.preventDefault(); exitRun(); }
    return;
  }
  if (e.key === 'Escape') { e.preventDefault(); exitRun(); return; }
  if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Fn', 'Hyper', 'Super', 'OS', 'AltGraph'].includes(e.key)) return;
  const it = r.items[r.idx]; if (!it) return;
  e.preventDefault();
  const now = performance.now();
  let ok = false, misfire = null;
  if (it.t === 'c') {
    if (e.key === 'Backspace') {
      if (!S.settings.stopOnError && r.idx > 0 && r.wrong.has(r.idx - 1)) { r.idx--; paintState(); }
      return;
    }
    let typed = e.key === 'Enter' ? '\n' : e.key;
    if (e.metaKey || e.ctrlKey) misfire = e.metaKey ? '⌘ fired instead of a letter' : '⌃ fired instead of a letter';
    else if (e.key === 'Dead' || (e.altKey && typed !== it.ch)) misfire = '⌥ fired instead of a letter';
    else if (typed.length === 1 && typed !== it.ch && typed.toLowerCase() === it.ch.toLowerCase() && /[a-z]/i.test(typed)) misfire = typed === typed.toUpperCase() ? 'Shift fired by accident' : 'Shift was not held';
    if (typed.length !== 1 && !misfire) return; // stray navigation key: ignore
    ok = !misfire && typed === it.ch;
    if (misfire) { const t = misfire.startsWith('⌘') || misfire.startsWith('⌃') ? 'mod' : misfire.startsWith('⌥') ? 'alt' : 'shift'; r.misfires[t]++; S.stats.misfires[t] = (S.stats.misfires[t] || 0) + 1; }
  } else {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const want = new Set(it.mods);
    const modsOk = ['ctrl', 'alt', 'meta', 'shift'].every(m => !!e[m + 'Key'] === want.has(m));
    ok = k === it.key && modsOk;
    if (k === it.key && !modsOk) misfire = 'Wrong modifier held';
  }
  r.lastMisfire = misfire;
  if (!r.t0) { r.t0 = now; r.last = now; startLiveTimer(); }
  const id = it.t === 'c' ? it.ch : E.keyId(it);
  const ks = S.stats.keys[id] || (S.stats.keys[id] = { n: 0, err: 0, lat: 0, ln: 0 });
  if (!r.tried.has(r.idx)) {
    r.tried.add(r.idx); ks.n++;
    if (!ok) { ks.err++; r.errCount++; }
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
    stages = chars.length ? E.practiceStages(S.C, unlocked, chars, WORDS, +S.settings.stageLen) : [];
    if (keys.length) stages.push({ name: 'Focus keys', items: Array.from({ length: 12 }, () => E.keyItem(keys[Math.floor(Math.random() * keys.length)])) });
    title = 'Problem keys: ' + pk.map(itemLabel).join(' ');
  } else if (kind === 'free') {
    stages = E.practiceStages(S.C, unlocked, [], WORDS, +S.settings.stageLen * 1.5);
    title = 'Free practice';
  } else {
    const t = (S.customText || '').replace(/\s+/g, ' ').trim();
    if (!t) return;
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
document.addEventListener('keydown', onKey);
window.addEventListener('focus', () => { if (S.run) paintState(); });
window.addEventListener('blur', () => { if (S.run) paintState(); });
document.addEventListener('click', e => {
  const t = e.target.closest('button, a[data-jump]'); if (!t) return;
  const d = t.dataset;
  if (d.jump) { e.preventDefault(); const el = document.getElementById(d.jump); if (el) { if (el.tagName === 'DETAILS') el.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
  if (d.view) { S.view = d.view; S.msg = null; S.confirmDel = null; render(); return; }
  if (d.start != null) { startLesson(+d.start); return; }
  if (d.layer != null) { S.layerView = +d.layer; render(); return; }
  if (d.use) { activate(d.use); S.msg = null; render(); return; }
  if (d.del) {
    if (Object.keys(S.layouts).length <= 1) { S.confirmDel = null; render(); return; }
    if (S.confirmDel !== d.del) { S.confirmDel = d.del; render(); return; }
    delete S.layouts[d.del]; store.set('layouts', S.layouts); store.del('stats.' + d.del); S.confirmDel = null;
    if (d.del === S.activeId) activate(Object.keys(S.layouts)[0]);
    render(); return;
  }
  switch (d.act) {
    case 'exit': exitRun(); break;
    case 'focus': window.focus(); paintState(); break;
    case 'next-stage': nextStage(); break;
    case 'retry-stage': resetStage(); renderRun(true); break;
    case 'next-lesson': startLesson(S.run.lessonIdx + 1); break;
    case 'redo-lesson': if (S.run.lesson) startLesson(S.run.lessonIdx); else { S.run.si = 0; S.run.results = []; resetStage(); renderRun(true); } break;
    case 'practice-problem': startPractice('problem'); break;
    case 'practice-free': startPractice('free'); break;
    case 'practice-custom': S.customText = ($('#customText') || {}).value || ''; startPractice('custom'); break;
    case 'add-selected': {
      const i = ($('#presetSel') || {}).value, p = (window.HOMEROW_PRESETS || [])[+i];
      S.presetSel = +i || 0;
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
    case 'reset':
      if (S.confirmDel !== '__reset') { S.confirmDel = '__reset'; render(); break; }
      S.stats = freshStats(); saveStats(); S.confirmDel = null; render(); break;
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'presetSel') { S.presetSel = +t.value || 0; render(); return; }
  if (t.id === 'layoutFile' && t.files && t.files[0]) {
    const f = t.files[0], rd = new FileReader();
    rd.onload = () => { try { const L = loadLayoutText(String(rd.result), f.name.replace(/\.[^.]+$/, '')); S.msg = S.msg && S.msg.t === 'err' ? S.msg : { t: 'ok', m: `Loaded ${L.title} from ${f.name}. Lessons rebuilt for this layout.` }; } catch (err) { S.msg = { t: 'err', m: `${f.name}: ${err.message}` }; } render(); };
    rd.readAsText(f); return;
  }
  const keys = ['routePref', 'passAcc', 'targetWpm', 'stageLen', 'dailyGoal', 'stopOnError', 'showKeyboard', 'showFingers', 'unlockAll', 'theme'];
  if (keys.includes(t.id)) {
    const v = t.type === 'checkbox' ? t.checked : (t.tagName === 'SELECT' && (t.id === 'routePref' || t.id === 'theme')) ? t.value : Math.max(1, +t.value || DEFAULT_SETTINGS[t.id]);
    S.settings[t.id] = v; store.set('settings', S.settings);
    if (t.id === 'routePref') rebuild();
    if (t.id === 'theme') applyTheme(v);
    render();
  }
});
document.addEventListener('input', e => { if (e.target.id === 'customText') S.customText = e.target.value; });

/* ---------- boot ---------- */
applyTheme(S.settings.theme);
// Miryoku (macOS) on Go60, from the Starter layouts catalog (data/presets/).
const DEFAULT_LAYOUT_ID = 'bcbba205-ff1e-4254-9bda-d85cfbac68ff';
function defaultPreset(){
  const ps = window.HOMEROW_PRESETS || [];
  if (!ps.length) return null;
  return ps.find(p => String(p.uuid) === DEFAULT_LAYOUT_ID) || ps[0];
}
function seedDefault(){
  const p = defaultPreset();
  if (!p) return;
  const txt = JSON.stringify(p);
  const L = E.buildLayout(txt);
  S.layouts[L.id] = { name: L.title, keyboard: L.keyboard, text: txt, savedAt: Date.now() };
  if (!store.set('layouts', S.layouts)) S.msg = { t: 'err', m: 'This browser blocked storage, so your layouts, progress and stats will not be remembered after you close the page.' };
  activate(L.id);
}
try {
  if (S.activeId && S.layouts[S.activeId]) activate(S.activeId);
  else if (Object.keys(S.layouts).length) activate(Object.keys(S.layouts)[0]);
  else seedDefault();
} catch (err) {
  console.error(err); S.layouts = {}; seedDefault();
}
render();
})();
