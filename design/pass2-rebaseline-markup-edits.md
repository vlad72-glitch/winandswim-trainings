# rebaseline-markup-edits

## Verdict counts

**17 of 24 still apply.** 3 are fully superseded by pass 1 and should be deleted from the plan (edits 1, 9, 10). 2 are partly superseded (21, 22). 2 have to be restructured because pass 1 rewrote the region they targeted (2, 24).

The 7 whose `before` no longer exists are exactly 1, 2, 9, 10, 21, 22 and 24, which matches the mechanical count you were given.

## The dangerous category, ranked

These `after` texts would undo work pass 1 landed. Read these before applying anything.

**1. Edit 2, worst by a wide margin.** Pasting `design/draft-stylesheet.css` verbatim reintroduces **blocker 3**: draft css:167 bundles `prefers-contrast` with `prefers-reduced-transparency` and hardcodes `--label:#000000`, which is the black-on-black dark mode bug pass 1 split into three blocks to fix (index.html:118-126). It also reverts `button.good` to using the pale text token as a fill (draft css:352 vs index.html:176), drops the three `.login` rules pass 1 added, and has no counterpart for the `" ✓ done"` pool tick. Edit 2 has to be rebuilt as a merge, not a paste.

**2. Edit 22.** Its after is `h("pre",{class:"small"},`, which strips the `codeblock` class pass 1 added at index.html:1698. There is no bare `pre` rule in the current sheet, so the SQL block loses its background and its sideways scroll. Its risk field also tells you to swap the login card's class to `bordered`, which would drop pass 1's `.login` full-width fix.

**3. Edit 9.** Its after calls `isActive(x)`, which does not exist. Pass 1 landed the identical predicate as `isLive` (index.html:691-693) and wired it into 7 places. Applying edit 9 as written throws ReferenceError on every Library paint; applying its risk field adds a duplicate predicate. Edits 18 and 19 also name `isActive` in their bodies and need the same rename.

**4. Edit 8.** Its after moves the toast's fixed positioning into a `.toast` class that does not exist yet. Land it alone and every toast in the app renders inline at the bottom of `<body>`, invisible.

**5. Edit 12.** It stops emitting `.pline` and stops writing `clock.className`, which orphans pass 1's pool typography (index.html:301, 312) and kills the behind-schedule inversion (index.html:291) with nothing styled to replace them. Pass 1's `.prole::after` tick does survive, so you get two ticks on a done block.

**6. Edit 21.** Pass 1 already replaced the false adaptive-volume sentence, in index.html:1867 **and** SETUP.md:233-235. Edit 21's after substitutes a different truthful sentence. That is a wording decision for Vlad, not a fix, and changing it means changing SETUP.md too.

## Two hazards the design review did not catch

- **index.html:2206** passes `growLibrary` as a bare `onclick` handler. The moment edit 18 changes the signature to `growLibrary(role, focus, count)`, `role` becomes a click Event. Edits 18 and 19 have to land together.
- **index.html:2092** still references `var(--accent-ink)`, a token pass 1 deleted. It is the only dangling token reference in the file. Edit 18's `openSetSheet` fixes it as a side effect, so patch it by hand if you land only part of 18.

## Harness reality check

`node verify.js` passes on the current file. But the suite never calls `renderCard`, `clearApp` or any render path, and there is no name-presence assertion, so edit 23's risk field ("verify checks that eleven names are present") is wrong and every risk field that says "the suite catches a throw here once harness commit 1 has landed" is describing work that has not been done. Edits 7, 12, 13 and 20 currently have no net.

Every line number below is against the current 2333-line file. Every quoted anchor I give was checked for exactly one occurrence.

## Items

### 1. Edit 1, theme-color meta  [already-fixed-by-pass-1]

Before is gone; `<meta name="theme-color" content="#0284c7">` no longer exists. Pass 1 landed the after VERBATIM at index.html:10-11. Nothing to do. Delete this edit from the plan.

