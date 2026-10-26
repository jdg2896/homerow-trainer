# Security policy

## Supported versions

Only the latest version, the one deployed at <https://jdg2896.github.io/homerow-trainer/>, gets fixes. The version is in the app's footer.

## Reporting a vulnerability

Please report it privately through [GitHub's private vulnerability reporting](https://github.com/jdg2896/homerow-trainer/security/advisories/new), not in a public issue or with the in-app Feedback button (that opens a public issue).

Include what an attacker controls (a layout file, a backup, pasted text…), the steps or a file that reproduces it, and the browser you used. This is a personal project, so expect a reply within a week or so. I'll credit you in the changelog unless you'd rather I didn't.

## What's in scope

Homerow Trainer is one static page with no backend, no accounts and no analytics. Everything you do stays in your browser's `localStorage`. The things that matter are:

- **Files you load.** MoErgo `.json` and ZMK `.keymap` layouts, and backup files, are often shared between people. Loading one should never run script, change other layouts' data or break the app so it can't start.
- **Pasted text.** Pasted layouts and custom practice text get the same rules as files.
- **The build.** `build.mjs` inlines the word list, the Tatoeba sentences and the MoErgo presets into the page, so data from upstream must not be able to run script there.
- **The feedback form.** It opens a prefilled GitHub issue. It should only include what the form lists (you can see the diagnostics and untick the layout), and nothing is sent until you submit the issue on GitHub.

Out of scope: someone who already has access to your browser profile or can run script in the page's origin (they can read `localStorage` anyway), browser extensions, and denial of service from very large files you choose to load yourself.

## How the app handles untrusted input

- Views are template strings, so every value from a file, a backup or storage is passed through `esc()` before it reaches `innerHTML`.
- Layout files are parsed into a fresh structure, and their names, title and id are coerced to strings.
- Backups are rebuilt field by field. Settings must be one of the values the app writes itself, stats keep only numbers, flags and dates, and layout text is parsed like any loaded file.
- Clicks go through one delegated handler on `data-*` attributes. There are no inline event handlers, `eval` or `new Function`.
- Inlined JSON has every `<` written as `<`, so a `</script>` in the data can't end the script block.

## Third parties

The page loads its fonts from Google Fonts (`fonts.googleapis.com` and `fonts.gstatic.com`), so Google sees the request and your IP address. It makes no other network requests, except to open GitHub when you send feedback or follow a link.
