# rebaseline-stylesheet-merge

## Headline

**No token renaming is needed.** That is the big result. Pass 1 and the draft were written from the same colour table: 41 of the 44 custom properties pass 1 defines are spelled identically in the draft, and every one of those 41 also carries an identical value. The three live-only names (`--good-fill`, `--on-good`, `--on-accent`) are pass 1's fix for review major 10 and the draft must be rewritten to use them, not the other way round. The draft adds about a dozen names that collide with nothing. Two draft names are synonyms and should be rejected: `--row-h` (a second name for the 44px `--ctl-h` floor) and `--focus-ring` (identical to `--accent` in both modes). Two are dead (`--s-8`, `--z-content`).

So the merge is not a token war. It is four other things.

**1. The accessibility blocks are already correct and the draft would undo them.** Pass 1 landed blocker 3's prescribed three-block form verbatim at index.html:118-126, and also dropped the invalid `(prefers-contrast: high)` branch (minors 3 and 7). The draft at 167-178 re-bundles all three queries and puts light-mode label hexes behind Reduce Transparency, which is `#000000` label text on `#1c1c1e` cards at 1.23:1 in dark. **Do not apply draft section 4.** The only edit index.html:118-126 needs is additive: the five glass and scrim tokens go into block (1), and never a label hex.

**2. Three of pass 1's fixes are quietly deleted by the draft.** `.codeblock` (still emitted at index.html:1698), the three `.login` rules (whose replacement is not equivalent, the flex row survives and the 56px button height is lost), and `button.small{min-width:64px}`. That last one is a live 44px-floor regression: index.html:1857 builds the five difficulty buttons as single characters with class `small`, and the draft's padding-only rule gives them about 32px of width. The draft's intended replacement, `.seg`, does not exist in markup yet, and `.seg button` sets `min-height:40px` anyway, which nobody flagged. The `isLive()` fix and the difficulty-rating copy are engine and copy, so no stylesheet can touch them.

**3. Pass 1 satisfies review major 4 by accident, and the draft breaks it.** `body{padding:env(safe-area-inset-*)}` at index.html:142 currently protects the whole app in landscape. The draft drops it and its shell handles vertical insets only, so applying the shell as written moves landscape from correct to content-under-the-notch. Major 4's fix has to land in the same edit.

**4. Pool view is the one place the CSS must not land before the markup.** Four concrete breakages if it does: `.ptop` loses `display:flex` while index.html:1913 still builds it as a flex row, `.pblk` loses `cursor:pointer` and all press feedback while index.html:1930 still puts onclick on the whole card, and `#pool .pfoot` and `#pool .of` never match the classes the script actually writes. Stylesheet section 14 and markup edit 12 are one commit.

**One live defect found.** index.html:2092 still reads `style:{color:"var(--accent-ink)"}` and pass 1 deleted `--accent-ink`. The declaration is invalid at computed-value time, so the Claude-suggests cue in the Library has had no colour since pass 1 shipped. That is review minor 13, now real rather than fragile. One-word fix to `var(--accent-text)`.

**One judgement call worth stating plainly.** `:root{font:-apple-system-body}` plus the 17px rem ladder is all-or-nothing: take the ladder without it and everything is 6% small, take it without the ladder and pass 1's sizes are 6% large. It also lets 1rem reach 53px at the largest accessibility sizes, which overflows a fixed-height top bar. Enable it in the shell commit, with major 5's `min-height`/`height:auto` fixes, and check it on his phone first.

Everything genuinely new (tab bar, top bar and glass, sheets, large title and type ladder, grouped inset lists, the pool rebuild, segmented control, stepper, switch, toast, skeletons) collides with nothing and can simply be added. Eleven places in the draft still hardcode a colour that should be a token, of which one (`button.good{color:#fff}` on a mint `--good` in dark, 1.47:1) is a live contrast bug and six disappear by hoisting the `--p-*` pool literals to `:root`. `node verify.js` is green now and no part of this reconciliation can move it, which also means it cannot warn you about any of the above.


## Items

### 1. Token names, overall verdict  [no-renames-needed]

