/* ============================================================
   Homerow Trainer engine: layout parsing, routing, curriculum, drills.
   Pure functions, no DOM. Testable in node.
   ============================================================ */

/* ---------- Keycode tables (US ANSI host layout) ---------- */
const MODS = {
  LSHFT:'shift',RSHFT:'shift',LSHIFT:'shift',RSHIFT:'shift',LS:'shift',RS:'shift',
  LCTRL:'ctrl',RCTRL:'ctrl',LCTL:'ctrl',RCTL:'ctrl',LC:'ctrl',RC:'ctrl',LCONTROL:'ctrl',RCONTROL:'ctrl',
  LALT:'alt',RALT:'alt',LA:'alt',RA:'alt',LOPT:'alt',ROPT:'alt',
  LGUI:'meta',RGUI:'meta',LG:'meta',RG:'meta',LCMD:'meta',RCMD:'meta',LWIN:'meta',RWIN:'meta',LMETA:'meta',RMETA:'meta'
};
const WRAP = {LS:'shift',RS:'shift',LC:'ctrl',RC:'ctrl',LA:'alt',RA:'alt',LG:'meta',RG:'meta'};
const MOD_SYM = {ctrl:'⌃',alt:'⌥',shift:'⇧',meta:'⌘'};
const MOD_NAME = {ctrl:'Control',alt:'Option',shift:'Shift',meta:'Command'};
const MOD_ORDER = ['ctrl','alt','shift','meta'];

const CH = {};
function addCh(names, a, b){ names.split(' ').forEach(n => { CH[n] = [a, b]; }); }
'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(L => addCh(L, L.toLowerCase(), L));
(function(){
  const sh = ')!@#$%^&*(';
  for (let i = 0; i < 10; i++) {
    addCh(`N${i} NUMBER_${i}`, String(i), sh[i]);
    addCh(`KP_N${i} KP_NUMBER_${i}`, String(i), String(i));
  }
})();
addCh('SPACE SPC', ' ', ' ');
addCh('MINUS', '-', '_'); addCh('EQUAL', '=', '+');
addCh('LBKT LEFT_BRACKET', '[', '{'); addCh('RBKT RIGHT_BRACKET', ']', '}');
addCh('BSLH BACKSLASH NON_US_BSLH NON_US_BACKSLASH NON_US_HASH', '\\', '|');
addCh('SEMI SEMICOLON', ';', ':'); addCh('SQT APOS APOSTROPHE SINGLE_QUOTE', "'", '"');
addCh('GRAVE', '`', '~'); addCh('COMMA', ',', '<'); addCh('DOT PERIOD', '.', '>');
addCh('FSLH SLASH', '/', '?');
addCh('KP_DOT', '.', '.'); addCh('KP_PLUS', '+', '+'); addCh('KP_MINUS', '-', '-');
addCh('KP_MULTIPLY KP_ASTERISK', '*', '*'); addCh('KP_DIVIDE KP_SLASH', '/', '/');
addCh('KP_EQUAL', '=', '='); addCh('KP_COMMA', ',', ',');
const SHIFTED = {EXCL:'!',EXCLAMATION:'!',AT:'@',AT_SIGN:'@',HASH:'#',POUND:'#',DLLR:'$',DOLLAR:'$',
  PRCNT:'%',PERCENT:'%',CARET:'^',AMPS:'&',AMPERSAND:'&',STAR:'*',ASTRK:'*',ASTERISK:'*',
  LPAR:'(',LEFT_PARENTHESIS:'(',RPAR:')',RIGHT_PARENTHESIS:')',UNDER:'_',UNDERSCORE:'_',PLUS:'+',
  LBRC:'{',LEFT_BRACE:'{',RBRC:'}',RIGHT_BRACE:'}',PIPE:'|',TILDE:'~',COLON:':',DQT:'"',DOUBLE_QUOTES:'"',
  LT:'<',LESS_THAN:'<',GT:'>',GREATER_THAN:'>',QMARK:'?',QUESTION:'?'};
/* Codes whose output depends on the host OS layout: route them last. */
const AMBIGUOUS = new Set(['NON_US_HASH','NON_US_BSLH','NON_US_BACKSLASH']);

const NAMED = {
  LEFT:['ArrowLeft','←'],LEFT_ARROW:['ArrowLeft','←'],RIGHT:['ArrowRight','→'],RIGHT_ARROW:['ArrowRight','→'],
  UP:['ArrowUp','↑'],UP_ARROW:['ArrowUp','↑'],DOWN:['ArrowDown','↓'],DOWN_ARROW:['ArrowDown','↓'],
  HOME:['Home','Home'],END:['End','End'],PG_UP:['PageUp','PgUp'],PAGE_UP:['PageUp','PgUp'],
  PG_DN:['PageDown','PgDn'],PAGE_DOWN:['PageDown','PgDn'],
  RET:['Enter','Enter'],ENTER:['Enter','Enter'],RETURN:['Enter','Enter'],TAB:['Tab','Tab'],
  BSPC:['Backspace','Bksp'],BACKSPACE:['Backspace','Bksp'],DEL:['Delete','Del'],DELETE:['Delete','Del'],
  ESC:['Escape','Esc'],ESCAPE:['Escape','Esc'],INS:['Insert','Ins'],INSERT:['Insert','Ins'],
  CAPS:['CapsLock','Caps'],CAPSLOCK:['CapsLock','Caps']
};
const PRETTY = {K_UNDO:'Undo',K_REDO:'Redo',K_COPY:'Copy',K_PASTE:'Paste',K_CUT:'Cut',K_APP:'Menu',
  PSCRN:'PrtSc',SLCK:'ScrLk',K_PP:'Play',C_PP:'Play',C_MUTE:'Mute',C_VOL_UP:'Vol+',C_VOL_DN:'Vol−',
  C_PREV:'Prev',C_NEXT:'Next',C_BRI_UP:'Bri+',C_BRI_DN:'Bri−',PAUSE_BREAK:'Pause'};

function modsLabel(mods){ return MOD_ORDER.filter(m => mods.has(m)).map(m => MOD_SYM[m]).join(''); }

function parseParam(p){
  const mods = []; let cur = p;
  while (cur && WRAP[cur.value] && cur.params && cur.params.length) { mods.push(WRAP[cur.value]); cur = cur.params[0]; }
  return { code: cur ? String(cur.value) : '', mods };
}

function tapInfo(t){
  if (!t || !t.code) return null;
  const code = t.code.toUpperCase();
  const mods = new Set(t.mods);
  let ch = null, key = null, label = null, mod = null;
  if (SHIFTED[code]) { ch = SHIFTED[code]; mods.delete('shift'); }
  else if (CH[code]) { ch = CH[code][mods.has('shift') ? 1 : 0]; mods.delete('shift'); }
  if (ch && (mods.has('ctrl') || mods.has('meta') || mods.has('alt'))) {
    const sh = ch !== ch.toLowerCase();
    const m = new Set(mods); if (sh) m.add('shift');
    key = { key: ch.toLowerCase(), mods: [...m].sort() };
    label = modsLabel(m) + ch.toUpperCase(); ch = null;
  } else if (!ch && NAMED[code]) {
    key = { key: NAMED[code][0], mods: [...mods].sort() };
    label = modsLabel(mods) + NAMED[code][1];
  } else if (!ch && MODS[code]) {
    mod = MODS[code];
    const all = new Set([...mods, mod]);
    label = all.size >= 3 ? 'Hyper' : modsLabel(all);
  } else if (!ch) {
    label = modsLabel(mods) + (PRETTY[code] || code.replace(/^(C_|K_)/, '').replace(/_/g, ' '));
  }
  if (ch) label = ch === ' ' ? 'Space' : (/[a-z]/.test(ch) ? ch.toUpperCase() : ch);
  return { code, ch, key, mod, bareMod: mod && !mods.size ? mod : null, label, ambiguous: AMBIGUOUS.has(code) };
}

function isNum(p){ return p != null && /^\d+$/.test(String(p.value)); }

