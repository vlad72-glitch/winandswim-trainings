# Where this got to — 29 July 2026

Read this first if you are picking the project up fresh. `SETUP.md` is the
user-facing guide; this file is the build state.

## START HERE: the redesign is done and shipped

The iOS redesign is live at cache `ws-training-v7`, blockers, majors and minors all done. `node verify.js` passes 128
checks, and `SEEDS=1-20 node verify.js` passes 4,000 simulated sessions. All six
screens have been rendered and looked at, plus the pushed session screen.

What the app has now: a bottom tab bar in thumb reach, large scrolling titles,
grouped inset lists, sheets for editing, full dark mode from
`prefers-color-scheme`, and a Pool view kept deliberately in the opposite
register, opaque black on white with no glass, because the deck is bright and his
hands are wet.

### How to see any screen without a login

`verify.js` can render every view behind its DOM stub, and that is how all six
were checked. The generator lives outside the repo, in the session scratchpad, and
the method is worth repeating rather than the file: slice `verify.js` up to the
line after `const paintUser`, repoint `ROOT`, set `env.win.supabase = {}` (render
bails to "Couldn't load the database library" without it), then
`E.setData({focuses, library: paintLib, games, settings: S, sessions:
paintSessions, items: paintItems, coaches: paintCoaches})` after `setSeed(4242)`
and `setNow(BASE_NOW)`, drive with `E.setUi({...})` and `E.render()` or
`E.startPool(sk)`, and serialise `doc.documentElement`. Write the output into the
app folder, because a preview pane will not serve files from outside it, and
delete it afterwards.

**Measure, do not reason.** Every real defect in the last round was found by
rendering the page and reading numbers off it, not by reading code. Three review
rounds at high effort produced findings that were roughly one-in-five wrong, and
the two worst bugs in the whole redesign were found by neither the reviewers nor
the audits.

### Two traps this file learned the hard way

1. **Never write a raw tag name in angle brackets inside a CSS comment.** A
   comment reading `/* a <button> shrinks to fit */` made `verify.js` parse the
   whole stylesheet as page content and fail with an unrelated-looking message. A
   real browser treats `<style>` as raw text so it renders fine, which is exactly
   what makes it hard to spot. The harness parser does not.
2. **A `var()` inside a custom property is substituted on the element that
   declares it.** Declaring `--p-call:calc(48px * var(--pool-scale))` on `:root`
   froze it against `:root`'s scale, so `#pool.big{--pool-scale:1.2}` changed
   nothing and the Bigger text switch was inert while still saving to
   localStorage. The size tokens now live on `#pool` itself.

### The old accent-ink note, kept because the lesson stands

An earlier version of this file claimed a live bug at `index.html:2092`
referencing a deleted `--accent-ink`. It was never true. The line reads
`var(--accent-text)`, `grep accent-ink index.html` returns nothing, and a sweep of
every `var(--x)` used against every `--x:` defined finds no undefined token. It
came from an agent report that was relayed without checking.

**The lesson, which matters more than the non-bug:** the four `design/pass2-*.md`
documents are agent output that was never verified against the file. One of them
led with a defect that did not exist. Spot-checking found the rest of its claims
sound (`button.small{min-width:64px}`, `isLive` with 6 uses and no `isActive` in
the live file, `.codeblock`, the four `.login` rules, the body safe-area padding,
`--good-fill` and `--on-good` all present as described). Treat those documents as
leads to confirm, not as findings to act on. Grep before you fix. In particular,
the claim of "9 review findings already live plus 5 new live defects" is unverified
and the one claim that was checkable was false.

### What was fixed after the design work shipped, and how it was found

All of these came out of rendering a screen and measuring it. None was in any
review document:

- The pool call line broke into four lines 221px tall, because the 104px tick
  strip left the text column 185px. Strip narrowed to 76, call cut 48px to 34px.
- The tick strip was an empty box with no children. It now draws a check in CSS.
- The pool goal took 25% of the screen before the first set. Own token at 24px.
- The pool header was 20% of the screen with "of 57 min" wrapping. `nowrap` plus
  smaller tokens brought it to about 110px.
- `#pool` set the top safe-area inset **and** `.ptop` set `top:` to the same
  value. They stack, so the header pinned 94px down on a notched phone and left a
  94px band the deck scrolled through, with set text under the clock and battery.
  The inset now lives only in the header.
- `overflow-y:auto` makes the other axis compute to `auto`, so the deck could
  scroll sideways. `overflow-x:hidden` added. It overflowed at 320px, which is
  what Display Zoom reports.