Good news first: the two files agree on names almost perfectly. 41 of the 44 custom properties pass 1 defines are spelled identically in the draft, and every one of those 41 also carries an identical VALUE in light, in dark, or both (--bg-grouped/-card/-nested, --label/-2/-3, --sep, --sep-opaque, --fill-3, --fill-4, --accent, --accent-text, --accent-fill, --accent-tint, --accent-line, --good, --good-tint, --good-line, --warn*, --bad*, --shadow-card, --r-card/-inner/-ctl/-pill, --s-1 to --s-6, --ctl-h, --ctl-h-lg, --dur-fast, --ease-out, --p-ink, --p-paper, --p-done-fill). Pass 1 was clearly written from the same colour table. So there is NO token rename to pay for. The naming question reduces to three live-only names and about a dozen draft-only additions.

### 2. --good-fill, --on-good, --on-accent (live only)  [pass-1-wins]

Pass 1 wins outright, and the draft must be rewritten to use them. These three exist only in index.html (lines 65, 69, 78, 101, 104, 109) and they ARE the fix for review major 10. Pass 1 split --good by job: --good is text on a tint and goes pale mint #8ce8b2 in dark; --good-fill is a button fill and stays dark (#155c33 light, #14663a dark), so --on-good:#ffffff is safe in both modes. The draft never got that far: line 352 is `button.good{ background:var(--good); border-color:var(--good); color:#fff; }`, which puts white on #8ce8b2 at 1.47:1 in dark. Applying draft line 352 over index.html line 176 undoes a shipped contrast fix on the live Save button (index.html:1866 emits class "good"). Rewrite the draft rule to `background:var(--good-fill); border-color:var(--good-fill); color:var(--on-good);`. Note the review's own recommended fix (--on-good:#0d2f1c in dark, keeping --good as the fill) is a DIFFERENT and now-obsolete resolution. Do not apply both, or you get dark ink on a dark fill.

### 3. --row-h (draft only)  [reject-the-rename]

Drop --row-h and use --ctl-h. Both are literally 44px, and pass 1's comment at index.html:33 already establishes --ctl-h as the single source of truth for the tap floor ("44px is the floor for anything you tap, not the target"). A second name for the same number in a hand-written single file is how the floor drifts later. Concrete risk if you keep it and half-apply: the draft's `.hrow{ min-height:var(--row-h) }` (line 801) landing before the :root block that defines --row-h makes min-height invalid at computed-value time, so it falls back to auto and the history rows collapse under 44px. Same exposure on .lrow (line 811) and .irow (line 450).

### 4. --focus-ring (draft only)  [reject-the-rename]

Drop it. --focus-ring is #0284c7 in light and #5cc4f5 in dark, which is exactly --accent in both modes. It is a synonym, not a job split, and pass 1 already writes `outline:2px solid var(--accent)` at index.html:192. Keep --accent and take only the draft's improvement, which is 2px going to 3px: `input:focus,select:focus,textarea:focus{ outline:3px solid var(--accent); outline-offset:1px; border-color:var(--accent); }`, plus the new `button:focus-visible{ outline:3px solid var(--accent); outline-offset:2px; }` (draft line 348), which pass 1 has no equivalent of.

### 5. --fill-1 and --fill-2 (draft only)  [must-land-with-their-rules]

These two are load-bearing and easy to lose. Four draft rules read them: `button:active{ background:var(--fill-2) }` (line 342), `.seg button:active` (440), `input[type=checkbox].sw{ background:var(--fill-1) }` (414). Pass 1 does not define either. If the draft's button rules land before the :root additions, `button:active` has an invalid background, falls back to transparent, and every button in the app silently loses the press feedback pass 1 added at index.html:172. Either add --fill-1:rgba(120,120,128,.20)/.36 and --fill-2:rgba(120,120,128,.16)/.32 in the same edit, or rewrite those three rules to --fill-3. Do not split the two halves across commits.

### 6. --dur-mid, --dur-sheet, --ease-sheet, --r-sheet, --r-pool, --gutter, --group-gap, --tabbar-h, --topbar-h, --scrim, --glass-*, --z-*, --pool-*, --p-* sizes  [add-as-is]

All genuinely new, no collision with a pass 1 name, no judgement needed. --dur-mid is the widest dependency (used by .bar>i, .topbar-title, .tabbar, .scrim, .sheet transitions and the switch), so add it in the first token edit even if the shell lands later. The z-index table is worth taking wholesale: pass 1 hardcodes `z-index:200` at index.html:279 and the draft's --z-pool is the same 200, so the swap is value-neutral and it retires the one invented number in the live file.

