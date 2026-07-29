# Win and Swim Training Generator: iOS Restructure Design Specification

Version 1.0, 29 July 2026. Target: iOS 26.6 Liquid Glass, forward compatible with iOS 27.
Baseline held throughout: `node verify.js` ends `All checks passed. 2400 simulated sessions, 147 library sets.` (confirmed on the untouched file).

Every colour value below was computed with the WCAG 2.x relative luminance formula against every background it can land on. Ratios in parentheses are measured, not estimated. Where a number is my judgement I say so and give the reason.

---

## 0. The one-paragraph version

Two registers, one file. Four views (today, library, insights, history) become a native iOS 26 app: one glass top bar, one glass tab bar, opaque grouped inset lists on a grouped background, sheets for anything that used to be a select or a browser dialog, full dark mode from `prefers-color-scheme`. Pool view becomes the opposite of a design system: literal black on literal white, 48px set lines, a 56px clock, a 104px tick strip, no tab bar, no glass, no theme, no tokens. The tokens below are split into three groups for exactly that reason: shared structure, themed surfaces (four views only), and pool literals (never themed).

---

## 1. Design tokens

Replaces `index.html` lines 16 to 21 entirely. Everything that is currently a hard-coded hex inside a rule (`#fff` at line 52, `#eef3f6` at 40, 76, 105, `#e9eef1` at 45, `#f5f8fa` at 87, `#f7fafb` at 95, `#f3c2c2`, `#fcd9a8`, `#b7e4c3`, `#bae0f5`, and the inline `#f5f8fa` at 1502) becomes a token reference.

### 1.1 Structure tokens, mode independent

```css
:root{
  color-scheme: light dark;

  /* radii. Concentric: inner = outer minus the gap, floored at 0. */
  --r-sheet:20px; --r-card:14px; --r-inner:10px; --r-ctl:11px; --r-pill:999px;
  --r-pool:16px;

  /* spacing rhythm, 8px base with 4px half steps */
  --s-1:4px; --s-2:8px; --s-3:12px; --s-4:16px; --s-5:20px; --s-6:24px; --s-8:32px;
  --gutter:16px;                 /* one alignment column for title, lists, cards */
  --group-gap:28px;              /* between two grouped inset lists */

  /* control sizes. 44px is the floor in the four views, never the target. */
  --ctl-h:44px;                  /* every tappable control, minimum */
  --ctl-h-lg:56px;               /* the one primary action on a screen */
  --row-h:44px;                  /* grouped list row, minimum */
  --tabbar-h:49px;
  --topbar-h:44px;               /* compact top bar, after the large title collapses */

  /* pool register sizes, see section 2.3 */
  --pool-scale:1;
  --pool-target:104px;           /* state changing target, wet finger */
  --pool-target-sm:76px;         /* reversible pool control */

  /* z layers, one table, no ad hoc numbers */
  --z-content:0; --z-topbar:30; --z-tabbar:40; --z-scrim:60; --z-sheet:61;
  --z-toast:100; --z-pool:200; --z-pool-toast:210;

  /* motion */
  --dur-fast:120ms; --dur-mid:250ms; --dur-sheet:340ms;
  --ease-out:cubic-bezier(.2,.8,.3,1);
  --ease-sheet:cubic-bezier(.32,.72,0,1);
}
```

### 1.2 Themed surface tokens, light

```css
:root{
  /* backgrounds by elevation */
  --bg-grouped:#f2f2f7;        /* the page behind everything */
  --bg-card:#ffffff;           /* elevation 1: cards, list cards, sheets' rows */
  --bg-nested:#f2f2f7;         /* elevation 2: a fill inside a card */
  --bg-sheet:#f2f2f7;          /* a sheet is a grouped background of its own */

  /* label hierarchy. All three measured on #ffffff AND on #f2f2f7. */
  --label:#13212b;             /* 16.40 on card, 14.70 on grouped */
  --label-2:#414e58;           /* 8.55 / 7.66, clears AAA on both */
  --label-3:#636f7b;           /* 5.13 / 4.60, placeholders and decoration only */

  /* separators */
  --sep:rgba(60,60,67,.29);    /* hairline, flattens to #c6c6c8 */
  --sep-opaque:#c6c6c8;

  /* fills, Apple's semi transparent grey ladder, safe over glass */
  --fill-1:rgba(120,120,128,.20);
  --fill-2:rgba(120,120,128,.16);
  --fill-3:rgba(118,118,128,.12);
  --fill-4:rgba(116,116,128,.08);

  /* accent. His brand blue is kept, but split by job. */
  --accent:#0284c7;            /* FILLS AND GLYPHS ONLY. 4.10 with white, never text. */
  --accent-text:#075985;       /* 7.56 on white, 7.32 on light glass */
  --accent-fill:#075985;       /* white on it is 7.56, so it is the primary button */
  --accent-tint:#e0f2fe;       /* goal box, info banner, selected segment */
  --accent-line:#9ecfea;       /* decoration on a tinted surface. NOT 3:1: on
                                  --accent-tint it measures 1.46, so it can never
                                  be the boundary that identifies a control. */

  /* semantic. All three clear 7:1 on card and on grouped. */
  --good:#155c33;              /* 8.04 / 7.21, white on it 8.04 */
  --good-tint:#dcfce7; --good-line:#8fd0a6;
  --warn:#743e00;              /* 8.64 / 7.74 */
  --warn-tint:#fff7ed; --warn-line:#e3b478;
  --bad:#9f1a1a;               /* 7.96 / 7.14 */
  --bad-tint:#fef2f2; --bad-line:#e8a3a3;

  /* glass material, the functional layer */
  --glass-fill:rgba(255,255,255,.72);
  --glass-rim:rgba(255,255,255,.70);      /* inset top: the specular highlight */
  --glass-edge:rgba(0,0,0,.10);           /* 1px outer: the iOS 27 darkened edge */
  --glass-drop:0 6px 20px rgba(0,0,0,.10), 0 1px 2px rgba(0,0,0,.06);
  --glass-blur:20px;
  --glass-flat:#fbfbfd;                   /* the same fill flattened, for the no-blur path */

  --scrim:rgba(0,0,0,.40);
  --shadow-card:0 1px 2px rgba(16,42,58,.05);
  --focus-ring:#0284c7;
}
```

### 1.3 Themed surface tokens, dark

Note the inversion that trips people up: the grouped background is lighter than the card in light mode and darker than the card in dark mode.

```css
@media (prefers-color-scheme: dark){
  :root{
    --bg-grouped:#000000;
    --bg-card:#1c1c1e;
    --bg-nested:#2c2c2e;
    --bg-sheet:#1c1c1e;

    --label:#ffffff;             /* 17.01 on card, 21.00 on grouped */
    --label-2:#b0b9c1;           /* 8.55 card, 7.01 nested, 10.56 grouped */
    --label-3:#949ea8;           /* 6.25 / 5.12 */

    --sep:rgba(84,84,88,.65);
    --sep-opaque:#404044;

    --fill-1:rgba(120,120,128,.36);
    --fill-2:rgba(120,120,128,.32);
    --fill-3:rgba(118,118,128,.24);
    --fill-4:rgba(118,118,128,.18);

    --accent:#5cc4f5;            /* glyphs and text both: 8.64 card, 7.08 nested */
    --accent-text:#5cc4f5;
    --accent-fill:#0c5c86;       /* white on it is 7.26 */
    --accent-tint:#213844;       /* #38b6f0 at 18% over #1c1c1e */
    --accent-line:#3b6d87;

    --good:#8ce8b2;              /* 11.59 card, 9.49 nested */
    --good-tint:#2e4037; --good-line:#4c7a5e;
    --warn:#f5c377;              /* 10.50 / 8.60 */
    --warn-tint:#42382b; --warn-line:#7d6640;
    --bad:#ffada8;               /* 9.56 / 7.83 */
    --bad-tint:#453434; --bad-line:#8a5b58;

    --glass-fill:rgba(28,28,30,.72);
    --glass-rim:rgba(255,255,255,.16);
    --glass-edge:rgba(0,0,0,.60);
    --glass-drop:0 6px 20px rgba(0,0,0,.50), 0 1px 2px rgba(0,0,0,.35);
    --glass-flat:#141416;

    --scrim:rgba(0,0,0,.60);
    --shadow-card:none;          /* dark mode separates by fill, not by shadow */
    --focus-ring:#5cc4f5;
  }
}
```

### 1.4 Accessibility override blocks

One override set serves both the contrast request and the transparency request, because both resolve to the same thing: opaque surfaces, harder edges, no shadows.

```css
@media (prefers-contrast: more), (prefers-contrast: high), (prefers-reduced-transparency: reduce){
  :root{
    --label:#000000; --label-2:#2b343c; --label-3:#4a545e;
    --sep:var(--sep-opaque);
    --glass-fill:var(--glass-flat); --glass-blur:0px; --glass-edge:var(--sep-opaque);
    --shadow-card:none; --glass-drop:none;
    --scrim:rgba(0,0,0,.70);
  }
}
@media (prefers-color-scheme: dark) and (prefers-contrast: more){
  :root{ --label:#ffffff; --label-2:#dfe4e8; --label-3:#b9c1c8; }
}
/* reachable regardless of query support: a switch in Settings sets body.solid */
body.solid .glass{ background:var(--glass-flat); backdrop-filter:none; -webkit-backdrop-filter:none; }
body.solid .card, body.solid .list-card{ box-shadow:none; }

@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{
    transition-duration:.01ms !important; animation-duration:.01ms !important;
    animation-iteration-count:1 !important; scroll-behavior:auto !important;
  }
}
```

### 1.5 Pool register literals, never themed

These are not tokens in the themed sense. They live under `#pool` and use literal values so that no dark mode, no contrast query and no user switch can reach them.

```css
#pool{
  color-scheme: light;                /* keeps UA scrollbars and controls light inside */
  --p-ink:#000; --p-paper:#fff;
  --p-done-fill:#e8ecef;             /* black on it is 17.68, decoration only */
  --p-behind-ink:#fff; --p-behind-fill:#000;   /* the late state inverts, it does not go red */
  --p-call:calc(48px * var(--pool-scale));
  --p-rest:calc(34px * var(--pool-scale));
  --p-qual:calc(30px * var(--pool-scale));
  --p-cue:calc(28px * var(--pool-scale));
  --p-adv:calc(26px * var(--pool-scale));
  --p-role:calc(20px * var(--pool-scale));
  --p-clock:calc(56px * var(--pool-scale));
  --p-drift:calc(28px * var(--pool-scale));
  --p-collapsed:calc(28px * var(--pool-scale));
  --p-border:3px;
}
#pool.big{ --pool-scale:1.2; }        /* the two step size control, className only */
#pool *{ backdrop-filter:none !important; -webkit-backdrop-filter:none !important; }
```

