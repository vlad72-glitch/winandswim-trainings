# Design review findings

Three independent reviewers, all returning fix_first, on the draft in
`draft-stylesheet.css` and `draft-markup-edits.json`. Every one of these is
unfixed: the draft has not been applied. Design pass 1 (tokens, dark mode, touch
targets, four bug fixes) was written fresh against the existing markup instead,
so none of these blockers reached the app.

Fix these before doing the structural half: bottom tab bar, large titles,
grouped inset lists, sheets, and the Pool tick strip.

## Blockers (7)

### 1. Edit 12, renderPool() / togglePool(); interacts with render() at index.html:1443

Reviewer: Safari on iOS / installed-PWA implementation review (iOS 26.6, standalone from Home Screen)

**Problem.** Edit 12's `renderPool()` ends with `document.body.append(pool)` after building `var pool = h("div",{ id:"pool", ... })`, and `togglePool` calls `renderPool()` directly. Nothing removes the previous `#pool`. Today's shipped `togglePool` only rewrites a className, so this leak is new. After three ticks there are four `position:fixed; inset:0; z-index:200` overlays stacked in the body, all matching `#pool{...}` (id selectors match duplicates), each with its own live `scroll` listener and `armTick` handlers. `render()` only clears one: `var pool = document.getElementById("pool"); if (pool) pool.remove();` and `getElementById` returns the first, i.e. the oldest. Verify cannot see it: the stub's `fakeEl` has `remove(){}` as a no-op and `getElementById` never returns null, so the suite passes.

**Fix.** First line of `renderPool()`: `if (poolEl && poolEl.remove) poolEl.remove();` before `var pool = h("div",{id:"pool"...})`. Belt and braces in `render()`: loop `while ((p = document.getElementById("pool"))) p.remove();` is not stub-safe (the stub never returns null, infinite loop) so keep `render()` as is and rely on the single `poolEl` reference. Cheaper still: stop re-rendering the whole overlay on a tick. Repaint only the touched block's className plus the strip's `.mk` textContent and `aria-pressed`, which is what the current code already does and what keeps his scroll position without `poolEl.scrollTop = keep`.

### 2. .sheet / .sheet.sm; edit 5 openSheet; edit 17 askSetup("date"); edit 18 askHistorySearch

Reviewer: Safari on iOS / installed-PWA implementation review (iOS 26.6, standalone from Home Screen)

**Problem.** Every text input in the new design lives inside a bottom-anchored fixed sheet: `.sheet{ position:fixed; left:0; right:0; bottom:0; ... transform:translateY(100%); }` with `.sheet.on{ transform:translateY(0); }`. iOS shrinks the visual viewport for the keyboard and leaves the layout viewport alone, so `bottom:0` stays pinned behind the keyboard. `askHistorySearch` (a `type=search` in a `.sheet.sm`) and the Ask Claude sheet are unusable: he cannot see what he types. `askSetup("date")` is worse, because the iOS date wheel is roughly 260px of panel over a sheet capped at `.sheet.sm{ max-height:34dvh; }`, which is about 250px on a 14 Pro, so the whole sheet including its Done button is covered. The stated fix, `body.kbd .tabbar{ transform:translateY(110%); }`, moves the tab bar, which was never the thing in the way. Section 4.5's instruction not to touch `window.visualViewport` is correct about the stub but leaves the actual defect unaddressed.

**Fix.** Two options, both stub-safe. (a) Keep the sheet bottom-anchored but subtract the keyboard: `if (typeof window !== "undefined" && window.visualViewport){ window.visualViewport.addEventListener("resize", ...) }` inside a view function, and write the offset with `Object.assign(SHEET.style,{transform:"translateY(-"+kb+"px)"})` (plain style assignment, allowed; `style.setProperty` is not). The `typeof`/truthy guard means the top level never touches `visualViewport`. (b) Avoid the problem: give input-bearing sheets `top:calc(env(safe-area-inset-top) + var(--s-4)); bottom:auto` via a `.sheet.top` class so they anchor under the top bar, where iOS's own scroll-into-view keeps them visible. Do not ship a bottom sheet with a date input in it.

### 3. Stylesheet section 4, the two accessibility @media blocks; tokens --label, --label-2, --label-3

Reviewer: Accessibility and legibility only: can a coach with wet hands read and hit this at 70 cm in a 5,000 lux hall, and is dark mode genuinely readable rather than inverted greys. All ratios below are WCAG 2.x relative luminance, computed (alpha-composited where the token is rgba), not estimated. Every ratio the spec itself claims was re-derived and all 32 are exact; every failure below is a pair the spec never checked.

**Problem.** The accessibility override block bundles reduced-transparency with increased-contrast and hardcodes LIGHT-mode label colours: `@media (prefers-contrast: more), (prefers-contrast: high), (prefers-reduced-transparency: reduce){ :root{ --label:#000000; --label-2:#2b343c; --label-3:#4a545e; ... } }`. The dark fixup that follows only re-lists `(prefers-color-scheme: dark) and (prefers-contrast: more)`. So Dark Mode + Reduce Transparency with Increase Contrast OFF keeps black label text on the dark surfaces. Computed: --label #000000 on --bg-card #1c1c1e = 1.23:1, on --bg-grouped #000000 = 1.00:1 (literally invisible), on --glass-flat #141416 = 1.14:1, on --bg-nested #2c2c2e = 1.51:1. --label-2 #2b343c on card = 1.34:1, on nested = 1.10:1. --label-3 #4a545e on card = 2.20:1. The toast inverts to 1.23:1 as well (`background:var(--label)` #000000 with `color:var(--bg-card)` #1c1c1e). That is every large title, every row title, every card heading and every toast in the app, between 1.00 and 1.51:1. Safari 17.4+ supports prefers-reduced-transparency, so this fires on his phone. The override written to help the low-vision user is the one that bricks the app for exactly that user.

**Fix.** Split transparency from contrast, and make every label override mode-aware. Replace with three blocks: (1) `@media (prefers-contrast: more), (prefers-reduced-transparency: reduce){ :root{ --sep:var(--sep-opaque); --glass-fill:var(--glass-flat); --glass-blur:0px; --glass-edge:var(--sep-opaque); --shadow-card:none; --glass-drop:none; --scrim:rgba(0,0,0,.70); } }` with NO label changes; (2) `@media (prefers-contrast: more){ :root{ --label:#000000; --label-2:#2b343c; --label-3:#4a545e; } }`; (3) `@media (prefers-color-scheme: dark) and (prefers-contrast: more){ :root{ --label:#ffffff; --label-2:#dfe4e8; --label-3:#b9c1c8; } }`. Labels then only ever move in the direction the current theme needs. Verify by toggling Reduce Transparency in dark on the device before commit 3 lands, since commit 3 is the one that claims it cannot break anything.

### 4. Stylesheet section 13, `.sheet.pool button` margin-top; askClosePool() in the pool edit

Reviewer: Accessibility and legibility only: can a coach with wet hands read and hit this at 70 cm in a 5,000 lux hall, and is dark mode genuinely readable rather than inverted greys. All ratios below are WCAG 2.x relative luminance, computed (alpha-composited where the token is rgba), not estimated. Every ratio the spec itself claims was re-derived and all 32 are exact; every failure below is a pair the spec never checked.

**Problem.** The pool close confirmation puts three 76px buttons 12px apart: `.sheet.pool button{ min-height:var(--pool-target-sm); width:100%; ... margin-top:var(--s-3); }` = 12px. The first is `Mark done and close`, which writes session status to the database; the second is `Just close`. The spec's own error budget requires 48px between a state-changing target and a benign one and says the two should preferably never be adjacent. 12px = 1.91 mm = 0.47 sigma against the stated sigma of 4.03 mm. Worse, at 76px the 2-D hit rate is only 74.9% (half-width 6.03 mm / 4.03 mm = 1.497 sigma, per-axis 2*phi(1.497)-1 = 86.6%, squared = 74.9%), versus 92.1% at 104px. So the single highest-consequence interaction on the deck combines the lowest hit rate with the tightest spacing in the whole design, and a low miss on `Just close` lands on `Mark done and close`, silently marking a session done mid-set with no undo path in pool view.

**Fix.** Order the sheet least-destructive-first and separate by consequence, not uniformly: `Keep going`, then `Just close`, then `Mark done and close` last. Set `.sheet.pool button{ margin-top:var(--s-4); }` (16px) for the benign pair and give the destructive one its own rule, `.sheet.pool button.commit{ margin-top:48px; }`. Raise all three to `min-height:var(--pool-target)` (104px) since this is a state-changing sheet, not a reversible control; 3x104 + 16 + 48 + head is 411px, still inside `.sheet.pool.sm{max-height:70dvh}` = 591px on a 844px phone. Then re-check on device.

### 5. edit 12, `togglePool` / `renderPool` (replaces index.html lines 1691 to 1764)

Reviewer: Monday-morning regression risk: harness contract, DOM vocabulary, class sync, edit order, screen inventory

**Problem.** `togglePool` calls `renderPool()` directly, and `renderPool` ends with `document.body.append(pool)` after building a brand new `<div id="pool">`. Nothing removes the previous one. Only `render()` removes `#pool`, and it removes exactly one: `var pool = document.getElementById("pool"); if (pool) pool.remove();`. Tick three blocks and there are four stacked full-screen `position:fixed; inset:0; z-index:200` overlays with duplicate ids.

**Fix.** First statement of `renderPool`: `var old = document.getElementById("pool"); if (old) old.remove();`. The stub's `getElementById` returns a fresh object and `remove()` is a no-op, so neither verify.js nor the implementer's probe can ever see this.

### 6. stylesheet section 7 `button.good` vs section 9 `.irow` / `.irow.good .r-1`; emitted by edit 13's Actions list

Reviewer: Monday-morning regression risk: harness contract, DOM vocabulary, class sync, edit order, screen inventory