### 7. --s-8 and --z-content (draft only)  [drop]

Both are defined and never read anywhere in the 849-line draft. Do not carry dead tokens into a file that has to stay hand-readable.

### 8. :root{ font: -apple-system-body } and the whole 17px rem ladder (draft line 192)  [needs-decision]

This is the single biggest call in the merge and it is all-or-nothing. Pass 1 kept a 16px root. The draft's every size is a seventeenth of the Apple point ladder (.882rem Subhead, .765rem Footnote, .706rem Caption 1, .647rem Caption 2, 1.294rem Title 2, 2rem Large Title) and is only correct if 1rem resolves to 17px. Take the ladder without line 192 and every size renders about 6% small. Take line 192 without the ladder and pass 1's existing sizes (.7rem, .72rem, .78rem, .85rem, .92rem, 1.15rem, 1.35rem, 1.9rem) all grow about 6%. Both halves must land in one edit. Second constraint: review major 5 shows that with Dynamic Type live, 1rem can reach 53px at the largest accessibility sizes, which overflows a fixed-height top bar. So do not enable line 192 before the shell edit that makes `.topbar{ min-height:...; height:auto }` and caps `.tab svg{ width:min(28px,1.65rem) }`. My recommendation: enable it in the shell commit, not the token commit, and check it on his phone at the largest text size before committing.

### 9. --p-ink, --p-paper, --p-done-fill, --p-border scope  [hoist-to-root]

Both files define the pool literals on `#pool` (index.html:281, draft 645). That is fine for everything inside the overlay and wrong for two new draft elements: `.toast.pool` (draft 584) and `.sheet.pool` (621), both of which are appended to document.body, outside `#pool`, so they cannot inherit and the draft falls back to literal #fff/#000. Fix: define --p-ink:#000, --p-paper:#fff, --p-done-fill:#e8ecef, --p-behind-ink, --p-behind-fill and --p-border on `:root`, OUTSIDE the prefers-color-scheme dark block so nothing themes them, keep the same declarations on `#pool` (harmless, and it documents the register), and add `body.nightpool` overriding the same five so the Night pool switch flips the toast and the close sheet with the deck. This is review minor 10 and it also removes six of the draft's nine hardcoded pool colours.

### 10. .codeblock (index.html:212, bug fix 2 of 4)  [keep-pass-1]

The draft has no `.codeblock` rule at all. It styles bare `pre` instead (line 217). index.html:1698 emits `h("pre",{class:"small codeblock"})`, so deleting the class rule is exactly the failure mode review risk 13 describes: a selector removed in CSS whose class the script still writes, with no test signal. The draft's `pre` rule would cover the background, but it drops the `border:1px solid var(--sep)` pass 1 added and adds `margin:0`. Resolution: keep index.html:212-215 verbatim, and additionally add the draft's `pre` rule as a base so a future bare `<pre>` is not naked. The two do not conflict.

### 11. .login input, .login .row, .login .row button (index.html:217-222, bug fix 3 of 4)  [keep-pass-1]

The draft deletes all three and tries to replace them with `input,select,textarea{ width:100% }` plus an opt-in `.bordered` (lines 398, 407). That is not equivalent. Pass 1's fix was structural: `.login .row{ display:block }` breaks the flex row so the button stops being stranded beside a shrunken field, and `.login .row button{ width:100%; min-height:var(--ctl-h-lg) }` gives it the 56px main-action height. Under the draft, `.row{ display:flex }` still applies to the login row, the 100%-wide input just flex-shrinks back down, and the 56px button height is gone. Keep index.html:217-222 as-is. Separately, apply review major 17 by inverting the input border default (`border:1px solid var(--label-3)` in the base rule, opt-out `input.inrow{ border-color:var(--sep-opaque) }`) and then delete `.bordered` from the draft entirely, since it becomes the default.

### 12. isLive() (index.html:691, bug fix 1 of 4)  [not-at-risk-from-the-stylesheet]