`#pool` no longer references `var(--bad)` (today at line 113), because a dark mode override would silently change the late-clock colour under him.

### 1.6 Meta tags

```html
<meta name="theme-color" content="#f2f2f7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
```
`viewport` at line 5 stays exactly as it is. It has no `maximum-scale` and no `user-scalable=no`, which is correct, and neither must ever be added.

I am deliberately keeping `status-bar-style` on `default` rather than moving to `black-translucent`. Reason, and it is my judgement: `black-translucent` means the app owns the top inset and any mistake there puts the clock over his large title on the pool deck, and there are reports of `safe-area-inset-top` reading 0 in standalone that I could not verify on his phone. `default` keeps the status bar outside the web view and costs only that the status bar tracks the system rather than the app. Revisit after testing on his actual iPhone.

---

## 2. The two registers, stated plainly

### 2.1 Glass register: today, library, insights, history, settings, login

- Content is opaque. Cards, list cards, rows, tiles, badges, banners and sheets all sit on `--bg-card` or `--bg-grouped`. None of them carry `backdrop-filter`.
- Exactly two elements on screen carry glass: the fixed top bar and the fixed tab bar. That is the whole budget. `backdrop-filter` on a `position:fixed` element forces the browser to repaint the blurred region every scroll frame, so a third one buys jank on his phone and buys nothing visually.
- Glass recipe, applied only to `.glass`:

```css
.glass{
  background:var(--glass-fill);
  -webkit-backdrop-filter:blur(var(--glass-blur)) saturate(180%);
  backdrop-filter:blur(var(--glass-blur)) saturate(180%);
  border:0; border-bottom:1px solid var(--glass-edge);
  box-shadow:inset 0 1px 0 0 var(--glass-rim), var(--glass-drop);
}
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){
  .glass{ background:var(--glass-flat); }
}
```
The inset top line is the specular highlight. The 1px outer line is the iOS 27 darkened edge. Refraction is not attempted: Safari does not allow SVG filters in `backdrop-filter`, so displacement mapping is a no-op there. Tell Vlad up front that it will read as iOS frosted glass, not as the refractive lens on the iOS 27 lock screen.

### 2.2 Hard contrast register: pool view only

Opaque, heavy bordered, huge typed, maximum contrast. Every foreground is `#000`, every background is `#fff`. No grey carries information anywhere in pool view.

### 2.3 Exactly which tokens differ, and why

| Token | Glass register | Pool register | Why |
|---|---|---|---|
| Surface | `--bg-grouped` / `--bg-card`, themed | literal `#fff` | A wet screen in a 5,000 lux hall raises effective screen reflectance to roughly 12%. Modelling veiling glare as `(L_light + L_v)/(L_dark + L_v)`, a nominal 21:1 pair delivers 4.14:1 in that environment and a nominal 7:1 pair delivers 3.15:1. AAA is the floor, not the target, so the only surface that survives is pure white. |
| Foreground | `--label` / `--label-2` / `--label-3`, three levels | literal `#000`, one level | There is no contrast budget left to spend on a secondary grey. Any grey in pool view is a grey he cannot read. |
| Body type | 17px, the iOS ladder | 48px call, 34px rest, 30px qualifier, 28px cue, 26px Adv, 20px role | Angular size at 70 cm. Cap height in arcmin: current 29.6px gives 16.3, which is exactly the ISO 9241 hard floor of 16. 48px gives 26.4, inside the 20 to 25 preferred band with margin, and still 18.5 at the 100 cm bench distance. |
| Borders | 1px hairline at `--sep` | 3px solid `#000` | A 1px hairline is gone at 70 cm through glare. Also never dashed: dashes at 3px disappear at that distance. |
| Radius | 14px card, 10px inner | 16px | Larger radius to compensate for the 3px border reading tighter. Cosmetic. |
| Tap target | 44px floor, 56px for the one primary | 104px for state changing, 76px for reversible, 64px absolute floor | Wet finger error budget, section 6.10. |
| Dark mode | follows `prefers-color-scheme` | never | A large light field constricts the pupil, which lifts effective acuity, and it matters more for a presbyopic eye. Water droplets on a dark screen each scatter as a bright point against black, which is worse than droplets on white. A manual "Night pool" switch is offered in Settings, off by default, never automatic. |
| Glass | two fixed bars | banned by `#pool *{backdrop-filter:none !important}` | A hard guard so no future rule can leak the wrong register onto the deck. |
| Dynamic Type | follows the system | fixed px, plus a two step Normal / Bigger switch | An AX5 setting would multiply a 48px call past 100px and leave less than one block on screen. |
| Tab bar | present | absent | Pool view is a modal full screen task. The bar would cost about 83px of a 763px budget and put a wet thumb one stray tap from leaving the deck view mid set. |
| Motion | transitions per section 5 | none except the tick strip inversion | Nothing may move next to a value he is reading at 70 cm. |

---

## 3. Type scale

### 3.1 Root

```css
:root{ font: -apple-system-body; }   /* WebKit resolves family AND size from Dynamic Type */
body{
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  font-size:1rem; line-height:1.294;
  background:var(--bg-grouped); color:var(--label);
  -webkit-text-size-adjust:100%;
  -webkit-tap-highlight-color:transparent;
  overscroll-behavior-y:none;
}
```
The `font` shorthand also overrides family and resets line-height, so `body` restores both. At the default Large setting `-apple-system-body` resolves to 17pt, so **1rem = 17px, not 16px**. The whole ladder is therefore expressed in seventeenths of the Apple point ladder, which is exact:

| Style | px | rem | line-height | weight | Used for |
|---|---|---|---|---|---|
| Large Title | 34 | 2rem | 1.206 | 700 | scrolling screen title |
| Title 1 | 28 | 1.647rem | 1.214 | 700 | session title on a detail screen |
| Title 2 | 22 | 1.294rem | 1.273 | 700 | card heading, tile value |
| Title 3 | 20 | 1.176rem | 1.25 | 600 | set line in the four views |
| Headline | 17 | 1rem | 1.294 | 600 | row primary text, button label |
| Body | 17 | 1rem | 1.294 | 400 | prose |
| Callout | 16 | 0.941rem | 1.313 | 400 | cue |
| Subhead | 15 | 0.882rem | 1.333 | 400 | row secondary text |
| Footnote | 13 | 0.765rem | 1.385 | 400 | list group header, tertiary row line |
| Caption 1 | 12 | 0.706rem | 1.333 | 600 | badge |
| Caption 2 | 11 | 0.647rem | 1.182 | 500 | tab bar label |

This replaces every arbitrary value in the current sheet: 1.15rem headers (31, 59), .92rem tabs (34), .8rem small buttons (49), .85rem / .78rem / .72rem / .7rem (55, 62, 64, 73, 76, 82). His current body `line-height:1.45` is far looser than iOS Body at 1.294 and is part of why the app does not read as native.

In a non-WebKit browser `font:-apple-system-body` is invalid, the root stays 16px and everything renders about 6% smaller. That is a clean degradation and needs no fallback.

Two caveats to state in the UI if it ever matters: `-apple-system-body` does not update live, so a changed iOS text size takes effect after the PWA is relaunched, and the iOS "Bold Text" setting exposes no media query and cannot be honoured.

### 3.2 What breaks at a large text size, and the fix per line

- Line 96 `.hdate{width:92px}` becomes `min-width:5.5em; width:auto`.
- Line 98 `.htitle{white-space:nowrap}` drops nowrap and allows two lines.
- Line 71 `.tiles{minmax(130px,1fr)}` becomes `minmax(min(100%,160px),1fr)`.
- Lines 38 and 50, button padding in px, becomes em: `padding:.6em 1em`, and labels may wrap.
- Tab bar labels cap at `font-size:min(.647rem,12px)`, and because the meaning then rests on the icon every tab gets an `aria-label`.
- General rules: `min-height` everywhere, `height` nowhere; no `overflow:hidden` on a text container; grouped rows get `flex-wrap:wrap` so a label and its value stack rather than crush; `dvh` not `vh` for any height.

The cheap conformance test: if the layout survives `line-height:1.5; letter-spacing:.12em; word-spacing:.16em` and 2em paragraph spacing, it will survive AX5.

### 3.3 Pool type, and the two rules that matter most

Sizes are in section 1.5. Line heights: 1.15 for the single line call, 1.25 for any wrapping 36 to 40px line, 1.35 for the 26 to 30px supporting lines.

Two changes from today that are easy to get wrong:

1. **Weight drops from 800 to 700** on the clock (line 112) and the set line (line 118). SF Bold has a stroke of about a fifth of cap height, which is right for low effective contrast. Heavy at 48px and above closes the counters in 0, 6, 8 and 9 and the digits blob together at a glance. The gain from 800 is real at 20px and negative at 48px.
2. **Delete the 560px breakpoint at line 124** that drops `.pline` to 1.55rem. On a real iPhone that is 24.8px, only 13.2 arcmin at 70 cm, below the point where reading speed collapses. The viewing distance does not shrink with the phone, so the small phone case needs the same size as the large phone case. This one line is currently working directly against the brief.

Tracking is 0 or `+0.01em` on all pool text and never negative, because adjacent letter crowding is the dominant failure mode once glare washes out stroke edges. Uppercase stays only on the 20px role label with its existing `+0.08em`. The set line is never uppercased: all caps removes word shape cues and costs 10 to 15% reading speed.

---

## 4. The shell

### 4.1 DOM, static HTML

```html
<body>
  <div class="topbar glass" id="topbar">
    <button class="barbtn" id="bar-left" hidden></button>
    <div class="topbar-title" id="topbar-title"></div>
    <button class="barbtn" id="bar-right" hidden></button>
  </div>

  <div class="wrap">
    <h1 class="largetitle" id="largetitle"></h1>
    <div id="app"></div>
  </div>

  <nav class="tabbar glass" id="tabbar" role="tablist">
    <button class="tab" id="tab-today"    aria-label="Today"><svg …/><span class="lbl">Today</span></button>
    <button class="tab" id="tab-history"  aria-label="History"><svg …/><span class="lbl">History</span></button>
    <button class="tab" id="tab-library"  aria-label="Library"><svg …/><span class="lbl">Library</span></button>
    <button class="tab" id="tab-insights" aria-label="Insights"><svg …/><span class="lbl">Insights</span></button>
  </nav>

  <div class="scrim" id="scrim"></div>
  <div class="sheet" id="sheet" role="dialog" aria-modal="true">
    <div class="grabber"></div><div class="sheet-head" id="sheet-head"></div>
    <div class="sheet-body" id="sheet-body"></div>
  </div>
</body>
```