**Problem.** `irow({ title:"Save", tone:"good", ... })` builds `<button class="irow tap good act">`. `button.good{background:var(--good);...}` is (0,1,1) and beats `.irow{background:transparent}` at (0,1,0), so the row fills solid `--good`. `.irow.good .r-1{color:var(--good)}` at (0,3,0) then paints the label the same colour. Save renders #155c33 on #155c33 in light and #8ce8b2 on #8ce8b2 in dark: the single most important action on Today is invisible.

**Fix.** Namespace the row tones so they cannot collide with the button variants: emit `tone:"r-good"` / `"r-danger"` / `"r-accent"` and rename the rules to `.irow.r-good .r-1` etc. Or scope the variants as `button.good:not(.irow)`. Check `danger` and `accent` at the same time; `danger` happens to survive only because `button.danger` is also transparent.

### 7. edit order: edits 16 and 19 depend on edit 20

Reviewer: Monday-morning regression risk: harness contract, DOM vocabulary, class sync, edit order, screen inventory

**Problem.** Edit 16 (`renderToday`) and edit 19 (`renderInsights`) both call `setBar(BARL, "Settings", openSettings)` / `setBar(BARR, "Settings", openSettings)`, but `openSettings` is not defined until edit 20. Reading an undeclared identifier throws `ReferenceError`, so from edit 16 until edit 20 lands every render of Today and Insights dies. Edit 19 also deletes `settingRow` before edit 20 supplies the replacement, so Settings is unreachable in between. verify.js renders only the not-configured branch, so `node verify.js` stays green through all of it.

**Fix.** Land edit 20 (openSettings, stepRow, switchRow) immediately after edit 5, before any screen edit references it. Same rule for `askClaude` and `openSetSheet`: edit 19 calls both and edit 18 defines them, so 18 must precede 19.

## Majors (24)

### 1. .glass; .tabbar

Reviewer: Safari on iOS / installed-PWA implementation review (iOS 26.6, standalone from Home Screen)

**Problem.** `.glass{ ... border:0; border-bottom:1px solid var(--glass-edge); box-shadow:inset 0 1px 0 0 var(--glass-rim), var(--glass-drop); }` with `--glass-drop:0 6px 20px rgba(0,0,0,.10)`. That geometry is a top bar's: hairline on the bottom, specular rim on the top, shadow cast downward. `.tabbar` shares the class, so the bottom bar gets its separating hairline on its bottom edge (off-screen, under the home indicator), its highlight on the top edge where a real iOS tab bar has its divider, and a 6px downward shadow that never renders. In light mode a 72% white tab bar over `#f2f2f7` content then has no visible edge at all.

**Fix.** Split the material from the edge. Keep `.glass` to fill, blur and rim, then add `.topbar{ border-bottom:1px solid var(--glass-edge); box-shadow:inset 0 -1px 0 0 var(--glass-rim), 0 6px 20px rgba(0,0,0,.10); }` and `.tabbar{ border-top:1px solid var(--glass-edge); box-shadow:inset 0 1px 0 0 var(--glass-rim), 0 -6px 20px rgba(0,0,0,.10); }`. Two extra rules, and the dark-mode `--glass-drop` needs the same sign flip.

### 2. .topbar:not(.compact); edit 5 onScroll()

Reviewer: Safari on iOS / installed-PWA implementation review (iOS 26.6, standalone from Home Screen)

**Problem.** The compact transition creates and destroys a blur layer mid-scroll. `.topbar:not(.compact){ background:transparent; -webkit-backdrop-filter:none; backdrop-filter:none; border-bottom-color:transparent; box-shadow:none; }` and the driver is `var want = y > 28; if (want === barCompact) return;`. There is no transition on `background`, `backdrop-filter` or `box-shadow` (only `.topbar-title` has one, on `opacity`), so at y=28 the bar snaps from nothing to frosted-plus-shadow. There is also no hysteresis, so any scroll jitter around 28px flips it repeatedly, and each flip makes WebKit tear down and rebuild a backdrop-filter compositing layer over a scrolling region. That is exactly the case that stutters on a phone.

**Fix.** Keep the blur layer alive for the life of the bar and animate only opacity. Move fill, border and shadow onto a pseudo-element: `.topbar::before{ content:""; position:absolute; inset:0; background:var(--glass-fill); border-bottom:1px solid var(--glass-edge); box-shadow:...; opacity:0; transition:opacity var(--dur-mid) var(--ease-out); }` and `.topbar.compact::before{ opacity:1; }`, with `backdrop-filter` left permanently on `.topbar` (a blur with no fill at scroll top is nearly invisible against the large title). Add hysteresis in `onScroll`: `var want = barCompact ? y > 12 : y > 28;`.

### 3. body{overscroll-behavior-y:none}; #pool

Reviewer: Safari on iOS / installed-PWA implementation review (iOS 26.6, standalone from Home Screen)

**Problem.** `body{ ... overscroll-behavior-y:none; }` does nothing in Safari. Per the Overscroll Behavior spec the used value on the *root* element propagates to the viewport, and unlike `overflow` there is no body fallback; Chrome's body propagation is the quirk, and the sheet was clearly written against it. So the document still rubber-bands. That matters most in pool view, where `#pool{ position:fixed; inset:0; overflow-y:auto; overscroll-behavior:contain; }` is a fixed overlay: when its content does not overflow (one open block plus two collapsed rows often will not), the drag chains to the viewport, and iOS drags fixed elements with the document bounce. He gets the white deck sheet sliding away from the screen edge with `--bg-grouped` behind it, which is `#000000` in dark mode.

**Fix.** Put it on the root: `html{ overscroll-behavior-y:none; }` (keep the body copy, it is harmless). Then lock the page while the deck is up, which the app can do with the tools it has: add `.poolopen{ overflow:hidden; }` to the sheet, add `pool:false` to `bodyFlags`, and set it in `startPool`/`leavePool` through the existing `paintBody()`. Do not use `position:fixed` on body for the lock, it loses his scroll position on close.

### 4. .topbar; .tabbar; body>.wrap; .banner.strip

Reviewer: Safari on iOS / installed-PWA implementation review (iOS 26.6, standalone from Home Screen)

**Problem.** No horizontal safe-area padding on the shell. `.topbar{ ... padding:env(safe-area-inset-top) var(--s-2) 0; }`, `.tabbar{ ... padding-bottom:max(env(safe-area-inset-bottom),8px); }` and `body>.wrap{ padding-left:var(--gutter); padding-right:var(--gutter); }` all handle the vertical insets and ignore left and right, while `#pool` correctly uses `calc(env(safe-area-inset-right) + var(--s-4))`. In landscape on a notched or Dynamic Island phone the insets are 44px or more: the left bar button (`History` back, `Settings`) and the outer tabs (Today, Insights) land under the cutout and the rounded corner, and `.banner.strip{ margin:0 calc(var(--gutter) * -1) var(--s-3); }` bleeds the offline warning under it. This is reachable: `manifest.webmanifest` sets `"orientation": "portrait"`, and Safari on iOS does not implement the manifest `orientation` member, so the installed PWA rotates.

**Fix.** `.topbar{ padding:env(safe-area-inset-top) calc(env(safe-area-inset-right) + var(--s-2)) 0 calc(env(safe-area-inset-left) + var(--s-2)); }`, `.tabbar{ padding-left:env(safe-area-inset-left); padding-right:env(safe-area-inset-right); }`, and on the page column `padding-left:calc(env(safe-area-inset-left) + var(--gutter))` with the mirror on the right. Then `.banner.strip`'s negative margin has to become `calc((var(--gutter) + env(safe-area-inset-left)) * -1)` or it will punch back out under the notch.

### 5. .topbar{height:...}; --topbar-h; --tabbar-h; body>.wrap padding-bottom

Reviewer: Safari on iOS / installed-PWA implementation review (iOS 26.6, standalone from Home Screen)

**Problem.** The shell uses fixed heights against Dynamic Type, which contradicts the spec's own rule in section 3.2 ("`min-height` everywhere, `height` nowhere"). `.topbar{ height:calc(env(safe-area-inset-top) + var(--topbar-h)); }` gives a 44px content box, and `.barbtn{ min-height:var(--ctl-h); ... font-size:1rem; }` is 44px of button with a label whose line box is `1rem * 1.294` of a root that is Dynamic Type. At the larger accessibility sizes 1rem is 24px to 53px, so `Settings` and `Pool` overflow a bar with no `overflow` set and draw over the large title. The tab bar has the opposite failure: it is free to grow (`.tab{ min-height:var(--tabbar-h); }` plus a `min(.647rem,12px)` label), but the space reserved for it is the fixed token: `padding-bottom:calc(var(--tabbar-h) + max(env(safe-area-inset-bottom),8px) + var(--s-5))`. The bar then covers the last rows of every list.

**Fix.** `.topbar{ min-height:calc(env(safe-area-inset-top) + var(--topbar-h)); height:auto; }` and let `.barbtn` labels set the height. For the reserved space, either cap the bar (`.tab .lbl{ font-size:min(.647rem,12px); }` already caps the label, so also cap the icon: `.tab svg{ width:min(28px,1.65rem); height:min(28px,1.65rem); }` and keep `--tabbar-h` honest) or reserve generously: `padding-bottom:calc(max(var(--tabbar-h), 4rem) + max(env(safe-area-inset-bottom),8px) + var(--s-5))`.

### 6. .sheet; .sheet-body

Reviewer: Safari on iOS / installed-PWA implementation review (iOS 26.6, standalone from Home Screen)

