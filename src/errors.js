/* Keep the last few runtime errors so a feedback report can include them.
   Loaded before engine.js so errors anywhere on the page are caught. */
(function(){
  const errs = window.HOMEROW_TRAINER_ERRORS = [];
  const push = (kind, msg, where) => {
    errs.push({ at: new Date().toISOString().slice(11, 19), kind, msg: String(msg).slice(0, 500), where: where || '' });
    if (errs.length > 10) errs.shift();
  };
  const describe = v => v && v.stack ? v.stack : v && v.message ? v.message : String(v);
  window.addEventListener('error', e => push('error', e.error ? describe(e.error) : e.message, e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : ''));
  window.addEventListener('unhandledrejection', e => push('rejection', describe(e.reason)));
  const orig = console.error;
  console.error = function(...a){ push('console', a.map(describe).join(' ')); return orig.apply(this, a); };
})();