The tab bar, the top bar, the scrim and the sheet frame all live in the **static HTML**, not in the engine script. Two reasons. First, the icons must be inline `<svg>`, and `h()` cannot build SVG: the stub has no `createElementNS`, and in a real browser `document.createElement("svg")` produces an `HTMLUnknownElement`, not an SVG element. Second, static markup is invisible to `verify.js`, which was confirmed safe by the seam audit. The engine touches these elements only through `document.getElementById` plus `className`, `textContent`, `setAttribute` and `append`.

The old `header` at lines 134 to 138 and `nav.tabs` built at lines 1470 to 1474 are both deleted. `#who` moves into the Settings sheet as an account row.

### 4.2 Four tabs, not five, and Pool is not a tab

Tabs are Today, History, Library, Insights, exactly the four pairs already at line 1471.

Settings goes behind a bar button, not a fifth tab. My call. Reasons: four labels at 11px in a full width bar give each slot about 97px and read comfortably, whereas a fifth destination he touches twice a year steals thumb space from the four he uses weekly; Apple's own apps put settings behind a bar button when it is not a daily destination; and it keeps the tab array identical to today, which is the smallest possible diff on the riskiest structural change.

Pool view is also not a tab. It is a modal overlay. Apple's own guidance is not to disable or hide tab buttons, and a Pool tab would be dead whenever no draft exists. Instead Pool gets two entry points, both above the fold: a **Pool** bar button in the Today top bar whenever a draft exists, and the primary 56px button in the session hero card.

### 4.3 Safe areas

Safe area handling moves off `body` (line 27) and onto each fixed element. Body padding does nothing for `position:fixed` children and doubles up with the bar.

```css
.wrap{
  max-width:860px; margin:0 auto;
  padding:0 var(--gutter);
  padding-top:calc(env(safe-area-inset-top) + var(--topbar-h) + var(--s-2));
  padding-bottom:calc(var(--tabbar-h) + max(env(safe-area-inset-bottom),8px) + var(--s-5));
}
.tabbar{
  position:fixed; left:0; right:0; bottom:0; z-index:var(--z-tabbar);
  display:flex; padding-bottom:max(env(safe-area-inset-bottom),8px);
  user-select:none;
}
.topbar{
  position:fixed; left:0; right:0; top:0; z-index:var(--z-topbar);
  display:flex; align-items:center; gap:var(--s-2);
  height:calc(env(safe-area-inset-top) + var(--topbar-h));
  padding:env(safe-area-inset-top) var(--s-2) 0;
}
#pool{
  position:fixed; inset:0; z-index:var(--z-pool);
  overflow-y:auto; overscroll-behavior:contain;
  padding:calc(env(safe-area-inset-top) + var(--s-4))
          calc(env(safe-area-inset-right) + var(--s-4))
          calc(env(safe-area-inset-bottom) + 46px)
          calc(env(safe-area-inset-left) + var(--s-4));
}
```
`#pool` stays on `position:fixed; inset:0` and is never converted to a height unit: there are reports of `100dvh` returning wrong values on PWA cold start. `dvh` is used only for sheet `max-height`, where a small cold start error is invisible.

Pool padding rises from `inset + 10px` to `inset + 16px` because water pools along the bezel and produces ghost touches there, and because the iOS system gesture strips live in those edges. Nothing tappable within 16px of any screen edge in pool view. The bottom keeps 34px of home indicator plus 12px clear.

### 4.4 Large title that collapses

The large title is real markup in `.wrap`, so it scrolls with the content. The compact title in the fixed bar fades in as it goes. No `IntersectionObserver` and no `requestAnimationFrame`: a plain scroll listener reading `document.documentElement.scrollTop`… which the stub does not have. Use `window.pageYOffset` inside a listener attached in a view function, and toggle one class on the top bar:

```js
function onScroll(){
  var y = window.pageYOffset || 0;
  TOPBAR.className = "topbar glass" + (y > 28 ? " compact" : "");
}
```
`window.addEventListener` exists in the stub as a no-op, so the listener is safe to attach at any level. Reading `window.pageYOffset` inside the handler is safe because the handler never fires under verify. The class change is a pure CSS crossfade, which also means it stops correctly under reduced motion.

```css
.largetitle{ font-size:2rem; line-height:1.206; font-weight:700; margin:var(--s-2) 0 var(--s-4); }
.topbar-title{ flex:1; text-align:center; font-size:1rem; font-weight:600;
  opacity:0; transition:opacity var(--dur-mid) var(--ease-out); }
.topbar.compact .topbar-title{ opacity:1; }
.topbar:not(.compact){ background:transparent; backdrop-filter:none;
  -webkit-backdrop-filter:none; border-bottom-color:transparent; box-shadow:none; }
```

### 4.5 Keyboard

A fixed bottom bar disappears behind the iOS keyboard. The fix that survives the harness is the simple one: hide the tab bar while an input is focused, toggled by a class on `body` from `focusin` and `focusout`. Do not touch `window.visualViewport`: the stub's window does not have it and reading `.addEventListener` on undefined throws.

```css
body.kbd .tabbar{ transform:translateY(110%); }
.tabbar{ transition:transform var(--dur-mid) var(--ease-out); }
```

### 4.6 Print

The print block at lines 126 to 129 must grow to cover the new chrome, or the printed sheet gets a tab bar across it:

```css
@media print{
  .topbar,.tabbar,.scrim,.sheet,button,#pool{ display:none !important; }
  body{ background:#fff; color:#000; }
  .wrap{ padding:0; }
  .card,.blk,.list-card{ box-shadow:none; border-color:#999; background:#fff; }
  .largetitle{ font-size:24pt; }
}
```
Separately: `window.print()` at line 1585 is questionable inside an iOS standalone PWA. My recommendation is to keep the button but move it out of the primary action row into the "Share" sheet, since it is a prep-at-home action, not a poolside one.

---

## 5. Per screen layout

### 5.1 Today

The current order is four generator selects, then five badges, then the goal, then 202px of tiles, then six equal buttons at roughly 1,200px down, then the sets at roughly 1,430px. That is the single biggest hierarchy failure in the app. The new order answers what he actually needs: what is today's session, then start pool view, then the sets.

**No draft:**
1. Large title: `Today`.
2. Grouped inset list, one card, four rows: `Date`, `Slot`, `Ending`, `Focus`. Each row is a label on the left, the current value in `--label-2` on the right, and a chevron. Tapping any row opens the **Session setup sheet**. The four `select` elements at lines 1514 to 1527 stop being inline controls.
3. One 56px primary button, full width inside the gutter: `Generate today's training`.
4. Empty state text, kept verbatim: "Press the button. The app picks a focus you have not done recently, fills the 45 minutes from the library, and never repeats a set inside six sessions."

Note that the promise of "six sessions" is not literally true, because `effectiveWindow` at lines 543 to 546 shrinks the window to half the role pool size. The honest version, in his voice: "Press the button. The app picks a focus you have not done recently, fills the 45 minutes from the library, and keeps a set out of the rotation for as long as the library allows." Ask him which he prefers.

**Generating:** the button becomes a 56px disabled row with an indeterminate 3px progress line across its bottom edge and the label "Writing today's training…". The existing line stays under it verbatim: "Picking the focus, filling the 45 minutes, then Claude writes the coaching notes. About 30 seconds." A 30 second wait with only a disabled button is the weakest state in the app, so also add a Today card skeleton, three grey rounded blocks at the block heights, under the button.

**With a draft:**
1. Large title: the day, for example `Thursday 30 Jul`.
2. Top bar right button: `Pool`.
3. **Hero card**, `--bg-card`, `--r-card`: session title at Title 2; one status line at Subhead in `--label-2` joining the slot label, total metres and planned minutes with `·`; the goal in a `.goalbox` at Callout; then one 56px primary `Start pool view`.
4. **Compact stat strip**, one row 44px tall, four values at Subhead separated by hairlines: `1,750 m`, `60 min`, `4 blocks`, `Cool-down`. This replaces the 2x2 tile grid and recovers about 158px, which is what lifts `Start pool view` above the fold.
5. Banner stack, but weighted, see 6.6.
6. Blocks: warm-up, each main block, the ending. Each is a `.blk` card.
7. **Actions**, a grouped inset list rather than six competing buttons: `Save` (only when editable, unsaved and online, styled as the good action), `Mark done`, `Did not run`, `Regenerate`, `Share` (opens a sheet with Copy as text and Print). Each is a 44px row.
8. Feedback card when saved, see 6.9.

Badges: the current header can carry five badges in one wrapping row at 11.2px. Split them by class of information. Provenance (`Claude` / `library`) moves to a tertiary line inside the hero card, not a badge. State (`done` / `did not run`) stays a badge, because it is the only one he acts on. Date and slot move into the status line.

### 5.2 Pool view

This is where legibility overrides the iOS research. It is not an iOS screen.

**Vertical budget on an iPhone 14 in standalone: 763 usable px.**

```
 sticky top bar, 120px max
 ┌──────────────────────────────────────────┐
 │  12:34            of 60 min      [Close] │  clock 56px/700 tabular, "of 60 min" 24px/600
 │  +4 min                                  │  drift 28px/700
 └──────────────────────────────────────────┘  3px solid #000 bottom rule
 goal, 30px/600, 2 lines max
 ┌──────────────────────────────────────────┐
 │ MAIN SET · 600 m              ┌────────┐ │  role 20px/700 uppercase +.08em
 │ 8 x 50 m free                 │        │ │  CALL 48px/700, never wraps
 │ Adv 1   30 sec                │  tick  │ │  REST 34px/700, own line(s)
 │ Adv 2   20 sec                │  104px │ │
 │ building easy to steady       │        │ │  QUALIFIER 30px/600, may wrap
 │ Long, smooth, count strokes   │        │ │  CUE 28px/600
 └───────────────────────────────└────────┘─┘  3px solid #000
 ┌──────────────────────────────────────────┐
 │ SPRINTS  4 x 25 m                     ✓  │  collapsed, 88px max, call at 28px
 └──────────────────────────────────────────┘
 [ Close ]                         [ Copy ]    76px, 48px apart, Mark done NOT here
```

Rules:

