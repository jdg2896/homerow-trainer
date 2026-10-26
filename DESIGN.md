---
name: Homerow Trainer
description: A typing course built from your own split-keyboard layout.
colors:
  keycap-blue: "#2B57D9"
  keycap-blue-soft: "#DCE5FB"
  keycap-blue-ink: "#FFFFFF"
  go-amber: "#F2B705"
  go-amber-ink: "#241A00"
  ok-green: "#127A51"
  ok-green-ink: "#FFFFFF"
  err-red: "#C13029"
  err-red-soft: "#FBE0DD"
  desk: "#E8ECF2"
  surface: "#FFFFFF"
  surface-sunken: "#F3F5F9"
  ink: "#141C2F"
  muted: "#56627C"
  line: "#D2D9E5"
  key: "#FFFFFF"
  key-edge: "#B8C1D2"
  key-ink: "#1B2438"
  finger-pinky: "#E6DCFA"
  finger-ring: "#D4E6FA"
  finger-middle: "#D3F0E0"
  finger-index: "#FBE6C4"
  finger-thumb: "#E3E1DB"
  keycap-blue-dark: "#7393FF"
  keycap-blue-soft-dark: "#223060"
  keycap-blue-ink-dark: "#0D121C"
  ok-green-dark: "#41C78E"
  ok-green-ink-dark: "#0D121C"
  err-red-dark: "#FF6A60"
  err-red-soft-dark: "#48201E"
  desk-dark: "#0D121C"
  surface-dark: "#151C2A"
  surface-sunken-dark: "#1B2333"
  ink-dark: "#E4E9F2"
  muted-dark: "#94A1BA"
  line-dark: "#283247"
  key-dark: "#1E2637"
  key-edge-dark: "#37425A"
  finger-pinky-dark: "#342A50"
  finger-ring-dark: "#1F364E"
  finger-middle-dark: "#1D3D2F"
  finger-index-dark: "#47391B"
  finger-thumb-dark: "#2B2E37"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Avenir Next, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.15
  headline:
    fontFamily: "Bricolage Grotesque, Avenir Next, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.15
  title:
    fontFamily: "Atkinson Hyperlegible, system-ui, -apple-system, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Atkinson Hyperlegible, system-ui, -apple-system, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Atkinson Hyperlegible, system-ui, -apple-system, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.06em"
  stat:
    fontFamily: "Bricolage Grotesque, Avenir Next, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
    fontFeature: "tnum"
  drill:
    fontFamily: "IBM Plex Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "clamp(19px, 2.5vw, 27px)"
    fontWeight: 500
    lineHeight: 1.9
  keycap:
    fontFamily: "IBM Plex Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.86em"
    fontWeight: 600
    lineHeight: 1
  section:
    fontFamily: "Bricolage Grotesque, Avenir Next, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.15
  dialog:
    fontFamily: "Bricolage Grotesque, Avenir Next, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1.2
  secondary:
    fontFamily: "Atkinson Hyperlegible, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
  meta:
    fontFamily: "Atkinson Hyperlegible, system-ui, -apple-system, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  caption:
    fontFamily: "Atkinson Hyperlegible, system-ui, -apple-system, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.3
rounded:
  mark: "2px"
  xs: "3px"
  bar: "5px"
  sm: "6px"
  md: "8px"
  row: "10px"
  lg: "12px"
  xl: "14px"
  pill: "99px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "22px"
  2xl: "28px"
components:
  button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-go:
    backgroundColor: "{colors.go-amber}"
    textColor: "{colors.go-amber-ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary:
    backgroundColor: "{colors.keycap-blue}"
    textColor: "{colors.keycap-blue-ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  nav-item:
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  nav-item-active:
    backgroundColor: "{colors.keycap-blue}"
    textColor: "{colors.keycap-blue-ink}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
  keycap-chip:
    backgroundColor: "{colors.key}"
    textColor: "{colors.key-ink}"
    typography: "{typography.keycap}"
    rounded: "{rounded.sm}"
    height: "1.9em"
  badge:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  layer-pill:
    backgroundColor: "{colors.keycap-blue}"
    textColor: "{colors.keycap-blue-ink}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  hero:
    backgroundColor: "{colors.keycap-blue}"
    textColor: "{colors.keycap-blue-ink}"
    rounded: "{rounded.xl}"
    padding: "20px 22px"
---

# Design System: Homerow Trainer

## Overview

**Creative North Star: "The Keycap Workbench"**

The app is a calm workbench, and the user's own keyboard is the object on it. The ground is a cool, slightly blue-grey desk. White cards sit on it with hairline borders, and the drill text and the on-screen keyboard are the only things that ask for attention. Visual vocabulary comes from keycaps: mono legends, a thicker bottom edge that reads as a raised cap, and finger colors pastel enough that the legend stays readable.