function parseBinding(b, ht){
  const v = b && b.value ? String(b.value) : '&none';
  const P = (b && b.params) || [];
  const k = { beh: v, tap: null, hold: null, label: '' };
  if (v === '&kp') k.tap = tapInfo(parseParam(P[0]));
  else if (v === '&mt') { const m = MODS[parseParam(P[0]).code]; if (m) k.hold = { mod: m }; k.tap = tapInfo(parseParam(P[1])); }
  else if (v === '&lt') { k.hold = { layer: +P[0].value }; k.tap = tapInfo(parseParam(P[1])); }
  else if (v === '&mo') { k.hold = { layer: +P[0].value }; }
  else if (v === '&sk') { const m = MODS[parseParam(P[0]).code]; if (m) k.hold = { mod: m, sticky: true }; k.label = m ? 'Sticky ' + MOD_SYM[m] : 'Sticky'; }
  else if (v === '&trans') k.trans = true;
  else if (v === '&none') k.none = true;
  else if (P.length === 2) {
    const def = ht[v];
    const first = def && def.bindings ? def.bindings[0] : null;
    if (first === '&mo' || first === '&lt' || (!first && isNum(P[0]))) k.hold = { layer: +P[0].value };
    else { const m = MODS[parseParam(P[0]).code]; if (m) k.hold = { mod: m }; }
    k.tap = tapInfo(parseParam(P[1]));
  } else if (v === '&tog' || v === '&to' || v === '&tl') {
    k.label = (v === '&tog' ? 'Toggle ' : 'To ') + (P[0] ? P[0].value : '');
  } else {
    k.label = v.replace(/^&/, '').replace(/_/g, ' ') + (P[0] ? ' ' + String(P[0].value).replace(/_/g, ' ') : '');
  }
  return k;
}

/* ---------- ZMK .keymap text parsing ---------- */
function parseDtsParams(str){
  // "LS(N1)" -> {value:'LS', params:[{value:'N1'}]}
  str = str.trim();
  const m = str.match(/^([A-Za-z0-9_]+)\((.*)\)$/);
  if (m) return { value: m[1], params: [parseDtsParams(m[2])] };
  return { value: /^\d+$/.test(str) ? +str : str };
}
function tokenizeBindings(body){
  const out = [];
  const parts = body.split('&').map(s => s.trim()).filter(Boolean);
  for (const part of parts) {
    const toks = []; let depth = 0, cur = '';
    for (const c of part) {
      if (c === '(') depth++;
      if (c === ')') depth--;
      if (/\s/.test(c) && depth === 0) { if (cur) toks.push(cur); cur = ''; } else cur += c;
    }
    if (cur) toks.push(cur);
    out.push({ value: '&' + toks[0], params: toks.slice(1).map(parseDtsParams) });
  }
  return out;
}
function parseZmkKeymap(text){
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const holdTaps = [];
  const htRe = /(\w+)\s*:\s*[\w-]+\s*\{[^{}]*?compatible\s*=\s*"zmk,behavior-hold-tap"[^{}]*?bindings\s*=\s*<\s*(&\w+)[^>]*>\s*,\s*<\s*(&\w+)/g;
  let m;
  while ((m = htRe.exec(clean))) holdTaps.push({ name: '&' + m[1], bindings: [m[2], m[3]] });
  const kmStart = clean.search(/keymap\s*\{/);
  if (kmStart < 0) throw new Error('No keymap { … } block found in this file.');
  const km = clean.slice(kmStart);
  const layerRe = /([\w-]+)\s*\{([^{}]*?)bindings\s*=\s*<([\s\S]*?)>\s*;/g;
  const layers = [], names = [];
  while ((m = layerRe.exec(km))) {
    const dn = m[2].match(/(?:display-name|label)\s*=\s*"([^"]*)"/);
    names.push(dn ? dn[1] : m[1].replace(/_layer$/, ''));
    layers.push(tokenizeBindings(m[3]));
  }
  if (!layers.length) throw new Error('Found a keymap block but no layer bindings in it.');
  return { title: 'ZMK keymap', keyboard: '', layer_names: names, layers, holdTaps };
}

/* ---------- Geometry ---------- */
const FINGERS = ['pinky','ring','middle','index','thumb'];
function halfFingers(w){
  if (w >= 7) return ['pinky','pinky','ring','middle','index','index','index'];
  if (w === 6) return ['pinky','pinky','ring','middle','index','index'];
  if (w === 5) return ['pinky','ring','middle','index','index'];
  return ['pinky','ring','middle','index'].slice(4 - w);
}
const STAGGER6 = [0.38, 0.38, 0.12, 0, 0.14, 0.26];

function gridKey(pos, row, col, cols, gap, extraY){
  const half = cols / 2, left = col < half;
  const hc = left ? col : cols - 1 - col;           // distance from outer edge
  const fingers = halfFingers(half);
  const st = half === 6 ? STAGGER6[hc] : (half === 5 ? STAGGER6[hc + 1] : 0);
  return {
    pos, row, col, hand: left ? 'L' : 'R', finger: fingers[hc],
    stretch: half === 6 ? (hc === 0 || hc === 5) : (half === 5 ? hc === 4 : false),
    x: left ? col : col + gap, y: row + st + (extraY || 0), r: 0
  };
}
function thumbArc(posList, hand, startX, y0, step, mirrorW){
  return posList.map((pos, i) => {
    const xL = startX + i * 1.08, yy = y0 + i * step, rot = 8 + i * 7;
    const g = { pos, row: 99, col: -1, hand, finger: 'thumb', stretch: false, x: xL, y: yy, r: rot, thumb: true };
    if (hand === 'R') { g.x = mirrorW - xL - 1; g.r = -rot; }
    return g;
  });
}
// MoErgo thumb keys sit on a natural arc: each is rotated about a shared pivot (rx, ry) rather than its
// own centre, which is what curves the cluster. Given the raw [x, y, r, rx, ry] (key top-left + pivot, in
// key units, from the MoErgo default geometry), fold the pivot rotation into the key's final centre so the
// renderer can keep rotating about the centre. KW is the key side in units (matches s = U - 6 in the UI).
const KW = 1 - 6 / 60;
function pivotThumb(pos, x, y, r, rx, ry, hand){
  const a = r * Math.PI / 180, cx = x + KW / 2, cy = y + KW / 2, dx = cx - rx, dy = cy - ry;
  const px = rx + dx * Math.cos(a) - dy * Math.sin(a), py = ry + dx * Math.sin(a) + dy * Math.cos(a);
  return { pos, row: 99, col: -1, hand, finger: 'thumb', stretch: false, x: px - KW / 2, y: py - KW / 2, r, thumb: true };
}

function buildGeometry(keyboard, n){
  const G = [];
  if (keyboard === 'go60' && n === 60) {
    const gap = 5, W = 12 + gap;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 12; c++) G.push(gridKey(r * 12 + c, r, c, 12, gap));
    // Go60 columns 2,3,4 (index/middle/ring, counting in from the centre) have a 5th row; 1,5,6 have four.
    [2, 3, 4].forEach((c, i) => G.push(gridKey(48 + i, 4, c, 12, gap)));
    [7, 8, 9].forEach((c, i) => G.push(gridKey(51 + i, 4, c, 12, gap)));
    // Thumb fan: one 3-key arc per hand, each key rotated about a pivot far below the board (ry = 9),
    // outer key first (least rotated). Raw [x, y, r, rx, ry] from the MoErgo Go60 default geometry.
    const thumbs = [                                        // pos, x, y, r, rx, ry, hand
      [54, 4, 4.25, 15, 4.5, 9, 'L'], [55, 4, 4.25, 30, 4.5, 9, 'L'], [56, 4, 4.25, 45, 4.5, 9, 'L'],   // outer -> inner
      [57, 12, 4.25, -15, 12.5, 9, 'R'], [58, 12, 4.25, -30, 12.5, 9, 'R'], [59, 12, 4.25, -45, 12.5, 9, 'R']
    ];
    thumbs.forEach(t => G.push(pivotThumb(...t)));
    G.sort((a, b) => a.pos - b.pos);
    return { keys: G, homeRow: 2, numRow: 0, width: W, height: 7.1, name: 'Go60' };
  }
  if (keyboard === 'glove80' && n === 80) {
    const gap = 6, W = 12 + gap;
    for (let i = 0; i < 5; i++) { G.push(gridKey(i, 0, i, 12, gap)); G.push(gridKey(5 + i, 0, 7 + i, 12, gap)); }
    for (let r = 1; r <= 4; r++) for (let c = 0; c < 12; c++) {
      const pos = r < 4 ? 10 + (r - 1) * 12 + c : (c < 6 ? 46 + c : 58 + (c - 6));
      G.push(gridKey(pos, r, c, 12, gap));
    }
    for (let i = 0; i < 5; i++) { G.push(gridKey(64 + i, 5, i, 12, gap)); G.push(gridKey(75 + i, 5, 7 + i, 12, gap)); }
    // Thumb clusters: an upper arc (Shift/Ctrl/Lower) and a lower arc (Bksp/Del/Alt) per hand, each key
    // rotated about a shared pivot so the cluster curves naturally. Raw [x, y, r, rx, ry] from the MoErgo
    // Glove80 default geometry; pivotThumb folds the pivot rotation into each key's centre.
    const thumbs = [                                        // pos, x, y, r, rx, ry, hand
      [52, 6.4, 4,   20,  4, 4,   'L'], [53, 7.8, 3.3, 30,  4, 3.3, 'L'], [54, 10.1, 1.5, 45,  4, 1.5, 'L'],  // Shift Ctrl Lower
      [69, 5.3, 5.4, 15,  4, 5.4, 'L'], [70, 6.6, 5,   25,  4, 5,   'L'], [71, 9,    3.2, 45,  4, 3.2, 'L'],  // Bksp  Del  Alt
      [57, 10.7, 4, -20, 14, 4,   'R'], [56, 9.3, 3.3,-30, 14, 3.3, 'R'], [55, 7,    1.5,-45, 14, 1.5, 'R'],  // Shift Ctrl Win/Gui
      [74, 11.7, 5.4,-15,14, 5.4, 'R'], [73, 10.4, 5, -25, 14, 5,   'R'], [72, 8,    3.2,-45, 14, 3.2, 'R']   // Space Enter Alt
    ];
    thumbs.forEach(t => G.push(pivotThumb(...t)));
    G.sort((a, b) => a.pos - b.pos);
    return { keys: G, homeRow: 3, numRow: 1, width: W, height: 8.6, name: 'Glove80' };
  }
  // Generic grid: rows of 10 or 12 plus thumbs
  let cols = 12, rows;
  if (n === 34 || n === 36 || n === 40) cols = 10;
  if (n % 12 === 0 && n >= 48) rows = n / 12;
  else rows = Math.min(Math.floor(n / cols), 4) || 1;
  const gap = 2;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const pos = r * cols + c; if (pos < n) G.push(gridKey(pos, r, c, cols, gap));
  }
  const rest = [];
  for (let p = rows * cols; p < n; p++) rest.push(p);
  const W = cols + gap, hl = Math.ceil(rest.length / 2);
  const startX = cols / 2 - Math.min(hl, 4) * 1.08 + 0.4;
  G.push(...thumbArc(rest.slice(0, hl), 'L', Math.max(startX, 0), rows + 0.4, 0.15, W));
  G.push(...thumbArc(rest.slice(hl), 'R', Math.max(startX, 0), rows + 0.4, 0.15, W).reverse());
  G.sort((a, b) => a.pos - b.pos);
  return { keys: G, homeRow: -1, numRow: -1, width: W, height: rows + 1.9 + rest.length * 0.05, name: `${n}-key grid` };
}