1. **Exactly one block is current and expanded.** Current is the first block in the ordered list `[warm-up, ...blocks, endBlock]` whose `done` is falsy. Every other block collapses to a single row of at most 88px showing its role, its call at 28px and its done check. Budget: 120 + about 300 + two collapsed rows at 88 = 596px, fits. At full size with everything expanded only 2.4 cards fit, which is not enough, and shrinking the type to fit would defeat the whole exercise.
2. **The call and the rest of the current block must always be visible together with no scrolling.** That pair is the non negotiable viewport guarantee.
3. **The set line splits into three tiers by glance frequency.** Measured against the real library in `supabase-schema.sql`: 258 distinct structure strings, length min 4, median 33, p90 53, max 82, and `restText()` is appended on top of that at line 1736. At 48px a 375px viewport fits 11 to 12 characters, so a p90 line plus rest would wrap to four or five lines and produce a 400px card.
   - **The call**, what he shouts. Reps by distance only. Measured: the call captures at 2 to 6 non space characters, p90 = 6, max = 6, so at 48px the worst case is about 193px against 311px available on the narrowest iPhone. Guaranteed never to wrap.
   - **The rest**, read repeatedly during the set. Own line at 34px.
   - **The qualifier**, read once before the block starts at closer range. 30px, may wrap to two lines.
   The split is a pure string operation on `b.rendered_text`:
   ```js
   var CALL_RE = /^\s*(\d+\s*[x×]\s*\d+(?:\s*m)?|\d+\s*m)\s*(.*)$/i;
   function splitCall(t){
     var m = CALL_RE.exec(String(t||""));
     if (!m) return { call:String(t||""), qual:"" };
     return { call:m[1].replace(/\s+/g," ").trim(),
              qual:m[2].replace(/^[\s,;:.\-–—]+/,"") };
   }
   ```
   Tested against the real rows: 252 of 258 split, 6 correctly decline (`400 m easy swim` style). The leading punctuation strip is load bearing: real qualifiers include `, 75 m of each` and `- 25 m legs / 25 m swim`.
   Optionally promote a stroke word onto the call line, but only when it still fits. Do not measure the DOM, estimate the width from a character table:
   ```js
   var W = { " ":.26, i:.28, l:.28, j:.3, f:.3, t:.34, r:.35, s:.45, c:.5, e:.52,
             a:.52, z:.45, x:.52, v:.52, y:.52, n:.56, o:.56, u:.56, b:.55, d:.55,
             p:.55, q:.55, g:.55, h:.55, k:.52, m:.86, w:.78, I:.28, M:.9 };
   function emWidth(s){ var w=0; for (var i=0;i<s.length;i++) w += (W[s[i]] != null ? W[s[i]] : 0.56); return w; }
   // promote only if the whole call line still fits the narrowest phone
   if (emWidth(call + " " + stroke) <= 5.8) call = call + " " + stroke;
   ```
   `5.8em` at 48px is 278px against 311px available, which leaves margin for SF's real metrics differing from the table.
4. **Rest gets its own line and spelled units.** `restText()` at lines 1374 to 1379 returns forms like `30" adv 1 | 20" adv 2`. Two failures at 70 cm through glare: the double prime and single prime differ by one small stroke, so 30 seconds and 30 minutes become indistinguishable, and the pipe is a single thin vertical stroke that washes out first. In pool view only: spell the unit as `30 sec`, write minutes as `1:30`, and when Adv 1 and Adv 2 differ stack two rows reading `Adv 1   30 sec` and `Adv 2   20 sec`. His Adv 1 / Adv 2 split by rest is preserved exactly, it just gets two rows instead of one. Costs 41px, removes the most likely misread on the deck. The library keeps storing whatever it stores and `asPlainText` is untouched.
5. **The done state stops being encoded by reduced contrast.** Today, line 116 drops text and border to `#9aa7ae` on `#f7f9fa`, which is 2.34:1 and fails even the 3:1 large text bar. Done blocks still have to be readable, because he scrolls back to check what the group already did. Keep the text at `#000` and use three redundant cues, none of them colour: a filled black circle with a white check at 44px or larger in the tick strip; a 4px `#000` line-through on the call only, not on the qualifier; and the card fill going from `#fff` to `#e8ecef`, which keeps black text at 17.68 and is worth only about 4.4 units of L*, so it is decoration and never the signal. The border stays `3px solid #000` in both states.
6. **No tab bar. No swipe gestures at all.** Banned in pool view: swipe to complete, swipe to delete, pull to refresh, edge swipe dismissal. A wet finger dragging on a scroll produces unintended swipes and every one of those gestures is destructive or state changing. Vertical scrolling is fine, it is non destructive and self evidently reversible.
7. **Mark done leaves the bottom row.** Today it sits 16px below the last block's toggle and 10px from Copy, both inside one sigma of the wet finger error. It moves into a Close confirmation: tapping Close opens a small pool register sheet with `Mark done and close`, `Just close`, `Keep going`. That also fixes the worst failure in the app, which is that Close at line 1723 destroys `poolState` with no undo and loses the clock.
8. `user-select:none` and `touch-action:manipulation` on the whole `#pool` subtree. The first stops a slow wet press raising the iOS text selection magnifier and the Copy / Look Up callout over the set he is reading. The second kills double tap zoom, which with wet hands is a genuine incident.

### 5.3 History

Hierarchy is already right, newest first grouped by week. Convert to native grouped inset lists.

1. Large title `History`, top bar right button opens a search sheet.
2. Search moves into the top bar as a real `input[type=search]` at 44px, and **the term must persist**. Today `q` is recreated on every render at line 1768, so any repaint clears it. Store it on the existing `lib`-style state object: add `hist = { q:"" }` next to line 252.
3. One `.list-card` per week, with a Footnote uppercase group header `Week of 30 Jul` above it. Rows: date at Subhead `--label-2` in a `min-width:5.5em` column, title at Headline, a Footnote `--label-3` line joining slot, metres and status, then a rating badge if present, then a chevron.
4. **A row pushes a session detail screen, it does not overwrite Today.** Today, line 1785 sets `draft = hydrate(s); view.name = "today"`, so the date picker silently shows the old session's date, the generate button relabels to "Generate another", and pressing it fires the already-saved alert. There is no back button and no indication you are looking at an old session. Fix: add `view.name = "session"` plus `view.from`, render the session card with a `‹ History` back button in the top bar and no generator controls, and leave `draft` alone.
5. Delete the "Quick look" card at the bottom. It is a shortcut placed after the thing it shortcuts, and its label "What did we do last Thursday?" promises something the code does not guarantee: `data.sessions.filter(s => s.slot === "thu_1930")[0]` is the most recent Thursday session, not last Thursday. The first row of the list usually is that session anyway.

### 5.4 Library

1. Large title `Library`, subtitle row `147 active sets`.
2. Top bar right button: `+`, which opens the **Ask Claude sheet**. `growLibrary` currently picks the role from `thinRoles()[0]` and the focus at random from all focuses including inactive ones, with no indication of either. The sheet gets a role picker defaulted to the thinnest role, a focus picker defaulted to the least recently used focus, a count stepper defaulted to 5, and one 56px `Ask Claude` button. Keep the explanatory sentence verbatim: "The generator only uses active sets. Retiring one keeps it in your saved trainings but stops it coming up again."
3. **Claude suggests** list first when proposed sets exist, with a `n waiting` badge. Each row shows the full coaching detail it already shows today: name, structure plus rest, cue in `--accent-text`, watch_for, role and focus tags. This is the only place in the app that shows a set's full detail, which proves the layout is possible for the main list too.
   **The Add / No pair is dissolved.** Today they are 26.6px and 4px apart, which is the highest mis-tap risk in the app, and `No` sets status `rejected` with no confirm and no undo. Replace with: the row itself pushes a set detail screen; the detail screen carries a 56px `Add to library` primary and a 44px `Not this one` in `--bad` at the bottom, 48px apart.
4. Filters become one segmented control for role and a chevron row for focus, inside a filter sheet, so there is only ever one search and filter cluster on screen.
5. Set rows: name at Headline, an optional `back in n sessions` badge, an optional `Claude` badge, structure plus rest at Subhead `--label-2`, and a Footnote `--label-3` line of role, gear, times used and last used. The whole row is tappable and pushes a **set detail screen** showing cue, watch_for, Adv 1 and Adv 2, safety tags, and the actions `Retire` or `Bring back`. The 26.6px inline Retire button disappears.
6. **Retired sets must show as retired.** The filter at lines 1840 to 1846 checks only `status`, while `toggleActive` at line 1911 sets `active:false` and leaves status alone, so a retired set keeps appearing, looks identical to an active one, and still offers Retire. Add `|| x.active === false` to the filter, add a `Retired` segment to the role filter so they are reachable, and add an un-retire action. This is a bug, not a style problem, and it must be fixed before the counts are restyled.

### 5.5 Insights

Settings leave this screen, which is most of the fix.

1. Large title `Insights`.
2. Stat strip, not a tile grid: `Sessions`, `Average`, `By Claude`, `Library`.
3. **Thin roles first**, because it is the card he acts on. Keep verbatim: "These roles have few sets, so the generator will start repeating them sooner than six sessions." One 44px row per role with a `have of need` badge, and one 56px `Ask Claude for new sets` that opens the same sheet as the Library `+`, prefilled with the tapped role.
4. Focus balance, one 44px row per focus with an 8px bar. Bars are decoration, so the count stays as text.
5. Never used, and Most used, as **two separate group headers**, because today they share one heading. Also list the never used sets: today the `stale` variable at line 2014 is computed and thrown away, and only the count is shown.
6. **Empty state**, which does not exist today. With zero sessions the screen renders zeroes, "last 0 sessions" and every focus bar at "not yet". Replace the whole screen with one line: "Nothing to show yet. Save a couple of trainings and this fills in."

Three counts must be corrected in the same pass, because they all count by `status` only and therefore overstate the active pool: the header badge at line 1881, the Library stat at line 1986, and the never-used denominator at line 2020. All three need `&& x.active !== false`, which is what `roleCounts` at line 1851 and `thinRoles` at line 1959 already do.

### 5.6 Settings sheet

Reached from a gear in the top bar of Insights and from the account row. A grouped list inside a large detent sheet:

- **Account**: display name, email, `Log out` in `--bad`.
- **Pace**, with the footer kept verbatim: "Change the two pace numbers after a couple of real sessions. They are what makes the clock come out right." Two rows, `Steady pace, seconds per 100 m (includes rest and you talking)` and `Faster pace, seconds per 100 m`. The 29.7px number inputs become 44px rows with a stepper: label left, value right, `−` and `+` buttons at 44px each.
- **Generator**: `Main block, least metres`, `Main block, most metres`, `Sessions before a set can come back`.
- **Pool view**: `Bigger text` switch, which sets `#pool.big`. `Night pool` switch, off by default. `Tick sound` switch, on by default.
- **Display**: `Solid backgrounds` switch, which sets `body.solid`.