### 2. Edit 2, replace the whole <style> block  [danger-undoes-pass-1 (and half superseded)]

Before is gone: the old `:root{ --bg:#f3f6f8; ...}` token block was replaced by pass 1. New range: everything between `<style>` (index.html:16) and `</style>` (index.html:319), so content lines 17 to 318.

New opening anchor, unique:
```
<style>
  /* ==========================================================================
     Tokens, in three groups on purpose.
```
New closing anchor, unique:
```
  @media print{
    nav.tabs,button,header .spacer{display:none !important;}
    body{background:#fff;color:#000;}
    .card,.blk{box-shadow:none;border-color:#999;}
  }
</style>
```

DO NOT paste design/draft-stylesheet.css verbatim. Four concrete regressions:
1. BLOCKER 3 comes back. Draft css:167 is `@media (prefers-contrast: more), (prefers-contrast: high), (prefers-reduced-transparency: reduce){ :root{ --label:#000000; --label-2:#2b343c; --label-3:#4a545e; ... } }`. Pass 1 split that into three blocks at index.html:118-126 precisely so Reduce Transparency in dark mode cannot paint #000 labels on #000. Keep pass 1's split and move only the glass and scrim tokens into the shared block.
2. Draft css:352 is `button.good{ background:var(--good); border-color:var(--good); color:#fff; }`. Pass 1 split good into `--good` (text on a tint) and `--good-fill` (button fill) at index.html:69,109 and wrote `button.good{background:var(--good-fill);color:var(--on-good);}` at index.html:176. The draft's version is white on dark `--good:#8ce8b2`, about 1.6:1. Keep pass 1's rule and add `--good-fill`/`--on-accent`/`--on-good` to the draft's token blocks, they are absent from the draft.
3. Draft css has NO `.login` rule. Pass 1's `.login input{width:100%}`, `.login .row{display:block}`, `.login .row button{width:100%;min-height:var(--ctl-h-lg)}` at index.html:220-222 are the login-field-width fix. The draft's global `input{width:100%}` at css:397 covers the fields but not the button. Carry the three `.login` rules across.
4. Pass 1's pool done marker `#pool .pblk.done .prole::after{content:" ✓ done";font-weight:800;}` (index.html:298) has no counterpart in the draft, which marks done with a strikethrough on `.pcall` instead (css:739-744). Decide which one ships; if both survive alongside edit 12's `✓` in `.mk` you get two ticks and a strikethrough on the same row.

Also still unfixed in the draft and reviewed as defects: blocker 4 (`.sheet.pool button{margin-top:var(--s-3)}`, 12px between "Mark done and close" and "Just close"), blocker 6 (`.irow.good .r-1` vs `button.good`), minor 3 and 7 (`prefers-contrast: high` is not a valid value).

### 3. Edit 3, delete the html: branch in h()  [still-applies]

Matches exactly once at index.html:346: `      else if (k === "html") e.innerHTML = v;`. Re-confirmed zero call sites: `grep -n "html:" index.html` returns nothing. Safe, unchanged by pass 1.

### 4. Edit 4, static shell markup  [still-applies, hard-gated on edit 2]

Matches exactly once at index.html:322-329, unchanged by pass 1.

Gate: none of `.topbar`, `.tabbar`, `.largetitle`, `.scrim`, `.sheet`, `.grabber`, `.barbtn`, `.tab`, `.lbl`, `.glass`, `.gone` exists in the current stylesheet (I grepped lines 16-319 for each; all zero). With pass 1's sheet only, this edit puts an unstyled `.scrim` and an always-open `.sheet` into normal document flow at the bottom of every page, and `class="barbtn gone"` hides nothing. Edit 4 cannot land before the shell CSS from edit 2.

