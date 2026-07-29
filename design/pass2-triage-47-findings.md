# triage-47-findings

# Triage of all 47 DESIGN-REVIEW findings against index.html as it stands after pass 1

Files read in full: `/Users/vlad/Desktop/Personal/Lessons Generator/index.html` (2333 lines), `/Users/vlad/Desktop/Personal/Lessons Generator/verify.js`, `/Users/vlad/Desktop/Personal/Lessons Generator/design/DESIGN-REVIEW.md`, `/Users/vlad/Desktop/Personal/Lessons Generator/design/draft-stylesheet.css`, `/Users/vlad/Desktop/Personal/Lessons Generator/design/draft-markup-edits.json`, plus the relevant parts of `design/DESIGN-SPEC.md`, `manifest.webmanifest`, `sw.js`, `HANDOVER.md`. `node verify.js` passes today (2400 simulated sessions, "All checks passed").

## Headline

- **2 findings are fully fixed** (blocker 3, minor 7). **5 more are half fixed** (major 10, minors 3, 5, 6, 11). Everything else stands. So `HANDOVER.md` line 16, "None of these are fixed", is now wrong and should be corrected.
- **1 finding was caused by pass 1 and is live right now**: minor 13. `index.html:2092` still reads `style:{color:"var(--accent-ink)"}` and `--accent-ink` exists nowhere in the file (pass 1 renamed it `--accent-text`). One grep hit, the use site, no definition. The Claude-suggests cue in the Library has lost its colour in the shipped app.
- **9 findings that the review framed as future risks are already live defects** in the current file: majors 4, 9, 16, 17, 18, 22 and minors 1, 8, 9. They can be cleared now, before any structural work.
- **3 fixes in the review must NOT be applied as written**, because pass 1 solved the same problem a different way. Applying them blind makes things worse. See "Traps" below.
- **Nothing is moot outright.** Blocker 5 is a duplicate of blocker 1. Minor 7 duplicates the first half of minor 3.
- I found **5 live defects and 3 cross-cutting hazards the review does not contain**. They are in the list as N1 to N8.

## Traps: review fixes that are now stale and would cause harm

1. **Major 10's `--on-good:#0d2f1c` for dark mode. Do not add it.** The review assumed dark `--good` stays a pale mint as the button fill. Pass 1 split the token: `--good-fill:#14663a` stays dark in both modes (`index.html:104`) and `button.good` uses `color:var(--on-good)` which is white (`index.html:109, 176`). White on `#14663a` is 7.02:1, computed. The review's `#0d2f1c` on that same fill is **2.08:1**, computed. The first half of major 10 is already fixed and correct.
2. **The draft edits name the liveness helper `isActive`** (edits 9 and 10). The live helper is `isLive` (`index.html:691`), used in 9 places. Any snippet lifted from the draft must be renamed or it throws `ReferenceError`.
3. **Blocker 1's fix references a `poolEl` variable that does not exist** in the current file. Restate it as `var old = document.getElementById("pool"); if (old && old.remove) old.remove();`.
4. **Edit 24's grep gate still matters but its target moved.** The draft's "stylesheet section 15" never landed as a labelled block. Pass 1 folded those legacy rules into the main stylesheet: `header` at 145 to 147, `nav.tabs` at 157 to 161, `.hrow/.hdate/.hmain/.htitle` at 253 to 260, `.lrow/.lmain/.filters` at 262 to 267. The gate now points at those line ranges.

## Where the review's own numbers are wrong

I recomputed 18 of its contrast claims from WCAG relative luminance with alpha compositing. **16 matched to the second decimal.** The legibility reviewer is trustworthy. Two are wrong:

- **Minor 9 claims `--accent-edge:#3b6d87` "computes to 5.6:1 against #000000". It is 3.72:1.** The fix still works, because a control boundary only needs 3:1, but the margin is a third of what is claimed. Note the token already exists under another name: dark `--accent-line` is `#3b6d87` (`index.html:102`), so reuse it instead of adding a duplicate.
- **Major 10's switch-knob arithmetic is wrong twice.** 1px of `rgba(0,0,0,.28)` over `#8ce8b2` composites to rgb(101,167,128), not the stated rgb(151,183,161), and that against a white knob is **2.84:1, not 3.1:1**. The whole calculation is moot anyway: with pass 1's dark `--good-fill:#14663a` a plain white knob is 7.02:1 and needs no border.

Two more claims are overstated but do not change any conclusion:

- **Every physical measurement in the review and in the spec assumes 160 CSS ppi** (0.1588 mm per CSS px). Every iPhone from the 12 to the 16 is 460 device ppi at 3x, which is 153.3 CSS ppi, 0.1658 mm per px. So all arcmin and mm figures in both documents are about **4.4% conservative**. Consequence: the spec's claim (DESIGN-SPEC.md:263) that today's 1.85rem set line is "16.3 arcmin, exactly the ISO 9241 hard floor" is really **17.4 arcmin**, above the floor. The case for 48px survives untouched, since the target band is 20 to 25, but the "exactly on the floor" framing is not accurate. The real floor breach on his phone is the 560px breakpoint (`index.html:310-313`), which drops the line to 24.8px = **14.5 arcmin**.
- **Blocker 2 says `.sheet.sm{max-height:34dvh}` is "about 250px on a 14 Pro".** In standalone it is 270 to 290px. The conclusion holds either way, since the iOS date wheel alone is about 260px.

One internal contradiction between two of the review's own majors, which needs a decision:

- **Major 13 (keep the tick strip at 104px when collapsed, raise the block gap to 20px) breaks the spec's viewport budget** at DESIGN-SPEC.md:519 ("120 + about 300 + two collapsed rows at 88 = 596px, fits"). With major 13's own numbers a collapsed row costs 154px, and with major 15's recomputed heights the top bar is 121px and a worst-case open block is 394px. 121 + 52 (goal) + 394 = 567px, leaving about 196px of the 763 usable, so **one collapsed neighbour fits, not two**. Major 15's scroll-to-current-block stops being a nicety and becomes the only thing that makes the layout work, and the spec's budget paragraph has to be rewritten.

## The authoritative remaining list

Ordered so it can be worked top to bottom. 5 blockers, 24 majors, 15 minors, 8 new, 3 prerequisites, 6 decisions.