Pure engine code, used at 696, 2037, 2047, 2077, 2155, 2182, 2210, 2216. No CSS in either file can touch it and the draft stylesheet contains nothing that references it. Flagging it only so nobody re-derives review risk 9 from the spec: it is already done and must not be re-applied. Same for the difficulty-rating copy (bug fix 4), which is live and correct at index.html:1867 ("Saved with the session, so you can look back at what landed hard.") with the 1-to-5 legend still at 1863. Review minor 16 asks that the legend survive the move to a segmented control, so carry that string across when `.seg` replaces the five rating buttons.

### 13. LIVE DEFECT: index.html:2092 reads var(--accent-ink), which pass 1 deleted  [regression-created-by-pass-1]

`h("div",{class:"small",style:{color:"var(--accent-ink)"}}, x.cue)` at index.html:2092 is the only var(--) reference inside the engine script, and --accent-ink is defined nowhere in the current <style> block. An undefined custom property makes the declaration invalid at computed-value time, so the Claude-suggests cue in the Library has silently lost its colour since pass 1 shipped. This is review minor 13, still open, and now actually broken rather than merely fragile. One-word fix in pass 2: `var(--accent-text)`.

### 14. button.small (index.html:183 vs draft 362) and the 44px floor  [draft-regresses-the-floor]

The sharpest 44px regression in the merge. Pass 1: `button.small{ font-size:.85rem; padding:0 12px; min-width:64px; border-radius:var(--r-inner); }`. Draft: `button.small{ font-size:.882rem; padding:.4em .8em; }` with no min-width and the comment "text only. Still 44px tall." Tall, yes. Wide, no. index.html:1857 builds the five difficulty buttons as single characters with class "small", so .8em of a 15px font gives about 32px of total width against pass 1's guaranteed 64px. index.html:2096 and 2097 ("Add", "No") land around 44px, borderline. The draft's intended replacement is `.seg` (line 433), which does not exist in markup yet. Resolution: merge, do not replace. `button.small{ font-size:.882rem; padding:.4em .8em; min-width:64px; border-radius:var(--r-inner); }`, and keep it until the `.seg` markup edit actually lands.

### 15. .seg button{ min-height:40px } (draft 436)  [new-floor-violation-nobody-flagged]

The draft's own replacement for the rating buttons sets `min-width:44px; min-height:40px`. The `.seg` track has `padding:2px` so the visual row measures 44px, but the hit target is 40px, which is under pass 1's floor. Review major 9 audited this control's colour and missed its height. Fix: `min-height:var(--ctl-h)` on `.seg button` and let the track be 48px, or drop `.seg{ padding:2px }` to 0 and keep the cells at 44. While you are in there, apply major 9's colour fix too: `.seg button.on{ background:var(--accent-fill); color:var(--on-accent); box-shadow:none; }`, because the draft's white-pill-on-grey state indicator computes to 1.15:1 in light and 1.33:1 in dark.

### 16. ACCESSIBILITY BLOCKS: index.html:118-126 vs draft 167-178  [pass-1-wins-outright-do-not-apply-the-draft]

Confirmed: pass 1 landed the corrected separated form exactly as review blocker 3 prescribes, and the draft would undo it. Live is three blocks: (1) `@media (prefers-contrast: more), (prefers-reduced-transparency: reduce){ :root{ --sep:var(--sep-opaque); --shadow-card:none; } }` with NO label changes; (2) `@media (prefers-contrast: more){ :root{ --label:#000000; --label-2:#2b343c; --label-3:#4a545e; } }`; (3) `@media (prefers-color-scheme: dark) and (prefers-contrast: more){ :root{ --label:#ffffff; --label-2:#dfe4e8; --label-3:#b9c1c8; } }`. Pass 1 also correctly dropped the invalid `(prefers-contrast: high)` branch, which is review minors 3 and 7. The draft bundles all three into one block, reintroduces `(prefers-contrast: high)`, and puts the light-mode label hexes inside a query that fires on Reduce Transparency in dark. That is #000000 label on #1c1c1e cards at 1.23:1 and on #000000 grouped at 1.00:1. Do not touch index.html:118-126 except to ADD tokens to block (1). What block (1) must gain when the glass lands, and only block (1): `--glass-fill:var(--glass-flat); --glass-blur:0px; --glass-edge:var(--sep-opaque); --glass-drop:none; --scrim:rgba(0,0,0,.70);`. Never put a label hex in block (1).