The eleven ids to hand-check against edit 5: topbar, topbar-title, bar-left, bar-right, largetitle, tabbar, scrim, sheet, sheet-head, sheet-body, plus tab-today/tab-history/tab-library/tab-insights. The harness cannot see an id typo: verify.js `doc.getElementById(){ return fakeEl(); }` never returns null.

### 5. Edit 5, shell refs and helpers  [still-applies]

Matches exactly once at index.html:362-363. Harness re-checked against the current verify.js stub: `document.createTextNode` exists (verify.js:218), `doc.body` is a fakeEl with a writable `className` (verify.js:219), `win.addEventListener` and `doc.addEventListener` are no-ops (verify.js:209,219), `el.onclick` is a plain property write. `window.pageYOffset` is NOT in the vm context, but `onScroll` only ever runs from a scroll event that never fires. `clear` is defined at index.html:361, above the insertion point, so `setBar` can call it.

Cosmetic only: `stat()` emits `.val` and `.lbl`, which the current sheet styles only as `.tile .val` / `.goalbox .lbl`, so stats render unstyled until edit 2.

### 6. Edit 6, view/setup/hist state  [still-applies]

Matches exactly once at index.html:436: `  var view = { name:"today" };`. The companion insertion point from the risk field has moved: `var lib = { q:"", role:"", focus:"", showProposed:false };` is now at index.html:441, not 252. Add `var hist = { q:"" };` after that line.

### 7. Edit 7, render()  [still-applies, conflicts with edit 20]

Matches exactly once. New range: index.html:1637 to 1676 inclusive, the whole of render(). Body verified identical to the draft's before.

CONFLICT: edit 7's after keeps `renderWho();` as the first statement of the new render(). Edit 20 deletes that call, `var WHO` and `<span id="who">`. If you apply 7 then 20, you must strip `renderWho();` out of the NEW body too, not the old one. Missing that leaves `clear(undefined)` throwing in the browser while verify.js stays green, since the stub's getElementById never returns null.

Cosmetic: the after emits `class:"banner warn strip"`. The current sheet has `.banner`, `.banner.ok`, `.banner.info` only (index.html:225-227), no `.banner.warn` and no `.strip`, so the offline banner renders as a plain amber box until edit 2. Not a regression, just no edge-to-edge.

### 8. Edit 8, toast()  [still-applies, but gated on edit 2]

Matches exactly once at index.html:1600-1607, unchanged by pass 1.

WARNING: the after drops the inline `position:fixed; left:50%; transform:translateX(-50%); bottom:24px; zIndex:99` and the `banner ok` class, and relies entirely on a `.toast` class. `.toast` does not exist anywhere in the current stylesheet. Land this edit alone and every toast becomes an unstyled div appended to the end of `<body>`, in normal flow, below the fold and invisible. "Copied.", "Saved.", "Marked done." all go silent. Land the `.toast` / `.toast.pool` rules in the same commit or keep the inline styles until edit 2.

### 9. Edit 9, isActive row filter  [superseded]

Before is gone. Pass 1 landed exactly this fix under a different name. index.html:2036-2037 now reads:
```
      var rows = data.library.filter(function(x){
        if (!isLive(x)) return false;
```
and the predicate is at index.html:691-693: `function isLive(x){ return x.active !== false && (x.status || "active") === "active"; }`, functionally identical to the proposed `isActive`.

DANGER if applied as written: the after (`if (!isActive(x)) return false;`) references a function that does not exist, so renderLibrary throws ReferenceError on every paint. Applying the risk field's instruction instead adds a second predicate with the same body. Drop this edit entirely and use `isLive` in all the later edits (18 and 19 both name `isActive` in their bodies, so fix those too).

### 10. Edit 10, the three library counts  [superseded]

Before is gone at all three sites; pass 1 already substituted `isLive`:
- index.html:2077 `        h("span",{class:"badge"}, data.library.filter(isLive).length + " sets"),`
- index.html:2182 `      tile("Library", String(data.library.filter(isLive).length), "active sets")`
- index.html:2216 `        data.library.filter(isLive).length + " have never come up."),`
Also at index.html:2047 inside the roleCounts loop and 2210 in the never-used filter. Drop this edit.