- `button.primary:active` swapped its background to `--accent-text`, a pale text
  colour in dark mode, putting the label at 1.97:1. Brightness only now.
- The three switches were 51 by 31, the only sub-44px targets in the app, two of
  them pool controls. A `::before` grows the target to 71 by 45.
- `onScroll` wrote `className` on every scroll event, invalidating the one element
  carrying `blur(20px)` sixty times a second, with a single threshold that thrashes
  on a rubber-band settle. Two thresholds, write only on the flip.
- Night pool could not reach the toast, which mounts outside `#pool`, so a white
  box appeared on a black deck. `poolnight` is mirrored on the body element.
- History rows changed shape depending on title length, because `flex-basis:auto`
  in a wrapping row makes an item jump to its own line instead of shrinking.

### The minors round, also done

Every one was checked against the file first, and all eleven acted on were real:

- The deck scrolled the open block into view with `index * 88`, but a collapsed row
  is 90.1px with a 12px margin, so the real pitch is 102.1 and it landed 56px out
  by the fifth block. It now reads `offsetTop`, which cannot drift when the type
  changes and reads undefined behind the stub, where the guard makes it no scroll.
- The tick strip showed a check even before it was tapped. A ring before, a check
  after, so done and not-done differ by shape and not only by the fill inverting.
- The tab bar declared `role="tablist"` and `role="tab"` while marking the current
  tab with `aria-current`. Those are two different contracts: `role="tab"` promises
  `aria-selected` and an `aria-controls` panel, neither of which exists, so
  VoiceOver said "tab, 1 of 4" and never which one was current. A tab bar that
  swaps the whole view is navigation, so the widget roles are gone and the nav
  landmark and `aria-current` stayed.
- The sheet never leaves the DOM and closing it only dropped a class, so a closed
  sheet still advertised `aria-modal="true"` and still held the previous sheet's
  contents. It now toggles `aria-hidden` and empties itself on close.
- `button.good` had no dark-mode border, so Add sat at 2.42:1 against the card. The
  primary button had already been fixed the same way and this one was missed.
- `.seg button:active` stripped the accent fill while leaving the label white, so
  pressing the rating already chosen went white on pale grey. Both selectors were
  0,2,1 and only source order decided it. It dims now instead of replacing.
- The increase-contrast border rule listed `.tile`, which is a cell inside a card,
  so every cell got boxed separately. Now `.tiles`.
- `hyphens:none` unprefixed is dropped at parse time on iOS 16 and earlier, so the
  guard did not hold on the versions it was guarding. Prefixed.
- The Ask Claude picker offered the Game role, but games come from `tr_games` and
  `pickForRole` is never called with `"game"`, so anything added there would sit in
  `tr_exercises` unused. Removed from the picker.
- The hairline was drawn between a suggested set and its own Add and No buttons
  exactly as between two different sets, so the buttons read as belonging to
  nothing. Suppressed on that row.
- Regenerate was offered on an unsaved draft, where the button above already says
  "Generate another" and its own sheet talks about sets returning to the rotation,
  which has not happened yet. Saved sessions only.

### Pass 2's salvaged audits, now spent

`design/pass2-*.md` are four audit documents from a workflow whose repair step died.
They were never verified and roughly one claim in five proved false, so treat them
as leads to confirm rather than findings to act on. Grep before fixing anything from
them. Everything worth acting on has been acted on; they are kept for the reasoning,
not as a to-do list.

- `design/pass2-README.md` is the index. Read the four in the order it gives.
- `design/pass2-triage-47-findings.md` (59 items) triages every review finding
  against the post-pass-1 file. **This supersedes `DESIGN-REVIEW.md` wherever the
  two disagree.** It also records 9 review findings that are already live defects,
  plus 5 live defects and 3 hazards the review never contained, as N1 to N8.
- `design/pass2-stylesheet-merge-plan.md` (37 items) reconciles the draft CSS
  against the live one. 41 of the 44 token names already match with identical
  values, so this is a merge, not a rewrite.
- `design/pass2-markup-edits-rebaselined.md` (27 items) re-anchors the 24 draft
  edits against the current bytes. 17 still apply, 3 are superseded, 2 partly, 2
  need restructuring.
- `design/pass2-harness-extension.md` (10 items) is the plan for making `verify.js`
  able to fail when the interface breaks, and for reaching `renderPool` from
  `WSTRAIN_ENGINE`. That is the prerequisite for the rest.

### Three traps recorded in those documents