### 17. prefers-reduced-motion (index.html:127-131 vs draft 844-849)  [additive-no-regression]

Same global `*,*::before,*::after` rule in both. The draft adds `animation-iteration-count:1 !important; scroll-behavior:auto !important;`, which is strictly additive, so take it. Then add review minor 4's static state AFTER the global block, or the new generate indicator parks itself off-screen: `@media (prefers-reduced-motion: reduce){ button.working::after{ animation:none; width:100%; opacity:.5; } }`. Ordering matters only for that second block; the global one wins from anywhere because of !important.

### 18. body{ padding:env(safe-area-inset-*) } (index.html:142)  [draft-regresses-landscape]

Pass 1 put all four safe-area insets on body. The draft drops that (line 200) and replaces it with `body>.wrap{ padding-left:var(--gutter); padding-right:var(--gutter) }` (296) plus vertical-only insets on .topbar and .tabbar. That is review major 4, and pass 1 currently satisfies it by accident. Applying the draft's shell as written moves the app from correct to broken in landscape, where the insets are 44px or more and the manifest's `"orientation": "portrait"` is not honoured by Safari on iOS. Apply major 4's fix in the same edit: `.topbar{ padding:env(safe-area-inset-top) calc(env(safe-area-inset-right) + var(--s-2)) 0 calc(env(safe-area-inset-left) + var(--s-2)); }`, `.tabbar{ padding-left:env(safe-area-inset-left); padding-right:env(safe-area-inset-right); }`, `body>.wrap{ padding-left:calc(env(safe-area-inset-left) + var(--gutter)); padding-right:calc(env(safe-area-inset-right) + var(--gutter)); }`, and the banner's negative margin becomes `calc((var(--gutter) + env(safe-area-inset-left)) * -1)`.

### 19. body{ overscroll-behavior-y:none } (draft 206) and html{ -webkit-tap-highlight-color:transparent } (draft 197)  [fix-while-merging]

Two base-rule notes. First, review major 3: overscroll-behavior on body is a no-op in Safari because the used value propagates from the ROOT element only. Put it on `html{ overscroll-behavior-y:none }` and keep the body copy if you like. Second, the draft moves tap-highlight suppression to a blanket `html` rule while pass 1 sets it per control (index.html:168, 254, 293). If you take the draft's `.hrow` or `.pblk` rules without the `html` rule, the grey iOS tap flash comes back on exactly the two things he touches most. Take both or neither.

### 20. button{} base rule (index.html:162-171 vs draft 331-339)  [safe-to-take-draft-with-two-carve-outs]