### 11. Edit 11, hydrate warm fields  [still-applies]

Matches exactly once at index.html:1529: `      warmup_minutes: warm ? (data.settings.warmup_minutes||10) : (data.settings.warmup_minutes||10),`. Both branches still identical, and it still throws when `data.settings` is null, so the collapse plus `warmItemId`/`warmDone` is still the right change.

### 12. Edit 12, pool view rebuild  [still-applies, orphans two pass-1 fixes]

Before matches exactly once at index.html:1887. New range: index.html:1887 to 1960 inclusive (the `// ---- Pool view ---` comment, startPool 1888-1892, renderPool 1893-1953, togglePool 1954-1960), stopping before the blank line at 1961 and the History comment at 1962. End anchor, unique:
```
  async function togglePool(b, el){
    b.done = !b.done;
    el.className = "pblk" + (b.done ? " done" : "");
```

Two pass-1 fixes go dead if this lands before the pool CSS:
1. `#pool .pblk .pline{font-size:1.85rem}` (index.html:301) and its 1.55rem mobile override (index.html:312) are pass 1's pool type. Edit 12 stops emitting `.pline` and emits `.pcall` / `.pqual` / `.prest` instead. None of those has a rule, so the whole deck drops to body size. That is the one thing pool view exists for.
2. `#pool .clock.behind{background:var(--p-ink);color:var(--p-paper);...}` (index.html:291) is pass 1's behind-schedule inversion, and index.html:1907 is the only writer of that class. Edit 12 never writes `clock.className` again; lateness moves to a `.drift` / `.drift.late` element that has no rule. So the behind-schedule signal disappears completely.
Pass 1's `#pool .pblk.done .prole::after{content:" ✓ done"}` DOES survive (edit 12 keeps `.prole` and `.pblk.done`), and it will show alongside the new `✓` in `.mk`. Two ticks.

Still open from the review: blocker 5, renderPool does not remove the previous `#pool`, so add `var old = document.getElementById("pool"); if (old) old.remove();` as its first statement. Blocker 4 and major 22 (askClosePool order and the frozen overlay when `sk.id` is null) are both unfixed in this edit's text.

Harness: `AudioContext` and `webkitAudioContext` are absent from the vm context, and the `typeof` guards handle that. `poolEl.scrollTop` is a plain read and write on the stub. Confirmed inside the allowlist.

### 13. Edit 13, renderSessionCard  [still-applies]

Before matches exactly once at index.html:1755-1758. Full replacement range: index.html:1755 to 1806 inclusive, ending on `    if (sk.saved) APP.append(feedbackCard(sk));` at 1805 and the closing `  }` at 1806. Keep `tile()` at index.html:1808-1811, Insights still calls it until edit 19.

Blocker 6 still bites: the after emits `irow({ title:"Save", tone:"good" })`, which builds `class="irow tap good act"`. Pass 1's `button.good{background:var(--good-fill);color:var(--on-good)}` (index.html:176) at (0,1,1) beats a future `.irow{background:transparent}`. Emit `tone:"r-good"` and name the row rules `.irow.r-good` per the review fix, before the sheet's section 9 lands.

### 14. Edit 14, blockCard  [still-applies]

Before matches exactly once at index.html:1818-1821. The function is index.html:1813-1836. `var rest = restText(b), a1 = advText(b,1), a2 = advText(b,2);` to trim is at index.html:1814. The rep nudge span to replace is index.html:1832-1834. The safety tag map to fix is index.html:1830-1831, still the single-underscore `t.replace("_"," ")`.

Gate: `.blk .call`, `.blk .rest`, `.blk .qual` and `.blk .blkact` have no rules in the current sheet, only `.blk .line` (index.html:243). So the set line loses its weight and size until edit 2. `SAFETY_LABEL` needs Vlad's sign-off on the wording, especially `underwater`, given his practice.