Only five of the eighteen keys in `defaultSettings` are editable today. The other thirteen, including `total_minutes`, `warmup_minutes`, `game_minutes`, `max_paddle_m` and `default_ending`, stay database only. `default_ending` is worth promoting into the Session setup sheet, since he already sets ending per session.

### 5.7 Sheets, the complete list

| Sheet | Detent | Replaces |
|---|---|---|
| Session setup: date, slot, ending, focus | medium | the four selects at lines 1514 to 1527 |
| Regenerate confirm | small | the alert at line 1156 |
| Share: Copy as text, Print | small | two of the six buttons at 1584 and 1585 |
| Ask Claude: role, focus, count | medium | the bare button at 1882 and 2010 |
| Library filter | medium | the two `select.small` at 1826 and 1829 |
| Settings | large | the card at 2028 to 2047 |
| Close pool: Mark done and close, Just close, Keep going | small, pool register | the bare Close at 1721 |
| Retire confirm | small | the `confirm()` at 1910 |

All nine `alert()` calls become sheets or toasts. Every string is carried over word for word, with two exceptions noted in section 9.6. `friendlyDbError` at lines 446 to 452 already maps to his voice and stays.

### 5.8 Login and the four error screens

Login hierarchy is already right: email, password, button. Changes only: fields to 44px, submit bound on the email field too, and the raw Supabase string replaced. Map `Invalid login credentials` to "That email and password do not match. Try again." and keep the raw string in a Footnote `--label-3` line below it for the setup-time cases.

`renderNotCoach` keeps its copy exactly. The `pre` block loses its inline `#f5f8fa` and picks up `--bg-nested` with `overflow-x:auto`. It is the one horizontally scrolling element in the app and that is correct for a SQL statement.

`afterLoadFailed` survives verbatim, all of it. It is real and useful on the free tier.

The two dead ends at lines 1447 to 1460 both gain a retry button. The no-library branch in particular can happen with a valid localStorage mirror present, so its retry should attempt `loadMirror()` before reloading. Note that the not-configured branch is the only path `verify.js` renders, so it must stay free of `classList`, `innerHTML` and `getBoundingClientRect`.

---

## 6. Components

### 6.1 Buttons

The current ladder fails almost everywhere: base 39.2px, `.big` 59.5px, `.ghost` 35.2px, `.small` 26.6px, tabs 35.3px, and `.ghost.small` collapses to 26.6px because `.small` at line 49 wins on source order. Only `.big` and `#pool button` clear 44px. Rebuild it so that **the smallest tappable variant is 44px and `.small` no longer exists as a button size**. Anything that needs to be visually small becomes non-tappable text or moves into a row.

```css
button{
  font:inherit; font-weight:600; cursor:pointer;
  min-height:var(--ctl-h); padding:.6em 1.1em;
  border:1px solid var(--sep-opaque); border-radius:var(--r-ctl);
  background:var(--bg-card); color:var(--label);
  -webkit-tap-highlight-color:transparent; touch-action:manipulation;
  user-select:none;
  transition:background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}
button:active{ background:var(--fill-2); transform:scale(.97); }
button:disabled{ opacity:.4; cursor:default; transform:none; }
button:focus-visible{ outline:3px solid var(--focus-ring); outline-offset:2px; }

button.primary{ background:var(--accent-fill); border-color:var(--accent-fill); color:#fff; }
button.primary:active{ background:var(--accent-text); filter:brightness(.88); }
button.good{ background:var(--good); border-color:var(--good); color:#fff; }
button.danger{ background:transparent; border-color:transparent; color:var(--bad); }
button.danger:active{ background:var(--bad-tint); }
button.plain{ background:transparent; border-color:transparent; color:var(--accent-text); }
button.plain:active{ background:var(--fill-3); }
button.big{ min-height:var(--ctl-h-lg); width:100%; font-size:1rem; border-radius:var(--r-card); }
button.pill{ border-radius:var(--r-pill); }

/* hover only where a real pointer exists. All five current hover rules stick on iOS. */
@media (hover:hover) and (pointer:fine){
  button:hover{ background:var(--fill-3); }
  button.primary:hover{ filter:brightness(1.08); }
  .row-tap:hover{ background:var(--fill-4); }
}
```

`button.primary` uses `--accent-fill` (`#075985` light, `#0c5c86` dark) rather than the brand `#0284c7`. White on `#0284c7` is **4.10, which fails AA 4.5 for normal text in the shipped app today**, and it affects every primary button in the four views. `#075985` gives 7.56 with white and is already in the file as `--accent-ink`. The brand blue stays as `--accent`, used for the active tab glyph, bar fills, tints and the focus ring, where only 3:1 non-text applies.

### 6.2 Grouped inset list

```css
.list{ margin:0 0 var(--group-gap); }
.list-hdr{ font-size:.765rem; line-height:1.385; font-weight:600;
  text-transform:uppercase; letter-spacing:.06em; color:var(--label-2);
  padding:0 var(--s-4) 7px; }
.list-card{ background:var(--bg-card); border-radius:var(--r-card);
  box-shadow:var(--shadow-card); }
.row{ position:relative; display:flex; align-items:center; gap:var(--s-3);
  min-height:var(--row-h); padding:11px var(--s-4); color:var(--label);
  flex-wrap:wrap; -webkit-tap-highlight-color:transparent; }
.row+.row::before{ content:""; position:absolute; left:var(--s-4); right:0; top:0;
  height:1px; background:var(--sep); transform:scaleY(.5); transform-origin:top; }
.row-tap{ cursor:pointer; user-select:none; touch-action:manipulation; }
.row-tap:active{ background:var(--fill-4); }
.row .r-main{ flex:1; min-width:0; }
.row .r-1{ font-size:1rem; font-weight:600; }
.row .r-2{ font-size:.882rem; color:var(--label-2); }
.row .r-3{ font-size:.765rem; color:var(--label-3); }
.row .r-val{ margin-left:auto; color:var(--label-2); font-size:1rem; }
.chev{ width:9px; height:15px; color:var(--label-3); flex:none; }
.list-card>.row:first-child{ border-radius:var(--r-card) var(--r-card) 0 0; }
.list-card>.row:last-child{ border-radius:0 0 var(--r-card) var(--r-card); }
```
The `.row + .row::before` trick gives a true half pixel hairline on retina and needs no last-child exception, which matters because there is no way to fix up separators from JS: `document.querySelectorAll` does not exist in the stub. Use `:active`, never `:hover`, for the press state.

Every tappable row is a real `<button>` or carries `role="button"` and `tabindex="0"`, because a `div` with an `onclick` is invisible to VoiceOver, unreachable by keyboard, and gets none of the free hit slop.

### 6.3 Card

```css
.card{ background:var(--bg-card); border-radius:var(--r-card);
  padding:var(--s-4); margin-bottom:var(--s-4); box-shadow:var(--shadow-card); }
.card>.inner{ border-radius:max(0px, calc(var(--r-card) - var(--s-4))); }
```
Nested radii are always `max(0px, calc(outer - padding))`, so a shared centre is preserved and a large padding cannot produce a negative radius. CSS cannot draw Apple's continuous corner curve: `corner-shape: squircle()` ships only in Chromium and is two to four years from cross-browser production, and an SVG mask or JS polyfill would break the zero-build rule for a small visual gain. Accept circular corners and nudge the radii up a touch, which is why `--r-card` is 14px rather than 12px.

### 6.4 Session block, the four views

```css
.blk{ background:var(--bg-card); border-radius:var(--r-card); padding:var(--s-4);
  margin-bottom:var(--s-3); box-shadow:var(--shadow-card); }
.blk .role{ font-size:.765rem; font-weight:700; text-transform:uppercase;
  letter-spacing:.06em; color:var(--label-2); }
.blk .call{ font-size:1.176rem; line-height:1.25; font-weight:700; margin-top:3px; }
.blk .rest{ font-size:1rem; font-weight:600; color:var(--label); margin-top:2px; }
.blk .qual{ font-size:.941rem; color:var(--label-2); margin-top:2px; }
.blk .cue{ font-size:.941rem; color:var(--accent-text); margin-top:6px; }
.blk .watch{ font-size:.882rem; color:var(--label-2); margin-top:4px; }
.blk .adv{ display:flex; gap:var(--s-2); flex-wrap:wrap; margin-top:var(--s-2); }
.blk .adv span{ font-size:.882rem; background:var(--bg-nested);
  border-radius:var(--r-inner); padding:4px 10px; }
.blk .meta{ margin-top:var(--s-2); display:flex; gap:var(--s-2); flex-wrap:wrap; }
```
Six information layers per block is one too many. The rep nudge buttons leave the meta row entirely: they are 26.6px and 4px apart, and they vanish once saved, which means the only way to adjust a saved session today is to regenerate it, which is the path that does not exist. Replace with a 44px `Adjust reps` row at the bottom of the block that opens a small sheet with 56px `−` and `+` buttons and the live metre total. Available whether or not the session is saved, since Regenerate now exists as the alternative.

Safety tags render as raw database strings like `max effort` and `breath control` after a single `replace("_"," ")` at line 1635. Add a label map next to `ROLE_LABEL` so they read as his phrases, and confirm the wording with him before writing it: for underwater work in particular, his practice is the reference, not a generic safety rule.

The warm-up wording exists in four places: lines 1259 to 1261, 1350 to 1351, 1593 to 1595 and 1729 to 1730. Extract one function `warmupText(sk)` returning `{ role, call, watch }` and call it from all four, or they will drift.

The ending block hard-codes `10 min` and `5 min` at lines 1602, 1366 and 1746 while `buildSkeleton` at line 770 reads `S.game_minutes` and `S.cooldown_minutes`. If he ever changes `game_minutes` the card lies. Read from settings in all three places. Careful: line 1366 is inside `asPlainText`, which **is** asserted by verify.js check 12, so the surrounding format must not change, only the number.

### 6.5 Pool block

