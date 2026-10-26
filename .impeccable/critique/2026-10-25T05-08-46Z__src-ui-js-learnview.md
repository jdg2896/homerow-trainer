---
target: lessons page
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/jaspergabriel/Workspace/personal/homerow-trainer/src/ui.js#learnView"
timestamp: 2026-10-25T05-08-46Z
slug: src-ui-js-learnview
---
# Critique: Lessons page (src/ui.js learnView, header, sidebar)

Method: dual-agent (A: design review · B: detector + CDP live scan)

## Design Health Score: 25/40 (Acceptable)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility | 3 | Hero "Continue" doesn't say lesson number, stage, or time |
| 2 | Match real world | 3 | "Typing time 75:00" ambiguous; "Review" title + REVIEW badge |
| 3 | User control | 3 | Skipping ahead needs a Settings toggle nobody mentions |
| 4 | Consistency | 2 | Two Signals Rule broken: 6 amber things visible; done rows drop their number |
| 5 | Error prevention | 2 | First run trains bundled Miryoku Go60 without saying so; layout chip not a link |
| 6 | Recognition | 3 | Stars and stage segments never explained |
| 7 | Flexibility | 3 | Strong keyboard plumbing; no unit jump at ≤860px |
| 8 | Minimalist | 2 | 44+ locked rows each with a disabled "Locked" button; KPI header competes |
| 9 | Error recovery | 2 | Storage-blocked S.msg never rendered on Lessons |
| 10 | Help | 2 | No first-run explanation of what a lesson is or how long it takes |

## Specificity
Content (keycap-chip titles, lit-home-row brand mark, concrete unit blurbs) is product-specific; the frame (blue hero + CTA, KPI header, stars, unit sidebar) is course-app generic, and the page never shows the keyboard.
Detector: dist clean (8 advisories); src 37 advisories + side-tab false positive (chevron). Off-ramp sizes 12/13/14/21/24px and 10px radius are documented in DESIGN.md prose, not frontmatter (doc fix). Live: locked rows 4.02:1 light (fail), locked badge 2.32, stage segments off 1.42 (non-text fail), nav shortcut digit on active item 2.94 and in accessible name ("Lessons1"), .progress aria-label on generic div, summary names run together, What's new li ~136ch.

## Priority issues
- [P1] First run hides that the layout is a default; no onboarding; S.msg (storage blocked) never shown on Lessons. First-run card "You're practising Miryoku (macOS) for Go60 · Load yours / Keep this", one line on what a lesson is, layout chip links to Layout, render S.msg. → onboard
- [P1] Two Signals Rule: duplicate amber Continue (hero + .lesson.next), amber stars, goal ring, progress fill. One amber CTA; stars ink/muted outside results; ring green when met. → quieter
- [P2] Lesson rows for screen readers and low vision: 54 unnamed Start/Redo/Locked buttons, ignored aria-labels on .stars/.progress, ★ read aloud, .segs silent, locked rows dimmed by opacity below 4.5:1, segment track 1.42:1, nav digit in names. → harden
- [P2] Unit list is a wall and finished work vanishes: collapsed done unit = muted "8 of 8 done"; locked rows uninformative. Completed treatment in summary, collapse unreached lessons, preview next unit's keys. → layout
- [P3] Session framing for short pain-limited practice: no time per lesson, hero still says Continue after goal met, red problem keys greet every visit. → clarify

## Personas
Alex: no jump-ahead without Settings; unit links/keyhint hidden ≤860; redundant row Continue tab stop. Sam: repeated unnamed buttons, ★ glyphs, opacity-dimmed locked text, "Lessons1", glare-bright dark hero. Go60 owner in pain: not told layout is a stand-in, no time cost, KPIs first, red keys, no "done for today".

## Questions
1. If the keyboard is the product, why does the home screen show none of it?
2. Do stars and % · wpm on every row invite Redo loops against "never grind"?
3. What should Lessons look like once today's goal is met?