### 15. Edit 15, asPlainText ending minutes  [still-applies]

Matches exactly once at index.html:1562: `      L.push((e.block_role === "game" ? "Game (10 min)" : "Cool-down (5 min)") + ": " + e.rendered_text);`. I re-ran `node verify.js` on the current file: all checks pass, and the four export assertions at verify.js:669-672 (`Goal:`, `Warm-up`, `/Total .* planned \d+ min/`, no em or en dash) are all insensitive to the digits inside the brackets. Safe.

### 16. Edit 16, renderToday  [still-applies, one copy decision open]

Before matches exactly once at index.html:1707-1709. Full replacement range: index.html:1707 to 1753 inclusive.

The sentence the edit rewrites is still there, untouched by pass 1, at index.html:1749: "Press the button. The app picks a focus you have not done recently, fills the 45 minutes from the library, and never repeats a set inside six sessions." The same overclaim also sits at index.html:2200 in Insights ("sooner than six sessions"), which edit 19's risk field asks you to keep verbatim as a footnote. Decide once and apply to both, or the two screens will contradict each other.

Order: blocker 7 still holds. This edit calls `openSettings`, which edit 20 defines. Land 20 first.

### 17. Edit 17, renderHistory  [still-applies]

Before matches exactly once at index.html:1963-1965. Full replacement range: index.html:1963 to 2007 inclusive, which is the function plus the Quick look card at 2002-2006. `weekLabel` at index.html:2008-2013 stays.

Two bits of content the after silently drops from each row: the coach name (`coach ? coach.display_name : null`, index.html:1980,1990) and the Claude/library engine badge (index.html:1994). Both may be deliberate, but they are not mentioned in the edit, so confirm.

### 18. Edit 18, library sheets  [still-applies, two new hazards]

Before matches exactly once at index.html:2105-2108, `toggleActive` with its `confirm()`. Rebased line numbers for everything the risk field asks for: renderLibrary is index.html:2016-2104, `setStatus` is 2109-2111, `growLibrary` is 2113-2150, `thinRoles` is 2151-2166.

HAZARD 1, not in the review. index.html:2206 is `tb.append(h("button",{class:"primary small",disabled:offline,onclick:growLibrary},"Ask Claude for new sets"));`. That passes `growLibrary` as a bare handler reference, so it is called with the click Event as its first argument. The moment you change the signature to `growLibrary(role, focus, count)` and before edit 19 replaces that button, `role` becomes an Event object: `role || "main_set"` is truthy, the `existing` filter returns nothing, and an Event gets serialised into the AI payload. Fix index.html:2206 in the same commit as the signature change, or land 18 and 19 together.

HAZARD 2, a pass-1 leftover this edit happens to fix. index.html:2092 is `x.cue ? h("div",{class:"small",style:{color:"var(--accent-ink)"}}, x.cue) : null,`. `--accent-ink` was deleted by pass 1; the token is now `--accent-text`. It is the only dangling token reference left in the file, and `openSetSheet` replaces that line. If you land only the `toggleActive` part of edit 18, patch 2092 by hand.

Also: the edit's `askLibFilter` body calls `isActive(x)`. Change it to `isLive(x)` per edit 9.

### 19. Edit 19, renderInsights  [still-applies]

Before matches exactly once at index.html:2168-2169. Rebased ranges for the risk field: the four tiles are index.html:2178-2183, the focus balance card 2185-2194, the thin roles block 2196-2208, the never-used / most-used card 2210-2222, the Settings card to delete 2224-2231, and `settingRow` to delete 2233-2243. The "computed and thrown away" variable is `var stale` at index.html:2210, still unused past line 2215.

Order: depends on edit 20 for `openSettings` and edit 18 for `askClaude` and `openSetSheet` (blocker 7).

### 20. Edit 20, Settings sheet, delete renderWho  [still-applies]