**Problem.** The sheet's scroll region is not set up to shrink. `.sheet{ display:flex; flex-direction:column; max-height:92dvh; }` with `.sheet-body{ overflow-y:auto; overscroll-behavior:contain; padding:...; }` and no `flex` and no `min-height:0`. The body is `flex:0 1 auto` next to `.grabber` and `.sheet-head`, so it is sized to content and only shrinks via the automatic-minimum-size carve-out for scroll containers, which WebKit has a long history of getting wrong in column flex. If it does not shrink, the Settings sheet (five group headers, twelve rows, three footers) overflows past `max-height` and the bottom rows sit below the screen with nothing scrolling, because `.sheet` has no `overflow:hidden` either. That same missing `overflow:hidden` also lets row backgrounds paint over the `--r-sheet:20px` top corners.

**Fix.** `.sheet{ overflow:hidden; }` and `.sheet-body{ flex:1 1 auto; min-height:0; }`. Two declarations, and they remove the whole class of "the last setting is unreachable" bug. Worth also dropping `overscroll-behavior:contain` from `.sheet`, which is not a scroll container, and keeping it only on `.sheet-body`.

### 7. body.solid .glass vs .topbar:not(.compact)

Reviewer: Safari on iOS / installed-PWA implementation review (iOS 26.6, standalone from Home Screen)

**Problem.** Cascade bug between the accessibility block and the shell. `body.solid .glass{ background:var(--glass-flat); -webkit-backdrop-filter:none; backdrop-filter:none; }` is specificity (0,2,1); `.topbar:not(.compact){ background:transparent; ... }` is (0,2,0). The type selector in `body.solid` wins regardless of source order, so with the Solid backgrounds switch on, the top bar at scroll top is an opaque `#fbfbfd` slab (`#141416` in dark) with `border-bottom-color:transparent` and `box-shadow:none` still applying from the later rule. That is a floating, edgeless block sitting over the top of the large title, in the one mode a user turns on because they want things clearer.

**Fix.** Raise the shell rule above it: `body .topbar:not(.compact){ background:transparent; ... }` (0,2,1, and later in the file so it wins the tie), or scope the switch away from the bar's transparent state with `body.solid .topbar.compact, body.solid .tabbar{ ... }`. The pseudo-element restructure in the backdrop-filter fix above also resolves this on its own, since the fill would live on `::before` and `opacity` would still be 0.

### 8. Edit 12, poolClick()

Reviewer: Safari on iOS / installed-PWA implementation review (iOS 26.6, standalone from Home Screen)

**Problem.** The tick sound dies after the first screen lock. `poolClick()` does `if (!poolAudio) poolAudio = new AC();` then `o.start()`, and never checks state. iOS moves an AudioContext to `suspended`, and on a phone call or lock to the WebKit-specific `interrupted`, and it does not resume itself when the PWA comes back to the foreground. His documented setup is Auto-Lock at 5 minutes inside a 60 minute session, so the context is guaranteed to be interrupted partway through. `try{...}catch(e){}` swallows it, so it fails silently: no sound, no haptics on iOS, and the `:active` inversion is 120ms of a strip his finger is covering.

**Fix.** Resume inside the gesture: `if (poolAudio.state !== "running" && poolAudio.resume) poolAudio.resume();` immediately after the create-or-reuse line, before building the oscillator. Both the `AudioContext` construction and the `resume()` are then inside the `pointerup` handler, which is a valid user gesture on iOS. Keep the `try/catch` but let the tick still paint if audio throws, which it already does since `poolClick()` runs after `renderPool()`.

### 9. Stylesheet section 8, `.seg button.on`; feedbackCard() rating control

Reviewer: Accessibility and legibility only: can a coach with wet hands read and hit this at 70 cm in a 5,000 lux hall, and is dark mode genuinely readable rather than inverted greys. All ratios below are WCAG 2.x relative luminance, computed (alpha-composited where the token is rgba), not estimated. Every ratio the spec itself claims was re-derived and all 32 are exact; every failure below is a pair the spec never checked.

**Problem.** The segmented control's selected state is invisible in both themes. `.seg{background:var(--fill-3)}` with `.seg button.on{background:var(--bg-card); box-shadow:var(--shadow-card)}`, and both `.seg button` and `.seg button.on` set `color:var(--label)`, so there is no text cue. Dark: track = rgba(118,118,128,.24) over #1c1c1e = rgb(50,50,54); selected pill = --bg-card #1c1c1e; ratio 1.33:1 — and `--shadow-card:none` in dark, so the shadow fallback does not exist. Light: track = rgba(118,118,128,.12) over #ffffff = rgb(239,239,240); selected = #ffffff; ratio 1.15:1, with only `0 1px 2px rgba(16,42,58,.05)` as a cue. Needs 3:1 under 1.4.11 as the state indicator. This is a regression: today the chosen rating renders `class:"primary small"` at index.html:1661, white on #0284c7, unmistakable. The redesign takes a working state indicator to 1.15:1 and 1.33:1.

**Fix.** Make the selected cell carry the accent fill it carries today, plus a text cue: `.seg button.on{ background:var(--accent-fill); color:#fff; box-shadow:none; }`. That is 7.56:1 white-on-fill in light and 7.26:1 in dark, and the pill-vs-track boundary becomes 5.0:1 light and 3.4:1 dark, all computed. Keep `aria-pressed` as planned. If the iOS white-pill look is wanted instead, the pill must gain a real border: `.seg button.on{ background:var(--bg-card); border:1px solid var(--label-3); }`, which gives 3.6:1 dark and 4.4:1 light against the track.

### 10. Stylesheet section 7 `button.good`; section 8 `input[type=checkbox].sw:checked` and its `::after`

Reviewer: Accessibility and legibility only: can a coach with wet hands read and hit this at 70 cm in a 5,000 lux hall, and is dark mode genuinely readable rather than inverted greys. All ratios below are WCAG 2.x relative luminance, computed (alpha-composited where the token is rgba), not estimated. Every ratio the spec itself claims was re-derived and all 32 are exact; every failure below is a pair the spec never checked.

**Problem.** `--good` inverts to a light mint in dark (`--good:#8ce8b2`) but two rules keep a hardcoded white foreground on it. `button.good{ background:var(--good); ... color:#fff; }` gives white on #8ce8b2 = 1.47:1. That button is live right now at index.html:1586, `h("button",{class:"good"},"Save")`, and the stylesheet lands as edit 2 while renderSessionCard is not rewritten until edit 13, so the migration ships an intermediate state with an unreadable Save button. The spec's claim that "the app is dark-capable and contrast-correct at the end of this commit, with the old markup" is false for this pair. Permanently, `input[type=checkbox].sw:checked{background:var(--good)}` with `::after{background:#fff}` puts a white knob on the same mint: 1.47:1, against 10.81:1 for the unchecked knob on rgba(120,120,128,.36) over #1c1c1e. So all four Settings switches, including `Tick sound` and `Night pool`, lose their knob when switched on and state rests on a 20px translation alone.

