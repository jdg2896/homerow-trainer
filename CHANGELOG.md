# Changelog

What changed in each version of Homerow Trainer. The newest section is also shown in the app as "What's new" the first time you open a new version.

## 0.20.1 — 2026-10-27

- Restoring a backup only accepts the kinds of settings, stats and layout details Homerow Trainer writes itself, so an edited or malicious backup file can't run code in the page.

## 0.20.0 — 2026-10-26

- Settings is regrouped by what you'd come to change: daily practice, passing lessons, while you type, the on-screen keyboard, your layout's keys, appearance and your data. Each card is only as tall as its settings.
- You can download a backup of every layout with its progress and your settings, and restore it in another browser or after clearing site data.
- Reset progress asks first, says what will be cleared, starts on Cancel and confirms when it's done.
- The daily goal is a choice from 5 to 30 minutes, and the speed setting says how stars work: speed never holds you back.
- The numbers & symbols choice only shows when your layout can type them both ways, and the next-key highlight and finger colours only show while the keyboard is on.
- Settings ends with an About & feedback card: the version, what's new, credits, and ways to report a problem or share an idea.

## 0.19.0 — 2026-10-26

- The header's "Report a bug" button is now a quieter "Feedback" button, and it's gone during lessons. The footer has one "Feedback & bug reports" link.
- Opening feedback from the footer during a lesson pauses it, so writing a report no longer counts as typing time.
- A layout file that won't load offers "Report this file", which opens a bug report with that file attached and the error filled in.
- The feedback form's choices read "Something's broken" and "Idea or comment", and a missing title or detail is announced and focused.

## 0.18.0 — 2026-10-26

- "Not typed lately" in free practice, and the suggested "Bring them back" session, now always include every key it lists, each in at least two real words.

## 0.17.0 — 2026-10-26

- Practice suggests one short session at the top, such as bringing back keys you haven't typed in a week or working on weak letter pairs, and says why. Once today's goal is met it suggests resting instead.
- Problem keys only lists keys you miss more often than your pass mark allows, or that are clearly slower than the rest, and shows which keys the drill will use.
- Your own text tells you when the box is empty and which characters aren't on your layout or unlocked yet.
- Practice runs say "Back to practice" and "Practice again", and screen readers get named tables and readable column headers.

## 0.16.0 — 2026-10-26

- Loading a newer export of a layout you already have asks whether to update it and keep your progress, instead of quietly adding a second copy that starts from lesson 1.
- Removing a layout says what goes with it (its progress and key stats) and has a Cancel button.
- The Layouts page puts your layouts and the ways to add one at the top, preselects your keyboard's factory default among the Starter layouts, and says where to find your MoErgo or ZMK file.
- Pasting something that isn't a usable layout explains what's wrong and keeps your text so you can fix it.
- Screen readers hear the result of each action on the Layouts page, keep their place after it, and know which layer is showing.

## 0.15.0 — 2026-10-26

- Once you've met your daily goal, Lessons says "Done for today" and suggests resting your hands. Keep going is still there, but Enter no longer starts another lesson.
- Lessons you haven't unlocked fold into one "6 more lessons" line with their keys, and units you haven't reached preview their keys, so the list is much shorter.
- Finished units say "All 7 done". Lesson rows show only stars; accuracy and speed are on the result screen and Practice.

## 0.14.0 — 2026-10-26

- Screen readers name each lesson's button ("Start lesson 3: S and L"), read stars and stage progress as text instead of ★ symbols, and announce each unit with its progress. Nav items no longer read their shortcut number as part of the name.
- Locked lessons are easier to read: they no longer fade out, and they show a plain "Locked" label instead of a greyed-out button.
- Empty stage segments are easier to see.

## 0.13.0 — 2026-10-26

- Apostrophes in prose drills are contractions and possessives ("don't", "dad's") instead of words wrapped in single quotes.
- Code drills read like code: dots join names (e.key), commas sit in calls or lists, and no stray sentence words like "share." sit between snippets.
- Generated sentences sometimes quote a word mid-sentence, the way people quote a term.

## 0.12.0 — 2026-10-26