Before matches exactly once at index.html:1622-1630. All three deletion line numbers in the `where` field are stale. Rebased:
- `var WHO = document.getElementById("who");` is index.html:363, not 174.
- `renderWho()` itself is index.html:1622-1630, not 1426-1434.
- the `renderWho();` call is index.html:1638, not 1442. If edit 7 has already landed, the call is the first line of the NEW render() body instead. Check both.
- `<span id="who"></span>` in the static markup is index.html:326 today, or the `<span id="who" hidden></span>` line from edit 4 if that has landed.

Harness: `openSettings` and `switchRow` only run from click handlers, and `box.checked = !!on` is a plain property write on the stub, so nothing here is on the policed top-level surface. Land this immediately after edit 5, before 16, 18 and 19.

### 21. Edit 21, feedbackCard  [partly-superseded, needs-decision on wording]

Before is gone. Pass 1 already deleted the false adaptive-volume sentence. index.html:1865-1867 now reads:
```
      h("div",{class:"row"},
        h("button",{onclick:function(){ saveNote(sk, note.value); }},"Save note"),
        h("span",{class:"tiny muted"},"Saved with the session, so you can look back at what landed hard.")));
```
Use that as the new before. The structural half of the edit (44px segmented control, the note and its button on their own rows) still applies; the function is index.html:1854-1868.

DECISION: the after replaces pass 1's sentence with a different one, "The rating is saved with the session so you can see later which ones were too hard." Both are truthful, but pass 1's wording is already live AND mirrored in SETUP.md:233-235 ("can look back at what landed hard"). Keep the landed sentence unless Vlad prefers the new one, and if he does, change SETUP.md in the same commit.

The risk field's textarea note is already handled: index.html:1855 passes `sk.note || ""` as a child, so only the aria-label is missing.

### 22. Edit 22, login, not-a-coach, load-failed  [partly-superseded and danger-undoes-pass-1]

Before is gone. Pass 1 replaced the inline `background:#f5f8fa` with a class. index.html:1698 now reads `      h("pre",{class:"small codeblock"},`.

DANGER: the after is `h("pre",{class:"small"},`, which strips `codeblock`. The current stylesheet has NO bare `pre` rule; the nested background, radius and `overflow-x:auto` live only in `.codeblock` at index.html:212-215. Applying the after as written leaves the SQL statement unboxed and non-scrolling, undoing pass 1's minor fix. The draft stylesheet does carry a bare `pre` rule (css:217), so the after is only correct AFTER edit 2 lands, and even then keeping `codeblock` costs nothing. Recommendation: leave index.html:1698 alone.

Rebased ranges for the rest: renderLogin is index.html:1678-1690 (not 1482-1494), renderNotCoach is 1692-1704 (not 1502), afterLoadFailed is 2282-2298 (not 2095-2101). The login error to map is `loginError` at index.html:1686.

Second danger: index.html:1682 is `APP.append(h("div",{class:"card stack login",...}` and the risk field says to give it class "bordered". Pass 1's `login` class is what carries `.login .row{display:block}` and `.login .row button{width:100%;min-height:var(--ctl-h-lg)}` at index.html:220-222. The draft stylesheet has no `.login` rule at all. Keep `login` on the card and add `bordered` to the two inputs, do not swap one for the other.

### 23. Edit 23, export the pool string helpers  [still-applies, risk field is wrong]

Matches exactly once at index.html:2319-2320. Safe to apply.

Correction to the risk field: it claims "verify checks that eleven names are present". It does not. The current verify.js touches only `E.buildSkeleton`, `E.validate`, `E.costBlocks`, `E.setReps`, `E.renderLine`, `E.effectiveWindow`, `E.historyForRepeat`, `E.sessionsSinceItem`, `E.blocksToItems`, `E.asPlainText`, `E.defaultSettings`, `E.ARCHETYPES`, `E.FOCUS_ARCHETYPES`, `E.prosePasses`, `E.applyAi`, `E.setData`. It never calls `renderCard` or `clearApp`, and there is no presence assertion of any kind. Adding exports cannot break the suite, but it also buys nothing until the smoke test exists.