```css
#pool .pblk{ border:var(--p-border) solid var(--p-ink); border-radius:var(--r-pool);
  background:var(--p-paper); color:var(--p-ink);
  padding:var(--s-4); margin-bottom:var(--s-3);
  display:flex; gap:var(--s-4); align-items:stretch;
  user-select:none; touch-action:manipulation; }
#pool .pblk .pmain{ flex:1; min-width:0; }
#pool .prole{ font-size:var(--p-role); font-weight:700; text-transform:uppercase;
  letter-spacing:.08em; }
#pool .pcall{ font-size:var(--p-call); line-height:1.15; font-weight:700;
  letter-spacing:.01em; margin-top:6px; hyphens:none; overflow-wrap:break-word; }
#pool .prest{ font-size:var(--p-rest); font-weight:700; line-height:1.3; margin-top:8px;
  font-variant-numeric:tabular-nums; }
#pool .prest .rlab{ display:inline-block; min-width:4.2em; }
#pool .pqual{ font-size:var(--p-qual); font-weight:600; line-height:1.35; margin-top:8px; }
#pool .pcue{ font-size:var(--p-cue); font-weight:600; line-height:1.35; margin-top:10px; }
#pool .padv{ font-size:var(--p-adv); font-weight:600; line-height:1.35; margin-top:8px; }

/* done */
#pool .pblk.done{ background:var(--p-done-fill); color:var(--p-ink);
  border-color:var(--p-ink); }
#pool .pblk.done .pcall{ text-decoration:line-through;
  text-decoration-thickness:4px; text-decoration-color:var(--p-ink); }

/* collapsed */
#pool .pblk.collapsed{ padding:var(--s-3) var(--s-4); align-items:center; }
#pool .pblk.collapsed .pcall{ font-size:var(--p-collapsed); margin-top:2px; }
#pool .pblk.collapsed .prest,
#pool .pblk.collapsed .pqual,
#pool .pblk.collapsed .pcue,
#pool .pblk.collapsed .padv{ display:none; }

/* the tick strip: the ONLY tappable part of a block */
#pool .ptick{ flex:none; width:var(--pool-target); min-height:var(--pool-target);
  border:var(--p-border) solid var(--p-ink); border-radius:var(--r-pool);
  background:var(--p-paper); color:var(--p-ink);
  display:flex; align-items:center; justify-content:center; }
#pool .ptick.on{ background:var(--p-ink); color:var(--p-paper); }
#pool .ptick:active{ background:var(--p-ink); color:var(--p-paper); }
#pool .ptick svg{ width:52px; height:52px; }
#pool button{ min-height:var(--pool-target-sm); font-size:1.176rem; font-weight:700;
  border:var(--p-border) solid var(--p-ink); border-radius:var(--r-pool);
  background:var(--p-paper); color:var(--p-ink); }
#pool button:active{ background:var(--p-ink); color:var(--p-paper); }
```
The whole-card `onclick` at line 1734 is removed. The card is the largest thing on screen and the thing he brushes while scrolling, so it is the worst possible target for a state change.

### 6.6 Banners, weighted three ways

Three semantically different messages currently share one amber `.banner` and can stack four or five deep, pushing the session further down. Split them:

```css
.banner{ border-radius:var(--r-inner); padding:10px var(--s-3);
  font-size:.941rem; margin-bottom:var(--s-3); border:1px solid transparent; }
.banner.warn{ background:var(--warn-tint); color:var(--warn); border-color:var(--warn-line); }
.banner.info{ background:var(--accent-tint); color:var(--accent-text); border-color:var(--accent-line); }
.banner.ok{ background:var(--good-tint); color:var(--good); border-color:var(--good-line); }
.banner.err{ background:var(--bad-tint); color:var(--bad); border-color:var(--bad-line); }
.banner.strip{ border-radius:0; margin:0 calc(var(--gutter) * -1) var(--s-3);
  padding:10px var(--gutter); border-left:0; border-right:0; }
```
- **Safety warnings** from `validate()`, prefixed "Check this: ", stay `.banner.warn` and stay above the session card. They are the only ones that should block the eye. All eleven strings survive verbatim, from "Could not work out how long this takes. Check the pace settings." through "One block has no coaching cue." These are the app's coaching judgement and the highest value copy in the file.
- **Relaxations** ("Reused a recent focus…", "Repeated a Legs sooner than usual, that role is thin.") become `.banner.info` and move to a collapsed Footnote line under the hero card's status line, expandable on tap. They explain provenance, they are not a call to action.
- **Fallback notes**, the thirteen `FALLBACK_NOTE` keys, become `.banner.info` at the top of the session card. Six of them mention SETUP.md and are setup-time only, so demote those six to a Footnote line. All thirteen strings survive.
- **Offline** becomes `.banner.strip` immediately under the large title, persistent, `.banner.warn`. Both strings survive verbatim.
- **Toast** gets a second variant and a corrected z-index. Today it is `z-index:99` against `#pool` at 50, so the light green toast draws over the hard contrast pool view.
```css
.toast{ position:fixed; left:50%; transform:translateX(-50%);
  bottom:calc(var(--tabbar-h) + max(env(safe-area-inset-bottom),8px) + 12px);
  z-index:var(--z-toast); max-width:90%;
  background:var(--label); color:var(--bg-card);
  border-radius:var(--r-pill); padding:12px 18px; font-size:1rem; font-weight:600; }
.toast.pool{ z-index:var(--z-pool-toast); bottom:calc(env(safe-area-inset-bottom) + 96px);
  background:#000; color:#fff; border:3px solid #000; border-radius:var(--r-pool);
  font-size:1.176rem; }
```
`toast()` picks the variant from `view.name === "pool"`. Two lines of change inside `toast()` at lines 1404 to 1411.

### 6.7 Badges, tiles, bars

```css
.badge{ font-size:.706rem; font-weight:600; line-height:1.4;
  background:var(--fill-3); color:var(--label-2);
  padding:3px 9px; border-radius:var(--r-pill); white-space:nowrap; }
.badge.warn{ background:var(--warn-tint); color:var(--warn); }
.badge.ok{ background:var(--good-tint); color:var(--good); }
.badge.accent{ background:var(--accent-tint); color:var(--accent-text); }
```
Badges are never tappable and never carry an action, so 12px is acceptable, but at most **two** in any one row. The current header can show five.

Tiles are replaced by a stat strip. Where a grid is still wanted, the min changes to `minmax(min(100%,160px),1fr)` so large numerals cannot overflow the viewport.

```css
.strip{ display:flex; background:var(--bg-card); border-radius:var(--r-card);
  box-shadow:var(--shadow-card); overflow:hidden; margin-bottom:var(--s-4); }
.strip>div{ flex:1; min-width:0; padding:10px var(--s-2); text-align:center;
  border-left:1px solid var(--sep); }
.strip>div:first-child{ border-left:0; }
.strip .val{ font-size:1rem; font-weight:700; font-variant-numeric:tabular-nums; }
.strip .lbl{ font-size:.706rem; color:var(--label-2); }
.bar{ height:8px; background:var(--fill-3); border-radius:var(--r-pill); overflow:hidden; }
.bar>i{ display:block; height:100%; background:var(--accent);
  transition:width var(--dur-mid) var(--ease-out); }
```

### 6.8 Inputs

```css
input,select,textarea{
  font:inherit; color:var(--label); background:var(--bg-card);
  border:1px solid var(--sep-opaque); border-radius:var(--r-ctl);
  min-height:var(--ctl-h); padding:10px 12px; width:100%;
}
input:focus,select:focus,textarea:focus{
  outline:3px solid var(--focus-ring); outline-offset:1px; border-color:var(--accent); }
input::placeholder,textarea::placeholder{ color:var(--label-3); }
textarea{ min-height:88px; resize:vertical; }
```
`--line #e1e8ed` on white is 1.24:1, so the current input borders fail the 3:1 bar for a boundary needed to identify a control. `--sep-opaque #c6c6c8` is still only 1.71, so where a border is the **only** thing identifying a control, use `--label-3` instead: `input.bordered{ border-color:var(--label-3); }` at 5.13. My judgement: use `--sep-opaque` for inputs sitting inside a grouped list row, where the row itself identifies the control, and `--label-3` for standalone fields such as login.

Every input gets a real `<label>` or an `aria-label`. Today there are placeholders only: `email`, `password`, `Search titles and sets`, `Search the library`, `One line for next time (optional)`. The `.section-label` divs above the date and slot inputs at lines 1541 to 1542 are visual only and associate with nothing.

### 6.9 Segmented control

Replaces the five 26.6 x 25px rating buttons, which are the smallest targets in the app and fail on both axes.

```css
.seg{ display:flex; background:var(--fill-3); border-radius:var(--r-ctl);
  padding:2px; gap:2px; }
.seg button{ flex:1; min-width:44px; min-height:40px; padding:0;
  border:0; border-radius:calc(var(--r-ctl) - 2px);
  background:transparent; color:var(--label); font-weight:600; }
.seg button.on{ background:var(--bg-card); box-shadow:var(--shadow-card); }
.seg button:active{ background:var(--fill-2); transform:none; }
```
Five cells at 44px plus gaps is 232px, comfortable inside 358px. The container is 44px tall, the cells 40px inside the 2px padding, which is the iOS geometry and keeps the whole control on the 44px line.

The feedback card also fixes a layout bug: `Save note` is squeezed to 84.7px wide by the long sentence beside it and its label wraps onto two lines at 62.4px tall. Put the note textarea and its 44px full-width `Save note` on their own rows, with the sentence as a Footnote footer below.

**The sentence itself is false.** "Two 5s in a row and the next session drops 100 m. Two 1s and it goes up." I checked: `difficulty_rating` is written at line 1682, displayed at 1661 and 1797, and read by nothing. `main_min_m` and `main_max_m` are only ever read from settings at line 776. No adaptive volume exists. Either implement it or change the copy. My recommendation is to change the copy, because adaptive volume is a coaching model decision and not a redesign decision. Suggested replacement: "The rating is saved with the session so you can see later which ones were too hard."

### 6.10 The tick control and the wet finger error budget

Baselines in physical terms at 0.1588 mm per CSS px: Apple's 44pt is 7.0 mm, Material's 48px is 7.6 mm, the current pool button 52px is 8.3 mm. Those are calibrated for a dry, seated, close range tap, where error rate is near 2.5% at 7 mm.

The pool deck adds four independent error sources. One sigma estimates: wet finger capacitive centroid offset and spread 3.0 mm, because a water film enlarges the sensed area and shifts its centroid; targeting at 70 cm instead of 35 cm, 2.0 mm; standing one handed while glancing rather than staring, 1.5 mm; cold or stiff fingers, 1.0 mm. In quadrature, sigma = 4.03 mm. For a 95% hit rate the target must span two times two sigma, which is 16.1 mm, which is **102 CSS px**. Hence `--pool-target: 104px`.

