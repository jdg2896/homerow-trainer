---
target: settings page + bug/feedback entry points
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/jaspergabriel/Workspace/personal/homerow-trainer/src/ui.js#settingsView"
timestamp: 2026-10-26T15-25-53Z
slug: src-ui-js-settingsview
---
# Critique: Settings page + bug/feedback entry points (src/ui.js settingsView, header, footer, feedback dialog)

Method: dual-agent (A: design review subagent · B: detector + CDP live scan subagent)

## Design Health Score: 23/40 (Acceptable)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of status | 2 | Settings save silently; finished reset shows no message |
| 2 | Match real world | 3 | Plain copy, but page opens on "Key routing / Miryoku style" jargon |
| 3 | User control | 2 | Reset: no Cancel, no undo, no export to fall back on |
| 4 | Consistency | 2 | Inline 19px h3s off DESIGN scale; bold help text under Stop on errors only; bug entry is a header button + two footer links |
| 5 | Error prevention | 2 | Number inputs not clamped to max; 0 silently becomes default; bug dialog mid-drill keeps the clock running |
| 6 | Recognition | 3 | Star rules (98% + 1.25× wpm) not stated anywhere |
| 7 | Flexibility | 2 | No progress export/import, no restore defaults, routing prefs global not per-layout |
| 8 | Minimalist | 3 | Calm, but stretched cards leave Appearance/Reset mostly empty |
| 9 | Error recovery | 2 | Reset irreversible and unacknowledged; dialog error not announced, no aria-invalid |
| 10 | Help | 2 | Scoring card has no help; no link to learning principles |

## Specificity
Settings is a generic six-card form; nothing uses the keycap vocabulary (no preview of Fill vs Outline highlight). Feedback dialog itself is well authored. Detector: 0 findings in CLI and 9 CDP states (Settings light/dark at 1280/800, dialog both modes, run view).

## Priority issues
1. [P1] Opening the feedback dialog during a drill doesn't pause the clock (header(true) keeps the button, ui.js:243; pauseClock only on blur/Esc, ui.js:1103). Time counts toward wpm/stars and daily goal. Fix: drop the button from header(inRun); pause in openFeedback, resume on dialog close.
2. [P1] Reset is a one-way door: confirm only swaps the label (ui.js:521), no Cancel, armed state persists, no post-reset message, no backup. Fix: Layouts-style soft-red confirm panel with Cancel focused, S.msg afterwards, and an Export progress button beside it.
3. [P2] Bug/feedback entry points: persistent bug-icon button is the heaviest thing in the header, sits before the layout chip at ≤860px (style.css:338) as a 34px icon, footer links are 19.5px tall. Fix: one neutral "Feedback" entry (not in runs), one footer link, About & feedback card at bottom of Settings, contextual "Report this" on layout parse failures.
4. [P2] IA: "During a lesson" has 6 controls incl. Unlock every lesson; routing first; Reset weighted like Theme; routing select shown even when layout lacks both. Fix: regroup (Practice pace / Help while typing / Your layout / Appearance / Your data), conditional routing, dependent controls hidden when keyboard is off, .grid2 align-items:start, h3 class at Title size.
5. [P2] Daily goal 1–120 free number and bare wpm box invite grinding against "Care for the body". Fix: selects (5–30 min) with a short-sessions note; state star rules; clamp inputs.

## Persona red flags
- Alex: no export/import, no restore defaults, per-layout prefs are global, out-of-range numbers accepted.
- Sam: help text not aria-describedby; Stop-on-errors help inside the label (name becomes whole sentence); setting changes unannounced; reset arming not announced; dialog #fbErr no role/aria-live; no h1.
- Recently switched, in wrist pain: jargon first card; 120-min goal; Unlock-all beside comfort settings; reporting a bug mid-drill costs stars.

## Minor
Theme help text repeats options; Scoring has no help; "Drills & goal" grab-bag title; .btn.danger only red text; nav names include digit in textContent; dialog title first paints "Send feedback".

## Questions
- Should the wpm star target be a setting at all?
- Should Unlock every lesson become a per-unit test-out?
- Local-only without export: acceptable risk for weeks of progress?