Worth knowing before touching anything, because each one makes things worse:

1. **Never paste `design/draft-stylesheet.css` over the live one.** It re-bundles
   the accessibility media queries and hardcodes light-mode label hexes, which puts
   `#000000` text on `#1c1c1e` cards at 1.23:1 in dark mode. It also drops
   `button.small{min-width:64px}`, and the five difficulty buttons are single
   characters with that class, so they fall to about 32px wide.
2. **The draft edits call `isActive()`. The live helper is `isLive`**
   (`index.html:691`, used in 9 places). Any snippet lifted from the draft throws
   `ReferenceError` until it is renamed.
3. **Do not apply review major 10's `--on-good:#0d2f1c`.** Against the
   `--good-fill:#14663a` that actually shipped it computes to 2.08:1. The live
   split-token approach measures 7.02:1 and is already correct.

**Four traps, all of which make things worse if applied blind:**

1. Do not paste `design/draft-stylesheet.css`. It re-bundles the accessibility
   media queries, which puts `#000000` labels on `#1c1c1e` cards at 1.23:1 in dark
   mode. That is blocker 3, which pass 1 already fixed.
2. Do not apply major 10's `--on-good:#0d2f1c`. Against the `--good-fill:#14663a`
   that actually shipped it computes to 2.08:1. The live pairing is 7.02:1.
3. The draft edits call `isActive()`. The live helper is `isLive` at
   `index.html:691`. Applying them as written throws on every Library paint.
4. The draft drops `button.small{min-width:64px}`, `.codeblock`, the `.login`
   rules, and `body{padding:env(safe-area-inset-*)}`. All four are live pass 1
   fixes. The first one is a 44px regression on the five difficulty buttons.

**Scope is bigger than the review says.** 9 findings it framed as future risks are
already live defects, and the triage found 5 more plus 3 hazards the review never
contained. Also, the line further down this file that says "None of these are
fixed" is no longer true: 2 are fully fixed and 5 are half fixed.

## The design documents in `design/`, and what they are worth now

Both passes shipped. These are kept for the reasoning, not as a to-do list:

- `design/DESIGN-SPEC.md` is the full specification: token groups, the two visual
  registers, type scale, per screen layout, components, motion. Still the best
  explanation of *why* the app looks the way it does. A few of its measurements
  were later shown wrong by rendering the page, so trust the file over the spec.
- `design/DESIGN-REVIEW.md` is 7 blockers, 24 majors and 16 minors from three
  reviewers on the draft implementation. All the real ones are fixed. Several of
  its contrast ratios are wrong, including one whose prescribed fix measured
  2.08:1 against what actually shipped, so recompute before believing a number.
- `design/draft-stylesheet.css` and `design/draft-markup-edits.json` are the
  reviewed-but-unapplied draft. **Never paste them in.** They target markup that
  no longer exists and carry every one of those blockers.

**The legibility gap that used to be open is closed.** The pool set line was
24.8px at 375px, under the 16 arcmin floor. The call and qualifier are now split,
so the line he shouts is its own element at 34px and the rest reads underneath.

## History sessions open as their own screen

Added 30 July 2026, after Vlad reported that tapping a past session "opens like in
the main today training page".

`view.name === "session"` renders `renderSessionDetail()`, pushed inside the
History tab: a `‹ History` back button on the left, the session's own date as the
title, `paintTabs()` keeps History lit the same way pool keeps Today lit, and
`hist.scrollY` is captured on the way in so Back lands where he left the list.
No Set up form and no Generate button, because the session already happened.

The handler used to be `draft = hydrate(s); view.name = "today"`. Besides lighting
the wrong tab and offering no way back, that **assigned the today draft**, so
opening a past session silently destroyed a training generated for today and not
yet saved. The detail view holds its own `view.pastSession` instead. That property
is deliberately not called `session`: in this file `session` is the auth session.

Five paint checks cover the screen, and `setUi` accepts `pastSession` so the
harness can drive it. The goal box label follows the date rather than always
saying "Today's goal", and both halves of that condition are tested, because a
test for one half passes even when the condition is inverted.

## It is live and working

**https://vlad72-glitch.github.io/winandswim-trainings/**

Setup steps 1 to 6 of `SETUP.md` are done and verified:

- Supabase project `winandswim-trainings` created (on a **second Supabase
  account**, organization "Win and Swim 2 other projects" — the first account
  was out of free project slots)
- `supabase-schema.sql` run successfully. All nine `tr_` tables exist, RLS on,
  147 exercises, 15 focuses, 13 games, 48 historical trainings seeded