Spacing matters more than size, because it decides whether a miss lands on nothing or on the wrong thing: 16px between two targets that do the same kind of thing, 24px between two that do different things, 48px between a state changing target and a destructive one, and preferably never place those two adjacent.

**One tap stays one tap. What changes is that the tap must have a plausible shape, must not coincide with a scroll, and is always undoable.** Long press is wrong because it costs deck time and he may be holding a whistle. A confirmation dialog is wrong because it is two taps and it covers the set list.

```js
// pool tick gate. Geometry and timing only.
var lastScrollAt = 0, lastToggleAt = 0;
poolEl.addEventListener("scroll", function(){ lastScrollAt = Date.now(); });

function armTick(strip, b, sk){
  var down = null;
  strip.addEventListener("pointerdown", function(e){
    if (!e.isPrimary) return;
    down = { x:e.clientX, y:e.clientY, t:Date.now() };
  });
  strip.addEventListener("pointercancel", function(){ down = null; });
  strip.addEventListener("pointerup", function(e){
    var d = down; down = null;
    if (!d || !e.isPrimary) return;
    var moved = Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y);
    var dwell = Date.now() - d.t;
    if (moved > 10) return;                                  // a wet slip is a drag
    if (dwell < 40 || dwell > 1200) return;                  // droplet spike, or a resting hand
    if (Date.now() - lastScrollAt < 350) return;             // scroll lockout
    if (Date.now() - lastToggleAt < 400) return;             // global cooldown
    if (b.tickedAt && Date.now() - b.tickedAt < 1500) return; // water bridge double fire
    lastToggleAt = b.tickedAt = Date.now();
    togglePool(b, sk);
  });
}
```
The scroll lockout is the single highest value rule here. Do not attempt contact area or force gating: iOS Safari reports `PointerEvent.width` and `.height` as a constant for touch and `Touch.force` is 0 on non-3D-Touch iPhones, so neither is a usable signal.

Paint the check **immediately**, before the Supabase write at line 1762 resolves, because the write can be slow or offline. Show an Undo control at 76px or larger for 8 seconds, and after the 1500 ms cooldown the block is re-tappable anyway.

There is no haptics API in Safari on iOS, so a tick cannot be confirmed by feel. Visual confirmation is the `:active` inversion for 120 ms plus the immediate check. Offer an optional audio click, default on: a 40 ms `OscillatorNode` burst at 1 to 2 kHz, created on the tap so it counts as a user gesture, no external asset. A pool hall is a reverberant 70 to 80 dB(A) space, so keep it short and in the band where the phone speaker is loudest. **Guard it or the suite dies:**
```js
var AC = (typeof AudioContext === "function") ? AudioContext
       : (typeof webkitAudioContext === "function") ? webkitAudioContext : null;
```

### 6.11 The clock

Not readable as built. 1.9rem is 30.4px, a cap height of 16.7 arcmin at 70 cm, which is on the ISO hard floor, and 11.4 arcmin at the 100 cm bench distance, which is below the point where reading speed collapses. It is the most glanced element in the app and currently the least legible thing relative to its importance.

```css
#pool .ptop{ position:sticky; top:0; z-index:2;
  background:var(--p-paper); color:var(--p-ink);
  border-bottom:var(--p-border) solid var(--p-ink);
  padding:6px 0 10px; margin-bottom:var(--s-3); max-height:120px; }
#pool .clock{ font-size:var(--p-clock); font-weight:700; line-height:1.05;
  font-variant-numeric:tabular-nums; }
#pool .of{ font-size:24px; font-weight:600; }
#pool .drift{ font-size:var(--p-drift); font-weight:700; margin-top:2px;
  font-variant-numeric:tabular-nums; }
#pool .drift.late{ background:var(--p-behind-fill); color:var(--p-behind-ink);
  display:inline-block; padding:2px 12px; border-radius:var(--r-pill); }
```
56px gives 30.8 arcmin at 70 cm, inside the preferred band, and still 21.6 at 100 cm. `tabular-nums` is already there at line 112 and is essential: untabulated digits jitter every second and jitter is a real cost at a glance.

He needs "am I on time", not "what time is it", so give him three things: elapsed mm:ss at 56px/700, `of 60 min` at 24px/600 beside it, and the drift on its own line at 28px/700 as a **signed number of minutes**. A signed number is read in one fixation; comparing two clocks is not. Bands: within 2 minutes shows `on time`, 2 to 5 minutes shows the signed value in plain black, over 5 minutes inverts to white on a solid black pill. Show the ahead case too, since finishing early wastes paid class time.

The current lateness cue is colour only: `clock.className = "clock" + (… ? " behind" : "")` turning it `--bad #dc2626`, which is 4.83 nominal, collapses under glare, and fails WCAG 1.4.1 as a colour-only signal. Replace it: the drift text carries the state and the behind state inverts rather than changing hue, because inversion is the only state change that still reads at several metres. The behind indicator also currently stays silent until at least one block is ticked, so a coach who never ticks never sees it; base the expectation on elapsed time against planned minutes when nothing is ticked.

Vertical budget: clock row plus drift row plus padding plus the 3px rule is 121px, about 16% of the 763 usable px, hence the 120px cap.

The clock must never pulse, breathe or animate, regardless of the reduced motion setting, and nothing anywhere may blink or flash. A moving target is harder to read at 70 cm, and animating a value that changes every second is pure noise.

VoiceOver needs care: the digits update `textContent` every second, so a live region would announce a number once a second. Put `aria-hidden="true"` on the ticking digits and expose the reading through the container's `aria-label`, updated on minute boundaries only.

### 6.12 Tab bar

```css
.tab{ flex:1; min-height:var(--tabbar-h); display:flex; flex-direction:column;
  align-items:center; justify-content:center; gap:2px; padding:6px 0 2px;
  border:0; background:none; color:var(--label-2);
  -webkit-tap-highlight-color:transparent; touch-action:manipulation; }
.tab.on{ color:var(--accent); }
.tab:active{ opacity:.55; }
.tab svg{ width:28px; height:28px; }
.tab .lbl{ font-size:min(.647rem,12px); line-height:1.2; font-weight:500; }
```
Icons are hand written inline SVG paths in the static HTML: a calendar for Today, a clock with a back arrow for History, stacked cards for Library, a bar chart for Insights. SF Symbols are not available to the web and no external asset is allowed. Single word labels, per Apple. Never disable or hide a tab button. `aria-current="page"` on the active one.

Do not put `overflow:hidden` on the same element as `backdrop-filter`, and do not add `will-change:backdrop-filter`: it forces a permanent extra layer.

---

## 7. Motion

| What | Duration | Easing | Property |
|---|---|---|---|
| Sheet in and out | 340ms | `cubic-bezier(.32,.72,0,1)` | `transform: translateY()` |
| Scrim | 250ms | `ease` | `opacity` |
| Compact title crossfade | 250ms | `--ease-out` | `opacity` |
| Tab bar hide for keyboard | 250ms | `--ease-out` | `transform` |
| Button press | 120ms | `--ease-out` | `background`, `transform: scale(.97)` |
| Row press | 120ms | `--ease-out` | `background` |
| Pool tick strip inversion | 120ms | none, instant on `:active` | `background`, `color` |
| Focus bar fill | 250ms | `--ease-out` | `width` |
| Toast in and out | 250ms | `--ease-out` | `opacity`, `translateY` |

`cubic-bezier(.32,.72,0,1)` is the widely used approximation of the iOS sheet spring.

Sheet detents are CSS `max-height` values toggled by className, never measured: there is no `getBoundingClientRect` and no `requestAnimationFrame` available to the engine. Swipe to dismiss on a sheet is fine, driven from raw touch coordinates, because sheets live in the glass register where a mis-swipe costs nothing. Include a grabber: it is required for VoiceOver resizing.

```css
.scrim{ position:fixed; inset:0; z-index:var(--z-scrim); background:var(--scrim);
  opacity:0; pointer-events:none; transition:opacity var(--dur-mid) ease; }
.scrim.on{ opacity:1; pointer-events:auto; }
.sheet{ position:fixed; left:0; right:0; bottom:0; z-index:var(--z-sheet);
  display:flex; flex-direction:column; max-height:92dvh;
  border-radius:var(--r-sheet) var(--r-sheet) 0 0; background:var(--bg-sheet);
  box-shadow:0 -12px 40px rgba(0,0,0,.28);
  transform:translateY(100%); transition:transform var(--dur-sheet) var(--ease-sheet);
  overscroll-behavior:contain; padding-bottom:max(env(safe-area-inset-bottom),12px); }
.sheet.med{ max-height:56dvh; } .sheet.sm{ max-height:34dvh; }
.sheet.on{ transform:translateY(0); }
.sheet-body{ overflow-y:auto; overscroll-behavior:contain; }
.grabber{ width:36px; height:5px; border-radius:2.5px; margin:6px auto 0;
  background:var(--label-3); }
```

**Under `prefers-reduced-motion: reduce`:** every duration goes to `.01ms`, not 0, because 0 can skip `transitionend` in some WebKit versions and hang any JS waiting on it. Sheets appear instantly. `scroll-behavior` becomes `auto`. The focus bars change width instantly. The pool scroll-to-current-block jumps instead of animating. The large title still shrinks on scroll, because that is a layout response to scroll position rather than decoration, but it must track scroll directly with no spring and no overshoot.

If JS ever needs to read the setting: `var reduceMotion = (typeof matchMedia === "function") && matchMedia("(prefers-reduced-motion: reduce)").matches;`. A bare `matchMedia` call throws a `ReferenceError` in the sandbox.

---

## 8. DO NOT TOUCH

Derived from the seam audit and re-confirmed against `verify.js` lines 174 to 234.

**The script tag and its contents**
1. The engine's `<script>` tag stays a bare `<script>` with **no attributes and no interior whitespace**. `<script defer>` and even `<script >` both break extraction at `verify.js:188` and the suite dies with "could not find the app script in index.html".
2. Never write a literal closing script tag inside any string in the engine block. Split it as `"</scr" + "ipt>"` if you ever must.
3. If you add any script block **before** the engine (a theme bootstrap, a tab bar helper), keep the string `WSTRAIN_ENGINE` out of it entirely, comments included. `scripts.find()` at line 189 takes the first match and the suite dies with "Cannot read properties of undefined (reading 'defaultSettings')".
4. **Do not split the engine into a second `<script>` block.** Only one block is loaded into the vm, and in the real app the engine lives in an IIFE at lines 145 to 2128, so a second block cannot see `data`, `APP`, `h()`, `ROLE_LABEL` or any closure state without exporting all of it onto `window`. Divide by section comments inside the existing IIFE instead.
5. **Never add a synchronous top-level `render()` call.** It retroactively drags the whole view layer into the policed surface and fails the suite for reasons that look unrelated to your change.