Two accents carry all the meaning. Keycap Blue marks where you are: the current view, the cursor, the layer you're holding. Go Amber marks the one thing to do next: the key to press, the lesson to start, the goal ring that is filling up. Everything else is neutral, so the amber stays easy to spot.

Density is moderate and working-tool-like. Text is plain and set in Atkinson Hyperlegible. Bricolage Grotesque gives headings and numbers a little warmth without turning the app into a game.

**Key Characteristics:**
- A cool desk-grey ground with flat white cards and 1px borders.
- Blue for "where you are", amber for "what's next", green for "done", red for errors (always on a soft red tint).
- A keycap motif: mono legends and a 3px bottom edge on key chips.
- Finger colors appear only on the keyboard diagram.
- Full light and dark themes driven by the same token names.

## Colors

A cool neutral desk with two working accents and pastel finger colors on the keyboard diagram.

### Primary
- **Keycap Blue** (`keycap-blue`): the active nav item, the Lessons hero banner, the drill cursor underline, held-layer keys on the keyboard, the layer pill in hints, focus rings, and border hover on buttons. In dark mode it lightens to `keycap-blue-dark`, and text on it flips to `keycap-blue-ink-dark`.
- **Keycap Blue Soft** (`keycap-blue-soft`): the tint behind the current character, the selected segment in the feedback type picker, and success messages.

### Secondary
- **Go Amber** (`go-amber`): the target key on the keyboard, the hero's Start or Continue button (the only amber button on Lessons), the daily-goal ring while it fills, stars on the result card, and the lit middle row of the brand mark. It's the same in both themes. Text on it is always `go-amber-ink`, never white.

### Tertiary
- **Done Green** (`ok-green`): completed lessons (number disc), finished stage chips, the filled lesson segments, and the daily-goal ring once the goal is met. Text on it is `ok-green-ink`: white in light mode, near-black in dark, where the green lightens.
- **Miss Red** (`err-red` on `err-red-soft`): mistyped characters, error messages, misfire notes (a soft red pill beside the hint), problem-key warnings and danger buttons.

### Neutral
- **Desk** (`desk`): the page background.
- **Surface** (`surface`) and **Sunken Surface** (`surface-sunken`): cards, header and dialogs; inputs, badges, saved-layout rows and code blocks.
- **Ink** (`ink`) and **Muted** (`muted`): body text; secondary text, upcoming drill characters, uppercase labels and meta lines.
- **Line** (`line`): every border and divider, and unearned stars. Empty lesson segments are 70% Muted mixed into the surface, so they clear 3:1.
- **Key / Key Edge / Key Ink**: the keycap material, used for the diagram and keycap chips.
- **Finger colors** (`finger-pinky` lavender, `finger-ring` sky, `finger-middle` mint, `finger-index` apricot, `finger-thumb` stone): key fills on the keyboard diagram when "show fingers" is on.

### Named Rules
**The Two Signals Rule.** Blue means "you are here", amber means "do this next". Don't use amber for decoration or as a second brand color. If more than one or two amber things are visible, one of them is wrong.

**The Fingers Stay On The Keyboard Rule.** Finger colors appear only on the keyboard diagram and its legend. They are never used for UI state.

**The Paired Token Rule.** Every color token has a light and a dark value under the same name, set in `:root`, the `prefers-color-scheme: dark` block and `[data-theme="dark"]`. A new token needs all three.

## Typography

**Display Font:** Bricolage Grotesque (with Avenir Next, system-ui), loaded at 600 and 700.
**Body Font:** Atkinson Hyperlegible (with system-ui), loaded at 400 and 700.
**Mono Font:** IBM Plex Mono (with ui-monospace, SF Mono, Menlo), loaded at 500 and 600.

**Character:** Hyperlegible body text keeps instructions unambiguous for people learning under strain. The grotesque display face adds a friendly, slightly quirky voice to headings and numbers, and Plex Mono gives drill text and key legends the fixed rhythm of a keyboard.

### Hierarchy
- **Display** (700, 26px, 1.15): the Lessons hero heading. Section titles use 24px.
- **Headline** (700, 22px, 1.15): unit headings, the drill run bar, and the result card (24px).
- **Title** (700, 17px): lesson names, What's new heading. Dialog titles use the display face at 21px.
- **Body** (400, 15px, 1.5): everything else. Meta and secondary lines use 13–14px in Muted. The footer's line length is capped at 112ch.
- **Label** (700, 11px, 0.06–0.08em, uppercase): stat captions, sidebar group headings, table headers and badges.
- **Stat** (700, 22px, tabular figures): header stats and result numbers, with units at 12px in the body face. Accuracy always comes before speed. During a drill the header drops its stats and the run bar shows accuracy only; speed appears on the result.
- **Drill** (Plex Mono 500, clamp(19px, 2.5vw, 27px), 1.9em lines): the typing viewport, three lines tall.

