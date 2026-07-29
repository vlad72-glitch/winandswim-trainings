# Where this got to — 29 July 2026

Read this first if you are picking the project up fresh. `SETUP.md` is the
user-facing guide; this file is the build state.

## START HERE: one live bug, and where pass 2 got to

**There is no live bug. An earlier version of this file claimed there was, and it
was wrong.** The pass 2 triage agent reported that `index.html:2092` still read
`style:{color:"var(--accent-ink)"}` against a deleted token. It does not. That line
reads `var(--accent-text)` and always did after pass 1. Verified two ways: `grep
accent-ink index.html` returns nothing, and a sweep of every `var(--x)` used in the
file against every `--x:` defined in it finds no undefined token at all.

**The lesson, which matters more than the non-bug:** the four `design/pass2-*.md`
documents are agent output that was never verified against the file. One of them
led with a defect that did not exist. Spot-checking found the rest of its claims
sound (`button.small{min-width:64px}`, `isLive` with 6 uses and no `isActive` in
the live file, `.codeblock`, the four `.login` rules, the body safe-area padding,
`--good-fill` and `--on-good` all present as described). Treat those documents as
leads to confirm, not as findings to act on. Grep before you fix. In particular,
the claim of "9 review findings already live plus 5 new live defects" is unverified
and the one claim that was checkable was false.

**Pass 2 was started and did not finish.** All four re-baseline agents completed
and their output is saved. The repair agent then died on a network error
(ENOTFOUND) and produced nothing, so the Repair, Re-review and Completeness phases
never ran. Workflow runs cannot be resumed across sessions, so do not try. Re-run
the repair using these four documents as the input, and do not start the design
work over: everything needed to write the merged stylesheet and the corrected edit
list is already in them.

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

## The redesign is half done, and the half that is left is specified

A full iOS restructure was designed and reviewed. **Pass 1 is live.** Pass 2 is
not started, and everything it needs is written down in `design/`:

- `design/DESIGN-SPEC.md` is the full specification: token groups, the two
  visual registers, type scale, per screen layout, components, motion, and a
  DO NOT TOUCH list. Every colour in it was measured, not guessed.
- `design/DESIGN-REVIEW.md` is 7 blockers, 24 majors and 16 minors found by
  three independent reviewers on the draft implementation, each with a fix, plus
  the 14 risk decisions the spec carries. **None of these are fixed.** Read it
  before writing a line of pass 2.
- `design/draft-stylesheet.css` and `design/draft-markup-edits.json` are that
  reviewed-but-unapplied draft. Do not paste them in. They are written for
  markup that does not exist yet and they contain every one of those blockers.

**Pass 1, live now:** the token system with light and dark palettes, dark mode
from `prefers-color-scheme`, `prefers-contrast` and
`prefers-reduced-transparency` in separate blocks, every tap target at 44px or
more, `:active` feedback with hover behind `@media (hover:hover)`, and four real
bugs fixed. It was written fresh against the existing markup rather than taken
from the draft, which is why none of the blockers reached the app.

The four bugs: primary buttons failed AA at 4.10:1 and are now 7.56:1; retired
library sets were counted and listed as active in five places and now go through
one `isLive()` predicate; the pool done state was 2.34:1 and colour-only, and is
now 17.68:1 with a "done" marker; and the difficulty rating claimed to change the
next session's volume, which no code ever did.

**Pass 2, not started:** bottom tab bar, large titles, grouped inset lists,
sheets, and the Pool view rebuild with the tick strip.

### The one legibility gap still open

At 375px the pool set line renders at 24.8px, under the ISO 9241 16 arcmin floor
that `DESIGN-SPEC.md` derives for a bright hall at 70 cm. It was left alone on
purpose: raising the size without the call/rest/qualifier split makes a 53
character set line wrap to four lines, which is worse than small type. The split
is specified in the spec, section 6. This is unchanged from the original app, so
it is a gap and not a regression.

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

## Open question worth asking him

His sprint pyramid note reads `25 sprint / 50m 90% / 100m 80% / 200m 70% / Rest
1 min, 3 more times`. I read "3 more times" as **four rounds total** (1,500 m).
If he meant three rounds after the first, that set should be 1,875 m. Worth
confirming when he next reviews the library.