- New users start on QWERTY for the Glove80 instead of Miryoku for the Go60. Lessons says which starter layout you're on and how a lesson works, with a button to pick another or load your own.
- The layout name in the header opens the Layout page.
- The Lessons page is calmer: only the next lesson's Start is amber, earned stars on the list are plain, and the daily-goal ring turns green once you've met your goal.

## 0.11.0 — 2026-10-25

- Keys you haven't typed in a week come back: lessons' mixed drills use them more often, and free practice starts with them. The free practice card on Practice shows which ones.

## 0.10.0 — 2026-10-24

- The app now notices letter pairs you fumble even when each letter is fine on its own, like "th" in "the". Common combos in reviews and practice drill your weakest pairs more often, and Practice lists them next to your problem keys.

## 0.9.0 — 2026-10-24

- During a lesson the only live number is accuracy. Speed shows on the result, and accuracy now comes first everywhere.
- Esc pauses a lesson instead of ending it, so a stray press next to A doesn't cost you the stage. Press Esc again to leave.
- Misfire notes name the key: "⌘ fired: S or E was still held when you pressed Space", or "Shift wasn't held. Hold N for T."
- The keyboard shrinks to fit the window during a drill, so the thumb keys stay on screen.
- The end of a lesson shows the keys you learned and today's practice time, with a link to change your daily goal. Once your daily goal is met, Enter takes you back to the lessons instead of starting another.
- Screen readers hear each stage's name and text when it starts. Typed text and finished stage chips are easier to read, especially in dark mode.

## 0.8.0 — 2026-10-24

- Hints fade as you learn: once you type a key accurately, its hint and highlight stay hidden until you pause or miss, so you recall it from memory. Change this under Settings › Hints.
- The end-of-stage result fits inside the drill box instead of spilling over the hint, without the page changing width, and a failed stage no longer shows empty stars.
- A miss on the current letter now shows in red even with reduced motion, and switching away from the window really pauses the clock, so resting doesn't count against your speed or toward your daily goal.
- Enter on a focused Retry, Redo or Back button now does that, and results and modifier misfires are announced to screen readers.

## 0.7.2 — 2026-10-20

- The footer shows who made Homerow Trainer, and Credits & licenses now notes that the app is MIT licensed.

## 0.7.1 — 2026-10-19

- If your Mac types § instead of ` (or ± instead of ~), the lesson now explains why: macOS thinks the keyboard is ISO, which you can switch to ANSI in System Settings › Keyboard.

## 0.7.0 — 2026-10-19

- A "What's new" note on the Lessons page after an update, and this changelog, linked from the version in the footer.
- The footer links to the full credits and licenses instead of listing them.

## 0.6.0 — 2026-10-19

- Sentence stages use real English sentences from Tatoeba once you know every letter in them, instead of generated ones.
- Capitals lessons pick sentences that use the capitals they teach.

## 0.5.0 — 2026-10-19

- Lessons pair new keys in common English letter groups, and reviews and practice get a Common combos stage.
- Code drills generate fresh dates, versions, times, prices and paths.
- Sentences use quotes, contractions, hyphenated words, ! ; : and parentheses once those keys are unlocked.

## 0.4.0 — 2026-10-19

- Saved layouts are save slots: update one with a newer export and keep its progress and key stats.
- Saved layouts can be renamed.
- Review lessons are named by the keys they cover.

## 0.3.3 — 2026-10-19

- Dedicated Shift, Ctrl, Alt and Cmd keys count as modifiers, not just home-row mods, and a setting picks between them when a layout has both.

## 0.3.2 — 2026-10-18

- The next-key highlight is Fill, Outline or Off, with a separate option to show it only after a wrong key.

## 0.3.1 — 2026-10-17

- Fixed a lesson restarting from the beginning when you left on its last "Stage passed" screen.

## 0.3.0 — 2026-10-17

- Keyboard navigation on the Lessons page: arrow keys move between lessons, Enter starts, 1–4 switch tabs.
- A lesson left part-way resumes at its first unpassed stage.
- A setting for the next-key highlight.

## 0.2.0 — 2026-10-17

- Report a bug or send feedback from inside the app, with optional diagnostics and your layout file attached.
- The footer shows the version and commit.

## 0.1.0 — 2026-10-14

- First release: progressive lessons built from your own MoErgo or ZMK layout, practice on problem keys, Starter layouts from MoErgo's editors, and light and dark themes.