- Sign-ups turned off
- Coach rows added to `tr_coaches`
- `config.js` filled in with the real project URL and publishable key
- Pushed to GitHub, live on Pages, all 8 files serving with correct content
  types, deployed `index.html` byte-identical to the local copy, no console
  errors, login screen renders

Vlad has confirmed the logged-in path works (he tested locally before pushing).

## The Claude layer is deployed

Steps 8 and 9 are done. `ANTHROPIC_API_KEY` is set as an Edge Function secret
and `generate-session` is deployed.

Verified from the outside, without any credentials:

- An unauthenticated `POST` to
  `https://wueuvwutbeqtyuhmhglh.supabase.co/functions/v1/generate-session`
  returns 401 `UNAUTHORIZED_NO_AUTH_HEADER`, so the function exists under the
  right name and Supabase's gateway JWT check is switched on in front of it.
  The app satisfies that check: it sends the coach's own access token in
  `Authorization`. This is a second lock in front of the `tr_coaches` check,
  not a replacement for it.
- An `OPTIONS` preflight returns 200 with `access-control-allow-headers:
  authorization, x-client-info, apikey, content-type` and `allow-methods: POST,
  OPTIONS`, which is byte-for-byte the `CORS` constant in the function. That is
  the proof that the deployed code is *this* file and not a stale paste. The
  gateway passes preflights through unverified, so the handler answers them.

Note for a future deploy: Secrets are **not** under Project Settings, whatever
older notes say. They are under **Edge Functions** in the left sidebar, then the
**Secrets** tab. `SETUP.md` step 8 has the direct link. Project Settings →
Integrations → **Vault** is a different feature and the function cannot read it.

## Nothing is left

All nine setup steps are done, step 7 included: it is on his home screen and he
is using it. `node verify.js` passes, and the four app files served from Pages
are byte-identical to the local copies.

The one thing never checked from the outside is a live Anthropic call, because
that needs his login. It is confirmed only by him using the app and not
reporting a banner. If a card ever appears with a banner across the top, read
the banner first: it names the reason, and the session underneath it is still
written from the library and still usable.

### Where the library is backed up

`supabase-schema.sql` is the only portable copy of the library: 147 exercises,
15 focuses, 13 games and 48 of his own past trainings, plus every table and RLS
policy. The GitHub repo is **public**, so this one file is deliberately kept out
of it. It lives in a **secret gist** instead:

https://gist.github.com/vlad72-glitch/9f0a8662938297d92339ff07f99a8692

Secret means unlisted and not indexed, not encrypted. Anyone holding the link
can read it. That is the right trade for a training library and the wrong one
for anything containing a key, so never put `config.js` or a secret in there.

Nothing syncs it. After editing the library, push the new version by hand:

```bash
gh gist edit 9f0a8662938297d92339ff07f99a8692 supabase-schema.sql
```

### The thing most likely to bite now

His project uses Supabase's **newer key system** (`sb_publishable_...` /
`sb_secret_...`) rather than the legacy JWT `anon`/`service_role` keys. Supabase
normally injects `SUPABASE_SERVICE_ROLE_KEY` into Edge Functions automatically,
but that may be absent on projects created under the new scheme.

The function already handles this: it also accepts a secret named
`SB_SECRET_KEY`, and if neither is present it returns `no_service_key`, which the
app renders as a message naming the exact secret to add. Documented at the end of
`SETUP.md` step 9. If he reports "The function cannot reach the database", that
is what happened and the fix is to add that secret.

## Checked since, but still never run

The Edge Function now type-checks. Deno was not available last session; it is
installable with `npm install deno`, and `deno check
edge-function/generate-session/index.ts` passes clean. So a syntax or type
problem is no longer the thing to expect on first deploy.

Its Anthropic call was also read against the current API and is correct for
`claude-opus-5`. It is documented raw HTTP (`POST /v1/messages`, `x-api-key`,
`anthropic-version: 2023-06-01`, strict JSON via `output_config.format`),
deliberately not the SDK, so there is no pinned package version to go stale.
Three details matter and all three are right: it sends no `temperature`,
`top_p` or `top_k` and no assistant prefill, all of which return 400 on this
model, and it checks `stop_reason` before reading the text.

**Still never run: the Anthropic call itself.** No request has been made, so
first deploy is still where a live-behaviour surprise would show up. If the
reply shape is wrong the app falls back to the library and logs the reason in
`tr_ai_generations`.