### 24. Edit 24, delete stylesheet section 15  [stale, restructure into 8 deletions]

Before is gone. Pass 1's sheet has no section-15 header comment; the old class rules are dispersed through it. The eight real targets, all verified unique:
1. index.html:145-147 `header{...}`, `header h1{...}`, `header .spacer{flex:1;}`. Freed by edit 4.
2. index.html:157-161 `nav.tabs{...}`, `nav.tabs button{...}`, `nav.tabs button.active{...}`. Freed by edit 7.
3. index.html:254-260 `.hrow`, `.hrow:last-child`, `.hrow:active`, the hover media query, `.hdate`, `.hmain`, `.htitle`. Freed by edit 17.
4. index.html:263-265 `.lrow`, `.lrow:last-child`, `.lrow .lmain`. Freed by edit 18.
5. index.html:266-267 `.filters`, `.filters input[type=search]`. Freed by edits 17 and 18 together (both still emit `class:"filters"`, at 1999 and 2102).
6. index.html:291 `#pool .clock.behind{...}`. Freed by edit 12.
7. index.html:301 `#pool .pblk .pline{...}`. Freed by edit 12.
8. index.html:312 `#pool .pblk .pline{font-size:1.55rem;}` inside the 560px media query, and the `nav.tabs,button,header .spacer` selector list in the print block at index.html:315.

DO NOT delete `.tiles` / `.tile` (index.html:229-233), `.bar` (268-269) or `.blk .line` (243). They are pass 1 rules, not section-15 relics, and the draft carries them in its own sections 10 and 11.

Run the review's gate first and treat it as a blocker: `grep -c 'class:"\(lrow\|lmain\|filters\|hrow\|hdate\|hmain\|htitle\|tabs\|pline\)' index.html` must return 0. Right now it returns non-zero at index.html:1666, 1926, 1932, 1943, 1981, 1984, 1985, 1986, 1999, 2055, 2056, 2088, 2089, 2102.

### 25. Cross-cutting: harness commit 1 never landed  [needs-decision]

Several risk fields lean on a smoke test that does not exist. `node verify.js` on the current file ends with "All checks passed. 2400 simulated sessions, 147 library sets.", but the harness never calls `renderCard`, `clearApp`, `render`, `startPool` or `renderPool`, and its fakeEl (verify.js:174-186) has no classList, innerHTML, dataset, closest, getBoundingClientRect, cloneNode, insertBefore or style.setProperty. So edits 7, 12, 13 and 20 currently have NO net at all: a throw inside any of them is invisible to the suite. Write the smoke test before edit 12, not after.

### 26. Cross-cutting: edit 7 and edit 20 both own render()'s first line  [needs-decision]

Edit 7's after reinstates `renderWho();` at the top of the new render(). Edit 20 removes that call plus `var WHO` (index.html:363) and the `#who` span. Whichever lands second must be applied against the other's output, not against the draft's before. This is the exact failure mode the review calls out as invisible to the harness: `clear(undefined)` throws in Safari while `doc.getElementById` in the stub happily returns a fresh object.

### 27. Cross-cutting: recommended landing order for the 17 live edits  [still-applies]

1, 9, 10 are dead. 2 must be rebuilt as a merge of pass 1's tokens with the draft's structure, and it must land first because 4, 8, 12, 13, 14, 16, 17, 18, 19, 20 and 21 all reference classes that do not exist yet. Then 3, then 4 and 5 together, then 20 (blocker 7), then 6, 7, 8, 11, 12, then 13 and 14, then 15, 16, then 18 and 19 together (the growLibrary signature), then 17, then 21, then 22 minus its `pre` change, then 23, then 24 last with the grep gate green.