/* ---------- Layout model ---------- */
function detectFormat(text){
  const t = text.trim();
  if (t.startsWith('{')) return 'moergo';
  if (/keymap\s*\{/.test(t)) return 'zmk';
  throw new Error("This isn't a layout file Homerow Trainer can read. A MoErgo layout is JSON that starts with {, and a ZMK .keymap has a keymap { … } block.");
}

function buildLayout(text, opts){
  opts = opts || {};
  const fmt = detectFormat(text);
  let raw;
  if (fmt === 'moergo') {
    try { raw = JSON.parse(text); } catch (e) { throw new Error("Homerow Trainer couldn't read this JSON file: " + e.message); }
    if (!Array.isArray(raw.layers) || !raw.layers.length) throw new Error('The JSON has no "layers" array. Export the layout from the MoErgo Layout Editor.');
  } else raw = parseZmkKeymap(text);
  const n = Math.max(...raw.layers.map(l => l.length));
  if (!n) throw new Error('This layout has no keys on its layers. Export it again from the MoErgo Layout Editor, or check the .keymap file.');
  let keyboard = String(raw.keyboard || '').toLowerCase();
  if (!keyboard) keyboard = n === 80 ? 'glove80' : n === 60 ? 'go60' : '';
  const ht = {};
  (raw.holdTaps || []).forEach(h => { ht[h.name] = h; });
  const layers = raw.layers.map(l => l.map(b => parseBinding(b, ht)));
  // resolve &trans to base
  layers.forEach((l, li) => { if (li) l.forEach((k, p) => { if (k.trans) l[p] = Object.assign({}, layers[0][p], { inherited: true }); }); });
  // A file can parse but type nothing (an empty or placeholder export); refuse it rather than build an empty course.
  if (!layers[0].some(k => k.tap && k.tap.ch)) throw new Error("This layout's base layer has no keys that type a letter or symbol, so there's nothing to build lessons from.");
  const geo = buildGeometry(keyboard, n);
  const keys = geo.keys;
  // home row: row with most hold-mods; fallback row containing 'a'
  let home = geo.homeRow;
  if (home < 0) {
    const score = {};
    layers[0].forEach((k, p) => { const g = keys[p]; if (!g || g.thumb) return; if (k.hold && k.hold.mod) score[g.row] = (score[g.row] || 0) + 2; if (k.tap && k.tap.ch === 'a') score[g.row] = (score[g.row] || 0) + 3; });
    home = +Object.keys(score).sort((a, b) => score[b] - score[a])[0];
    if (isNaN(home)) home = 1;
  }
  keys.forEach(g => {
    if (g.thumb) g.role = 'thumb';
    else {
      const d = g.row - home;
      g.role = d === 0 ? 'home' : d === -1 ? 'top' : d === 1 ? 'bottom' : d === -2 ? 'num' : d < -2 ? 'fn' : 'extra';
    }
  });
  // Names come from the file and are sliced and shown as text, so anything that isn't a string falls back.
  const names = Array.isArray(raw.layer_names) ? raw.layer_names : [];
  const layerNames = layers.map((_, i) => typeof names[i] === 'string' && names[i] ? names[i] : i ? 'Layer ' + i : 'Base');
  return {
    id: String(opts.id || (typeof raw.uuid === 'string' && raw.uuid) || hashStr(text)), uuid: typeof raw.uuid === 'string' ? raw.uuid : '',
    title: (typeof raw.title === 'string' && raw.title) || opts.name || 'Untitled layout',
    keyboard: keyboard || 'generic', geo, keys, layers, layerNames, format: fmt, n
  };
}

function hashStr(s){ let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return 'L' + (h >>> 0).toString(36); }

/* ---------- Routing: how to produce each character ---------- */
const ROLE_COST = { home: 0, top: 0.3, bottom: 0.35, thumb: 0.1, num: 0.9, extra: 1, fn: 5 };
const FINGER_RANK = { index: 0, middle: 1, ring: 2, pinky: 3, thumb: 4 };

function keyCost(L, p, pref){
  const g = L.keys[p]; if (!g) return 99;
  let c = 1 + (ROLE_COST[g.role] || 0);
  if (pref === 'layers' && (g.role === 'num' || g.role === 'extra')) c += 2.6;
  if (g.stretch) c += 0.4;
  if (g.finger === 'pinky') c += 0.15;
  return c;
}

function pickHolder(L, list, p, pref){
  const g = L.keys[p]; let best = null, bc = 1e9;
  for (const h of list) {
    if (h === p) continue;
    const hg = L.keys[h]; if (!hg) continue;
    let c = keyCost(L, h, pref);
    if (g && hg.hand === g.hand) c += g.thumb ? 0.5 : 3;
    if (hg.thumb) c -= 0.3;
    if (c < bc) { bc = c; best = h; }
  }
  return best == null ? null : { pos: best, cost: bc };
}

/* Modifier keys come in two kinds: hold-taps that type a letter when tapped (home row mods)
   and dedicated keys (&kp LSHFT, sticky keys). modPref picks a kind; the other is the fallback
   so a layout with only one kind still gets capitals and shortcuts. */
function modifierKeys(L){
  const kinds = { homerow: {}, dedicated: {} };
  for (const k of Object.values(kinds)) for (const m of MOD_ORDER) k[m] = [];
  L.layers[0].forEach((k, p) => {
    if (k.hold && k.hold.mod) kinds[k.hold.sticky ? 'dedicated' : 'homerow'][k.hold.mod].push(p);
    else if (k.tap && k.tap.bareMod) kinds.dedicated[k.tap.bareMod].push(p);
  });
  const both = MOD_ORDER.some(m => kinds.homerow[m].length && kinds.dedicated[m].length);
  return Object.assign(kinds, { both });
}

function buildRoutes(L, pref, modPref){
  const base = L.layers[0];
  const mk = modifierKeys(L), modHolders = {}, layerActs = {};
  for (const m of MOD_ORDER) {
    const h = mk.homerow[m], d = mk.dedicated[m];
    modHolders[m] = modPref === 'homerow' ? (h.length ? h : d) : modPref === 'dedicated' ? (d.length ? d : h) : h.concat(d);
  }
  const shiftHolders = modHolders.shift;
  base.forEach((k, p) => {
    if (k.hold && k.hold.layer != null) (layerActs[k.hold.layer] = layerActs[k.hold.layer] || []).push(p);
  });
  const chars = {}, keys = {};
  // Characters a layer key and a base-layer number-row or reach key both type: the only ones the routing preference changes.
  const viaLayer = new Set(), viaReach = new Set();
  const consider = (map, id, r) => { if (!map[id] || map[id].cost > r.cost) map[id] = r; };
  L.layers.forEach((layer, li) => {
    layer.forEach((k, p) => {
      if (!k || !k.tap || k.inherited) return;
      const t = k.tap, reach = li === 0 && L.keys[p] && (L.keys[p].role === 'num' || L.keys[p].role === 'extra');
      let c = keyCost(L, p, pref) + (t.ambiguous ? 1.5 : 0), holds = [];
      if (li > 0) {
        const a = pickHolder(L, layerActs[li] || [], p, pref);
        if (!a) return;
        holds = [{ pos: a.pos, kind: 'layer', layer: li }];
        c += 1;
      }
      const r = { layer: li, pos: p, holds, cost: c };
      if (t.ch) {
        consider(chars, t.ch, r);
        if (li > 0) viaLayer.add(t.ch); else if (reach) viaReach.add(t.ch);
        if (li === 0) {
          const sh = CH[t.code] && CH[t.code][1];
          if (sh && sh !== t.ch) {
            if (reach) viaReach.add(sh);
            const s = pickHolder(L, shiftHolders, p, pref);
            if (s) consider(chars, sh, { layer: 0, pos: p, holds: [{ pos: s.pos, kind: 'mod', mod: 'shift' }], cost: c + 1.2 + (L.keys[s.pos].hand === L.keys[p].hand ? 1 : 0) });
          }
        }
      }
      if (t.key) consider(keys, keyId(t.key), Object.assign({ key: t.key, label: t.label }, r));
    });
  });
  return { chars, keys, modHolders, layerActs, bothModKinds: mk.both, bothRouteKinds: [...viaReach].some(c => viaLayer.has(c)) };
}
function keyId(k){ return (k.mods || []).slice().sort().join('+') + (k.mods && k.mods.length ? '+' : '') + k.key; }

/* chord route: mods held on the opposite hand + base key for the letter */
function chordRoute(L, R, mods, letter, pref){
  const r = R.chars[letter];
  if (!r || r.layer !== 0 || r.holds.length) return null;
  const holds = [];
  for (const m of mods) {
    const h = pickHolder(L, R.modHolders[m] || [], r.pos, pref);
    if (!h) return null;
    holds.push({ pos: h.pos, kind: 'mod', mod: m });
  }
  return { layer: 0, pos: r.pos, holds, cost: r.cost + mods.length };
}

/* ---------- Curriculum ---------- */
function charName(c){
  if (c === ' ') return 'Space';
  if (/[a-z]/.test(c)) return c.toUpperCase();
  return c;
}
function listTitle(arr){
  const n = arr.map(charName);
  if (n.length <= 1) return n.join('');
  if (arr.some(c => !/[a-z0-9 ]/i.test(c))) return n.join('  ');
  return n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1];
}
function sortSlots(L, items, routeOf){
  return items.slice().sort((a, b) => {
    const ga = L.keys[routeOf(a).pos], gb = L.keys[routeOf(b).pos];
    const ra = (FINGER_RANK[ga.finger] || 0) + (ga.stretch ? 5 : 0), rb = (FINGER_RANK[gb.finger] || 0) + (gb.stretch ? 5 : 0);
    if (ra !== rb) return ra - rb;
    if (ga.hand !== gb.hand) return ga.hand === 'L' ? -1 : 1;
    return ga.x - gb.x;
  });
}
function chunk(items, size){
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  if (out.length > 1 && out[out.length - 1].length === 1) out[out.length - 2].push(...out.pop());
  return out;
}