### Named Rules
**The Tabular Numbers Rule.** Every number that changes while you type (stats, counts, table cells, lesson numbers) uses `font-variant-numeric: tabular-nums` so it doesn't jitter.

**The Mono Means Keys Rule.** Plex Mono is for things you type: drill text, key legends, keycap chips, shortcut hints and code. Prose is never set in mono.

## Layout

- **Shell:** a full-width header bar (brand, layout chip that opens Layout, stats, goal ring, report-a-bug button), then a two-column grid: a 250px sidebar (nav, unit links, problem-key card) and a main column centered in the remaining space at up to 980px. Page gutters are 16px. A footer sits at the bottom of the viewport even on short pages.
- **Main column:** a vertical stack with 28px between sections and 16px between cards. Grids use `auto-fit, minmax(280px, 1fr)`. Practice uses two equal columns that each stack their own cards, collapsing to one column at 760px.
- **Rhythm:** gaps cluster at 4/6/8 inside components, 12–16 between siblings, and 22–28 between sections. Card padding is 16px. The type box is roomier (22px 26px).
- **≤860px:** the sidebar folds above the content and the nav becomes a wrapping row. Unit links, the sidebar card, nav shortcut numbers and the key hint are hidden. The report-a-bug button stays top right as an icon only, and lessons drop their action column under the title.
- **Keyboard diagram:** an SVG at least 560px wide that scrolls horizontally inside its card rather than shrinking past legibility. In a drill its height is capped by the window (at least 260px), so the thumb keys stay on screen; it shrinks and centres rather than overflowing.

## Elevation & Depth

The system is mostly flat. Depth comes from tone (desk → surface → sunken surface) and 1px borders. One soft shadow, `--shadow`, is used only on things that matter right now: the drill's type box, the next lesson and the feedback dialog. Dark mode deepens the same shadow rather than dropping it. Keycaps get their depth from a thicker bottom border, not a shadow.

### Shadow Vocabulary
- **Focus lift** (`box-shadow: 0 1px 2px rgba(20,28,47,.06), 0 4px 14px rgba(20,28,47,.06)`; dark: `0 1px 2px rgba(0,0,0,.3), 0 4px 14px rgba(0,0,0,.25)`): the type box, the next-lesson row and dialogs.
- **Cursor underline** (`box-shadow: inset 0 -3px 0 var(--accent)`): the current drill character. This marks state; it isn't elevation.

### Named Rules
**The One Lifted Thing Rule.** Shadows mark the one place to look: the drill, the next lesson or an open dialog. Cards at rest don't get a shadow.

## Shapes

Corners are softly rounded and get bigger with the size of the element: 2px for the brand mark squares, 3px for drill characters and lesson segments, 5px for the hero progress bar, 6px for keycap chips and sidebar links, 8px for buttons, inputs and nav items, 10px for saved-layout rows, 12px for cards, lessons and dialogs, and 14px for the type box, keyboard card and hero. Pills (99px) are for chips, badges, tabs and the layer label. Circles are used only for lesson number discs and the goal ring. Every border is 1px in Line, except keycaps (3px bottom edge), lesson discs (2px) and home-row keys on the diagram (2px stroke).

## Components

### Buttons
Plain and tactile: bordered, bold labels, no shadow.
- **Shape:** gently rounded (8px), padding 8px 16px, bold body type, with an 8px gap for an icon or play triangle.
- **Default:** surface fill with a Line border. On hover, the border turns Keycap Blue.
- **Go:** Go Amber fill and border, with Go Amber Ink text, and slightly brighter on hover. Used for starting or continuing a lesson.
- **Primary:** Keycap Blue fill with Keycap Blue Ink text, for confirming actions.
- **Ghost:** a transparent fill that keeps the border; used in the header and for secondary actions.
- **Danger:** a default button with Miss Red text.
- **Disabled:** 45% opacity and a not-allowed cursor.
- **Link button:** underlined inline text that turns Keycap Blue on hover.

### Keycap Chips
The signature primitive: an inline key legend that looks like a physical cap.
- Mono 600 at 0.86em, at least 1.9em square, a 1px Key Edge border with a 3px bottom edge, 6px radius, and Key fill.
- `big` scales it to 1.4em for new keys. `warn` turns the border and legend Miss Red for problem keys.

### Chips, Badges and Tabs
- **Stage chips:** pills with 12px text and a Line border. The current stage gets a Keycap Blue border and text, and done stages get a solid Done Green fill with Done Green Ink text.
- **Badge:** an uppercase 11px label pill on Sunken Surface.
- **Tabs (layer picker):** 13px bold pills. The active tab inverts to an Ink fill with Desk text.
- **Layer pill:** a Keycap Blue pill in the hint line naming the layer to hold.