The draft drops `display:inline-flex; align-items:center; justify-content:center; gap:6px`. I checked: only one of the 27 `h("button"...)` call sites has an element child (index.html:1687, a single button inside a div), so nothing in the live markup depends on the flex gap and WebKit centres button text by default. Safe to drop. Two things to carry over instead of the draft's versions: (a) `button:active{ background:var(--fill-2) }` needs --fill-2 to exist, see the --fill-1/--fill-2 item; (b) the draft's border goes from `var(--sep)` to `var(--sep-opaque)`, which is the right direction (review major 17's reasoning) and costs nothing. Also take review minor 5's addition: `-webkit-appearance:none; appearance:none;` on the button block, which pass 1 lacks.

### 21. button.primary:active (index.html:175 vs draft 351)  [keep-pass-1]

Live: `background:var(--accent-text); filter:brightness(1.15)`. Draft: `filter:brightness(.88)`. --accent-fill is #075985 in light and #0c5c86 in dark, dark in both modes, so brightening is the visible direction and darkening it further is close to no feedback on a phone in a bright hall. Keep pass 1. Separately apply review minor 9 when you add the dark tokens: `--accent-edge:#3b6d87` in the dark block and `button.primary{ border-color:var(--accent-edge) }`, because #0c5c86 on #000000 is 2.89:1 and the 56px primaries sit straight on the grouped background.

### 22. .hrow:active (index.html:256 vs draft 804)  [draft-regresses-it]

Live uses var(--fill-3) at 12%. The draft uses var(--fill-4) at 8%. Review minor 2 explicitly says to bump row press feedback TO 12% because 8% is close to no feedback at all, so pass 1 is already at the reviewed value and the draft is the stale side. Keep --fill-3, and use --fill-3 for the new `.irow.tap:active` too (draft line 462 has --fill-4). Also note the draft drops `@media (hover:hover){ .hrow:hover }` (index.html:257); irrelevant on the phone, one line to keep for desktop prep.

### 23. .htitle (index.html:260 vs draft 809)  [keep-pass-1]

The draft reduces it to `font-weight:600` and drops `overflow:hidden; text-overflow:ellipsis; white-space:nowrap`. Those three keep a long session title on one line inside a 44px history row. The draft's replacement is `.irow .r-1`, which has no ellipsis either because the new rows are meant to be multi-line. Until `.hrow` markup is actually gone, dropping the ellipsis makes titles wrap and blows the row height. Keep index.html:260 verbatim. Same call on `.hdate` (index.html:258): the draft loses `flex-shrink:0`, so keep it, and take only the improvement of `min-width:5.5em` over `width:92px`, which survives Dynamic Type.

### 24. .section-label (index.html:208) vs .section-label, .list-hdr (draft 236-242)  [keep-them-separate]

The draft merges the two selectors and gives the shared rule `padding:0 var(--s-4) 7px`, then walks it back with `.card .section-label{ padding-left:0; padding-right:0 }`. There are 12 live `.section-label` call sites (index.html:1737, 1738, 1740, 1741, 1861, 1979, 2004, 2185, 2199, 2214, 2217, 2225) and not all of them are provably inside a `.card`, so any that is not gains a 16px indent nobody asked for. Cheapest correct resolution: leave index.html:208 exactly as it is and give the new inset-list group header its own `.list-hdr` rule with the 16px padding. Two rules, no audit of 12 call sites, no chance of a stray indent.

### 25. input,select,textarea{ width:100% } (draft 398)  [conflict-scope-it-down]

A global 100% width on every field breaks the Library filter row. index.html:2022 and 2025 build `h("select",{class:"small"})` inside `.filters`, which is `display:flex; flex-wrap:wrap` with no flex on the children, so each select would claim a full row. `.filters input[type=search]{ flex:1 }` saves the search field and nothing saves the two selects. Fix: drop `width:100%` from the base rule and put it where it is wanted, `.login input, .sheet input, .sheet select, .sheet textarea, textarea{ width:100% }`, or keep the base rule and add `.filters select, .filters input{ width:auto }`. The first is less surprising later.

### 26. .card and .tile losing their borders (index.html:199, 230 vs draft 485, 516)  [conflict-add-a-contrast-block]

The draft correctly makes cards borderless and shadow-separated, which is the iOS grouped look. But pass 1's accessibility block (1) sets `--shadow-card:none` under prefers-contrast and prefers-reduced-transparency. Borderless plus shadowless in dark leaves a #1c1c1e card on a #000000 page separating on a fill difference alone, in the one mode a user turns on to make things clearer. Add, next to the a11y blocks: `@media (prefers-contrast: more), (prefers-reduced-transparency: reduce){ .card,.list-card,.blk,.tile,.strip{ border:1px solid var(--sep-opaque); } }`. Neither file has this and neither reviewer caught it.

### 27. .blk (index.html:241 vs draft 539) and its two dependent rules  [take-draft-as-a-unit]

The draft's `.blk{ padding:var(--s-4) }` is not optional if you take `.blk .blkact{ margin:var(--s-3) calc(var(--s-4) * -1) calc(var(--s-4) * -1) }` (line 553), which is a full-bleed action row computed against exactly 16px of padding. Live is `padding:12px 14px`, so a mixed merge leaves the action row 2px and 4px off on the two axes. Same pairing for `.card>.inner{ border-radius:max(0px, calc(var(--r-card) - var(--s-4))) }` (line 493) against `.card{ padding:var(--s-4) }`. Take each card-family rule together with its padding, or neither.

### 28. #pool .pblk.done .prole::after{ content:" ✓ done" } (index.html:298)  [keep-pass-1]

The draft has no equivalent. It replaces the done cue with three others: a `--p-done-fill` card, a 4px line-through on the call, and a filled `.ptick.on`. Two of those three exist only in new markup. The line-through rule (draft 741) does match the current `.pline`, so it survives, but the filled tick does not exist until the pool rebuild lands, which would leave the intermediate state carrying done on a card fill the draft's own comment calls decoration only. Keep the appended word. It is one rule, it is a non-colour non-geometry cue, and it still reads at arm's length once the tick strip exists. Only revisit if he says the word is redundant next to the tick.

### 29. #pool .clock.behind (index.html:291 vs draft 816)  [take-draft]

Functionally the same inversion, which is the pass 1 fix for the red-clock problem, so nothing is lost either way. Take the draft's version because it reads `--p-behind-fill`/`--p-behind-ink` instead of `--p-ink`/`--p-paper` directly, which is what lets `#pool.night` (draft 673) flip the deck without flipping the lateness pill into invisibility. Value-neutral today, correct once the Night pool switch exists.

### 30. #pool .ptop, #pool .pblk, #pool button, #pool footer (index.html:286-306 vs draft 687-785)  [sequencing-css-must-not-land-before-the-markup]

Four specific breakages if the pool CSS lands ahead of the pool markup edit. (1) The draft's `.ptop` (687) drops `display:flex; align-items:center; gap:10px`, but index.html:1913 still builds .ptop as a flex row of clock, an "of N min" span, a spacer and a Close button. Without flex they stack and the sticky bar becomes roughly 200px tall. (2) The draft's `.pblk` (711) drops `cursor:pointer` and `-webkit-tap-highlight-color:transparent`, and the draft has no `#pool .pblk:active` at all, but index.html:1930 still puts onclick on the whole card, so the only press feedback on the deck disappears. (3) The draft's `#pool .pfoot{ gap:48px }` never matches, because index.html:1948 emits `class:"row"` with an inline 10px gap. (4) The draft's `#pool .of` never matches, because index.html:1915 emits `class:"small"`, so the minutes target renders at the app's 15px Subhead inside the pool register. Land sections 14 of the stylesheet and edit 12 of the markup in the SAME commit. Everything else in the merge can be staged.

### 31. @media (max-width:560px){ #pool .pblk .pline{ font-size:1.55rem } } (index.html:310-313)  [must-be-explicitly-deleted]

The draft has no such rule, and risk decision 1 says delete it outright: 1.55rem is 13.2 arcmin of cap height at 70 cm, well under the ISO 9241 floor of 16 that the spec calls non-negotiable. It matters that this is an explicit deletion, not an omission, because it lives in a separate @media block near the end of the file that a section-by-section merge will skip straight past. The `.wrap{ padding:10px 10px 60px }` in the same block goes too, along with `.wrap` at index.html:144, when `body>.wrap` takes over. No specificity conflict either way, `body>.wrap` at (0,1,1) beats `.wrap` at (0,1,0) regardless of order, but leaving both is confusing.

### 32. Genuinely new structure, add with no conflict  [purely-additive]

These draft sections collide with nothing in pass 1 and can be added as written, subject to the review fixes noted elsewhere: the glass material and the two bars (.glass, .topbar, .topbar-title, .barbtn, .tabbar, .tab, .tab svg, .tab .lbl, body.kbd .tabbar, body>.wrap, body.solid *) at draft 255-324; sheets and scrims (.scrim, .sheet and its detents, .sheet-head, .sheet-body, .grabber, .sheet.pool) at 596-632; the type ladder and large title (.largetitle, h1-h3, .title1, .headline, .callout, .dim, .tnum, .grow) at 221-248; grouped inset lists (.list, .list-card, .irow and its r-1/r-2/r-3/r-val/r-date children, the .irow+.irow::before hairline, .chev) at 446-480; the pool rebuild (.prow, .pmain, .pcall, .prest, .pqual, .rlab, .pclockrow, .drift, .ptick and .mk, .collapsed, #pool.big, #pool.night, .pfoot) at 693-785; controls (.seg, .stepper, input[type=checkbox].sw) at 411-440; and the feedback layer (.toast, .skel, button.working) at 376-589. Also add `[hidden]{ display:none !important }` and `.gone{ display:none !important }` (208-211): the engine has no classList and no removeAttribute, so a whole-string class rewrite is the only hide lever it has.

### 33. Hardcoded colours in the draft that must become tokens  [eleven-places]

Line 350 `button.primary{ color:#fff }` to var(--on-accent) (correct value today, wrong source). Line 352 `button.good` background, border-color and `color:#fff` to --good-fill and --on-good (this one is a real contrast bug, see the --good-fill item). Line 419 `input[type=checkbox].sw::after{ background:#fff }` to var(--on-good), and pair it with `sw:checked{ background:var(--good-fill) }` instead of var(--good), which is review major 10's white-knob-on-mint failure at 1.47:1; keep the extra ring `0 0 0 1px rgba(0,0,0,.28)` as belt and braces. Line 587 `.toast.pool{ background:#fff; color:#000; border:3px solid #000 }` to --p-paper/--p-ink/--p-border once those are on :root. Line 599 `.scrim.pool{ background:rgba(0,0,0,.55) }` to a new pool literal --p-scrim, because the themed --scrim moves to .60 in dark and .70 under contrast and the deck must not follow. Line 604 `.sheet{ box-shadow:0 -12px 40px rgba(0,0,0,.28) }` to a --shadow-sheet token, so the accessibility block can null it the way it nulls --shadow-card and --glass-drop; as a literal it survives Increase Contrast. Lines 622, 623, 625, 629, 632 `.sheet.pool` and its grabber and buttons, all #fff/#000/3px, to --p-paper/--p-ink/--p-border. Line 797 `nav.tabs button.active{ color:#fff }` to var(--on-accent), which index.html:160 already does correctly, so just do not overwrite it. The @media print literals (#fff, #000, #999 at 832-836) are fine as literals, print has no theme, and pass 1 uses the same. The --glass-* rgba values are a material, not a colour, and are correctly literal.

### 34. .banner.strip (draft 569)  [rename-before-applying]

Review minor 12, and it is a straight cascade collision inside the draft itself. The offline banner emits `class="banner warn strip"` and `.strip` (draft 503, the stat strip) contributes `display:flex`, `box-shadow:var(--shadow-card)` and `overflow:hidden` that `.banner.strip` never overrides. Rename the edge-to-edge modifier to `.banner.edge` in the stylesheet and in the one emitter before anything ships. Cheap now, invisible later.

### 35. button.ghost (index.html:177 vs draft 356-359)  [deliberate-change-confirm-it]

Not a bug, a semantic shift worth naming. Live ghost is secondary grey text, `color:var(--label-2)`, with `:active` restoring `color:var(--label)`. The draft merges ghost with a new `.plain` and makes both `color:var(--accent-text)`, so they read as blue links. There are six live call sites: "Log out" (1628, 1702, 2297), "Mark done" and "Did not run" (1783, 1784), "Retire" (2068). Blue is right for Mark done and Did not run, and arguably wrong for Log out and Retire, which are not the action he wants to be drawn to. Suggestion: take the draft's `.plain` as the new blue variant, keep `button.ghost` grey exactly as pass 1 has it, and move only 1783 and 1784 to `.plain`. Also keep pass 1's `:active{ color:var(--label) }`, which the draft drops.

### 36. manifest.webmanifest  [still-stale-adjacent-to-this-work]

Not in either file, but it is the same colour table and it is still on the pre-pass-1 values: `"background_color": "#f3f6f8"` and `"theme_color": "#0284c7"`, against a live --bg-grouped of #f2f2f7. background_color is what iOS paints for the launch screen, so a dark-mode cold start still flashes light grey. sw.js is already at ws-training-v2, so that half of review minor 6 is done. Set background_color and theme_color to #f2f2f7, and tell him he has to delete the Home Screen icon and re-add it once, because iOS reads the manifest at install time and does not re-read it.

### 37. verify.js exposure of this merge  [zero-risk-as-CSS-only]

Confirmed green on the current file: `node verify.js` ends with "All checks passed. 2400 simulated sessions, 147 library sets." The harness regex-extracts only the WSTRAIN_ENGINE script block, so no stylesheet change in this merge can move it either way, which also means it cannot warn you about any of the above. The one thing in this reconciliation that touches the script is the --accent-ink fix at index.html:2092, and that is a string inside an inline style object, invisible to the suite. Review risk 12 wants verify.js extended first, before the markup half; the stylesheet half does not need it.

