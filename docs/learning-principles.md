# Learning principles

What the curriculum and drills are based on, so changes to lessons, drill text or practice keep to it. Each principle notes the evidence, how the app applies it, and what's still missing.

## 1. Introduce keys a few at a time, home row first

Typing courses (typing.com, GNU Typist, keybr) start on the home row and add a couple of keys per lesson, with reviews in between, so each new key builds on ones that are already automatic.

**In the app:** `buildCurriculum` in `src/engine.js` orders home row → top row → bottom row → reach keys → capitals → shifted symbols → thumb layers → navigation → shortcuts, two keys per lesson, with review lessons along the way. Every drill only uses keys that are already unlocked.

## 2. Accuracy before speed

Errors practiced become habits, and speed follows once the movements are right. Typing courses gate progress on accuracy, not WPM.

**In the app:** a stage passes on the *Accuracy needed to pass* setting (`passAcc`, 95% by default), and *Stop on error* (`stopOnError`) makes you fix a miss before moving on. The WPM target (`targetWpm`) only earns extra stars; it never blocks progress.

## 3. Short, regular sessions beat long ones

Postal workers learning to type learned most per hour of training at one hour a day; two two-hour sessions a day was the least efficient schedule ([Baddeley & Longman, 1978](https://www.gwern.net/doc/psychology/spaced-repetition/1978-baddeley.pdf); see also [distributed practice](https://en.wikipedia.org/wiki/Distributed_practice)).

**In the app:** a daily goal in minutes (`dailyGoal`, 15 by default) with a progress ring, and short stages (`stageLen`). The end of a lesson shows today's minutes, and once the goal is met it suggests stopping: Enter goes back to the lessons instead of starting the next one.

**Gap:** nothing brings you back the next day.

## 4. Move to real words and text as early as possible

Skilled typists don't type letter by letter. They read ahead and type in chunks, with the word as the main unit (Salthouse, 1986, discussed in [Crump et al., 2019](https://www.crumplab.com/publications/Crump/files/13615/Crump%20et%20al.%20-%202019%20-%20Instance%20theory%20predicts%20information%20theory%20Episo.pdf); [Crump & Logan, 2010](https://www.crumplab.com/publications/Crump/files/3903/Crump%20and%20Logan%20-%202010%20-%20Episodic%20contributions%20to%20sequential%20control%20Lear.pdf)). Random letter strings are only useful until there are enough keys for words.

**In the app:** stages go from key patterns → mixed drill → short words → words → sentences. Words come from `data/words.json` filtered to unlocked letters, and real sentences take over once their letters are unlocked ([#8](https://github.com/jdg2896/homerow-trainer/pull/8)). Code-style snippets and prose cover symbols.

## 5. Practice frequent letter combinations

Letter pairs that are common in English are typed faster than rare ones, because frequent sequences become single motor chunks ([Salthouse, 1984 summary](https://www.jimdavies.org/summaries/salthouse1984.html); [Crump et al., 2019](https://www.crumplab.com/publications/Crump/files/13615/Crump%20et%20al.%20-%202019%20-%20Instance%20theory%20predicts%20information%20theory%20Episo.pdf)). Drilling them builds those chunks sooner.

**In the app:** `NGRAMS` in `src/engine.js` lists common bigrams, trigrams and tetragrams. Learn lessons drill the ones that include the new key ("With known keys"), and reviews and free practice have a "Common combos" stage that follows each group with words using it.

## 6. Spend extra time on weak spots

Practice that targets current weaknesses improves faster than even practice across everything. keybr's adaptive drills are the familiar example.

**In the app:** per-key miss rate and latency are stored per layout (`stats.<layoutId>`) and drive the "Problem keys" practice. Misses are also counted per in-word letter pair (`stats.<layoutId>.pairs`), against the pair the missed letter completes. A pair is weak when it's missed more often than its second letter is overall, so a weak *pair* (fumbling `th` even though `t` and `h` are fine alone) shows up without a weak key flagging every pair it's in. The "Common combos" stage in reviews and practice gives the weakest pairs about 40% of its picks, along with the longer letter groups and words that contain them. Practice lists the weak pairs beside each one's second-letter miss rate.

## 7. Bring back old material over time

Skills fade without use. Spacing reviews out, and returning to older material, keeps it ([spaced practice for skills](https://www.learningscientists.org/blog/2018/11/15-1)).

**In the app:** review lessons inside each unit, and free practice draws on everything unlocked. Each key's stats also record the day it was last typed. Keys typed at least 10 times but not for 7 days or more count as not typed lately (up to six, longest ago first). Lessons' mixed drills weight them three times as heavily as other known keys, and free practice opens with a "Not typed lately" stage: real words for letters, groups for digits, and symbols in context. The Practice page names those keys on the free practice card.

## 8. Stop looking at the keyboard

Touch typing means not looking down. Visual hints help at first but should fade so you recall positions from memory.

**In the app:** the on-screen keyboard shows fingers, layers and held keys. Hints fade per key by default (`hints: 'fade'`): once a key is typed accurately and without hesitation (at least 40 presses, a miss rate of 4% or less and under 800 ms on average, from `stats.<layoutId>`), its hint, highlight and layer are hidden until you miss it or pause for 1.5 seconds. *Hints* can also be set to always show, or to show for every key only after a miss, and the keyboard and highlight can be turned off.

## Changing drills

- Check a change against these principles. If it departs from one, say why in the PR.
- New generated text has to stay typeable with unlocked keys only. `npm test` checks every drill item routes on every bundled layout.
- Prefer defaults that follow the principles over new settings. Add a setting only when users have a real reason to differ.