### Cards / Containers
- **Corner style:** 12px (14px for the type box, keyboard and hero).
- **Background:** Surface on Desk, with a 1px Line border.
- **Shadow:** none at rest (see Elevation).
- **Internal padding:** 16px.
- **Hero:** the Lessons banner is the one solid Keycap Blue block, with a Keycap Blue Ink progress fill on a translucent white track.
- **Starter-layout card:** on first run, while the bundled default layout is active and no lesson has been typed, a plain card above the hero names the layout and keyboard, says it's a stand-in, and explains a lesson in one line. "Choose a layout" is a default button and "Keep this one" a link button, so the hero's Start stays the only amber.

### Lesson Row
A three-column grid: a number disc, the title with its meta line, and the action. A 2px Line circle holds the number, which fills Done Green when the lesson is complete. The next lesson gets a Keycap Blue border and the focus-lift shadow, and its button is ghost like the others, since the hero already carries the amber Start. Locked lessons drop their fill to sit on the desk, with Muted text and keycaps, no segment strip, and a plain "Locked" label instead of a disabled button; they recede without falling below 4.5:1. The meta line holds stars (Ink when earned) and a 140px strip of stage segments that fill green; accuracy and speed stay on the result screen and Practice, so the list doesn't invite redoing lessons for a better number. Lessons not unlocked yet fold into one "6 more lessons" row at the end of their unit, sitting on the desk with Muted keycap previews and a "Locked" label.

### Unit Header
The unit title and blurb on the left; on the right, its status and a chevron. A finished unit reads "✓ All 7 done" in bold Done Green. A unit not reached yet previews up to eight of its new keys as Muted keycaps before "0 of 8 done".

### Inputs / Fields
- **Style:** Sunken Surface fill, 1px Line border, 8px radius, 8px 10px padding, full width. Textareas are mono 13px except in the feedback dialog.
- **Labels:** bold 14px above the field, with Muted 13px help text below.
- **Focus:** the global 2px Keycap Blue outline at a 2px offset.
- **Segmented control:** a bordered strip of equal segments. The selected one is Keycap Blue Soft with Ink text.
- **Messages:** an error message is Miss Red on its soft tint, and a success message is Keycap Blue Soft.

### Navigation
A vertical list of bold 15px rows with 10px 12px padding and an 8px radius, each with its number-key shortcut in faded mono on the right (hidden from screen readers, which get `aria-keyshortcuts`; 85% on the active row so it clears 4.5:1). Hover shows a Surface fill, and the active row is a solid Keycap Blue fill. At ≤860px it becomes a wrapping row and the shortcut numbers are hidden.

### Drill Viewport
Three mono lines in a roomy, shadowed card, scrolling one line at a time (a 0.15s transform). Upcoming characters are Ink, since they are what you read next. Typed characters step back to Muted, which still clears 4.5:1 in both themes. A miss is Miss Red on its soft tint, including on the current character, where it also turns the cursor underline red, and a miss that was then fixed stays Miss Red at 60%. The current character gets a Keycap Blue Soft tint and a 3px Keycap Blue underline, and the current space shows a centered blue dot. A miss also triggers a 3px horizontal shake (0.18s), which reduced motion turns off. When the box loses focus, a translucent surface veil covers it with "Paused while this window is in the background. Click here or switch back to keep typing." Esc shows the same veil with "Paused. Press any key to keep typing, or Esc again to leave the lesson." The clock really stops while either shows.

### Keyboard Diagram
An SVG of the user's board. Keys are Key fills with a Key Edge stroke, and home-row keys get a 2px stroke. Finger colors fill the keys when "show fingers" is on. The target key is a solid Go Amber fill with a Go Amber Ink stroke and legend, and held keys are a solid Keycap Blue fill. In the subtle-highlight setting, the finger color stays and the key only gets a 3px blue outline (dashed for held keys). Empty keys sit at 45% opacity. A small legend sits below.

## Do's and Don'ts

### Do:
- **Do** route every color through the tokens in `src/style.css`, with a light and a dark value for each.
- **Do** keep amber for the single next action or target, and blue for location and selection.
- **Do** show keys as keycap chips (mono, 3px bottom edge) wherever a key is named in UI text.
- **Do** use tabular figures for every live number.
- **Do** keep cards flat with 1px Line borders, and save the one shadow for what needs attention now.
- **Do** check each screen in light, dark and ≤860px widths, and turn off motion under `prefers-reduced-motion`.

### Don't:
- **Don't** use finger colors outside the keyboard diagram.
- **Don't** put white text on Go Amber. Use Go Amber Ink.
- **Don't** show errors in red text alone without the soft red tint, and don't make error feedback louder than the existing short shake.
- **Don't** add shadows to resting cards, or gradients or glows anywhere.
- **Don't** set prose in mono, or drill text in the body face.