const CHORD_SETS = [
  { title: 'Copy, paste, cut', mods: ['meta'], letters: ['c', 'v', 'x'] },
  { title: 'Undo, select all, save', mods: ['meta'], letters: ['z', 'a', 's'] },
  { title: 'Redo and formatting', mods: ['meta'], letters: ['b', 'i', 'k'], extra: [{ mods: ['meta', 'shift'], letter: 'z' }] },
  { title: 'Control line editing', mods: ['ctrl'], letters: ['a', 'e', 'k'] }
];

function buildCurriculum(L, pref, modPref){
  const R = buildRoutes(L, pref, modPref);
  const units = [];
  const used = new Set();
  const rOf = c => R.chars[c];
  const isLetter = c => /^[a-z]$/.test(c);
  const allChars = Object.keys(R.chars).filter(c => c !== ' ' && c.length === 1);

  function addUnit(id, title, blurb, groups, kind, reviewEvery){
    if (!groups.length) return;
    const lessons = [];
    let since = 0, unitNew = [];
    groups.forEach((g, i) => {
      lessons.push({ id: id + ':' + g.join(''), title: g.title || listTitle(g), kind, items: g.slice() });
      unitNew.push(...g); since++;
      const last = i === groups.length - 1;
      if ((since >= (reviewEvery || 4) && !last) || (last && groups.length > 1)) {
        // Named by content so progress survives layout updates; legacyId is the old position-based id.
        lessons.push({ id: id + ':review:' + unitNew.join(''), legacyId: id + ':review' + lessons.length, title: last ? title + ' review' : 'Review', kind: 'review', reviewKind: kind, items: unitNew.slice() });
        since = 0;
      }
    });
    units.push({ id, title, blurb, lessons });
  }

  // Base rows (unshifted, layer 0, no holds)
  const baseRole = role => allChars.filter(c => { const r = rOf(c); return r.layer === 0 && !r.holds.length && L.keys[r.pos].role === role; });
  const roleTitles = { home: ['Home row', 'Your resting keys. Learn them before anything else.'],
    top: ['Top row', 'Reach up from the home row and come back.'],
    bottom: ['Bottom row', 'Curl down from the home row.'] };
  ['home', 'top', 'bottom'].forEach(role => {
    const cs = baseRole(role).filter(c => !used.has(c));
    const letters = sortSlots(L, cs.filter(isLetter), rOf), other = sortSlots(L, cs.filter(c => !isLetter(c)), rOf);
    const groups = chunk(letters, 2);
    if (other.length) groups.push(...chunk(other, 3));
    if (role === 'home' && groups.length && R.chars[' ']) groups[0].push(' ');
    groups.forEach(g => g.forEach(c => used.add(c)));
    addUnit('base-' + role, roleTitles[role][0], roleTitles[role][1], groups, 'learn', 4);
  });
  // ensure space is learned even with no home row
  if (!used.has(' ') && R.chars[' '] && units.length) { units[0].lessons[0].items.push(' '); units[0].lessons[0].title = listTitle(units[0].lessons[0].items); used.add(' '); }
  // Remaining base chars (reach keys: number row, extras, thumbs)
  const reach = sortSlots(L, allChars.filter(c => { const r = rOf(c); return r.layer === 0 && !r.holds.length && !used.has(c); }), rOf);
  reach.forEach(c => used.add(c));
  addUnit('base-reach', 'Reach keys', 'Keys outside the three main rows on your base layer.', chunk(reach, 3), 'learn', 4);

  // Capitals and shifted symbols
  const shifted = allChars.filter(c => { const r = rOf(c); return r.layer === 0 && r.holds.length && r.holds[0].mod === 'shift' && !used.has(c); });
  const capGroups = [];
  ['home', 'top', 'bottom'].forEach(role => {
    const caps = sortSlots(L, shifted.filter(c => /[A-Z]/.test(c) && L.keys[rOf(c).pos].role === role), rOf);
    chunk(caps, 6).forEach(g => { g.title = 'Capitals: ' + g.join(' '); capGroups.push(g); });
  });
  const restCaps = shifted.filter(c => /[A-Z]/.test(c) && !capGroups.some(g => g.includes(c)));
  if (restCaps.length) { const g = restCaps.slice(); g.title = 'Capitals: ' + g.join(' '); capGroups.push(g); }
  capGroups.forEach(g => g.forEach(c => used.add(c)));
  const shSyms = sortSlots(L, shifted.filter(c => !used.has(c)), rOf);
  const shGroups = chunk(shSyms, 3);
  shSyms.forEach(c => used.add(c));
  addUnit('shift-caps', 'Capitals', 'Hold Shift on the opposite hand, tap the letter.', capGroups, 'learn', 4);
  addUnit('shift-syms', 'Shifted symbols', 'Symbols you reach with Shift on your base layer.', shGroups, 'learn', 4);

  // Layer units
  for (let li = 1; li < L.layers.length; li++) {
    const cs = allChars.filter(c => rOf(c).layer === li && !used.has(c));
    if (!cs.length) continue;
    const groups = [];
    ['home', 'top', 'bottom', 'thumb', 'num', 'extra', 'fn'].forEach(role => {
      const rc = sortSlots(L, cs.filter(c => L.keys[rOf(c).pos].role === role), rOf);
      groups.push(...chunk(rc, role === 'thumb' ? 3 : 2));
    });
    cs.forEach(c => used.add(c));
    const act = R.layerActs[li] && pickHolder(L, R.layerActs[li], 0, pref);
    const name = L.layerNames[li] || 'Layer ' + li;
    addUnit('layer-' + li, name + ' layer', `Hold a thumb key to reach the ${name} layer.`, groups, 'learn', 4);
  }

  // Navigation keys (arrows, home/end)
  const navSets = [
    { title: 'Arrow keys', keys: ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'] },
    { title: 'Home, End, Page Up, Page Down', keys: ['Home', 'End', 'PageUp', 'PageDown'] }
  ];
  const navGroups = [];
  navSets.forEach(s => {
    const ids = s.keys.filter(k => R.keys[k]);
    if (ids.length >= 2) { const g = ids.slice(); g.title = s.title; navGroups.push(g); }
  });
  if (navGroups.length) {
    const lessons = navGroups.map(g => ({ id: 'nav:' + g.join(','), title: g.title, kind: 'keys', items: g.slice() }));
    units.push({ id: 'nav', title: 'Navigation', blurb: 'Move the cursor without leaving the home row.', lessons });
  }

  // Shortcuts via home-row mods
  const chordLessons = [];
  CHORD_SETS.forEach(s => {
    const items = [];
    s.letters.forEach(l => { const rr = chordRoute(L, R, s.mods, l, pref); if (rr) items.push(keyId({ key: l, mods: s.mods })); });
    (s.extra || []).forEach(e => { const rr = chordRoute(L, R, e.mods, e.letter, pref); if (rr) items.push(keyId({ key: e.letter, mods: e.mods })); });
    if (items.length >= 2) chordLessons.push({ id: 'chord:' + items.join(','), title: s.title, kind: 'chords', items });
  });
  if (chordLessons.length) units.push({ id: 'chords', title: 'Shortcuts', blurb: 'Hold the modifier on the opposite hand, then tap.', lessons: chordLessons });

  // number lessons globally
  let n = 0;
  units.forEach(u => u.lessons.forEach(l => { l.num = ++n; l.unit = u.id; }));
  return { units, routes: R, lessons: units.flatMap(u => u.lessons) };
}

/* Resolve the route (hint) for a drill item */
function routeFor(L, C, item, pref){
  if (item.t === 'c') return C.routes.chars[item.ch] || null;
  if (item.t === 'k') {
    if (!item.mods.length || (item.mods.length === 1 && C.routes.keys[keyId(item)])) return C.routes.keys[keyId(item)] || null;
    const letter = item.key.length === 1 ? item.key : null;
    return letter ? chordRoute(L, C.routes, item.mods, letter, pref) : (C.routes.keys[keyId(item)] || null);
  }
  return null;
}

/* ---------- Drill text generation ---------- */
function rand(n){ return Math.floor(Math.random() * n); }
function pick(a){ return a[rand(a.length)]; }
function shuffle(a){ a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

const PAIRS = { '(': ')', '[': ']', '{': '}', '<': '>' };
const CLOSERS = { ')': '(', ']': '[', '}': '{', '>': '<' };
const SNIPPETS = [
  'a = b;', 'x == y', 'x != y', 'a <= b', 'b >= a', 'i++', 'a && b', 'a || b', '!done', '#tag', '$price', '50%',
  'x^2', 'a * b', 'a / b', 'a - b', 'a + b', '~/code', '`npm test`', 'me@site.io', 'f(x)', 'arr[i]', 'obj.key',
  'k: v', '"text"', "'c'", 'snake_case', 'run()', 'if (ok) {}', 'x => x * 2', '# Title', '- item', '@param',
  '3.14', 'a | b', 'a & b', 'path\\to', 'n % 2', 'let x = [0];', 'const y = {};',
  'fn(a, b)', 'map[key]', '{ id: 1 }', '<div>', '</p>', 'a ? b : c', 'x += 1', 'y -= 2', 'i < n', 'git add .',
  'cd ~/src', 'ls -la', 'rm -rf', 'tx.hash', '[1, 2, 3]', '(a + b) * c', '$HOME', '#!/bin/sh',
  'user_id', 'a->b', 'a::b', 'x |> f', '#[derive]', 'f"{x}"', 'e.key', 'await fn();', '?.', '{...a}',
  'list[0] = 5', '(1, 2)', 'a % b == 0', 'n ^ m', '~x', '`a`', 'x // 2', '/* note */', '"%s"', './run.sh', 'src/app.js'
];
// Numbers change every drill so dates, versions and times don't repeat (issue #3).
const pad2 = n => String(n).padStart(2, '0');
const between = (a, b) => a + rand(b - a + 1);
const NUM_SNIPPETS = [
  () => `${between(1990, 2035)}-${pad2(between(1, 12))}-${pad2(between(1, 28))}`,
  () => `${pad2(between(1, 28))}/${pad2(between(1, 12))}/${between(1990, 2035)}`,
  () => `${between(1, 12)}/${between(1, 28)}`,
  () => `v${rand(5)}.${rand(20)}.${rand(10)}`,
  () => `${pad2(rand(24))}:${pad2(rand(60))}`,
  () => `${between(1, 12)}:${pad2(rand(60))} pm`,
  () => `$${between(1, 99)}.${pad2(rand(100))}`,
  () => `price = ${between(1, 99)}.${pad2(rand(100))};`,
  () => `${between(1, 99)}%`,
  () => `${between(1, 9)}.${rand(10)}${rand(10)}`,
  () => `${between(1, 9)}/${between(2, 10)}`,
  () => `192.168.${rand(10)}.${between(1, 254)}`,
  () => `0x${rand(256).toString(16)}`,
  () => `${between(100, 999)}-${between(1000, 9999)}`,
  () => `#${between(1, 999)}`,
  () => `${between(1, 20)}..${between(21, 99)}`,
  () => `app.js:${between(1, 400)}`,
  () => `~/notes/${between(2020, 2030)}-${pad2(between(1, 12))}.md`,
  () => `localhost:${pick([3000, 5173, 8000, 8080])}`,
  () => `/api/v${between(1, 3)}/users/${between(1, 999)}`,
  () => `${between(10, 999)} * ${between(2, 12)}`,
  () => `x += ${between(2, 99)}`
];
// Common English letter groups by length, roughly most frequent first.
const NGRAMS = [
  'th he in er an re on at en nd ti es or te of ed is it al ar st to nt ng se ha as ou io le ve co me de hi ri ro ic ne ea ra ce li ch ll be ma si om ur',
  'the and ing ion tio ent ati for her ter hat tha ere ate his con res ver all ons nce men ith ted ers pro thi wit are ess not ive was ect rea com eve per int est sta',
  'tion that ther with ment ions this here from ould ting hich ever they thin have were tive ough ight ence ance'
].map(s => s.split(' '));
const CONTRACTIONS = ["don't", "it's", "can't", "you're", "we'll", "isn't", "that's", "won't", "let's", "there's", "didn't", "they're"];
const COMPOUNDS = ['follow-up', 'well-known', 'long-term', 'short-term', 'real-time', 'full-time', 'part-time', 'built-in',
  'check-in', 'up-to-date', 'self-care', 'high-quality', 'day-to-day', 'one-on-one', 'open-source', 'brand-new'];

function lettersOf(set){ return [...set].filter(c => /[a-z]/.test(c)); }

function patternText(chars, len){
  // introduce: "ttt nnn tnt ntn ..."
  const cs = chars.filter(c => c !== ' ');
  if (!cs.length) return 'space '.repeat(4).trim();
  const out = [];
  cs.forEach(c => { out.push(c.repeat(3), c.repeat(2)); });
  while (out.join(' ').length < len) {
    const g = []; const n = 2 + rand(3);
    for (let i = 0; i < n; i++) g.push(pick(cs));
    out.push(g.join(''));
  }
  return out.join(' ');
}
function mixText(newC, known, len, stale){
  const nc = newC.filter(c => c !== ' '), kc = known.filter(c => c !== ' ' && /[a-z0-9]/i.test(c));
  // Known keys not typed lately count three times, so old keys come back without crowding out the new ones.
  const sc = (stale || []).filter(c => kc.includes(c) && !nc.includes(c));
  const pool = kc.length ? [...nc, ...nc, ...nc, ...kc, ...sc, ...sc] : nc;
  if (!pool.length) return '';
  const out = [];
  while (out.join(' ').length < len) {
    const n = 2 + rand(4), g = [];
    for (let i = 0; i < n; i++) g.push(pick(pool));
    if (nc.length && !g.some(c => nc.includes(c))) g[rand(n)] = pick(nc);
    out.push(g.join(''));
  }
  return out.join(' ');
}
function pseudoWord(letters, must){
  const V = letters.filter(c => 'aeiouy'.includes(c)), Cn = letters.filter(c => !'aeiouy'.includes(c));
  const n = 3 + rand(3); let w = '';
  for (let i = 0; i < n; i++) {
    const wantV = V.length && Cn.length ? i % 2 === 1 : true;
    w += wantV ? pick(V.length ? V : letters) : pick(Cn.length ? Cn : letters);
  }
  if (must && !w.includes(must)) { const i = rand(w.length); w = w.slice(0, i) + must + w.slice(i + 1); }
  return w;
}
function wordPool(unlocked, newC, WORDS){
  const lset = new Set(lettersOf(unlocked));
  const ok = WORDS.filter(w => [...w].every(c => lset.has(c)));
  const nl = newC.map(c => c.toLowerCase()).filter(c => /[a-z]/.test(c));
  const withNew = nl.length ? ok.filter(w => nl.some(c => w.includes(c))) : ok;
  return { ok, withNew };
}
function wordsText(newC, unlocked, len, WORDS, caps){
  const { ok, withNew } = wordPool(unlocked, newC, WORDS);
  const letters = lettersOf(unlocked);
  const nl = newC.map(c => c.toLowerCase()).filter(c => /[a-z]/.test(c));
  const out = [];
  let guard = 0;
  while (out.join(' ').length < len && guard++ < 400) {
    let w;
    if (withNew.length >= 4 && Math.random() < 0.7) w = pick(withNew);
    else if (ok.length >= 6) w = pick(ok);
    else w = pseudoWord(letters, nl.length ? pick(nl) : null);
    if (caps && caps.length) {
      const cap = caps.find(C => w[0] === C.toLowerCase());
      if (cap) w = cap + w.slice(1);
      else if (Math.random() < 0.6) { const C = pick(caps); w = C + (ok.filter(x => x[0] === C.toLowerCase())[0] || pseudoWord(letters)).slice(1); }
    }
    if (out[out.length - 1] !== w) out.push(w);
  }
  return out.join(' ');
}
function capPick(unlocked){ return [...unlocked].filter(c => /[A-Z]/.test(c)); }

/* Real sentences (data/sentences.json) once every letter in them is unlocked. Capitals and
   . , ? ! ; : that aren't unlocked yet are lowered or dropped; any other missing key rules a sentence out. */
const letterMasks = new WeakMap(), realCache = new Map();
const maskOf = s => { let m = 0; for (const c of s.toLowerCase()) if (c >= 'a' && c <= 'z') m |= 1 << (c.charCodeAt(0) - 97); return m; };
function realSentences(SENTS, unlocked){
  if (!SENTS || !SENTS.length) return [];
  const key = [...unlocked].sort().join('');
  if (realCache.has(key)) return realCache.get(key);
  if (!letterMasks.has(SENTS)) letterMasks.set(SENTS, SENTS.map(maskOf));
  const masks = letterMasks.get(SENTS), have = maskOf(lettersOf(unlocked).join(''));
  const out = [];
  SENTS.forEach((s, i) => {
    if (masks[i] & ~have) return;
    let t = '';
    for (const c of s) {
      if (unlocked.has(c)) t += c;
      else if (/[A-Z]/.test(c)) t += c.toLowerCase();
      else if (!'.,?!;:'.includes(c)) return;
    }
    out.push(t.replace(/\s+/g, ' ').trim());
  });
  if (realCache.size > 200) realCache.clear();
  realCache.set(key, out);
  return out;
}

function sentenceText(newC, unlocked, len, WORDS, SENTS){
  const real = realSentences(SENTS, unlocked);
  // Capitals match exactly, so a capitals lesson picks sentences that start with them.
  const realNew = newC.some(c => c !== ' ') ? real.filter(s => newC.some(c => c !== ' ' && (/[a-z]/.test(c) ? s.toLowerCase() : s).includes(c))) : real;
  const { ok, withNew } = wordPool(unlocked, newC, WORDS);
  const letters = lettersOf(unlocked);
  const caps = new Set(capPick(unlocked));
  const has = c => unlocked.has(c), typeable = w => [...w].every(has);
  const word = () => withNew.length >= 4 && Math.random() < 0.5 ? pick(withNew) : ok.length >= 6 ? pick(ok) : pseudoWord(letters);
  // Real-world punctuation only shows up once its keys are unlocked (issue #3).
  const contr = CONTRACTIONS.filter(typeable), comp = COMPOUNDS.filter(typeable);
  const who = typeable('said') ? ['he', 'she', 'they', 'we'].filter(typeable) : [];
  const out = [];
  let guard = 0;
  while (out.join(' ').length < len && guard++ < 50) {
    // Generated sentences read as nonsense next to real ones, so they stop once the real pool is big enough.
    if (real.length >= 60 || (real.length >= 12 && Math.random() < 0.7)) {
      let s = realNew.length >= 4 && Math.random() < 0.6 ? pick(realNew) : pick(real);
      if (out.includes(s)) continue;
      // Tatoeba has almost no quotes, so some sentences become dialogue.
      if (has('"') && Math.random() < 0.15) {
        s = who.length && has(',') && /\.$/.test(s) ? `"${s.slice(0, -1)}," ${pick(who)} said.`
          : who.length && /[?!]$/.test(s) ? `"${s}" ${pick(who)} said.` : `"${s}"`;
      }
      out.push(s);
      continue;
    }
    const n = 4 + rand(5), s = [];
    for (let i = 0; i < n; i++) {
      const r0 = Math.random();
      let w = contr.length && r0 < 0.08 ? pick(contr) : comp.length && r0 < 0.11 ? pick(comp) : word();
      if (i === 0 && caps.has(w[0].toUpperCase())) w = w[0].toUpperCase() + w.slice(1);
      if (i > 1 && i < n - 1) {
        const r = Math.random();
        if (has(',') && r < 0.15) w += ',';
        else if (has(';') && r < 0.18) w += ';';
        else if (has(':') && r < 0.2) w += ':';
      }
      s.push(w);
    }
    const p = 1 + rand(n - 2);
    if (has('(') && has(')') && Math.random() < 0.1 && /[a-z]$/.test(s[p])) s[p] = '(' + s[p] + ')';
    // A quoted word mid-sentence, the way people quote a term; such a sentence isn't also turned into dialogue.
    const q = 1 + rand(n - 2);
    const quoted = has('"') && Math.random() < 0.12 && /^[a-z]+$/.test(s[q]);
    if (quoted) s[q] = '"' + s[q] + '"';
    let end = '';
    if (has('.')) { const r = Math.random(); end = has('?') && r < 0.15 ? '?' : has('!') && r < 0.22 ? '!' : '.'; }
    let sent = s.join(' ');
    if (!quoted && has('"') && Math.random() < 0.15) {
      sent = who.length && has(',') && end === '.' && Math.random() < 0.6 ? `"${sent}," ${pick(who)} said.` : `"${sent}${end}"`;
    } else sent += end;
    out.push(sent);
  }
  return out.join(' ');
}
function symbolToken(s, unlocked, word, mode){
  const w = word(), has = c => unlocked.has(c);
  if (/[0-9]/.test(s)) {
    const ds = [...unlocked].filter(c => /[0-9]/.test(c));
    let n = s; const L = 1 + rand(3);
    for (let i = 0; i < L; i++) n += pick(ds);
    return shuffle([...n]).join('');
  }
  if (PAIRS[s] && unlocked.has(PAIRS[s])) return s + w + PAIRS[s];
  if (CLOSERS[s] && unlocked.has(CLOSERS[s])) return CLOSERS[s] + w + s;
  // Code drills use punctuation the way code does, so a token never reads as a stray sentence ("share.").
  if (mode === 'code' && ".,;:!?".includes(s)) {
    if (s === '.') return w + '.' + word();
    if (s === ',') return has('(') && has(')') ? `${w}(${word()}, ${word()})` : has('[') && has(']') ? `[${w}, ${word()}]` : `${w},${word()}`;
    if (s === ';') return has('(') && has(')') ? w + '();' : has('=') ? `${w} = ${word()};` : w + ';';
    if (s === ':') return `${w}: ${word()}`;
    if (s === '!') return '!' + w;
    return has('.') ? `${w}?.${word()}` : w + '?';
  }
  if (".,;:!?".includes(s)) return w + s;
  // Outside code an apostrophe is a contraction or a possessive, not a quote mark.
  if (s === "'" && mode !== 'code') {
    const contr = CONTRACTIONS.filter(c => [...c].every(has));
    if (contr.length && (Math.random() < 0.5 || !has('s'))) return pick(contr);
    if (!has('s')) return s + w + s; // neither a contraction nor 's is typeable yet
    // Possessives on words that don't already end in s, so no "has's".
    let o = w; for (let i = 0; i < 8 && (o.length < 3 || /s$/.test(o)); i++) o = word();
    return /s$/.test(o) ? (contr.length ? pick(contr) : o) : o + "'s";
  }
  if ("'\"`".includes(s)) return s + w + s;
  if ("@#$~".includes(s)) return s + w;
  if ("-_".includes(s)) return w + s + word();
  if ("=+*/%^&|\\<>".includes(s)) return Math.random() < 0.5 ? w + ' ' + s + ' ' + word() : w + s + word();
  return w + s;
}
function symbolText(newC, unlocked, len, WORDS, mode){
  const { ok } = wordPool(unlocked, [], WORDS);
  const letters = lettersOf(unlocked);
  const short = ok.filter(w => w.length <= 5);
  const word = () => short.length ? pick(short) : pseudoWord(letters);
  const syms = newC.filter(c => c !== ' ');
  const snips = SNIPPETS.concat(NUM_SNIPPETS.flatMap(f => [f(), f()])).filter(s => [...s].every(c => unlocked.has(c)) && syms.some(c => s.includes(c)));
  const out = [];
  let guard = 0;
  while (out.join(' ').length < len && guard++ < 200) {
    if (mode === 'pattern') {
      const s = pick(syms), t = pick(syms);
      out.push(Math.random() < 0.5 ? s + s + t : s + t + s);
    } else if (mode === 'code' && snips.length && Math.random() < 0.6) out.push(pick(snips));
    else if (mode === 'prose' && Math.random() < 0.55) out.push(word());
    else out.push(symbolToken(pick(syms), unlocked, word, mode));
  }
  return out.join(' ');
}

function unlockedBefore(C, lesson, inclusive){
  const set = new Set();
  for (const l of C.lessons) {
    if (l === lesson && !inclusive) break;
    if (l.kind === 'learn') l.items.forEach(c => set.add(c));
    if (l === lesson) break;
  }
  return set;
}

function textItems(str){ return [...str].map(ch => ({ t: 'c', ch })); }
function keyItem(id){
  const parts = id.split('+'); const key = parts.pop();
  return { t: 'k', key, mods: parts };
}
function keyItemLabel(it){
  const NL = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', PageUp: 'PgUp', PageDown: 'PgDn' };
  return modsLabel(new Set(it.mods)) + (NL[it.key] || (it.key.length === 1 ? it.key.toUpperCase() : it.key));
}

function altText(chars, len){
  // finger alternation: "tn nt tnt ntn ttn"
  const cs = chars.filter(c => c !== ' ');
  if (cs.length < 2) return patternText(cs, len);
  const out = [];
  while (out.join(' ').length < len) {
    const a = pick(cs); let b = pick(cs); if (b === a) b = cs[(cs.indexOf(a) + 1) % cs.length];
    out.push(pick([a + b, b + a, a + b + a, b + a + b, a + a + b, a + b + b]));
  }
  return out.join(' ');
}
function bigramText(newC, known, len){
  // each new key next to an already-known key: "pa ap pe ep"
  const nc = newC.filter(c => c !== ' '), kc = known.filter(c => c !== ' ' && !nc.includes(c));
  if (!kc.length) return altText(nc, len);
  const out = [];
  while (out.join(' ').length < len) {
    const n = pick(nc), k = pick(kc);
    out.push(pick([n + k, k + n, n + k + n, k + n + k]));
  }
  return out.join(' ');
}
function ngramText(newC, unlocked, len, WORDS, weak){
  // common letter groups that use a new key, each followed by a word containing it: "ing thing th the"
  const lset = new Set(lettersOf(unlocked));
  const nl = newC.filter(c => /[a-z]/.test(c));
  const typeable = x => [...x].every(c => lset.has(c));
  const groups = NGRAMS.map(g => g.filter(x => typeable(x) && (!nl.length || nl.some(c => x.includes(c))))).filter(g => g.length);
  // Weak pairs (weakest first) and the longer groups that contain them, whatever the new keys are.
  const wp = (weak || []).filter(typeable);
  const wg = [...wp, ...NGRAMS.slice(1).flat().filter(x => typeable(x) && wp.some(p => x.includes(p)))];
  if (!wg.length && groups.reduce((n, g) => n + g.length, 0) < 6) return '';
  const ok = WORDS ? wordPool(unlocked, [], WORDS).ok : [];
  const out = [];
  let guard = 0;
  while (out.join(' ').length < len && guard++ < 400) {
    const g = wg.length && (!groups.length || Math.random() < 0.4) ? wg : pick(groups), x = g[Math.floor(Math.random() ** 2 * g.length)];
    if (out.includes(x) && Math.random() < 0.5) continue;
    out.push(x);
    // then up to two words using it, so the group is seen in different spots: "ment moment mental"
    const ws = shuffle(ok.filter(w => w.length > x.length && w.includes(x) && !out.includes(w)).slice(0, 30));
    out.push(...ws.slice(0, 2));
  }
  return out.join(' ');
}
function shortWordsText(newC, unlocked, len, WORDS){
  const { ok, withNew } = wordPool(unlocked, newC, WORDS);
  const sw = withNew.filter(w => w.length <= 4), so = ok.filter(w => w.length <= 4);
  const pool = sw.length >= 4 ? sw : so;
  if (pool.length < 4) return wordsText(newC, unlocked, len, WORDS);
  const out = [];
  while (out.join(' ').length < len) { const w = pick(pool); if (out[out.length - 1] !== w) out.push(w); }
  return out.join(' ');
}
function keyStages(ids, len){
  const n = Math.max(16, Math.round(len / 3));
  const intro = []; ids.forEach(id => { for (let i = 0; i < 4; i++) intro.push(id); });
  const alt = []; while (alt.length < n) { const a = pick(ids); let b = pick(ids); if (b === a && ids.length > 1) b = ids[(ids.indexOf(a) + 1) % ids.length]; alt.push(a, b, a); }
  const mix = []; while (mix.length < n) mix.push(pick(ids));
  const speed = []; while (speed.length < n * 2) speed.push(pick(ids));
  return [['Meet the keys', intro], ['Back and forth', alt], ['Mixed drill', mix], ['Speed round', speed]]
    .map(([name, a]) => ({ name, items: a.map(keyItem) }));
}

// weak: the learner's weakest letter pairs, weakest first, which reviews mix into Common combos.
// stale: known keys not typed lately, which the mixed drills bring back more often.
function makeStages(C, lesson, WORDS, len, SENTS, weak, stale){
  len = len || 90;
  if (lesson.kind === 'keys' || lesson.kind === 'chords') return keyStages(lesson.items, len);
  const isReview = lesson.kind === 'review';
  const before = unlockedBefore(C, lesson, false);
  const unlocked = unlockedBefore(C, lesson, true);
  if (isReview) lesson.items.forEach(c => unlocked.add(c));
  unlocked.add(' ');
  const newC = lesson.items;
  const hasLetters = newC.some(c => /[a-z]/.test(c));
  const hasCaps = newC.some(c => /[A-Z]/.test(c));
  const symOnly = !hasLetters && !hasCaps;
  const knownLetters = [...before].filter(c => /[a-z]/.test(c));
  const st = [];
  const add = (name, text) => { if (text && text.trim()) st.push({ name, text }); };
  const enough = wordPool(unlocked, newC, WORDS).ok.length >= 6;

  if (hasCaps && !hasLetters) {
    const caps = newC.filter(c => /[A-Z]/.test(c));
    const pairs = () => { const o = []; while (o.join(' ').length < len * 0.7) { const C = pick(caps), l = pick(lettersOf(unlocked)); o.push(pick([C + l, C + C.toLowerCase(), C + l + l])); } return o.join(' '); };
    if (!isReview) {
      add('Meet the keys', caps.map(C => `${C}${C.toLowerCase()} ${C}${C.toLowerCase()}${C.toLowerCase()}`).join(' ') + ' ' + patternText(caps, len / 2));
      add('Shift and tap', pairs());
    }
    const cw = wordsText(newC, unlocked, len, WORDS, caps);
    add('Capital words', cw);
    add('Mixed case', wordsText(newC, unlocked, len, WORDS, capPick(unlocked)));
    add('Sentences', sentenceText(newC, unlocked, len * 1.3, WORDS, SENTS));
    add('Accuracy check', sentenceText(newC, unlocked, len * 1.6, WORDS, SENTS));
  } else if (symOnly) {
    const lets = lettersOf(unlocked);
    if (!isReview) {
      add('Meet the keys', patternText(newC, len * 0.6));
      add('Back and forth', altText(newC, len * 0.6));
    }
    add('Key pairs', symbolText(newC, unlocked, len * 0.7, WORDS, 'pattern'));
    if (lets.length) add('With letters', bigramText(newC, lets, len * 0.7));
    add('In context', symbolText(newC, unlocked, len, WORDS, 'token'));
    if (before.has('a')) add('Code', symbolText(newC, unlocked, len * 1.1, WORDS, 'code'));
    add('Prose', symbolText(newC, unlocked, len * 1.2, WORDS, 'prose'));
    add('Accuracy check', symbolText(newC, unlocked, len * 1.2, WORDS, before.has('a') ? 'code' : 'token'));
  } else {
    if (!isReview) {
      add('Meet the keys', patternText(newC, len * 0.7));
      add('Back and forth', altText(newC, len * 0.7));
      if (knownLetters.length) add('With known keys', ngramText(newC, unlocked, len * 0.8) || bigramText(newC, knownLetters, len * 0.8));
    }
    add('Mixed drill', mixText(newC, [...before], len, stale));
    if (isReview) add('Common combos', ngramText(newC, unlocked, len, WORDS, weak));
    if (enough) {
      add('Short words', shortWordsText(newC, unlocked, len * 0.8, WORDS));
      const w = wordsText(newC, unlocked, len, WORDS);
      add('Words', w);
      if (lettersOf(unlocked).length >= 6) add('Sentences', sentenceText(newC, unlocked, len * 1.3, WORDS, SENTS));
    } else if (lettersOf(unlocked).length >= 4) {
      add('Pseudo-words', wordsText(newC, unlocked, len, WORDS));
      add('Mixed drill 2', mixText(newC, [...before], len, stale));
    } else {
      add('Mixed drill 2', mixText(newC, [...before], len, stale));
    }
    const extra = newC.filter(c => !/[a-z ]/.test(c));
    if (extra.length) add('Punctuation', symbolText(extra, unlocked, len, WORDS, 'prose'));
    add('Accuracy check', enough ? sentenceText(newC, unlocked, len * 1.6, WORDS, SENTS) : mixText(newC, [...before], len * 1.3));
  }
  return st.map(s => ({ name: s.name, items: textItems(s.text.replace(/\s+/g, ' ').trim()) }));
}

/* Free practice and problem keys */
function practiceStages(C, unlocked, focus, WORDS, len, SENTS, weak, stale){
  const u = new Set(unlocked); u.add(' ');
  const letters = focus.filter(c => /[a-z]/.test(c));
  const syms = focus.filter(c => !/[a-z ]/.test(c));
  const st = [];
  // Free practice opens with the keys not typed lately: letters in real words, digits in groups, symbols in context.
  const old = !focus.length ? (stale || []).filter(c => u.has(c) && c !== ' ') : [];
  if (old.length) {
    const ol = old.filter(c => /[a-z]/.test(c)), od = old.filter(c => /[0-9]/.test(c)), os = old.filter(c => !/[a-z0-9]/.test(c));
    // The random fill can skip a key, and the stage promises to bring every one back, so each gets a guaranteed share first.
    const { ok } = wordPool(u, [], WORDS);
    const lead = shuffle(ol.flatMap(c => { const ws = ok.filter(w => w.includes(c)); return [0, 1].map(() => ws.length ? pick(ws) : pseudoWord(lettersOf(u), c)); })).join(' ');
    const cover = (t, ks, make) => [t, ...ks.filter(c => !t.includes(c)).map(make)].join(' ');
    st.push({ name: 'Not typed lately', text: [ol.length && lead + ' ' + wordsText(ol, u, len * 0.7 - lead.length, WORDS),
      od.length && cover(mixText(od, [], len * 0.3), od, c => mixText([c], [], 1)),
      os.length && cover(symbolText(os, u, len * 0.6, WORDS, 'token'), os, c => symbolText([c], u, 1, WORDS, 'token'))].filter(Boolean).join(' ') });
  }
  if (focus.length) st.push({ name: 'Focus drill', text: mixText(focus, [], len) });
  if (letters.length) st.push({ name: 'Focus words', text: wordsText(letters, u, len, WORDS) });
  if (syms.length) st.push({ name: 'Focus symbols', text: symbolText(syms, u, len, WORDS, 'token') });
  if (letters.length || !focus.length || (weak && weak.length)) st.push({ name: 'Common combos', text: ngramText(letters, u, len, WORDS, weak) });
  st.push({ name: 'Sentences', text: sentenceText(letters, u, len * 1.4, WORDS, SENTS) });
  return st.filter(s => s.text.trim()).map(s => ({ name: s.name, items: textItems(s.text.replace(/\s+/g, ' ').trim()) }));
}

const HomerowTrainerEngine = { buildLayout, buildRoutes, buildCurriculum, makeStages, practiceStages, routeFor, keyItem, keyItemLabel,
  keyId, charName, listTitle, unlockedBefore, parseZmkKeymap, MOD_SYM, MOD_NAME, FINGERS, textItems };
if (typeof module !== 'undefined') module.exports = HomerowTrainerEngine;