### P0, prerequisites before any pass-2 code
- **P0-1. Extend verify.js first.** Risk decision 12 was never done. `verify.js:174-186` still has no `classList`, no `dataset`, no `style.setProperty`, and there is no `renderCard` smoke test even though `index.html:2319-2320` exports the hooks for one. Until this lands, pass 2 must stay inside the current allowlist. `getElementById(){ return fakeEl(); }` at verify.js:217 never returns null and `remove(){}` at :181 is a no-op, which is exactly why blockers 1 and 5 are invisible to the suite.
- **P0-2. Decide the root font size before writing any rem value.** Pass 1 did not adopt `:root{font:-apple-system-body}` (draft-stylesheet.css:192). The live root is 16px, and every rem in the draft stylesheet is a seventeenth of the Apple ladder. Lift the draft as is and the whole shell renders about 6% small, with the tab labels and the date column the first to break. See D1.
- **P0-3. Tab icons must be static markup.** `h("svg", ...)` calls `document.createElement("svg")`, which passes the stub silently and produces an unstyled unknown element in the browser. Put the four icons in the static HTML, as edit 4 intends, or use the `html:` branch of `h()` at `index.html:345`, which is stub-safe because it is a property assignment.

### Blockers
- **B1 (blockers 1 and 5, merged). Duplicate `#pool` overlays.** Still applies to the pass-2 renderPool. Reconcile with major 15: repaint in place for a tick, full re-render only when the current block changes, and remove the old node first.
- **B2 (blocker 2). No text input may live in a bottom-anchored sheet.** Prefer fix (b), a `.sheet.top` class, over the visualViewport listener.
- **B4 (blocker 4). The pool close confirmation: order least destructive first, 104px targets, 48px before the committing one.** Today's pool footer already puts "Mark done" 10px from "Copy" with no confirmation at all (`index.html:1948-1950`), so do not carry that geometry over.
- **B6 (blocker 6). Namespace the row tones.** Restated: pass 1 changed `button.good` to `--good-fill` plus `--on-good`, so the dark-mode half of the finding is no longer true. Light mode still collides exactly, `#155c33` text on `#155c33` fill, 1.00:1. Specificity claims verified: `button.good` is (0,1,1), `.irow` is (0,1,0), `.irow.good .r-1` is (0,3,0).
- **B7 (blocker 7). Define before you reference.** Restated as a rule: `openSettings`, `stepRow`, `switchRow`, `askClaude` and `openSetSheet` must exist before the screens that call them, and `settingRow` (`index.html:2233`) must not be deleted before its replacement exists. The numbered edit list is 7/24 stale, verified: edits 1, 2, 9, 10, 21, 22, 24 no longer match.