**Top-level code, the only policed surface**

Statements that run synchronously during `vm.runInContext` and are not inside an `async` function or a promise callback. That is: the top-level `var` initialisers at 173 to 174, 232 to 236, 261 to 330, 1091 to 1092 and 1129, and the `window.WSTRAIN_ENGINE` assignment at 2110. In that code, these all throw and break the suite:

`el.classList`, `el.style.setProperty`, `el.closest`, `el.getBoundingClientRect`, `el.dataset`, `el.matches`, `el.cloneNode`, `el.insertBefore`, `el.replaceChildren`, `document.documentElement`, `document.querySelector`, `document.querySelectorAll`, `document.createDocumentFragment`, `document.createElementNS`, `document.body.classList`, `matchMedia`, `requestAnimationFrame`, `IntersectionObserver`, `ResizeObserver`, `getComputedStyle`, `history`, `location`, `visualViewport`, `AudioContext`.

Inside view functions and event handlers all of those are safe today, because `render()` is only reached through the async `boot()` and a throw there becomes a silently swallowed rejected promise. **Do not rely on that.** It means the view layer is unprotected, not that it is safe. It is why section 9 puts the harness extension first.

**Load-bearing exports**

These eleven names and their signatures are the real contract with `verify.js`. Removing any one fails the suite: `buildSkeleton`, `blocksToItems`, `effectiveWindow`, `asPlainText`, `defaultSettings`, `setData`, `ARCHETYPES`, `FOCUS_ARCHETYPES`, `prosePasses`, `applyAi`, `historyForRepeat`.

Unused by verify and free to drop: `validate`, `costBlocks`, `setReps`, `renderLine`, `pickFocus`, `pickForRole`, `sessionsSinceItem`, `sessionsSinceFamily`, `ROLE_LABEL`, `data`, `renderCard`, `clearApp`. Keep `renderCard` and `clearApp`, because they are the free hook for the smoke test.

**Asserted numbers and strings**

- `renderLine` (717 to 721), `setReps` (707 to 716) and `finaliseAdv` (732 to 750): leave alone unless you intend to change the numbers. `rendered_text` is a tested string format, not free text: the leading `N x D m` shape and its agreement with `distance_m`, `reps` and the Adv lines are all asserted, including by the parse at sections 10, 10b and 10c.
- `asPlainText` (1345 to 1372) is the **only** place UI wording is pinned by a test. Check 12 asserts `txt.includes("Goal:")` (line 1348), `txt.includes("Warm-up")` (1350), `/Total .* planned \d+ min/` (1371) and `!/[—–]/` anywhere. If you reword the export, update `verify.js:669` to `671` in the same commit.
- `applyAi` must keep returning exactly `null`, `"metres"`, `"shape"`, `"prose"` (1102 to 1126).
- The eleven `validate()` warning strings, the two relaxation strings and the thirteen `FALLBACK_NOTE` strings are unasserted but are the highest value copy in the file. None may be lost.

**Things the harness cannot see, so hand-check them**

- **Element ids.** Renaming `<div id="app">` without updating line 173 passes the suite and dies in the real app at `clear(null)`, because `doc.getElementById` returns a fresh `fakeEl` for every call and never null. After the shell restructure, hand-check every `getElementById` string against the static HTML.
- **`innerHTML`.** Setting it on a stub element just sets a property, so children never appear and no assertion can notice. It stays banned by convention. The `html:` branch in `h()` at line 157 has zero call sites and should be deleted so nobody discovers it.
- **CSS class renames.** A selector renamed in CSS only, whose class the script still emits, silently loses its styling with no test signal. Rename in both places or in neither. Two specific sync traps: line 1734 emits `"pblk" + (b.done ? " done" : "")` while `togglePool` at 1760 rebuilds that exact string independently, and `tick()` at 1711 rebuilds `"clock" + …` from scratch, wiping any other class on that element.

**The CSS is completely free.** `verify.js` reads the file only for the extraction regex and never parses CSS or reads a computed style. Rewriting all 116 lines carries zero harness risk.

**Known iOS limitation, do not try to solve:** the Wake Lock API is unavailable in Safari on iOS, so the screen cannot be kept awake. He sets Auto-Lock to 5 minutes.

---

## 9. Migration order

Nine commits. Each one leaves the app working and `node verify.js` ending "All checks passed".

### 9.1 Commit 1: extend the harness, before touching the app

`verify.js` only. Two edits, both already tested against the unmodified `index.html`, so this commit passes today and costs nothing.

1. Append a smoke test before the final banner at line 716, using the already-exported hooks: `E.clearApp(); E.renderCard(results[3], true);` and a second call with `Object.assign({}, sk, {saved:true, id:9, status:"done"})`, both in try/catch, reported through `ok()` and `bad()`.
2. Replace `fakeEl` at lines 174 to 186 so `style` becomes `{ setProperty(k,v){ el.style[k]=v; }, removeProperty(k){ delete el.style[k]; } }`, plus `el.dataset = {}` and a real `classList` backed by `className` with `add`, `remove`, `toggle` and `contains` that split and rejoin the string. Keep every existing key. Keep `querySelector` returning null and `querySelectorAll` returning `[]`: that is what makes a bogus element lookup fail loudly.

This turns "the numbers are right" into "the numbers are right and both cards paint", and it lifts the `classList` and `dataset` ban across the whole engine including the top level. **Land it first.** Everything after this point is protected by it. Verified: with the extension in place, a genuine throw planted in `blockCard` still fails, and `document.body.querySelector(".x").append(…)` still fails on null. The extension adds no fallback and no auto-vivifying behaviour.

### 9.2 Commit 2: correctness, no visual change

Independent of styling, and it makes the numbers true before they are restyled.

- Retired sets filter at lines 1840 to 1846 gains `|| x.active === false`, and the three counts at 1881, 1986 and 2020 gain `&& x.active !== false`.
- Regenerate: wire `opts(true)` from a new action, with a confirm sheet. The alert at line 1156 already promises this control and `replace:true` is produced nowhere in the file.
- Toast: add the pool variant and fix the z-index.
- Extract `warmupText()` and call it from all four sites (1259, 1350, 1593, 1729).
- Ending minutes read from `S.game_minutes` and `S.cooldown_minutes` at 1602 and 1746. Line 1366 changes the number only, not the format, because check 12 asserts around it.
- `hydrate` keeps the warm-up item: add `warmItemId` and `warmDone` from the `warm` row it already finds at line 1315.
- Delete the dead `html:` branch in `h()`.

Run verify. Nothing here is asserted, but the smoke test from commit 1 now covers the card paths.

### 9.3 Commit 3: tokens, dark mode, touch hygiene. CSS only.

Replace lines 15 to 130 wholesale with sections 1, 3.1 and 6 of this spec. No markup change, no JS change. All five bare `:hover` rules get wrapped in `@media (hover:hover) and (pointer:fine)` and gain `:active` twins. `-webkit-tap-highlight-color:transparent` and `touch-action:manipulation` go global. Add the paired `theme-color` meta tags.

The app is dark-capable and contrast-correct at the end of this commit, with the old markup. That is deliberate: it is the highest value per unit of risk in the whole plan, and it is the one commit that cannot break the suite.

### 9.4 Commit 4: the shell

Static HTML for the top bar, tab bar, scrim and sheet frame. Delete `header` (134 to 138) and the `nav.tabs` build in `render()` (1470 to 1474). Add the tab wiring, the scroll listener, the `focusin`/`focusout` keyboard class, and the print hide list. Move `#who` into a placeholder Settings sheet.

**Risk sits here.** Element ids are invisible to the harness, so hand-check every `getElementById` string, and open the app in a real browser before committing.

### 9.5 Commit 5: pool view

Isolated to `renderPool` (1697 to 1757), `togglePool` (1758 to 1764) and the `#pool` CSS. New: `splitCall`, `restLines`, the drift computation, the current-block pointer, the collapsed state, the tick strip and `armTick`.

**This is the highest risk commit, and all of the regression risk in the whole plan sits in `armTick`.** Confine it to the allowlist: `className` string assignment, `textContent`, `value`, `append`, `appendChild`, `removeChild`, `addEventListener`, `removeEventListener` including `pointerdown`/`pointerup`/`pointercancel`, `setAttribute`, `getAttribute`, `remove`, `focus`, `select`, `contains`, `Object.assign` onto `style`, `setTimeout`, `clearTimeout`, `Date.now`. Guard `AudioContext`. Guard `matchMedia`. Do not reach for `requestAnimationFrame`.

Test on his actual phone with wet hands before moving on. Everything else can be checked in a desktop browser; this cannot.

### 9.6 Commit 6: Today

Session setup sheet, hero card, stat strip, action list, banner weighting, reps sheet, skeleton. `renderToday` and `renderSessionCard` are both free to restructure at any nesting depth.

### 9.7 Commit 7: History, Library, Insights

Grouped inset lists, the session detail route (`view.name = "session"` plus `view.from`), the set detail screen, the search-term persistence, the Ask Claude sheet, the Library filter sheet, the Insights reordering and empty state.

### 9.8 Commit 8: Settings sheet

Extract the five setting rows, add the stepper rows, add the four switches (Bigger text, Night pool, Tick sound, Solid backgrounds), add the account rows.

### 9.9 Commit 9: accessibility and Dynamic Type

`:root{font:-apple-system-body}` and the rem ladder. `aria-label` on every input and tab. `aria-current` on the active tab. `role="button"`, `tabindex="0"` and `aria-pressed` on every tappable row and the tick strip. `aria-live="polite"` on the banner region. `aria-hidden` on the ticking clock digits. `:focus-visible` rings at 3px with 2px offset. One heading per view instead of the single `h1`.

Do this last so the semantics are added once, to final markup, rather than three times.

### 9.10 Copy changes to clear with Vlad before shipping

1. The "two 5s in a row" sentence at line 1671 describes behaviour that does not exist. Change the copy or build the feature.
2. The "six sessions" promise at line 1553 is not literally true, because `effectiveWindow` shrinks the window to half the role pool size.
3. The safety tag labels currently render raw database strings. His practice is the reference for the wording, especially for underwater work.
4. Pool view staying white in dark mode is a legibility decision, not a preference. Confirm it rather than assume it, and offer the manual Night pool switch either way.
5. `window.print()` inside an iOS standalone PWA: confirm it still does something useful on his phone, or drop the button.