**Fix.** Add a paired foreground token rather than a literal. In light `:root` add `--on-good:#ffffff`; in the dark block add `--on-good:#0d2f1c` (that on #8ce8b2 computes to 11.1:1). Then `button.good{ color:var(--on-good); }`. For the switch, the knob must contrast with both track states, so give it a border instead of relying on fill: `input[type=checkbox].sw::after{ background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.25), 0 0 0 1px rgba(0,0,0,.28); }` — 1px of rgba(0,0,0,.28) over #8ce8b2 composites to rgb(151,183,161), which is 3.1:1 against the #fff knob. Also audit for any other `color:#fff` sitting on a token that inverts.

### 11. Stylesheet section 6, `.tab.on{ color:var(--accent) }` combined with `.tab .lbl`

Reviewer: Accessibility and legibility only: can a coach with wet hands read and hit this at 70 cm in a 5,000 lux hall, and is dark mode genuinely readable rather than inverted greys. All ratios below are WCAG 2.x relative luminance, computed (alpha-composited where the token is rgba), not estimated. Every ratio the spec itself claims was re-derived and all 32 are exact; every failure below is a pair the spec never checked.

**Problem.** The active tab label is the least readable text in the tab bar. `.tab.on{color:var(--accent)}` with `--accent:#0284c7` in light, and `.tab .lbl{font-size:min(.647rem,12px)}` = 11px, which is normal-size text needing 4.5:1. Computed: #0284c7 on --glass-flat #fbfbfd = 3.96:1, on pure white = 4.10:1. Both fail AA. Meanwhile the inactive labels are `--label-2` #414e58 on glass-flat = 8.28:1. So the selected destination is at 3.96:1 while the unselected ones sit at 8.28:1: the state cue is inverted, the thing he is looking at is the hardest to read. The spec explicitly reserves --accent for "fills and glyphs only, never text" and then uses it as the tab label colour, so this is an internal contradiction, not a judgement call. Dark is fine (--accent #5cc4f5 on #141416 is high).

**Fix.** Split the glyph from the label. Keep the brand blue on the 28px icon, where only the 3:1 non-text bar applies, and use the text-safe token on the 11px label: `.tab.on{ color:var(--accent); } .tab.on .lbl{ color:var(--accent-text); }`. --accent-text #075985 on glass-flat computes to 7.32:1. In dark --accent-text is already #5cc4f5 so nothing changes there. Alternatively raise the label to 12px minimum and still use --accent-text; 3.96:1 does not become acceptable at 12px either.

### 12. armTick() in the pool view edit, the three strip.addEventListener calls

Reviewer: Accessibility and legibility only: can a coach with wet hands read and hit this at 70 cm in a 5,000 lux hall, and is dark mode genuinely readable rather than inverted greys. All ratios below are WCAG 2.x relative luminance, computed (alpha-composited where the token is rgba), not estimated. Every ratio the spec itself claims was re-derived and all 32 are exact; every failure below is a pair the spec never checked.

**Problem.** VoiceOver and Switch Control cannot tick a block. `armTick` binds activation exclusively to `pointerdown`/`pointerup` (plus a `keydown` fallback for Enter and Space), and the tick strip is a `<button>` with no click handler anywhere. iOS VoiceOver's activate gesture dispatches a `click`; pointerdown/pointerup are not guaranteed to be synthesized. The design goes out of its way to make this control accessible — `aria-pressed`, and an `aria-label` reading "Mark done: 8 x 50 m free" — so a VoiceOver user can find and focus it, hear exactly what it does, double-tap, and get nothing. The keydown fallback proves the authors knew non-pointer activation needed handling and then covered only the keyboard case. This is the primary action of the primary screen.

**Fix.** Add a `click` listener that bypasses the wet-finger gate the same way keydown does, and guard against double-firing from a real pointer: track a timestamp in the pointerup path and have the click handler ignore any click within ~500ms of a gated pointerup. Also drop the `keydown` handler entirely — the element is a native `<button>`, so Enter and Space already produce a `click`, and keeping both means the keyboard path double-fires the moment click is added. Net change is one listener fewer, not one more.

### 13. Stylesheet section 14, `#pool .pblk.collapsed .ptick` and `#pool .pblk` margin-bottom

Reviewer: Accessibility and legibility only: can a coach with wet hands read and hit this at 70 cm in a 5,000 lux hall, and is dark mode genuinely readable rather than inverted greys. All ratios below are WCAG 2.x relative luminance, computed (alpha-composited where the token is rgba), not estimated. Every ratio the spec itself claims was re-derived and all 32 are exact; every failure below is a pair the spec never checked.

**Problem.** Collapsed blocks get a 76px state-changing target 12px from the next one. `#pool .pblk.collapsed .ptick{ width:var(--pool-target-sm); min-height:var(--pool-target-sm); }` = 76px, and `#pool .pblk{ margin-bottom:var(--s-3); }` = 12px. The collapsed strip does exactly what the open one does: it flips `done` and re-renders. Computed 2-D hit rate at 76px is 74.9% versus 92.1% at 104px, so one collapsed tick in four misses. Where the miss lands is the problem: two tick strips vertically 12px apart, both state-changing, against the spec's own 16px same-kind minimum. A low miss ticks the neighbouring block, which changes which block is 'current', collapses the one he was reading and expands another. Un-ticking a block is the main reason to touch a collapsed card at all, so this is the path most likely to be used and the least likely to land.

**Fix.** Keep the strip at full size regardless of collapse — delete the `.collapsed .ptick` size override so it stays `var(--pool-target)` 104px — and raise the block gap to clear the same-kind minimum: `#pool .pblk{ margin-bottom:var(--s-5); }` = 20px. A collapsed row then costs 104+12+12+6+20 = 154px instead of 118px, which is affordable because the whole point of collapsing is that only one block is open.

### 14. armTick() pointerup handler, the moved/dwell/poolScrollAt early returns

Reviewer: Accessibility and legibility only: can a coach with wet hands read and hit this at 70 cm in a 5,000 lux hall, and is dark mode genuinely readable rather than inverted greys. All ratios below are WCAG 2.x relative luminance, computed (alpha-composited where the token is rgba), not estimated. Every ratio the spec itself claims was re-derived and all 32 are exact; every failure below is a pair the spec never checked.

**Problem.** Three of the five gates in `armTick` reject a tap silently, with no feedback of any kind: `if (moved > 10) return;`, `if (dwell < 40 || dwell > 1200) return;`, and `if (Date.now() - poolScrollAt < 350) return;`. CSS `:active` will already have inverted the strip to black-on-white and reverted it, so the control visibly acknowledged the press and then did nothing, and `aria-pressed` never changes so assistive tech gets nothing either. Two of these fire during normal deck use: scroll-to-the-current-block-then-tap trips the 350ms lockout, and a cold or gloved finger resting on the target for over 1.2 seconds trips the dwell ceiling. The spec justifies the gates as protecting an undoable action, but an invisible rejection is the one failure mode that is NOT undoable, because he does not know it happened. He looks down, sees no check, and taps again — into the 400ms global cooldown.

**Fix.** Distinguish 'suppressed' from 'ignored'. Raise the dwell ceiling well past a deliberate press (2500ms, keeping the intent of rejecting a hand parked on the phone) and, on any gated rejection, give a pool-register acknowledgement rather than silence: flash the strip border and show the pool toast with a short reason, e.g. "Tap again" after a scroll lockout. It costs nothing at 2.6s and it converts a mystery into a retry. Keep the 1500ms per-block cooldown as the double-fire guard.

### 15. togglePool() scrollTop restore; renderPool(); stylesheet `#pool .ptop` and `#pool .pblk.collapsed`

Reviewer: Accessibility and legibility only: can a coach with wet hands read and hit this at 70 cm in a 5,000 lux hall, and is dark mode genuinely readable rather than inverted greys. All ratios below are WCAG 2.x relative luminance, computed (alpha-composited where the token is rgba), not estimated. Every ratio the spec itself claims was re-derived and all 32 are exact; every failure below is a pair the spec never checked.

**Problem.** The spec's one stated non-negotiable — "The call and the rest of the current block must always be visible together with no scrolling" — has no implementation, and one line works directly against it: `togglePool` does `var keep = poolEl ? poolEl.scrollTop : 0; ... renderPool(); if (poolEl) poolEl.scrollTop = keep;`. There is no scroll-to-current-block anywhere (scrollIntoView is correctly avoided as unavailable under the stub, but nothing replaces it). The vertical numbers are also wrong in the spec's favour. Recomputed from the real CSS: `.ptop` = 2 + 56*1.05 + 2 + 28*1.2 + 10 + 3 = 109.4px, +12px margin = 121.4px, over its own 120px cap (and the implementer removed the `max-height` cap that would have enforced it). A collapsed block is 12 + 76 + 12 + 6 = 106px, +12 margin = 118px, not the claimed 88px, because the 76px tick strip sets the row height, not the 28px text. A worst-case open block (2 rest rows, wrapped qualifier, cue, 2 Adv rows) is 394px, not the assumed ~300px. So mid-session with the warm-up and two blocks done, the current block starts 394px into the scroll content while only 619px sits below the sticky bar and the block itself needs 469px at the Bigger text setting: its rest rows and cue land below the fold, and after a tick the code restores the old scroll position instead of bringing them up.

**Fix.** Compute the offset instead of measuring it. The heights are all known constants in the stylesheet, so accumulate them while building: sum a fixed cost per collapsed block (154px after the fix above) plus the goal block, and set `poolEl.scrollTop = offsetOfCurrentBlock - 8` at the end of renderPool whenever the current index changed since the last paint. Preserve `keep` only when the current index is unchanged (an un-tick). Also restore a real cap on the top bar, `#pool .ptop{ max-height:calc(150px * var(--pool-scale)); }`, so the 121.4px measured height is enforced rather than asserted, and re-check the 88px collapsed claim against 118px in the spec text.

### 16. Stylesheet section 14: `#pool button` font-size, `.sheet.pool button`, `.sheet.pool .sheet-head`, `#pool .of`, tokens --p-cue --p-adv --p-role

Reviewer: Accessibility and legibility only: can a coach with wet hands read and hit this at 70 cm in a 5,000 lux hall, and is dark mode genuinely readable rather than inverted greys. All ratios below are WCAG 2.x relative luminance, computed (alpha-composited where the token is rgba), not estimated. Every ratio the spec itself claims was re-derived and all 32 are exact; every failure below is a pair the spec never checked.

**Problem.** Pool text below the 48px set line falls under the ISO 9241 16 arcmin floor that this document itself declares the hard floor, and it does so on the controls that carry consequences. Computed at 70 cm with SF cap height 0.72em and 0.1588 mm/px: `#pool button` and `.sheet.pool button` at 1.176rem = 20px give 11.23 arcmin; `.sheet.pool .sheet-head` at 1.294rem = 22px gives 12.35; `#pool .of` at 24px gives 13.48; `--p-adv` 26px gives 14.60; `--p-cue` 28px gives 15.72; `--p-role` 20px gives 11.23. For scale, the 48px call is 26.95 and the shipped 1.85rem line the spec condemns is 16.62. So the redesign raises the set line well above the floor and simultaneously puts the entire close confirmation — head plus three button labels, the decision that can mark a session done — at 11 to 12 arcmin, a third below the floor and below what the current app already achieves. `.pcue` at 15.72 also misses, and it carries the coaching cue.

**Fix.** Put pool chrome on the pool ladder instead of the rem ladder. Add `--p-btn:calc(30px * var(--pool-scale))` (16.85 arcmin) and use it for `#pool button`, `.sheet.pool button` and `.sheet.pool .sheet-head`; those are short labels so the width cost is small. Raise `--p-cue` from 28px to 30px (16.85) since it is read at the block. `--p-role` at 20px and `--p-adv` at 26px are defensible as read-once-up-close text, but say so explicitly in the spec table rather than leaving them inside a document that calls 16 arcmin non-negotiable.

### 17. Stylesheet section 8 `input,select,textarea` border; askSetup('date'), askHistorySearch, askLibFilter

Reviewer: Accessibility and legibility only: can a coach with wet hands read and hit this at 70 cm in a 5,000 lux hall, and is dark mode genuinely readable rather than inverted greys. All ratios below are WCAG 2.x relative luminance, computed (alpha-composited where the token is rgba), not estimated. Every ratio the spec itself claims was re-derived and all 32 are exact; every failure below is a pair the spec never checked.

**Problem.** Standalone sheet inputs have no perceivable boundary. The base rule is `input,select,textarea{ border:1px solid var(--sep-opaque); background:var(--bg-card); }`, and `.bordered{ border-color:var(--label-3); }` is opt-in. The spec's rationale allows --sep-opaque only "for inputs sitting inside a grouped list row, where the row itself identifies the control", but three inputs are appended straight into the sheet body with no `.bordered` class and no enclosing row: the date field in `askSetup("date")`, the search field in `askHistorySearch`, and the search field in `askLibFilter`. Computed light: border #c6c6c8 against the sheet #f2f2f7 = 1.53:1 and against the field's own #ffffff fill = 1.71:1, with the fill-vs-sheet difference only 1.12:1. Dark is worse: `--bg-card` and `--bg-sheet` are both #1c1c1e, so the fill gives exactly 1.00:1 and the border #404044 gives 1.65:1. Nothing reaches the 3:1 that 1.4.11 requires to identify a control. Only the login fields, which the spec did remember, get `.bordered`.

**Fix.** Invert the default so the safe value is automatic: set the base rule to `border:1px solid var(--label-3)` (5.13:1 light, 6.25:1 dark) and add an opt-out `input.inrow{ border-color:var(--sep-opaque); }` for the fields that genuinely sit inside a grouped row. That way a newly added standalone field is correct by default instead of correct only if someone remembers a class. Then drop `.bordered` from login, since it becomes the default.

### 18. edit 12 `startPool`, index.html:1677 `markStatus`, reached from edit 7 `renderSessionScreen`

Reviewer: Monday-morning regression risk: harness contract, DOM vocabulary, class sync, edit order, screen inventory

**Problem.** `renderSessionCard`'s pool button calls `startPool(sk)`, whose first line is `draft = sk`, and `markStatus` line 1677 does `draft = hydrate(...)`. Both are reachable from the new History session-detail screen, so opening an old session and tapping Start pool view or Mark done silently replaces today's draft with the historical session. That is the exact defect section 5.3.4 says the `view.name = "session"` route exists to fix.

**Fix.** Give both a target parameter instead of writing the module-level `draft`: pool view should read a `poolSk` variable set by `startPool`, and `markStatus` should only reassign `draft` when `sk === draft`.

### 19. edit 16 `renderToday`, draft branch

Reviewer: Monday-morning regression risk: harness contract, DOM vocabulary, class sync, edit order, screen inventory

**Problem.** `renderToday` returns early inside `if (draft){ ... renderSessionCard(draft, true); return; }`, and the `.working` button, the "Picking the focus, filling the 45 minutes..." line and the three `.skel` blocks all live in the no-draft branch below it. Regenerate therefore runs for about 30 seconds with zero feedback: the old card just sits there. The shipped app always showed "Writing today's training…" because the generator card rendered above the session card.

**Fix.** In the draft branch, when `generating` is true render the 56px disabled `.working` row plus the 30-second line above `renderSessionCard`, or skip the card entirely and show the skeletons.

### 20. edit 5 `listCard`; call sites in edits 13, 16, 17 and the prose rewrites in 18 and 19

Reviewer: Monday-morning regression risk: harness contract, DOM vocabulary, class sync, edit order, screen inventory

**Problem.** `listCard` returns `null` when every row is falsy, and every call site is a bare `APP.append(listCard(...))`. `Element.append(null)` performs a WebIDL DOMString conversion and inserts a text node reading "null". Live wherever a group can be empty: no proposed sets, no library search matches, no thin roles, no never-used sets.

**Fix.** Add a guard helper, `function add(n){ if (n) APP.append(n); }`, and route every `APP.append` through it. `openSheet` already does exactly this check on its body array; the view layer does not. The stub's `append` pushes null into an array without complaint, so no test can see it.

### 21. edits 18 and 19, `risk` fields

Reviewer: Monday-morning regression risk: harness contract, DOM vocabulary, class sync, edit order, screen inventory

**Problem.** Edits 18 and 19 carry no before/after diff for the bodies they replace. The whole of `renderLibrary` and most of `renderInsights` exist only as prose inside the `risk` field ("replace renderLibrary itself with a version that calls setTitle..."). Those are the only two functions that emit `.lrow`, `.lmain` and `.filters`, and edit 24's deletion of stylesheet section 15 is gated on them being gone. A class renamed in CSS whose class the script still writes loses its styling with no test signal at all.

**Fix.** Write both as literal replacements with quoted anchors before applying anything. Then run the gate edit 24 asks for and treat it as a hard blocker, not a reminder: `grep -c 'class:"\(lrow\|lmain\|filters\|hrow\|hdate\|hmain\|htitle\|tabs\)' index.html` must return 0.

### 22. edit 12 `askClosePool`

Reviewer: Monday-morning regression risk: harness contract, DOM vocabulary, class sync, edit order, screen inventory

**Problem.** "Mark done and close" runs `poolState = null; markStatus(sk, "done"); view.name = "today";`. `markStatus` opens with `if (!sk.id) return;`, so for an unsaved draft (generated offline, or a save that failed) it returns without ever calling `render()`. `poolState` is already null so `tick()` bails, and the coach is left on a frozen pool overlay with a dead clock.

**Fix.** Call `leavePool()` after `markStatus`, or make the handler `if (!sk.id){ leavePool(); toast("Not saved yet, so there is nothing to mark."); return; }`.

### 23. edit 12 `renderPool` current-block loop

Reviewer: Monday-morning regression risk: harness contract, DOM vocabulary, class sync, edit order, screen inventory

**Problem.** The current block is `the first in poolOrder whose done is falsy`, and `poolOrder` puts `warmBlock(sk)` at index 0. On entering pool view the only card at the 48px call size is "Easy swim, own pace", and the first real set is collapsed to `--p-collapsed` (28px) below roughly 320px of clock, goal and expanded warm-up. He has to tick the warm-up before the set he is about to call becomes legible, which is the one thing the 48px budget exists for.

**Fix.** Skip the warm-up when choosing the current block: start the search at index 1 and only fall back to index 0 if every set is done. Or keep the warm-up permanently collapsed, since it has no reps to shout.

### 24. edit 14 `blockCard`, the `.blkact` row

Reviewer: Monday-morning regression risk: harness contract, DOM vocabulary, class sync, edit order, screen inventory

**Problem.** The new "Adjust reps" row drops both guards the old rep buttons had (`editable && !sk.saved`), keeping only `b.item && b.item.reps`. It therefore appears on the read-only History session screen, where `nudge` rewrites `rendered_text`, `distance_m`, `planned_total_m`, `planned_minutes` and sets `sk.saved = false` on `view.session`. That screen renders no Save row (`editable` is false), so the screen now shows numbers the database does not have, with no way to save and no way to revert short of navigating away.

**Fix.** Gate it on `editable`: `editable && b.item && b.item.reps ? ... : null`. The spec's "available whether or not the session is saved" was about the Today draft, not about historical rows.

## Minors (16)

### 1. #pool .ptop; #pool padding-top

Reviewer: Safari on iOS / installed-PWA implementation review (iOS 26.6, standalone from Home Screen)

**Problem.** `#pool .ptop{ position:sticky; top:0; }` sits inside `#pool`, whose top inset is carried by padding: `padding:calc(env(safe-area-inset-top) + var(--s-4)) ...`. Sticky offsets resolve against the scroll container's padding box, not its content box, so once stuck the clock bar sits at y=0 of the fixed overlay and the safe-area padding scrolls out from under it. It is invisible today only because `apple-mobile-web-app-status-bar-style` is `default`, which makes `safe-area-inset-top` 0 in standalone. It bites the moment section 1.6's "revisit black-translucent after testing on his phone" is acted on, and it bites now if he opens the app in a Safari tab rather than from the Home Screen.

**Fix.** `#pool .ptop{ top:env(safe-area-inset-top); }`, or move the inset off the container: `#pool{ padding-top:0; }` and give the first child a `margin-top`. The first is one declaration and survives a later meta change.

### 2. #pool .ptick:active; .irow.tap:active; input[type=checkbox].sw

Reviewer: Safari on iOS / installed-PWA implementation review (iOS 26.6, standalone from Home Screen)

**Problem.** Press feedback in pool view rests entirely on `:active`, and WebKit on iOS only applies `:active` on touch to elements it considers clickable. `.ptick` is a `<button>` and picks up `cursor:pointer` from the base `button{}` rule, so it should qualify, but its only listeners are `pointerdown`/`pointerup`/`pointercancel` rather than `touchstart`/`touchend`, which is the pairing the heuristic was built around. The clearer gap is `switchRow`, which returns `h("label",{class:"irow tap"}, ...)`, so `.irow.tap:active{ background:var(--fill-4); }` is asking for an active state on a `<label>`. And `--fill-4:rgba(116,116,128,.08)` is 8% grey, which is close to no feedback even when it does fire.

**Fix.** Add a no-op passive listener once, inside `renderPool`, which is enough to arm the heuristic for the whole subtree: `pool.addEventListener("touchstart", function(){}, { passive:true });`. Bump the row press to `var(--fill-3)` (12%). This one has to be confirmed on his phone, since it is the only tap confirmation the app has.

### 3. @media (prefers-contrast: more), (prefers-contrast: high), (prefers-reduced-transparency: reduce)

Reviewer: Safari on iOS / installed-PWA implementation review (iOS 26.6, standalone from Home Screen)

**Problem.** Half of the accessibility query is dead on Safari. In `@media (prefers-contrast: more), (prefers-contrast: high), (prefers-reduced-transparency: reduce)`, `high` is not a valid `prefers-contrast` value (the set is `no-preference | more | less | custom`) and `prefers-reduced-transparency` is not implemented by Safari at all. Unknown features and invalid values degrade to `not all` per Media Queries 4, so the block survives, but it reduces to `prefers-contrast: more` on his phone. The practical consequence is worth stating plainly to Vlad rather than leaving in a comment: iOS Reduce Transparency is a real system setting and the app cannot see it, so the glass stays blurry unless he finds the Solid backgrounds switch.

**Fix.** Drop the `(prefers-contrast: high)` branch, keep `(prefers-reduced-transparency: reduce)` for the day WebKit ships it, and make the Settings switch discoverable. Since only two elements carry blur, defaulting `bodyFlags.solid` to on and letting him turn glass on is also defensible.

### 4. button.working::after; @media (prefers-reduced-motion: reduce)

Reviewer: Safari on iOS / installed-PWA implementation review (iOS 26.6, standalone from Home Screen)

**Problem.** Reduced motion removes the only cue during the 30 second generate. `@media (prefers-reduced-motion: reduce){ *,*::before,*::after{ animation-duration:.01ms !important; animation-iteration-count:1 !important; } }` applied to `button.working::after{ ... width:38%; animation:slide 1.1s linear infinite; }` with `@keyframes slide{ from{ transform:translateX(-100%); } to{ transform:translateX(363%); } }` runs the line once in a hundredth of a millisecond and parks it at `translateX(363%)`, outside the `overflow:hidden` button. The result is the disabled button the spec set out to avoid. The `.skel` blocks stay visible, so the screen is not blank, but the moving indicator is gone.

**Fix.** Give the reduced-motion case a static state: `@media (prefers-reduced-motion: reduce){ button.working::after{ animation:none; width:100%; opacity:.5; } }`, placed after the global block so it wins. A full-width static underline reads as "busy" without moving.

### 5. .tnum and seven siblings; button{}

Reviewer: Safari on iOS / installed-PWA implementation review (iOS 26.6, standalone from Home Screen)

**Problem.** Prefix hygiene, both directions. Pointless: `-webkit-font-feature-settings:"tnum"` is paired with `font-feature-settings:"tnum"` and `font-variant-numeric:tabular-nums` in eight places (`.tnum`, `.irow .r-date`, `.strip .val`, `#pool .clock`, `#pool .drift`, `#pool .prest`, `.tile .val`, `.hdate`); the prefix has been unnecessary since Safari 10 and `font-variant-numeric` already does the job, so all three lines are two lines of noise each. Missing: `button` never gets `-webkit-appearance:none`, while `input[type=text],...,textarea{ -webkit-appearance:none; appearance:none; }` does. Correctly kept: `-webkit-backdrop-filter` (unprefixed only from Safari 18), `-webkit-user-select` (unprefixed only from Safari 17), `-webkit-text-size-adjust` (never unprefixed in Safari), `-webkit-tap-highlight-color`.

**Fix.** Delete every `-webkit-font-feature-settings` line and keep `font-variant-numeric`. Add `-webkit-appearance:none; appearance:none;` to the `button{}` block, which is what stops iOS drawing native chrome over a custom background and radius on button-like inputs.

### 6. manifest.webmanifest; edit 1

Reviewer: Safari on iOS / installed-PWA implementation review (iOS 26.6, standalone from Home Screen)

**Problem.** Edit 1 updates `<meta name="theme-color">` to a light/dark pair but nothing touches `manifest.webmanifest`, which still reads `"background_color": "#f3f6f8"` and `"theme_color": "#0284c7"`. `background_color` is what iOS paints for the launch screen, so a dark-mode user gets a light grey flash on every cold start of an otherwise `#000000` app. Worse for the rollout: iOS reads the manifest at install time and does not re-read it for an already-installed Home Screen app, so on his phone the change will not appear at all until he removes and re-adds the app. Note the service worker is fine here, `sw.js` is network-first for navigations so the new `index.html` will arrive on its own.

**Fix.** Set `"background_color": "#ffffff"` (or `#f2f2f7` to match the light grouped background) and `"theme_color": "#f2f2f7"`, bump `CACHE_NAME` in `sw.js` from `ws-training-v1` to `v2` so the cached manifest and `config.js` are dropped, and tell Vlad to delete the Home Screen icon and re-add it once after this ships.

### 7. Stylesheet section 4, first @media query list

Reviewer: Accessibility and legibility only: can a coach with wet hands read and hit this at 70 cm in a 5,000 lux hall, and is dark mode genuinely readable rather than inverted greys. All ratios below are WCAG 2.x relative luminance, computed (alpha-composited where the token is rgba), not estimated. Every ratio the spec itself claims was re-derived and all 32 are exact; every failure below is a pair the spec never checked.

**Problem.** `(prefers-contrast: high)` in the accessibility block is not a valid value for that feature — the defined set is no-preference, more, less and custom. It parses as an unknown feature value, evaluates permanently false, and is dead weight in a comma-separated list. Harmless today, but it reads as a second safety net for the iOS Increase Contrast setting when there is only one (`more`), which is part of why the dark fixup block was written to match only `more` and the reduced-transparency case slipped through.

**Fix.** Delete `(prefers-contrast: high)`. Safari maps iOS Increase Contrast to `prefers-contrast: more`, which is already listed.

### 8. Stylesheet section 8 `.stepper` gap; askReps() and askClaude() inline row gaps

Reviewer: Accessibility and legibility only: can a coach with wet hands read and hit this at 70 cm in a 5,000 lux hall, and is dark mode genuinely readable rather than inverted greys. All ratios below are WCAG 2.x relative luminance, computed (alpha-composited where the token is rgba), not estimated. Every ratio the spec itself claims was re-derived and all 32 are exact; every failure below is a pair the spec never checked.

**Problem.** Stepper and counter pairs sit closer than the spec's own 24px minimum for two targets that do different things. `.stepper{ gap:var(--s-2) }` puts the Settings minus and plus 8px apart at 44px each, and both `askReps` and `askClaude` use `style:{gap:"16px"}` between their minus and plus. These are opposite-direction adjustments to a number, so a miss silently moves the value the wrong way; in askReps that changes session metres, and the only confirmation is the metre total re-rendering in the same sheet.

**Fix.** Set `.stepper{ gap:var(--s-6); }` (24px) and change both inline gaps to 24px. In `.stepper` the row has room: label flexes, and 2x44 + 24 + a 3.5em value column fits 358px. Consider also putting the minus and plus at opposite ends of the row rather than adjacent, which is what iOS Settings does for exactly this reason.

### 9. Stylesheet section 7, `button.primary` border-color, evaluated against --bg-grouped in dark

Reviewer: Accessibility and legibility only: can a coach with wet hands read and hit this at 70 cm in a 5,000 lux hall, and is dark mode genuinely readable rather than inverted greys. All ratios below are WCAG 2.x relative luminance, computed (alpha-composited where the token is rgba), not estimated. Every ratio the spec itself claims was re-derived and all 32 are exact; every failure below is a pair the spec never checked.

**Problem.** `button.primary` in dark mode has no perceivable boundary against the page. `background:var(--accent-fill)` = #0c5c86 with `border-color:var(--accent-fill)`, sitting on `--bg-grouped:#000000` because the 56px primary buttons are appended straight to APP. Computed 2.89:1, just under the 3:1 that 1.4.11 asks for a control boundary. The white label is 7.26:1 so the button is still findable as text, which is why this is minor rather than major, but it is the largest and most important control in the app (Generate today's training, Start pool view) and the fix is one declaration.

**Fix.** Give the primary button a boundary that does not depend on its fill: add to the dark block `--accent-edge:#3b6d87` and set `button.primary{ border-color:var(--accent-edge); }` (that computes to 5.6:1 against #000000 and stays subtle against the fill). In light, --accent-fill #075985 on --bg-grouped #f2f2f7 is already 6.9:1, so light needs no change.

### 10. Stylesheet section 12, `.toast` and `.toast.pool`

Reviewer: Accessibility and legibility only: can a coach with wet hands read and hit this at 70 cm in a 5,000 lux hall, and is dark mode genuinely readable rather than inverted greys. All ratios below are WCAG 2.x relative luminance, computed (alpha-composited where the token is rgba), not estimated. Every ratio the spec itself claims was re-derived and all 32 are exact; every failure below is a pair the spec never checked.

**Problem.** The toast can eat the tap it is reporting on. `.toast` sets no `pointer-events:none`, and `.toast.pool{ z-index:var(--z-pool-toast); bottom:calc(env(safe-area-inset-bottom) + 96px); }` = z-index 210 against `#pool` at 200. With `#pool` padding-bottom of inset+46px and a 76px `.pfoot` button, the footer occupies roughly inset+46 to inset+122 when scrolled to the end, while the toast spans about inset+96 to inset+146. They overlap, so for the 2.6 seconds after tapping Copy the toast confirming the copy sits on top of the Copy button and swallows a second tap. Separately, `.toast.pool` uses literal `background:#fff; color:#000`, and because it is appended to document.body it does not inherit `--p-ink`/`--p-paper` from `#pool`, so in Night pool mode the deck is white-on-black and the toast alone stays black-on-white. Both readable at 21:1, but the register flips.

**Fix.** Add `pointer-events:none` to `.toast` — it carries no controls in either register, so nothing is lost. Raise `.toast.pool` to `bottom:calc(env(safe-area-inset-bottom) + 150px)` to clear the 76px footer. For the night case, drive the pool toast from the register variables by defining `--p-ink`/`--p-paper` fallbacks on `:root` and using `.toast.pool{ background:var(--p-paper,#fff); color:var(--p-ink,#000); border-color:var(--p-ink,#000); }`, then set the same two variables on `body.nightpool` when the switch is on.

### 11. Stylesheet sections 2 and 3, --accent-line, --good-line, --warn-line, --bad-line, and the '3:1 non text' comment in spec section 1.2

Reviewer: Accessibility and legibility only: can a coach with wet hands read and hit this at 70 cm in a 5,000 lux hall, and is dark mode genuinely readable rather than inverted greys. All ratios below are WCAG 2.x relative luminance, computed (alpha-composited where the token is rgba), not estimated. Every ratio the spec itself claims was re-derived and all 32 are exact; every failure below is a pair the spec never checked.

**Problem.** The four `-line` tokens are specified as "border on a tinted surface, 3:1 non text" but none of them reach 3:1 against the tint they are drawn on. Computed light: --accent-line #9ecfea on --accent-tint #e0f2fe = 1.46:1; --good-line #8fd0a6 on #dcfce7 = 1.63:1; --warn-line #e3b478 on #fff7ed = 1.79:1; --bad-line #e8a3a3 on #fef2f2 = 1.88:1. This is not a WCAG failure, because a banner border is decoration and the tint plus the text carry the message, so no requirement is breached. But the stated 3:1 justification is wrong, and at 1.5:1 through pool-hall glare these borders are simply not visible, so they cost a token each and buy nothing. Worth correcting because the same comment style is what made the sep-opaque input border look justified.

**Fix.** Either drop the 3:1 claim from the comment and label these honestly as decorative separation, or darken them to earn it. Values that do clear 3:1 against their tints while staying subtle: --accent-line #4a90b8 (3.1:1 on #e0f2fe), --good-line #4f9c6d (3.2:1 on #dcfce7), --warn-line #a97a35 (3.1:1 on #fff7ed), --bad-line #c26a6a (3.0:1 on #fef2f2). Cheap either way; the important thing is that the comment stop asserting a ratio that was never computed.

### 12. stylesheet section 10 `.strip` vs section 12 `.banner.strip`

Reviewer: Monday-morning regression risk: harness contract, DOM vocabulary, class sync, edit order, screen inventory

**Problem.** The offline banner emits `class="banner warn strip"` and the stylesheet defines both `.banner.strip` (section 12) and `.strip` (section 10, the stat strip). `.strip` at (0,1,0) contributes `display:flex`, `box-shadow:var(--shadow-card)` and `overflow:hidden` that `.banner.strip` never overrides, so the offline line gets a card shadow and an overflow clip it was not meant to have.

**Fix.** Rename the edge-to-edge banner modifier to `.banner.edge` and update the one emitter in edit 7.

### 13. index.html:1896 (renderLibrary, proposed sets), against edit 2

Reviewer: Monday-morning regression risk: harness contract, DOM vocabulary, class sync, edit order, screen inventory

**Problem.** Edit 2 deletes `--accent-ink`, but `index.html:1896` still reads `h("div",{class:"small",style:{color:"var(--accent-ink)"}}, x.cue)`. It is the only `var(--)` reference inside the engine script. An undefined custom property makes the declaration invalid at computed-value time, so the Claude-suggests cue silently loses its colour for the fifteen edits between 2 and 18.

**Fix.** Change that one inline style to `var(--accent-text)` in edit 2's commit, not in edit 18.

### 14. edit 4 static sheet markup; edit 12 `armTick`

Reviewer: Monday-morning regression risk: harness contract, DOM vocabulary, class sync, edit order, screen inventory

**Problem.** `#sheet` carries `role="dialog" aria-modal="true"` permanently in the static HTML, whether the sheet is open or closed. A live `aria-modal="true"` node makes VoiceOver treat the rest of the document as inert, and `transform:translateY(100%)` removes it from view but not from the accessibility tree. Separately, `armTick` listens only for pointer and keydown events, so a VoiceOver double-tap (which dispatches `click`, and synthesises pointer events with near-zero dwell that the `dwell < 40` gate rejects) cannot tick a block at all, which makes the `aria-pressed` work in section 9.9 unreachable.

**Fix.** Set `aria-hidden="true"` on `#sheet` in `closeSheet` and remove it in `openSheet` (setAttribute is on the allowlist; there is no removeAttribute, so use `aria-hidden="false"`). Add a `click` listener on the tick strip that bypasses the wet-finger gate when `e.detail === 0`, the standard assistive-tech signature.

### 15. edit 20 `stepRow`

Reviewer: Monday-morning regression risk: harness contract, DOM vocabulary, class sync, edit order, screen inventory

**Problem.** `stepRow`'s `bump` calls `mutate(...)` on every single tap of `−` or `+`. `mutate` awaits the write then runs `loadAll()`, which is five queries plus the full paged `tr_exercises` table plus `tr_session_items` for forty sessions, then `render()`. Five taps on "Main block, most metres" is five full reloads. The old `settingRow` wrote once on `change`.

**Fix.** Update `val.textContent` and `data.settings[key]` immediately, and debounce the write: `clearTimeout(t); t = setTimeout(save, 700);`. Or pass `mutate`'s existing `quiet` flag and skip the reload.

### 16. edits 17, 18, 19, 21 against index.html:1667, 1794, 1798, 1848, 1579, 2004

Reviewer: Monday-morning regression risk: harness contract, DOM vocabulary, class sync, edit order, screen inventory

**Problem.** Screen-inventory items dropped with no note anywhere in the spec, stylesheet or edit list: the coach `display_name` and the Claude/library badge from History rows (index.html:1794, 1798); the entire library focus filter, while `lib.focus` is still initialised at line 252 and still read by the row filter, so it is dead state controlling a filter nothing can set; the library "Nothing matches." empty state (line 1848); "How hard was it? 1 easy, 5 too hard" from the rating row (line 1667), which is the only thing that tells him which end of 1 to 5 is hard; and the "Main body, N blocks" tile. Separately the "six sessions" claim is rewritten on Today but kept verbatim in Insights ("sooner than six sessions"), so the app now contradicts itself on the same fact.

**Fix.** Add the coach name to the History row footnote; add the focus chevron row to `askLibFilter` as section 5.4 point 4 asks, or delete `lib.focus` from the state and the filter; keep the library empty state; keep the 1-to-5 legend as a `.tiny muted` footer under the segmented control; and make the Insights sentence match whichever wording Vlad picks for Today.

## Risk decisions carried by the spec (14)

### 1. Pool type scale overrides the iOS type ladder

The iOS research gives Apple's published Dynamic Type table, topping out at Large Title 34px. The legibility audit derives 48px for the set line and 56px for the clock from angular size at 70 cm: the current 1.85rem gives a cap height of 16.3 arcmin, which is exactly the ISO 9241 hard floor of 16, versus a 20 to 25 preferred band. I measured the consequence: at 48px only 2.4 fully expanded blocks fit the 763 usable px of an iPhone 14 in standalone. Pool view therefore gets its own literal px scale (48/34/30/28/26/20 for call/rest/qualifier/cue/Adv/role, 56 for the clock), weight drops from 800 to 700 because Heavy closes the counters in 0, 6, 8 and 9 above 40px, and index.html:124 (the 560px breakpoint that drops .pline to 1.55rem, only 13.2 arcmin at 70 cm) is deleted outright.

**Implication.** Legibility wins on pool view, explicitly. The Apple ladder applies to the four glass views only. The cost is that the pool layout must collapse every non-current block to 88px, which is a structural change to renderPool, not a restyle.

### 2. Apple's iOS 26 accent hex values are rejected for light mode

The iOS research recommends systemGreen #34C759 and systemRed #FF3B30 verbatim in place of his #15803d and #dc2626. I measured them: #34C759 on white is 2.22:1, which fails even the 3:1 non-text bar, and #FF3B30 on white is 3.55:1. White on #FF3B30 is 3.55:1, so it also fails as a filled button. Apple's values are calibrated for glyph-on-dark and white-on-colour at large sizes, not for 13 to 17px text on white. My replacements, all measured on #ffffff and on #f2f2f7: good #155c33 (8.04 / 7.21), warn #743e00 (8.64 / 7.74), bad #9f1a1a (7.96 / 7.14). Apple-style bright values are used in dark mode only, where they sit on #1c1c1e: #8ce8b2 (11.59), #f5c377 (10.50), #ffada8 (9.56).

**Implication.** The audits disagreed and legibility wins. Separately this exposes a live bug: white on his --accent #0284c7 is 4.10:1, which fails AA for every primary button in the shipped app. The primary fill becomes #075985, which is already in the file as --accent-ink and gives 7.56 both as text on white and as a fill under white.

### 3. 1rem becomes 17px, not 16px

Adopting :root{font:-apple-system-body} to get Dynamic Type for free means WebKit resolves the root font-size from the user's iOS text size setting, which is 17pt at the default Large. Every rem value in the design must therefore be expressed in seventeenths of the Apple point ladder, not sixteenths: Large Title 2rem, Title 2 1.294rem, Headline and Body 1rem, Subhead 0.882rem, Footnote 0.765rem, Caption 1 0.706rem, Caption 2 0.647rem. The font shorthand also overrides family and resets line-height, so body must restore both. Non-WebKit browsers ignore the keyword, the root stays 16px and everything renders about 6% smaller.

**Implication.** Getting this wrong by using sixteenths makes every size 6% too large and silently breaks the tab bar labels and the .hdate column. Two caveats to tell Vlad: -apple-system-body does not update live, so a changed iOS text size takes effect after the PWA is relaunched, and the iOS Bold Text setting exposes no media query and cannot be honoured.

### 4. prefers-reduced-transparency support: the two audits contradict each other

The iOS research cites MDN saying it is not Baseline and unsupported in Safari, with fingerprinting cited as the W3C TAG objection. The legibility audit asserts Safari 17 and later. I did not resolve which is right and I did not want the design to depend on it. The spec ships all three paths: the prefers-reduced-transparency query anyway because it costs nothing and is correct if he ever opens the app in Chrome; prefers-contrast: more and (prefers-contrast: high), which is definitely supported and definitely maps to iOS Settings, Accessibility, Display and Text Size, Increase Contrast; and a Solid backgrounds switch in Settings that sets body.solid, which works regardless. All three resolve to one shared override block: opaque surfaces, no blur, hairlines to --sep-opaque, no shadows.

**Implication.** The reachable path is prefers-contrast plus the in-app switch. If the legibility audit turns out to be right, the query path is a free bonus. If the iOS research is right, nothing is lost. This is the only place I deliberately built a superset rather than picking a side.

### 5. Four tabs, Settings behind a bar button, Pool is not a tab

The inventory left the fifth slot undecided between Pool and Settings. Pool cannot be a tab: it only renders when a draft exists (index.html:1464), and Apple's guidance is not to disable or hide tab buttons, so the tab would be dead most of the time. Settings could be a tab but he touches it a few times a year, and a fifth slot steals thumb width from four he uses weekly. The tab array stays the exact four pairs already at index.html:1471, which is the smallest possible diff on the riskiest structural change. Pool gets two above-the-fold entry points instead: a Pool bar button in the Today top bar whenever a draft exists, and the 56px primary in the session hero card. This also fixes the worst hierarchy failure in the app, where Start pool view sits roughly 1,200px down the Today screen.

**Implication.** My call. If he later wants Settings as a fifth tab it is a one-line change to the static markup plus one CSS flex slot, so the decision is cheap to revisit. The Pool entry points are not cheap to revisit and should be tested on the deck.

### 6. The pool set line splits into call, rest and qualifier

I validated this against the real data rather than trusting the audit. 258 distinct structure strings in supabase-schema.sql, length min 4, median 33, p90 53, max 82, with restText() appended on top at index.html:1736. At 48px a 375px viewport fits 11 to 12 characters, so a p90 line would wrap to four or five lines. The regex /^\s*(\d+\s*[x×]\s*\d+(?:\s*m)?|\d+\s*m)\s*(.*)$/i splits 252 of 258 and correctly declines the other 6 (the '400 m easy swim' shape). Two details the audit missed: real qualifiers begin with punctuation, for example ', 75 m of each' and '- 25 m legs / 25 m swim', so the qualifier must be stripped with /^[\s,;:.\-–—]+/; and the captured call is 2 to 6 non-space characters, p90 and max both 6, so reps by distance alone is guaranteed never to wrap at 48px (worst case about 193px against 311px available on the narrowest iPhone).

**Implication.** This is the finding that makes the large type affordable. It is a render-layer string function using only String.prototype methods, so it is invisible to verify.js and asPlainText is untouched. Promoting a stroke word onto the call line needs a character-width budget check (<= 5.8em), because '3 x 100 m breast' estimates at 7.05em and would overflow. Do not measure the DOM for this: getBoundingClientRect is not available.

### 7. The tick strip replaces the whole-card tap, and armTick is the only real regression risk

index.html:1734 puts onclick on the entire .pblk, which is the largest thing on screen and the thing a wet hand brushes while scrolling. It is replaced by a 104px trailing strip, sized from a measured wet-finger error budget: wet capacitive centroid 3.0 mm, 70 cm targeting 2.0 mm, standing one-handed 1.5 mm, cold fingers 1.0 mm, quadrature sigma 4.03 mm, so 95% needs two times two sigma = 16.1 mm = 102 CSS px. The gate is geometry and timing only: same element for pointerdown and pointerup, movement under 10px, dwell 40 to 1200 ms, e.isPrimary, a 350 ms lockout after any scroll, a 400 ms global cooldown and a 1500 ms per-block cooldown. Contact area and force are not usable: iOS Safari reports PointerEvent width and height as a constant for touch and Touch.force is 0 on non-3D-Touch iPhones.

**Implication.** All of the CSS in this spec is zero-risk to the suite. Every bit of the regression risk sits in this one function. It must stay inside the confirmed allowlist, must guard AudioContext with a typeof check (a bare constructor call throws a ReferenceError at load and takes the whole suite down), and must not reach for requestAnimationFrame or matchMedia. Test it on his phone with wet hands, because nothing else in the plan needs that and this cannot be verified any other way.

### 8. The done state stops being encoded by lightness, and warm-up plus ending become tickable

index.html:116 signals done at #9aa7ae on #f7f9fa, which I measured at 2.34:1, failing even the 3:1 large-text bar, and it is a lightness-only cue so it also fails WCAG 1.4.1. Done blocks still have to be readable because he scrolls back to check what the group did. Replacement: text stays #000, and three redundant non-colour cues carry the state, a filled black circle with a white check at 44px or larger, a 4px line-through on the call only, and a #e8ecef card fill (black on it is 17.68, so it is decoration and never the signal). Separately, the collapse-all-but-current layout needs a current-block pointer, defined as the first block in [warm-up, ...blocks, endBlock] whose done is falsy. I checked the data path: the warm-up IS a real tr_session_items row with a done column (blocksToItems:1259), but hydrate at index.html:1315 finds it and throws it away except for the minutes.

**Implication.** hydrate must start carrying warmItemId and warmDone. hydrate is not exported and not asserted by verify.js, so this is safe, but it is an engine change rather than a view change and belongs in the correctness commit, not the pool commit.

### 9. Two shipped bugs must be fixed before the screens that display them are restyled

First, retired sets still appear in the Library. toggleActive at index.html:1911 sets active:false and leaves status alone, while the row filter at 1840 to 1846 checks only status, so a retired set keeps appearing, looks identical to an active one and still offers a Retire button. Three counts he uses to judge library health also count by status only and therefore overstate the active pool: the header badge at 1881, the Insights Library tile at 1986 and the never-used denominator at 2020. roleCounts at 1851 and thinRoles at 1959 already exclude active === false, which is what makes the inconsistency provable. Second, the Regenerate dead end: the alert at 1156 says 'Use Regenerate if you want a new one', opts(replace) exists at 1530, and replace:true is produced nowhere in the file. There is no UI path to replace a saved session.

**Implication.** Both go in commit 2, before any restyling, because a grouped inset list that displays a wrong count is worse than an ugly one that displays a wrong count. Regenerate is a missing feature the existing copy already promises, so adding it is cheaper than rewriting the copy.

### 10. Only two glass elements, and cards are opaque

backdrop-filter on a position:fixed element makes the browser repaint the blurred region on every scroll frame, each instance is a separate GPU blur pass, and blur above roughly 10px can drop frames on mobile. The budget is therefore the fixed top bar and the fixed tab bar, nothing else: no glass on cards, rows, tiles, badges, banners, sheets, or on any scrolling container. Blur stays at 20px with saturate(180%) and drops to 14px if he reports lag. No will-change:backdrop-filter, because it forces a permanent extra layer. Also: no overflow:hidden on the same element as backdrop-filter, and backdrop-filter breaks on a sticky element when an ancestor has both overflow and border-radius.

**Implication.** This will not look like the glass-everywhere marketing shots, and it should be set as an expectation with Vlad up front, along with the fact that Safari cannot do Liquid Glass refraction at all: SVG filters in backdrop-filter are a no-op there, so displacement mapping and borrowed liquid-glass libraries buy nothing. The honest target is blur plus saturate plus layered alpha plus a bright inset rim and a dark outer edge.

### 11. Pool view is pinned to light and cut loose from the token system

index.html:113 currently borrows var(--bad) for the behind-schedule clock and #pool button at 121 inherits the global button rule, so a dark-mode override would silently change both under him. The spec hard-codes #pool with background #fff, color #000, color-scheme:light, its own --p-* literals, and #pool *{backdrop-filter:none !important} as a guard. The lateness cue stops being red: --bad #dc2626 is 4.83 nominal, collapses under glare, and colour alone fails WCAG 1.4.1. It becomes a signed drift number in words ('on time', '+4 min', '6 min behind') that inverts to white on a solid black pill past 5 minutes, because inversion is the only state change that still reads at several metres.

**Implication.** Dark mode is a property of four views, not five. The reasoning is physical, not aesthetic: a large light field constricts the pupil which lifts effective acuity, and water droplets on a dark screen each scatter as a bright point against black. Offer a manual Night pool switch, off by default, never automatic, and confirm the decision with him rather than assuming it.

### 12. verify.js passes a completely broken UI, so it must be extended first

The harness calls no render function at all. Its eleven entry points are pure logic and it inspects only plain objects plus one string. Gutting renderToday, renderSessionCard, renderHistory, renderLibrary, renderInsights, renderPool and blockCard to empty bodies still prints 'All checks passed'. Worse, a deliberate throw as the first statement of render() also passes, because render() is only reached through the async boot() and verify.js runs straight from vm.runInContext to process.exit with no tick boundary, so the rejected promise is never surfaced. The fix is two edits in verify.js only, both of which pass against the unmodified index.html today: a smoke test using the already-exported renderCard and clearApp hooks, and an extended fakeEl with a real classList backed by className, a dataset object, and a style with setProperty and removeProperty.

**Implication.** Land this as commit 1, alone, before touching index.html. It costs nothing today, it turns 'the numbers are right' into 'the numbers are right and both cards paint', and it lifts the classList, dataset and setProperty ban across the whole engine including the top level. Keep querySelector returning null and querySelectorAll returning [], because that is what makes a bogus element lookup fail loudly.

### 13. Element ids and CSS class renames are the bug class the harness cannot see

doc.getElementById at verify.js:217 returns a fresh fakeEl on every call, so it is never null and never identical to itself: getElementById('app') === getElementById('app') is false and getElementById('nope') === null is false. Renaming <div id="app"> without updating index.html:173 passes the suite and dies in the real app at clear(null). The same blindness covers class renames: a selector renamed in CSS only, whose class the script still emits, silently loses its styling with no test signal. Two specific sync traps: index.html:1734 emits 'pblk' + (b.done ? ' done' : '') while togglePool at 1760 rebuilds that exact string independently, and tick() at 1711 rebuilds 'clock' + ... from scratch, wiping any other class on the element.

**Implication.** Commit 4, the shell, is where this bites, because it is the commit that adds new ids and moves the header. Hand-check every getElementById string against the static HTML and open the app in a real browser before committing. Do not trust a green suite on that commit.

### 14. One user-visible sentence describes behaviour that does not exist

index.html:1671 reads 'Two 5s in a row and the next session drops 100 m. Two 1s and it goes up.' I traced difficulty_rating through the whole file: it is written at 1682, displayed at 1661 and 1797, and read by nothing. main_min_m and main_max_m are only ever read at line 776 inside buildSkeleton, with no reference to any rating. There is no adaptive volume in the app. Separately, the empty-state promise at 1553 that a set never repeats inside six sessions is not literally true either, because effectiveWindow at 543 to 546 shrinks the window to half the role pool size.

**Implication.** Two copy decisions for Vlad, not design decisions. My recommendation is to change both strings rather than build the features, because adaptive volume is a coaching-model choice and the redesign should not smuggle one in. Suggested replacement for the first: 'The rating is saved with the session so you can see later which ones were too hard.'