Three fixes were made to the function after that read, before it was ever
deployed:

- `max_tokens` raised from 8,000 to 16,000. Thinking is on by default on this
  model and shares that budget with the reply, and unused tokens cost nothing.
- A `stop_reason === "max_tokens"` branch logging a new code, `truncated`. A
  cut-off reply used to fail `JSON.parse` and log as `bad_shape`, which blames
  Claude for a ceiling. `truncated` is not in the app's `FALLBACK_NOTE` map, so
  the card shows the generic "Claude was not reachable" line; the value is in
  the log.
- `MAX_CALLS_PER_COACH_PER_DAY` renamed to `MAX_CALLS_PER_DAY`, because that is
  what it always was. `tr_ai_generations` has no coach column, so the count
  cannot be narrowed to one coach. Per-coach capping would need a schema change
  and is not worth it: a whole-team cap bounds a stuck button better anyway.

## How to check you have not broken anything

```bash
cd "/Users/vlad/Desktop/Personal/Lessons Generator"
node verify.js            # 12 seeded seasons, 2,400 sessions, 44 checks
SEEDS=1-40 node verify.js # 8,000 sessions, for bigger changes
```

It is **seeded and deterministic**: the same run always gives the same answer,
and a failure names the seed and session so it can be reproduced. It parses the
seed library straight out of `supabase-schema.sql` and loads the engine straight
out of `index.html`, so it tests the real thing, not a copy. It must end with
`All checks passed`.

The engine is exposed for testing via `window.WSTRAIN_ENGINE` at the bottom of
`index.html` (`buildSkeleton`, `validate`, `renderCard`, `setData`, and so on).
That seam is how `verify.js` drives it without a browser or a database.

## After changing any file

Push to `main`, then **bump the cache version in `sw.js`** (`ws-training-v1` →
`v2`). Phones cache aggressively and this is the only thing that makes them drop
the old copy. Currently at `ws-training-v1`.

## Design decisions that are easy to undo by accident

- **Underwater work is allowed on purpose.** Vlad's real trainings are full of
  short submerged segments off the wall (5 to 12.5 m, dolphin kicks, flip turn
  plus 10 m under). An earlier version of the plan blocked these and that was
  wrong. What stays blocked is a contest for who stays under longest, and
  breath-restricted work is capped at one block and never placed last.
- **Adv 1 / Adv 2 differ by REST, not distance.** This is his own notation
  (`5x50m 30" adv 1 | 20" adv 2`) and matches the Advance 1 / Advance 2 boxes on
  his printed placement test. Adv 2 is the stronger half. Only the main set ever
  gets a rep-count difference; seven people in one lane cannot run different
  distances. `finaliseAdv()` enforces this.
- **Whole-session sets** (`whole_body = true`) are only ever used as the entire
  main body, via the `bigset` archetype, never as one block among four. That is
  how he writes them (`Warmup / 3x800`) and also the only way an 800 m repeat
  fits a 45 minute main block.
- **A set may only be rescaled** when its printed line is a single clean
  `N x D m` whose numbers match the stored `reps` and `rep_distance_m`
  (`rescalable()`). Composite sets and sets that name their own reps in order
  must have `reps` null. `verify.js` guards both cases.
- **The no-repeat window is sized against the role's full pool**, not whatever
  the momentary safety filters left. Otherwise the same set rests a different
  number of sessions depending on which code path picked it, and the Library
  screen shows a number that is sometimes wrong.

## Known limitations, deliberately left

- The library's goal sentences are fixed, one per focus. Claude writes a fresh
  goal on every generation, so this only shows when the AI is unreachable
  repeatedly. Adding a `goal_alt text[]` column would fix it if it ever grates.
- Pool view cannot keep an iPhone screen awake. The Wake Lock API is not
  available in Safari on iOS, so `SETUP.md` tells him to set Auto-Lock to 5
  minutes instead. Nothing to fix in code.
- Sessions are recorded per group and coach, not per swimmer. Per-swimmer
  tracking is the Swimmers Progress app's job.

## No open questions

The sprint pyramid is settled. Vlad confirmed on 30 July 2026 that
`25 sprint / 50m 90% / 100m 80% / 200m 70% / Rest 1 min, 3 more times` means
**four rounds total, 1,500 m**, which is what the library already stored:
`reps` 4, `rep_distance_m` 375, `distance_m` 1500. No change was needed. His
verbatim "3 more times" wording stays in `tr_historical_trainings` on purpose,
because that table is the style reference Claude reads, not a set the generator
picks from.