### Majors, in review order
M1 glass edge geometry. M2 topbar blur snap and hysteresis. M3 overscroll on the root plus a pool page lock (the live file has no `overscroll-behavior` at all, so the deck rubber-bands today). M4 horizontal safe area (live: `#pool` at `index.html:284` uses a flat `14px`, and being `position:fixed` it ignores the body padding at line 142, so the deck clips under the notch in landscape now). M5 `min-height` not `height`, interlocked with P0-2. M6 sheet flex and overflow. M7 `body.solid` cascade, (0,2,1) beats (0,2,0), verified; the fix ties at (0,2,1) so it must be later in the file. M8 AudioContext resume. M9 segmented selected state, keep the 7.56:1 the current control already has. M10 **switch knob only**, first half already fixed. M11 tab label uses `--accent-text`, 3.96:1 and 7.32:1 both verified. M12 the tick strip needs a `click` listener, merged with minor 14. M13 collapsed strip size and gap, see the budget conflict. M14 gated taps must acknowledge, depends on the pool toast being visible at all. M15 scroll to the current block. M16 pool chrome type (live: `#pool button` at `index.html:304` is 1.05rem, about **9.9 arcmin**, and the set line under 560px is **14.5 arcmin**). M17 input borders (live: `border:1px solid var(--sep)` at `index.html:188` composites to `#c6c6c9`, **1.70:1** against the field's own white). M18 `draft` clobbering (live at `index.html:1888` and `1873`). M19 keep the generating feedback, currently correct at `index.html:1731-1745`. M20 the `add()` guard for `APP.append`. M21 literal replacements plus the grep gate, target ranges updated above. M22 unsaved draft plus close (live cousin: `markStatus` returns silently at `index.html:1870` when the pool "Mark done" is pressed on an unsaved draft). M23 skip the warm-up when choosing the current block, needs the hydrate change. M24 gate "Adjust reps" on `editable` only; both guards are present today at `index.html:1832` and dropping `!sk.saved` is safe because `nudge` sets `sk.saved=false` at 1850, which re-exposes the Save row at 1782.

### Minors, in review order
m1 sticky top inset (live). m2 `:active` heuristic, mostly dissolved by M12's click listener; the `<label class="irow tap">` and 8% fill halves stand. m3 **switch decision only**, the invalid `high` value is gone. m4 static reduced-motion state, plus N7. m5 **`appearance:none` only**, and it is now wider than the review states. m6 **manifest colours only**, the sw.js bump is done. m7 **fixed**. m8 stepper gaps (live at 4px, `index.html:1832`). m9 primary button boundary (live, and 2.34:1 on a card, worse than the 2.89:1 stated). m10 toast, and see N2. m11 **spec comment only**, plus a cosmetic decision. m12 rename `.banner.strip` to `.banner.edge`. m13 **`--accent-ink`, live, fix now**. m14 `aria-hidden` on `#sheet`, plus M12. m15 debounce the stepper writes. m16 keep the six dropped inventory items, plus the six-sessions wording decision.

### New, not in the 47
- **N1. `--accent-ink` is undefined and still referenced.** Same as m13, listed here because it is a pass-1 regression rather than a draft finding.
- **N2. Every toast raised in pool view is invisible.** `toast()` sets `zIndex:"99"` (`index.html:1604`) and `#pool` is `z-index:200` with an opaque background (`index.html:279-283`). So "Copied. Paste it into Notes or WhatsApp." and "Marked done." are painted behind the deck. The draft's own comment at draft-stylesheet.css:582-584 knows about this. Major 14's "Tap again" acknowledgement is unbuildable until it is fixed.
- **N3. Returning to the app mid-session resets the deck scroll.** `refresh()` is bound to `window` focus at `index.html:2268`, none of its guards at 613-615 apply in pool view, and it ends in `render()`, which rebuilds the whole overlay with no scroll restore. His phone auto-locks at 5 minutes inside a 60 minute session, so this fires several times a session.
- **N4. Dead identical-branch ternary in `hydrate`.** `index.html:1529` reads `warmup_minutes: warm ? (data.settings.warmup_minutes||10) : (data.settings.warmup_minutes||10)`. `warm` is found at 1511 and discarded, which is the concrete proof for risk decision 8. Replace it with `warmItemId` and `warmDone`.
- **N5. The 560px pool breakpoint is still live** at `index.html:310-313`. DESIGN-SPEC.md:330 says delete it. It is the single worst legibility item in the shipped app, 14.5 arcmin.
- **N6. No `appearance:none` anywhere in the file.** Neither `button{}` nor `input,select,textarea{}` resets native iOS chrome, so the date, search and select controls can ignore the background, border and radius set at `index.html:186-190`. The draft at least had it on the inputs.
- **N7. Pass 1's reduced-motion block dropped `animation-iteration-count:1`.** Compare `index.html:127-131` with draft-stylesheet.css:844-849. Inert today because nothing animates, but the moment the `.working` bar or the `.skel` shimmer lands, a reduced-motion user gets an infinite animation at 0.01ms per cycle, which is a strobe rather than a stop. Fix it in the same commit that adds the animation.
- **N8. The manifest `theme_color` now contradicts the app.** `manifest.webmanifest` still says `"theme_color": "#0284c7"` and `"background_color": "#f3f6f8"` while `index.html:10-11` ships the light and dark pair. Part of m6, called out because it is a visible inconsistency introduced by pass 1.

### Needs a decision from Vlad
- **D1. Dynamic Type, yes or no.** Adopting `font:-apple-system-body` gives the iOS text-size setting for free and forces every rem to seventeenths, and it means a changed text size only takes effect after the PWA is relaunched. Not adopting it keeps the current 16px root and means the app ignores his phone's text size for good. Everything in P0-2 and major 5 hangs on this.
- **D2. Is there a "Solid backgrounds" switch in Settings at all** (minor 3), and if so is it on by default? Safari cannot see iOS Reduce Transparency, so without the switch that system setting does nothing here. If the switch is dropped, major 7 evaporates with it.
- **D3. Night pool switch** (risk decision 11). Pass 1 pinned the deck to light with no night path. The draft carries `--p-ink:#fff; --p-paper:#000` for `body.nightpool`. Off by default, never automatic, but it needs his yes or no.
- **D4. The pool close confirmation flow.** Does "Mark done and close" belong in that sheet at all, given there is no undo in pool view? Blocker 4's fix makes it safe, but removing it is also an option.
- **D5. The six-sessions wording.** `index.html:1749` promises "never repeats a set inside six sessions" and `index.html:2200` says "sooner than six sessions". `effectiveWindow` at 739 to 742 is `Math.max(1, Math.min(base, Math.floor(roleCount * 0.5)))`, so with a role pool of 6 the real window is 3. I verified this myself: the claim is false, and the two screens contradict each other. Pick one wording for both.
- **D6. The collapsed-block budget** (majors 13 and 15 in conflict). Either accept one collapsed neighbour on screen instead of two, or keep the 76px collapsed strip and accept a 74.9% hit rate on the un-tick path.

## Items

### 1. Blocker 1: duplicate #pool overlays from renderPool  [still-applies (to pass 2)]

Not live today: renderPool at index.html:1893-1953 does end with `document.body.append(pool)` and cleans nothing, but the only caller is render(), which removes one #pool first at 1639-1640, and togglePool at 1954-1960 only rewrites className. Pass 2's design re-renders the overlay on every tick, which reinstates the leak exactly as described. Fix confirmed, restated: first statement of renderPool becomes `var old = document.getElementById("pool"); if (old && old.remove) old.remove();`. The draft's `poolEl` variable does not exist in this file. Blindness confirmed: verify.js:217 `getElementById(){ return fakeEl(); }` and verify.js:181 `remove(){}`. The review's cheaper advice, do not re-render on a tick, conflicts with major 15's scrollTop-at-end-of-renderPool, so reconcile: repaint className plus the strip mark in place for a tick, full re-render only when the current block changes.

### 2. Blocker 2: text inputs in bottom-anchored sheets under the iOS keyboard  [still-applies]

No sheets exist yet, so nothing to prove in the file. The premise is sound and the date case is the worst: `.sheet.sm{max-height:34dvh}` at draft-stylesheet.css:610 is 270 to 290px in standalone, not the stated 250px, against an iOS date wheel of about 260px, so the conclusion holds either way. Fix (b), a `.sheet.top` class anchoring input-bearing sheets under the top bar, is the right default. Fix (a) is stub-safe as written: verify.js's `win` object at 206-214 has no `visualViewport`, so a `typeof`/truthy guard never touches it. Do not ship a bottom sheet containing a date input.

### 3. Blocker 3: accessibility @media block bundled transparency with contrast and hardcoded light labels  [already-fixed-by-pass-1]

index.html:115-126 is the three-block split the review asked for, verbatim on the values: `@media (prefers-contrast: more), (prefers-reduced-transparency: reduce){ :root{ --sep:var(--sep-opaque); --shadow-card:none; } }`, then `@media (prefers-contrast: more){ :root{ --label:#000000; --label-2:#2b343c; --label-3:#4a545e; } }`, then `@media (prefers-color-scheme: dark) and (prefers-contrast: more){ :root{ --label:#ffffff; --label-2:#dfe4e8; --label-3:#b9c1c8; } }`. I recomputed the worst pair it cited, #000000 on #1c1c1e: 1.23:1, matching the review exactly. Carry-forward, tracked as CF1 in the summary: block 1 currently overrides only --sep and --shadow-card, so when the glass tokens land it must also gain --glass-fill, --glass-blur, --glass-edge, --glass-drop and --scrim. Aside: the finding's premise, that Safari 17.4 supports prefers-reduced-transparency, is contradicted by minor 3 from a different reviewer. Unresolved and now irrelevant, since the split is correct under either answer.

### 4. Blocker 4: pool close sheet, three 76px buttons 12px apart, destructive first  [still-applies]

Nothing exists yet. I verified the geometry maths and it is right: 38px half-width at 0.1588 mm/px is 6.03mm, /4.03 sigma = 1.497, per-axis 2*phi(1.497)-1 = 86.6%, squared = 74.9%, against 92.1% at 104px. At a real 153 CSS ppi the targets are about 4% larger than stated, which does not change the ordering. Fix confirmed: least destructive first, 16px between the benign pair, 48px before the committing one, all three at 104px. Note what pass 2 must not carry over: the live pool footer at index.html:1948-1950 puts `Mark done` 10px from `Copy`, both 64px, with no confirmation step at all, so today the state-changing button has no guard whatsoever.

### 5. Blocker 5: renderPool duplicate #pool (second reviewer)  [superseded, duplicate of blocker 1]

Same defect, same file position, same fix. One change clears both. Its extra detail is worth keeping in the commit message: the stub's getElementById returns a fresh object and remove() is a no-op, so neither verify.js nor a probe can ever see it.

### 6. Blocker 6: button.good beats .irow, and .irow.good .r-1 paints the label the same colour  [still-applies (light mode only, dark half is now stale)]

The .irow system is unbuilt. Specificity claims verified: `button.good` is (0,1,1) and beats `.irow{background:transparent}` at (0,1,0); `.irow.good .r-1` is (0,3,0). But pass 1 rewrote the variant at index.html:176 to `button.good{background:var(--good-fill);border-color:var(--good-fill);color:var(--on-good);}`, so restate the consequence: in light the collision is still total, #155c33 label on a #155c33 fill, 1.00:1; in dark it becomes #8ce8b2 on #14663a, which is readable, so only light mode breaks. Fix unchanged: emit `r-good`, `r-danger`, `r-accent` and rename the rules, or scope the variants as `button.good:not(.irow)`. `danger` is safe for the reason given, `button.danger` at index.html:179 is transparent.

### 7. Blocker 7: edit order, edits 16 and 19 reference openSettings before edit 20 defines it  [still-applies (restated as a rule, not edit numbers)]

The numbered edit list is partly stale, so the ordering rule matters more than the numbers. I verified the staleness independently: 7 of 24 `before` snippets are absent from the current file, edits 1, 2, 9, 10, 21, 22 and 24, which matches the mechanical check quoted in the brief. The rule to carry forward: define openSettings, stepRow, switchRow, askClaude and openSetSheet before any screen references them, and do not delete settingRow (index.html:2233-2243) before its replacement exists. Reading an undeclared identifier throws ReferenceError and verify.js renders only the not-configured branch, so the suite stays green through the whole broken interval.

### 8. Major 1: .glass has a top bar's edge geometry, so .tabbar gets it upside down  [still-applies]

Confirmed against draft-stylesheet.css:255-262: `border-bottom`, `inset 0 1px 0 0` rim on top, and a downward `--glass-drop`. `.tabbar` at 301-306 shares the class and adds no edge of its own. Fix confirmed: keep `.glass` to fill, blur and rim, and give `.topbar` and `.tabbar` their own border and shadow with the sign flipped, including the dark `--glass-drop` at draft line 152.

### 9. Major 2: .topbar creates and destroys a backdrop-filter layer mid-scroll, with no transition and no hysteresis  [still-applies]

Confirmed at draft-stylesheet.css:274-277: `.topbar:not(.compact)` zeroes background, backdrop-filter, border colour and shadow, and only `.topbar-title` has a transition (line 281, on opacity). Fix confirmed: move fill, border and shadow onto `.topbar::before` and animate opacity, keep backdrop-filter permanently on `.topbar`, and add hysteresis, `var want = barCompact ? y > 12 : y > 28;`. This also resolves major 7 on its own.

### 10. Major 3: overscroll-behavior-y on body does nothing in Safari, and the pool overlay chains to the viewport  [still-applies (worse than stated today)]

The live file has no `overscroll-behavior` at all, grep returns zero hits, and `#pool` at index.html:278-285 has no `overscroll-behavior:contain` either, so the deck rubber-bands today with `--bg-grouped` behind it, which is #000000 in dark. Fix confirmed: `html{overscroll-behavior-y:none}` plus a body lock while the deck is up. The lock needs `bodyFlags` and `paintBody()`, which do not exist yet, so it must be built with the shell. Keep the class write on `className`, not `classList`, unless P0-1 lands first. Do not use position:fixed on body.

### 11. Major 4: no horizontal safe-area padding on the shell  [still-applies (and already live in pool view)]

Pass 1 put the insets on the body at index.html:142, which covers the current static layout, but a `position:fixed` .topbar or .tabbar is laid out against the viewport and gets nothing from body padding. And `#pool` is already `position:fixed;inset:0` with a flat `14px` left and right at index.html:284, so it ignores the body padding entirely: in landscape on a notched phone the deck cards sit under the cutout right now. The manifest's `"orientation": "portrait"` does not help, Safari on iOS does not implement it. Fix confirmed for the topbar, tabbar, page column and the `.banner.strip` negative margin, and add the same to `#pool`.

### 12. Major 5: fixed heights on the shell against Dynamic Type  [still-applies (severity gated on decision D1)]

Confirmed at draft-stylesheet.css:269 `height:calc(env(safe-area-inset-top) + var(--topbar-h))` and 298, where the space reserved for the tab bar is the fixed token while `.tab` itself is free to grow. The overflow only bites once `:root{font:-apple-system-body}` is adopted, and pass 1 did not adopt it, so the live root is a fixed 16px. Either way `min-height` with `height:auto` is the cheap correct choice, and the reserved space should be `max(var(--tabbar-h), 4rem)`. Interlocked with P0-2 and D1.

### 13. Major 6: .sheet-body cannot shrink, so the last rows of a long sheet are unreachable  [still-applies]

Confirmed at draft-stylesheet.css:600-617: `.sheet` is a column flex with `max-height` and no `overflow:hidden`, and `.sheet-body` at 617 has neither `flex` nor `min-height:0`. Fix confirmed and cheap: `.sheet{overflow:hidden}` and `.sheet-body{flex:1 1 auto; min-height:0}`, and drop `overscroll-behavior:contain` from `.sheet`, keeping it on `.sheet-body`. The missing overflow is also what lets row backgrounds paint over the 20px sheet corners.

### 14. Major 7: body.solid .glass outranks .topbar:not(.compact)  [still-applies (evaporates if D2 drops the switch)]

Specificity verified: `body.solid .glass` at draft-stylesheet.css:180 is (0,2,1); `.topbar:not(.compact)` at 274 is (0,2,0), since :not() takes its argument's specificity. The type selector wins regardless of order, so with the switch on the bar is an opaque slab with `border-bottom-color:transparent` and `box-shadow:none` still applying. Fix confirmed: `body .topbar:not(.compact)` ties at (0,2,1), so it must also sit later in the file. Major 2's pseudo-element restructure fixes it without a specificity fight, which is the better route.

### 15. Major 8: AudioContext is never resumed, so the tick sound dies after the first screen lock  [still-applies]

No audio code exists yet, grep for AudioContext returns nothing in index.html. The reasoning holds: iOS suspends or interrupts the context on lock and does not resume it, and his Auto-Lock is 5 minutes inside a 60 minute session. Fix confirmed: `if (poolAudio.state !== "running" && poolAudio.resume) poolAudio.resume();` inside the gesture, immediately after the create-or-reuse line. Note verify.js's sandbox has no AudioContext, so the `typeof` guard from risk decision 7 is mandatory or the whole suite dies at load.

### 16. Major 9: .seg selected state is 1.15:1 light and 1.33:1 dark  [still-applies (a regression the redesign would introduce)]

Confirmed at draft-stylesheet.css:433-439: track `--fill-3`, selected pill `--bg-card`, both cells `color:var(--label)`, and `--shadow-card:none` in dark so the shadow cue does not exist. The live control is fine and must not be regressed: index.html:1857 renders the chosen rating as `class:"primary small"`, which is white on `--accent-fill` #075985, and I recomputed that at exactly 7.56:1. Fix confirmed: `.seg button.on{background:var(--accent-fill); color:var(--on-accent); box-shadow:none;}`. Use the `--on-accent` token rather than the literal `#fff` the review wrote, to match pass 1's token discipline.

### 17. Major 10: white on the pale dark --good, on button.good and on the switch knob  [first half already-fixed-by-pass-1, switch half still-applies, and the review's fix is now a trap]

First half fixed: index.html:176 is `button.good{background:var(--good-fill);border-color:var(--good-fill);color:var(--on-good);}` with `--good-fill:#155c33` light (index.html:69), `--good-fill:#14663a` dark (index.html:104) and `--on-good:#ffffff` in both (78, 109). I computed white on #155c33 = 8.04:1 and white on #14663a = 7.02:1. DO NOT apply the review's `--on-good:#0d2f1c` in the dark block: on pass 1's dark fill it is 2.08:1, computed. Switch half still applies, no switches exist yet, and pass 1's tokens make it trivial: use `--good-fill` for the checked track with a plain white knob, 7.02:1, no border needed. The review's knob-border arithmetic is also wrong: rgba(0,0,0,.28) over #8ce8b2 composites to rgb(101,167,128), not rgb(151,183,161), and that against white is 2.84:1, not the claimed 3.1:1. Its unchecked-knob figure of 10.81:1 is right.

### 18. Major 11: .tab.on paints an 11px label in --accent, below AA  [still-applies]

Confirmed at draft-stylesheet.css:316 and 324. I recomputed every ratio in the finding and all three match: #0284c7 on --glass-flat #fbfbfd is 3.96:1, on white 4.10:1, and the proposed --accent-text #075985 on #fbfbfd is 7.32:1. The internal contradiction the finding names is real: DESIGN-SPEC.md:662 reserves --accent for glyphs and non-text. Fix confirmed: `.tab.on{color:var(--accent)}` for the icon, `.tab.on .lbl{color:var(--accent-text)}` for the label.

### 19. Major 12: armTick binds only pointer and keydown, so VoiceOver cannot tick a block  [still-applies (merge with minor 14's second half)]

Reconcile the two conflicting fixes into one design, or they double-fire: pointerdown and pointerup only RECORD geometry and timing, `click` becomes the single place state changes, and when `e.detail === 0` the geometry gate is skipped because there was no real pointer. Drop the keydown handler, since a native <button> already synthesises click from Enter and Space. Net one listener fewer. This also arms WebKit's clickable heuristic, which is the first half of minor 2, and it is the reason the aria-pressed work in spec section 9.9 is reachable at all.

### 20. Major 13: collapsed .ptick is 76px with a 12px gap to the next state-changing strip  [still-applies (creates decision D6)]

Confirmed at draft-stylesheet.css:759 and the 12px block gap. The hit-rate maths is right, 74.9% against 92.1%. Applying the fix as written, 104px strips and a 20px gap, breaks the spec's own viewport budget at DESIGN-SPEC.md:519: with major 15's recomputed heights, 121px top bar plus about 52px of goal plus a 394px worst-case open block leaves about 196px of the 763 usable, so one 154px collapsed row fits, not two. Either accept one collapsed neighbour and rewrite that paragraph, or keep 76px and accept the miss rate. Needs D6.

### 21. Major 14: three of armTick's five gates reject a tap in complete silence  [still-applies]

The gates are specified in risk decision 7 and the reasoning is sound: the scroll lockout and the dwell ceiling both fire during normal deck use, `:active` has already acknowledged the press, and aria-pressed never changes. Fix confirmed: raise the dwell ceiling to about 2500ms and give any gated rejection a pool-register acknowledgement. Note the dependency: the acknowledgement needs a visible pool toast, and today the toast is painted behind the deck, see N2. Keep the 1500ms per-block cooldown.

### 22. Major 15: nothing scrolls the current block into view, and one line works against it  [still-applies]

The spec's one non-negotiable, DESIGN-SPEC.md:520, still has no implementation. The reviewer's recomputed heights are arithmetically consistent, and the collapsed-row correction is easy to confirm from the draft CSS: a 76px strip plus 12px of padding twice plus 6px is 106px, plus a 12px margin is 118px, not the 88px the spec asserts at line 512. Fix confirmed: accumulate the known constants while building, set `poolEl.scrollTop = offsetOfCurrentBlock - 8` only when the current index changed, preserve `keep` on an un-tick, and restore a real `max-height` cap on `#pool .ptop`. scrollIntoView and getBoundingClientRect stay unavailable, so computing is the only route. Reconcile with B1 and with N3.

### 23. Major 16: pool chrome falls below the 16 arcmin floor the document calls non-negotiable  [still-applies (and already live)]

Live now, not just in the draft: `#pool button` at index.html:304 is 1.05rem, which at a 16px root is a cap height of about 9.9 arcmin at 70cm, and the set line under the 560px breakpoint at index.html:312 is about 14.5 arcmin. Both are below the floor on his phone today. Fix confirmed: add `--p-btn:calc(30px * var(--pool-scale))`, about 17.6 arcmin, and use it for `#pool button`, `.sheet.pool button` and `.sheet.pool .sheet-head`, and raise `--p-cue` from 28px to 30px. Caveat on the numbers: every arcmin figure in the review and the spec assumes 160 CSS ppi where a modern iPhone is 153.3, so they run about 4.4% low. No conclusion changes.

### 24. Major 17: standalone sheet inputs have no perceivable boundary  [still-applies (and already live)]

Live in the current file, with a different token but the same failure: index.html:186-190 sets `border:1px solid var(--sep)`, and rgba(60,60,67,.29) over white composites to #c6c6c9, which I computed at 1.70:1 against the field's own fill. Nothing reaches the 3:1 that 1.4.11 needs to identify a control. Fix confirmed and can land now: make the base rule `border:1px solid var(--label-3)`, which I computed at 5.13:1 on white, and add an opt-out for fields that genuinely sit inside a grouped row. The `.bordered` half of the fix is moot, pass 1 solved the login width with a scoped `.login` block at index.html:217-222 instead.

### 25. Major 18: startPool and markStatus write the module-level draft  [still-applies]

Both live: `startPool` at index.html:1888 opens with `draft = sk;`, and `markStatus` at 1873 does `draft = hydrate(...)`. Today the conflation is the design, since History deliberately does `draft = hydrate(s); view.name = "today"` at index.html:1982, so there is nothing to break yet. The moment the `view.name = "session"` route exists, opening an old session and tapping the pool button or Mark done silently replaces today's draft. Fix confirmed: pool view reads a `poolSk` set by startPool, and markStatus only reassigns `draft` when `sk === draft`.

### 26. Major 19: the draft branch of renderToday has no generating feedback  [still-applies (a do-not-regress item)]

Currently correct, which is the point: the generator card is emitted first at index.html:1735, the button label flips to "Writing today's training…" at 1733, and the 30-second explanation is at 1743-1744, all above `renderSessionCard(draft, true)` at 1752. The hero-card restructure moves the session above the controls, which is where the feedback gets lost. Fix confirmed: in the draft branch, when `generating` is true, render the disabled 56px working row plus the line above the card, or show the skeletons instead of the card.

### 27. Major 20: listCard returns null and Element.append(null) inserts the text "null"  [still-applies]

No live instance: `h()` filters null and false children at index.html:355, and every direct `APP.append` in the file is either unconditional or guarded, for example `if (sk.saved) APP.append(feedbackCard(sk));` at 1805. The hazard arrives with listCard. Fix confirmed: `function add(n){ if (n) APP.append(n); }` and route every view-layer append through it. The stub's `append` pushes null into an array without complaint, so no test can see it.

### 28. Major 21: edits 18 and 19 exist only as prose, and the class-rename gate is treated as a reminder  [still-applies (target ranges updated)]

Still the right process demand. The gate is still meaningful: every legacy class is live, `.hrow` at index.html:1981, `.hdate` 1984, `.hmain` 1985, `.htitle` 1986, `.lrow` 2055 and 2088, `.lmain` 2056 and 2089, `.filters` 1999 and 2102, `nav.tabs` 1666. What changed is the deletion target. The draft's "section 15" never landed as a labelled block; pass 1 folded those rules into the main stylesheet at index.html:145-147, 157-161, 253-260 and 262-267, and edit 24's `before` snippet no longer matches anything. Write renderLibrary and renderInsights as literal replacements with quoted anchors, then run the grep and treat a non-zero count as a hard stop.

### 29. Major 22: Mark done and close leaves an unsaved draft on a frozen overlay  [still-applies (live cousin already present)]

`markStatus` opens with `if (!sk.id) return;` at index.html:1870, so the live pool footer's Mark done at 1949 is a silent no-op for an unsaved draft today: no render, no toast, and any toast would be invisible anyway, see N2. The draft's version is worse because it nulls poolState first, killing the clock. Fix confirmed: `if (!sk.id){ leavePool(); toast("Not saved yet, so there is nothing to mark."); return; }`.

### 30. Major 23: the current block is the warm-up, so the first real set stays collapsed  [still-applies]

Correct about the data path and about the consequence. Fix confirmed: start the search at index 1 and fall back to index 0 only when every set is done, or keep the warm-up permanently collapsed since it has no reps to call. Note the dependency on risk decision 8: hydrate must start carrying `warmItemId` and `warmDone`, and index.html:1511 already finds the warm-up row and then throws it away, see N4.

### 31. Major 24: the Adjust reps row loses both guards and appears on a read-only screen  [still-applies]

Currently correct at index.html:1832, `editable && !sk.saved && b.item && b.item.reps`. Fix confirmed as `editable && b.item && b.item.reps`, and I checked that dropping `!sk.saved` is safe: `nudge` sets `sk.saved = false` at index.html:1850, which re-exposes the Save row at 1782, so a nudged saved session is never left unsaveable. The new session-detail screen must pass editable=false, which is what keeps nudge away from `rendered_text`, `distance_m`, `planned_total_m` and `planned_minutes` on a historical row.

### 32. Minor 1: #pool .ptop sticky top:0 sits inside the container's safe-area padding  [still-applies (already live)]

Live: index.html:286 is `position:sticky;top:0` and index.html:284 carries the top inset as padding. Sticky offsets resolve against the scrollport, which is the padding box, so once stuck the clock bar covers the inset. Masked today only because `apple-mobile-web-app-status-bar-style` is `default` at index.html:7, which makes the inset 0 in standalone, and it is already visible in a normal Safari tab. Fix confirmed, one declaration: `#pool .ptop{ top:env(safe-area-inset-top); }`.

### 33. Minor 2: :active on touch, and an active state asked of a <label>  [still-applies in part, first half dissolves with major 12]

Today's deck is fine: `#pool .pblk` has both `cursor:pointer` (index.html:293) and a real click handler (1930), which satisfies WebKit's heuristic. The draft's `.ptick` has no click listener, which is exactly what major 12 adds, so that half resolves itself. Still standing: `switchRow` returns `h("label",{class:"irow tap"})` while `.irow.tap:active` expects an active state on a label, and `--fill-4` at 8% is close to no feedback. Fix: keep the one-off passive touchstart listener as belt and braces, and bump the row press to `--fill-3`. Confirm on his phone, it is the only tap confirmation the app has.

### 34. Minor 3: half the accessibility query is dead on Safari  [first half already-fixed-by-pass-1, second half needs-decision]

Fixed: `(prefers-contrast: high)` is gone. index.html:118 and 121 read `@media (prefers-contrast: more), (prefers-reduced-transparency: reduce)` and `@media (prefers-contrast: more)`, with no invalid value anywhere. Still open, and it is a product call not a bug fix: iOS Reduce Transparency is a real setting the app cannot see, so the reachable path is prefers-contrast plus an in-app switch. Whether that switch exists, and whether it defaults on, is decision D2. If it is dropped, major 7 goes with it.

### 35. Minor 4: reduced motion parks the generate indicator outside the button  [still-applies, plus a new wrinkle from pass 1]

Neither `button.working` nor `@keyframes slide` exists yet, so nothing is live. Fix confirmed for when it lands: `@media (prefers-reduced-motion: reduce){ button.working::after{ animation:none; width:100%; opacity:.5; } }`, placed after the global block. New wrinkle, see N7: pass 1's reduced-motion block at index.html:127-131 dropped the draft's `animation-iteration-count:1 !important` (draft-stylesheet.css:847), so an infinite animation under reduced motion will cycle at 0.01ms rather than stop. Restore that declaration in the same commit that adds the first animation.

### 36. Minor 5: prefix hygiene, both directions  [first half already-fixed-by-pass-1, second half still-applies and is now wider]

Fixed: grep for `font-feature-settings` in index.html returns zero hits. Pass 1 kept `font-variant-numeric:tabular-nums` alone at index.html:232, 258 and 288, which is exactly what the finding asked for. Still open and worse than described: grep for `appearance` returns zero hits, so neither `button{}` nor `input,select,textarea{}` resets native iOS chrome, where the draft at least had it on the inputs. Add `-webkit-appearance:none; appearance:none;` to both blocks, or iOS can draw its own chrome over the background, border and radius set at index.html:186-190, which matters most for the date, search and select controls.

### 37. Minor 6: manifest.webmanifest still carries the old launch and theme colours  [still-applies (the sw.js half is done)]

Verified untouched: manifest.webmanifest reads `"background_color": "#f3f6f8"` and `"theme_color": "#0284c7"`, which now contradicts the light and dark meta pair at index.html:10-11. So a dark-mode cold start still flashes light grey. The cache half is done, sw.js:4 is already `ws-training-v2`. Note the bump does not fix it on his phone: iOS reads the manifest at install time and does not re-read it, so the instruction to delete the Home Screen icon and re-add it once is still required and belongs in SETUP.md.

### 38. Minor 7: (prefers-contrast: high) is not a valid value  [already-fixed-by-pass-1 (duplicate of minor 3's first half)]

Gone from the file. index.html:118-126 contains no `high` branch. Nothing to do.

### 39. Minor 8: stepper and counter pairs closer than the 24px minimum  [still-applies (already live, and tighter than the draft)]

Live and worse: index.html:1832 emits the rep nudge pair with `style:{gap:"4px"}`, two opposite-direction adjustments to session metres 4px apart. Pass 1 raised the targets to 64x44 but not the spacing. Fix confirmed: 24px between them, or put minus and plus at opposite ends of the row the way iOS Settings does. Applies to the future `.stepper`, `askReps` and `askClaude` the same way.

### 40. Minor 9: button.primary has no perceivable boundary in dark  [still-applies (already live, and the review's ratio is wrong)]

Live at index.html:174, `background:var(--accent-fill);border-color:var(--accent-fill)`, with dark `--accent-fill:#0c5c86` at index.html:101. I computed 2.89:1 against #000000 as the review says, and 2.34:1 against `--bg-card` #1c1c1e, which is where today's primary buttons actually sit inside cards, so it is slightly worse than stated. The review's proposed edge value is misreported: `#3b6d87` against #000000 is 3.72:1, not the claimed 5.6:1. It still clears the 3:1 bar, so the fix works. Do not add a new token for it: dark `--accent-line` at index.html:102 is already `#3b6d87`.

### 41. Minor 10: toast has no pointer-events:none, overlaps the pool footer, and flips register  [still-applies (and understates a live defect, see N2)]

All three sub-points hold for the draft. The live situation is worse than the finding says: the toast at index.html:1601-1607 sets `zIndex:"99"` while `#pool` is `z-index:200` with an opaque background at 279-283, so every toast raised in pool view is painted behind the deck. "Copied. Paste it into Notes or WhatsApp." and "Marked done." are invisible on the deck today. The draft's own comment at draft-stylesheet.css:582-584 acknowledges the z-index error. Fix confirmed: `pointer-events:none`, raise `.toast.pool` to clear the 76px footer, and drive its colours from `--p-paper`/`--p-ink` with `:root` fallbacks so Night pool does not leave the toast in the opposite register.

### 42. Minor 11: the four -line tokens do not reach the 3:1 their comment claims  [part moot for the app, part needs-decision]

Moot for index.html: pass 1 shipped the tokens at index.html:67-71 with no ratio claim attached, so there is no false comment in the app. The false comment is still in DESIGN-SPEC.md:88, `/* border on a tinted surface, 3:1 non text */`, and should be corrected there. The measurement is right, I recomputed #9ecfea on #e0f2fe at 1.46:1. Whether to darken the four borders to earn 3:1 or to relabel them as decorative is cosmetic and cheap either way, so it is a small decision rather than a defect.

### 43. Minor 12: .banner.strip collides with the stat-strip .strip  [still-applies]

Neither class exists in index.html yet, so this is a naming rule for pass 2. The collision is real as drafted: `.strip` at (0,1,0) contributes display:flex, a card shadow and overflow:hidden that `.banner.strip` at draft-stylesheet.css:569 never overrides. Fix confirmed and trivial: name the edge-to-edge modifier `.banner.edge` and update the single emitter.

### 44. Minor 13: var(--accent-ink) survives the token rename  [still-applies, and pass 1 made it live]

This is the one finding pass 1 actively caused. index.html:2092 still reads `x.cue ? h("div",{class:"small",style:{color:"var(--accent-ink)"}}, x.cue) : null`, and grep for `accent-ink` returns exactly one hit, that use site, with no definition anywhere. Pass 1 renamed the token to `--accent-text` and missed the only var() reference inside the engine script. An undefined custom property makes the declaration invalid at computed-value time, so the Claude-suggests cue in the Library falls back to inherited colour. One-character-class fix: change it to `var(--accent-text)`. Do it now, not in a pass-2 edit.

### 45. Minor 14: aria-modal is permanent on #sheet, and armTick cannot be activated by VoiceOver  [still-applies (second half merges into major 12)]

First half stands on its own: no `#sheet` exists yet, and when it does, `aria-modal="true"` in the static markup makes VoiceOver treat the rest of the document as inert whether the sheet is open or shut. Fix confirmed: `setAttribute("aria-hidden","true")` in closeSheet and `"false"` in openSheet, since the allowlist has setAttribute and no removeAttribute. Second half is the same defect as major 12; its `e.detail === 0` test is the cleaner half of the reconciled fix, because it identifies assistive and keyboard activation without a timestamp race.

### 46. Minor 15: stepRow writes to the database on every tap  [still-applies (a do-not-regress item)]

Currently correct: `settingRow` at index.html:2233-2243 writes on `change` only. The cost the finding describes is real, `mutate` at 622-634 awaits the write then calls `loadAll()` at 539-569, which is five queries plus the full paged `tr_exercises` table plus items for forty sessions, then render(). Fix confirmed: update `val.textContent` and the local settings value at once and debounce the write by about 700ms, or pass mutate's existing `quiet` flag and skip the reload.

### 47. Minor 16: screen-inventory items dropped with no note  [mixed: five keep-items still-apply, one is a stranded-state bug, the six-sessions wording needs-decision]

All live and to be preserved: the coach display_name in History rows (index.html:1990), the Claude and library badges (1994), the library "Nothing matches." empty state (2044), "How hard was it? 1 easy, 5 too hard" (1863), and the "Main body, N blocks" tile (1775). The library focus filter is live and working, `lib.focus` initialised at index.html:441, the select built at 2025, appended at 2102 and read by the row filter at 2039, so dropping `.filters` without a replacement strands real state: either add the focus row to the filter sheet or delete `lib.focus` from state and filter. The six-sessions contradiction is live in both places, index.html:1749 on Today and 2200 in Insights, and I verified the claim is false: `effectiveWindow` at 739-742 is `Math.max(1, Math.min(base, Math.floor(roleCount * 0.5)))`, so a role pool of six gives a window of three. That is decision D5.

### 48. N1: --accent-ink undefined (pass-1 regression)  [new, live, fix now]

Same defect as minor 13, listed separately because it is a regression introduced by pass 1 rather than a hazard in the draft. index.html:2092.

### 49. N2: every toast raised in pool view is invisible  [new, live]

`toast()` sets `zIndex:"99"` at index.html:1604; `#pool` is `z-index:200` at 279 with an opaque `background:var(--p-paper)` at 283 covering `inset:0`. Both are children of document.body, so the deck paints over the toast. Reachable paths today: the pool Copy button at index.html:1950, and markStatus's `render(); toast(...)` at 1874 which re-enters renderPool before the toast is appended. Consequence for pass 2: major 14's "Tap again" acknowledgement cannot work until this is fixed, and the pool register fix in minor 10 has to land with it.

### 50. N3: returning to the app mid-session resets the deck scroll position  [new, live]

`refresh()` is bound to window focus at index.html:2268 and its guards at 613-615 do not exclude pool view, so it runs loadAll() then render(), which rebuilds the whole overlay. The current renderPool has no scroll restore at all, so the deck jumps back to the top. His Auto-Lock is 5 minutes inside a 60 minute session, so this fires repeatedly. It also means major 15's scroll logic must survive an unrelated refresh, not only a tick, and it strengthens B1's advice to stop rebuilding the overlay for every change.

### 51. N4: dead identical-branch ternary in hydrate  [new, live (cosmetic today, blocks major 23)]

index.html:1529 reads `warmup_minutes: warm ? (data.settings.warmup_minutes||10) : (data.settings.warmup_minutes||10)`. The `warm` row is found at 1511 and then discarded, which is the concrete proof for risk decision 8's claim that hydrate throws the warm-up away except for the minutes. Both branches being identical is also a latent trap for anyone who later edits one of them. Replace with `warmItemId` and `warmDone` when major 23 lands.

### 52. N5: the 560px pool breakpoint is still live  [new (a spec instruction, not one of the 47)]

index.html:310-313 still drops `#pool .pblk .pline` to 1.55rem below 560px, which is 24.8px, about 14.5 arcmin at 70cm on his phone. DESIGN-SPEC.md:330 says to delete it outright, and HANDOVER.md:38-45 records it as a knowingly open gap. It is the worst legibility item in the shipped app and it cannot be cleared until the call, rest and qualifier split exists, so it belongs with the pool rebuild.

### 53. N6: no appearance:none anywhere in the file  [new, live (widens minor 5)]

grep for `appearance` in index.html returns nothing. The draft had `-webkit-appearance:none; appearance:none;` on the inputs and the review only asked to add it to `button{}`. Pass 1 shipped neither, so the date, search, number and select controls styled at index.html:186-190 can be drawn with native iOS chrome over the intended background, border and radius.

### 54. N7: pass 1's reduced-motion block dropped animation-iteration-count  [new (inert today, becomes a defect with the first animation)]

Compare index.html:127-131 with draft-stylesheet.css:844-849. The live block clamps `transition-duration` and `animation-duration` to 0.01ms but not the iteration count, so an infinite animation runs at 0.01ms per cycle rather than stopping: a strobe, which is the opposite of what the preference asks for. Nothing animates yet. Fix it in the same commit that adds `.working` or `.skel`.

### 55. N8: manifest theme_color now contradicts the app  [new, live (part of minor 6)]

manifest.webmanifest still declares `"theme_color": "#0284c7"`, the old brand blue, while index.html:10-11 ships `#f2f2f7` for light and `#000000` for dark. Listed separately because it is an inconsistency pass 1 created, not one the review predicted.

### 56. P0-1: verify.js was never extended (risk decision 12)  [needs-decision then work, prerequisite for pass 2]

Unapplied. verify.js:174-186's fakeEl still has no classList, no dataset and a plain-object style with no setProperty, and there is no smoke test using the `renderCard` and `clearApp` hooks that index.html:2319-2320 already export. The suite passes today, and it would also pass with every render function gutted. Risk decision 12 says land this alone as commit 1. Until it does, every line of pass 2 must stay inside the current allowlist, and the pool rewrite is the part most likely to want classList.

### 57. P0-2 / D1: the root font size, 16px or Dynamic Type at 17px  [needs-decision, blocks the whole stylesheet]

Pass 1 did not adopt `:root{font:-apple-system-body}` (draft-stylesheet.css:192), so the live root is a fixed 16px and the app ignores his iOS text size. Every rem in the draft stylesheet is a seventeenth of the Apple point ladder. Lift the draft onto a 16px root and the whole shell renders about 6% small, with `.tab .lbl` and the date column the first to break; adopt the keyword and pass 1's own rem values, for example `.tile .val{font-size:1.35rem}` at index.html:232, all grow by 6%. Two caveats for Vlad either way: `-apple-system-body` does not update live, a changed text size needs a relaunch, and the iOS Bold Text setting exposes no query at all. Major 5's severity depends entirely on this answer.

### 58. P0-3: tab bar icons must not be built with h("svg")  [new, prerequisite constraint]

`document.createElement("svg")` produces an unknown HTML element, not an SVG element, so the icons render as nothing while the suite stays green, since the stub's createElement returns a fakeEl for any tag. Put the four icons in the static HTML as edit 4 intends. If they must be built in script, the `html:` branch of `h()` at index.html:345 is stub-safe, because assigning innerHTML on a plain object is just a property write, but note edit 3 wanted that branch deleted, so pick one and be explicit.

### 59. D6: the collapsed-block viewport budget  [needs-decision]

Majors 13 and 15 together invalidate DESIGN-SPEC.md:519. Recomputed from the review's own corrected numbers: 121px top bar plus about 52px of goal plus a 394px worst-case open block is 567px of the 763 usable, leaving room for one 154px collapsed row, not two. Either accept one collapsed neighbour on screen and rewrite that paragraph, or keep the 76px collapsed strip and accept a 74.9% hit rate on the un-tick path, which is the path he uses most on a collapsed card.

