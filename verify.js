/* Win and Swim Training Generator — verification harness.
   Run with:  node verify.js

   Loads the seed library straight out of supabase-schema.sql and the engine
   straight out of index.html, then drives 200 simulated sessions through it.
   No browser, no database, no network. This is the check that proves the two
   things Vlad actually cares about: the hour comes out right, and a set does
   not come back too soon. */

"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OK = "✓", BAD = "✗";
let failures = 0;
function ok(msg){ console.log("  " + OK + " " + msg); }
function bad(msg){ console.log("  " + BAD + " " + msg); failures++; }
function check(cond, good, badMsg){ cond ? ok(good) : bad(badMsg || good); }

// ---------------------------------------------------------------------------
// 1. Parse the seed data out of supabase-schema.sql
// ---------------------------------------------------------------------------
function stripComments(sqlRaw){
  let out = "", inq = false;
  for (let i = 0; i < sqlRaw.length; i++){
    const c = sqlRaw[i];
    if (inq){
      if (c === "'"){
        if (sqlRaw[i+1] === "'"){ out += "''"; i++; continue; }
        inq = false;
      }
      out += c; continue;
    }
    if (c === "'"){ inq = true; out += c; continue; }
    if (c === "$" && sqlRaw.slice(i, i+2) === "$$"){
      const j = sqlRaw.indexOf("$$", i+2) + 2; out += sqlRaw.slice(i, j); i = j - 1; continue;
    }
    if (c === "-" && sqlRaw[i+1] === "-"){ while (i < sqlRaw.length && sqlRaw[i] !== "\n") i++; continue; }
    out += c;
  }
  return out;
}
function splitTop(s){
  const out = []; let buf = "", depth = 0, inq = false;
  for (let i = 0; i < s.length; i++){
    const c = s[i];
    if (inq){
      if (c === "'"){
        if (s[i+1] === "'"){ buf += "''"; i++; continue; }
        inq = false;
      }
      buf += c; continue;
    }
    if (c === "'"){ inq = true; buf += c; continue; }
    if (c === "(" || c === "[") depth++;
    if (c === ")" || c === "]") depth--;
    if (c === "," && depth === 0){ out.push(buf.trim()); buf = ""; continue; }
    buf += c;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}
function tuplesOf(body){
  const res = []; let depth = 0, buf = "", inq = false;
  for (let i = 0; i < body.length; i++){
    const c = body[i];
    if (inq){
      if (c === "'"){
        if (body[i+1] === "'"){ buf += "''"; i++; continue; }
        inq = false;
      }
      buf += c; continue;
    }
    if (c === "'"){ inq = true; buf += c; continue; }
    if (c === "("){ depth++; if (depth === 1){ buf = ""; continue; } }
    else if (c === ")"){ depth--; if (depth === 0){ res.push(buf); continue; } }
    if (depth >= 1) buf += c;
  }
  return res;
}
function parseVal(v){
  v = v.trim();
  if (/^null$/i.test(v)) return null;
  if (/^true$/i.test(v)) return true;
  if (/^false$/i.test(v)) return false;
  if (/^'\{\}'$/.test(v)) return [];
  const arr = v.match(/^array\s*\[(.*)\]$/is);
  if (arr) return splitTop(arr[1]).map(parseVal);
  if (/^'/.test(v)) return v.slice(1, -1).replace(/''/g, "'");
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}
function parseInsert(sql, table){
  const re = new RegExp("insert into public\\." + table + "\\s*\\(([^;]*?)\\)\\s*values(.*?)on conflict", "is");
  const m = sql.match(re);
  if (!m) return [];
  const cols = splitTop(m[1]).map(s => s.trim());
  return tuplesOf(m[2]).map(t => {
    const vals = splitTop(t).map(parseVal);
    const row = {};
    cols.forEach((c, i) => row[c] = vals[i]);
    return row;
  });
}

const sql = stripComments(fs.readFileSync(path.join(ROOT, "supabase-schema.sql"), "utf8"));
const exercises = parseInsert(sql, "tr_exercises").map((r, i) => Object.assign({
  id: i + 1, active: true, status: "active", group_level: "advanced",
  times_used: 0, last_used_on: null, no_repeat_override: null
}, r));
const focuses = parseInsert(sql, "tr_focuses").map(r => Object.assign({
  active: true, group_level: "advanced"
}, r));
const games = parseInsert(sql, "tr_games").map((r, i) => Object.assign({
  id: i + 1, active: true, minutes: 10, times_used: 0
}, r));

// per-role overrides come from the UPDATE statements, not the INSERT
exercises.forEach(x => {
  if (x.role === "activation" || x.role === "cooldown") x.no_repeat_override = 2;
  if (x.role === "sprint_set" || x.role === "open_water") x.no_repeat_override = 3;
  x.whole_body = ["MS-800-3","MS-LADDER-2-16","MS-100-ARMS-LEGS-STROKE","MS-PYRAMID-SPRINT",
                  "MS-300-BRFR-4","MS-25-50-100-3","KS-LEGS-LADDER"].includes(x.code);
});

console.log("\n=== 1. Seed data parsed from supabase-schema.sql");
check(exercises.length >= 100, exercises.length + " exercises", "only " + exercises.length + " exercises parsed");
check(focuses.length >= 12, focuses.length + " focuses", "only " + focuses.length + " focuses");
check(games.length >= 8, games.length + " games", "only " + games.length + " games");

const roleCounts = {};
exercises.forEach(x => roleCounts[x.role] = (roleCounts[x.role] || 0) + 1);
console.log("  roles: " + Object.keys(roleCounts).sort().map(r => r + "=" + roleCounts[r]).join(" "));

// every exercise must have the fields the engine and the card depend on
let missing = 0;
exercises.forEach(x => {
  if (!x.code || !x.name || !x.role || !x.structure || !x.cue || !x.distance_m) missing++;
  if (x.reps && x.rep_distance_m && x.reps * x.rep_distance_m !== x.distance_m){
    // his structures are not all pure N x D (mixed rounds), so only warn loudly
    // when it is badly off, which would break the metre budget
    if (Math.abs(x.reps * x.rep_distance_m - x.distance_m) > x.distance_m * 0.15){
      bad("distance does not multiply out: " + x.code + " " + x.reps + " x " + x.rep_distance_m + " != " + x.distance_m);
    }
  }
});
check(missing === 0, "every exercise has code, name, role, structure, cue and distance",
      missing + " exercises are missing a required field");

// nothing seeded may be a breath-hold contest, and no game may be one at all
const badTags = exercises.filter(x => (x.safety_tags || []).includes("breath_hold"));
check(badTags.length === 0, "no exercise is tagged breath_hold", badTags.length + " exercises tagged breath_hold");
const badGames = games.filter(g => (g.safety_tags || []).some(t => t === "breath_control" || t === "underwater"));
check(badGames.length === 0, "no game is a breath-holding or underwater contest",
      "unsafe games: " + badGames.map(g => g.code).join(", "));

// focus keys referenced by exercises must exist
const focusKeys = new Set(focuses.map(f => f.key));
const orphanTags = new Set();
exercises.forEach(x => (x.focus_tags || []).forEach(t => { if (!focusKeys.has(t)) orphanTags.add(t); }));
check(orphanTags.size === 0, "every focus_tag matches a real focus",
      "focus_tags with no focus: " + [...orphanTags].join(", "));

// every focus needs at least two items or the generator cannot use it
const thinFocus = focuses.filter(f =>
  exercises.filter(x => (x.focus_tags || []).includes(f.key)).length < 2);
check(thinFocus.length === 0, "every focus has at least two sets",
      "focuses with fewer than two sets: " + thinFocus.map(f => f.key).join(", "));

// ---------------------------------------------------------------------------
// 2. Load the engine out of index.html behind a DOM stub
//
// The stub stays small, but four things in it had to become real, because a stub
// that lies about the DOM is a harness that cannot see the interface at all.
//
//  1. firstChild and removeChild really detach. clear() is a
//     "while (node.firstChild) node.removeChild(node.firstChild)" loop, so with
//     the old no-op pair clear() did nothing: every view drew on top of the last
//     one, and a check for "the history list is on screen" would have passed on
//     leftovers from the session card.
//  2. textContent reads back the text of the whole subtree, so a check can read
//     what the coach reads. The app also writes it directly (the pool clock).
//  3. One id, one node. getElementById walks the document and returns that node,
//     or null. The old stub minted a fresh object per call, so
//     getElementById("app") !== getElementById("app"), getElementById("pool")
//     was never null, the pool overlay was therefore never really removed, and a
//     second overlay stacked on the first (a dead black screen on the deck) could
//     not be seen. A renamed id in the markup was invisible for the same reason:
//     the app asked for "app" and always got something back.
//  4. The document is parsed out of index.html's own <body> instead of being
//     hand written here, so the ids and classes the harness checks are the ones
//     that actually ship.
//
// Everything else is still a no-op, and the engine still may not use classList,
// innerHTML, dataset, closest, matches, getBoundingClientRect or
// style.setProperty. That ban used to be a comment nobody could enforce, which is
// how draft edits calling classList got written in the first place. Section 17c
// now reads the script as text and fails naming the line, so nothing here needs
// to grow to accommodate them: growing the stub is what would hide the bug.
// ---------------------------------------------------------------------------
function textOf(n){
  if (!n) return "";
  if (n.nodeType === 3) return n.textContent == null ? "" : String(n.textContent);
  const kids = n.children || [];
  let s = "";
  for (let i = 0; i < kids.length; i++) s += textOf(kids[i]);
  return s;
}
function walk(n, fn){
  if (!n || n.nodeType !== 1) return;
  fn(n);
  const kids = n.children || [];
  for (let i = 0; i < kids.length; i++) walk(kids[i], fn);
}
function findAll(root, pred){ const out = []; walk(root, e => { if (pred(e)) out.push(e); }); return out; }
function countEls(root){ let c = 0; walk(root, () => c++); return c; }
function classesOf(el){ return String(el.className || "").split(/\s+/).filter(Boolean); }
function byClass(root, cls){ return findAll(root, e => classesOf(e).indexOf(cls) !== -1); }
function byTag(root, tag){ const T = tag.toUpperCase(); return findAll(root, e => e.tagName === T); }
function label(el){ return textOf(el).replace(/\s+/g, " ").trim(); }
// Buttons are wired with onclick through h(), which becomes addEventListener,
// so the stub records listeners and the harness can press things.
function fire(el, type){
  const ls = (el && el.listeners && el.listeners[type]) || [];
  ls.slice().forEach(fn => fn.call(el, { type, target: el, preventDefault(){}, stopPropagation(){} }));
  return ls.length;
}
function textNode(t){ return { nodeType: 3, textContent: String(t), parentNode: null }; }

function fakeEl(tag){
  const el = {
    tagName: String(tag || "div").toUpperCase(),
    nodeType: 1, className: "", value: "", style: {},
    children: [], parentNode: null, attrs: {}, listeners: {}
  };
  function adopt(c){
    if (c == null || c === false) return c;
    if (c.parentNode && c.parentNode.removeChild) c.parentNode.removeChild(c);
    c.parentNode = el; el.children.push(c); return c;
  }
  el.append = function(){ for (const a of arguments) adopt(a); };
  el.appendChild = c => adopt(c);
  el.removeChild = function(c){
    const i = el.children.indexOf(c);
    if (i === -1) return null;
    el.children.splice(i, 1);
    if (c) c.parentNode = null;
    return c;
  };
  el.remove = function(){ if (el.parentNode) el.parentNode.removeChild(el); };
  el.addEventListener = function(t, fn){
    if (typeof fn === "function") (el.listeners[t] = el.listeners[t] || []).push(fn);
  };
  el.removeEventListener = function(t, fn){
    const a = el.listeners[t] || [], i = a.indexOf(fn);
    if (i !== -1) a.splice(i, 1);
  };
  // A browser mirrors these three onto properties, and h() routes id, class and
  // value through setAttribute, so the stub has to mirror them too.
  el.setAttribute = function(k, v){
    v = String(v); el.attrs[k] = v;
    if (k === "id") el.id = v;
    else if (k === "class") el.className = v;
    else if (k === "value") el.value = v;
  };
  el.getAttribute = k => (Object.prototype.hasOwnProperty.call(el.attrs, k) ? el.attrs[k] : null);
  el.contains = function(n){ let hit = el === n; walk(el, e => { if (e === n) hit = true; }); return hit; };
  el.select = function(){}; el.focus = function(){};
  el.querySelector = () => null; el.querySelectorAll = () => [];
  Object.defineProperty(el, "firstChild", { get: () => el.children[0] || null });
  Object.defineProperty(el, "textContent", {
    get: () => textOf(el),
    set(v){ while (el.children.length) el.removeChild(el.children[0]); adopt(textNode(v)); }
  });
  return el;
}

const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const appScript = scripts.find(s => s.includes("WSTRAIN_ENGINE"));
if (!appScript){ console.log(BAD + " could not find the app script in index.html"); process.exit(1); }

// Enough of a parser to rebuild the page the app boots into. index.html's body
// is six elements and a heading, so this only needs tags, ids and classes.
const VOID_TAGS = { br:1, hr:1, img:1, input:1, meta:1, link:1, source:1, area:1,
                    base:1, col:1, embed:1, param:1, track:1, wbr:1 };
function unescapeHtml(s){
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}
function parseBody(src){
  const root = fakeEl("html"), body = fakeEl("body");
  root.appendChild(body);
  const m = src.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!m) return { root, body };
  const s = m[1].replace(/<!--[\s\S]*?-->/g, "").replace(/<script\b[\s\S]*?<\/script>/gi, "");
  const stack = [body];
  const re = /<(\/?)([a-zA-Z][-\w]*)((?:"[^"]*"|'[^']*'|[^>])*)>|([^<]+)/g;
  let t;
  while ((t = re.exec(s)) !== null){
    if (t[4] != null){
      const text = unescapeHtml(t[4]).replace(/\s+/g, " ");
      if (text.trim()) stack[stack.length - 1].appendChild(textNode(text));
      continue;
    }
    const tag = t[2].toLowerCase(), raw = t[3] || "";
    if (t[1]){
      for (let k = stack.length - 1; k > 0; k--)
        if (stack[k].tagName === tag.toUpperCase()){ stack.length = k; break; }
      continue;
    }
    const el = fakeEl(tag), ar = /([-\w:]+)\s*=\s*"([^"]*)"/g;
    let a;
    while ((a = ar.exec(raw)) !== null) el.setAttribute(a[1], unescapeHtml(a[2]));
    stack[stack.length - 1].appendChild(el);
    if (!VOID_TAGS[tag] && !/\/\s*$/.test(raw)) stack.push(el);
  }
  return { root, body };
}

// The engine picks focuses and sets at random, so an unseeded run is a lottery:
// it can pass eleven times and fail the twelfth on a season it happened not to
// generate before. The sandbox therefore gets a seeded generator, and the suite
// walks a fixed set of seeds. A regression now always shows up, on the same seed,
// for anyone who runs it.
let seedState = 1;
function setSeed(n){ seedState = (n * 2654435761) % 2147483647 || 1; }
function seededRandom(){
  seedState = (seedState * 48271) % 2147483647;
  return (seedState - 1) / 2147483646;
}
const SeededMath = Object.create(Math);
SeededMath.random = seededRandom;

// The clock is frozen for the same reason the dice are seeded. The app asks the
// real clock what today is (the default date on the Today screen, whether
// fmtDate prints the year, how far through the session the pool view thinks it
// is), so a live clock means the output changes on its own overnight and the
// pool clock cannot be checked at all.
//
// Sunday 1 November 2026 on purpose. It sits in the middle of the simulated
// season, and it is NOT a class day, so "today" and "the next class day" are two
// different dates and a screen that muddles them cannot pass.
const BASE_NOW = Date.parse("2026-11-01T12:00:00Z");
// Monday, Thursday, Saturday are his class days, so this is the date the Today
// screen has to offer while the frozen clock says Sunday. Worked out here rather
// than typed in, so moving the frozen clock does not quietly break the check.
const NEXT_CLASS = (function(){
  for (let i = 0; i < 7; i++){
    const d = new Date(BASE_NOW + i * 86400000), dow = d.getUTCDay();
    if (dow === 1 || dow === 4 || dow === 6) return d.toISOString().slice(0, 10);
  }
  return "";
})();
let NOW = BASE_NOW;
function setNow(ms){ NOW = ms; }
function advance(ms){ NOW += ms; }
class FrozenDate extends Date {
  constructor(){ if (arguments.length === 0) super(NOW); else super(...arguments); }
  static now(){ return NOW; }
}
// A real setTimeout would leave the pool clock rescheduling itself once a second
// for the rest of the run. The harness keeps the queue instead, so the clock
// ticks exactly when the suite says it does.
function makeTimers(){
  const q = [];
  let id = 1;
  return {
    setTimeout(fn, ms){ q.push({ id, fn, ms }); return id++; },
    clearTimeout(h){ for (let i = 0; i < q.length; i++) if (q[i].id === h){ q.splice(i, 1); return; } },
    pending: () => q.length,
    runOne(){ const t = q.shift(); if (t) t.fn(); return !!t; },
    reset(){ q.length = 0; }
  };
}
// Enough of a Supabase client that the views which check "am I signed in" can
// draw. Nothing in the suite lets it be reached for real: every call resolves
// empty, so a handler that tries to save is a no-op rather than a crash.
function sbStub(){
  const chain = {};
  ["select","update","insert","upsert","delete","eq","in","order","limit","range","maybeSingle","single"]
    .forEach(k => { chain[k] = () => chain; });
  chain.then = res => Promise.resolve({ data: [], error: null }).then(res);
  return {
    from: () => chain,
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange(){ return { data: null }; },
      signOut: () => Promise.resolve({ error: null })
    }
  };
}

const vm = require("vm");
// One environment per load. The mutation control at the end loads a deliberately
// broken copy of the app into its own environment, so nothing may be shared.
function makeEnv(source){
  const timers = makeTimers();
  const parsed = parseBody(html);
  const doc = {
    documentElement: parsed.root, body: parsed.body, activeElement: null,
    createElement: tag => fakeEl(tag),
    createTextNode: t => textNode(t),
    getElementById(id){
      let hit = null;
      walk(parsed.root, e => { if (!hit && e.attrs.id === String(id)) hit = e; });
      return hit;
    },
    addEventListener(){}, removeEventListener(){}, execCommand(){ return true; }
  };
  const win = {
    WSTRAIN_CONFIG: { url: "https://YOUR-PROJECT.supabase.co", anonKey: "YOUR-ANON-KEY" },
    supabase: null,
    addEventListener(){}, removeEventListener(){}, scrollTo(){}, print(){},
    localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
    navigator: { clipboard: null },
    alert(){}, confirm(){ return false; },
    setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout, fetch: null,
    Intl, Date: FrozenDate, Math: SeededMath, JSON, console
  };
  win.window = win;
  const ctx = vm.createContext(Object.assign(win, {
    document: doc, localStorage: win.localStorage, navigator: win.navigator,
    AbortController: class { constructor(){ this.signal = {}; } abort(){} }
  }));
  try{
    vm.runInContext(source, ctx, { filename: "index.html" });
  }catch(e){
    return { error: e };
  }
  return { E: ctx.WSTRAIN_ENGINE, ctx, win, doc, timers };
}

const env = makeEnv(appScript);
if (env.error){
  console.log("\n" + BAD + " the app script threw while loading: " + env.error.message);
  console.log(String(env.error.stack || "").split("\n").slice(0, 4).join("\n"));
  console.log("  (a missing id in <body> lands here: the app calls getElementById at load)");
  process.exit(1);
}
const ctx = env.ctx;
const E = ctx.WSTRAIN_ENGINE;
const S = E.defaultSettings();
E.setData({ focuses, library: exercises, games, settings: S, sessions: [], items: {}, coaches: [] });

// archetype shares must sum to 1, or the metre budget is silently wrong
console.log("\n=== 3. Archetypes");
let archBad = 0;
Object.keys(E.ARCHETYPES).forEach(k => {
  const sum = E.ARCHETYPES[k].reduce((a, b) => a + b.share, 0);
  if (Math.abs(sum - 1) > 0.001){ bad("archetype " + k + " shares sum to " + sum.toFixed(3)); archBad++; }
});
check(archBad === 0, Object.keys(E.ARCHETYPES).length + " archetypes all sum to 1.000");
const missingArch = Object.keys(E.FOCUS_ARCHETYPES).filter(f =>
  E.FOCUS_ARCHETYPES[f].some(a => !E.ARCHETYPES[a]));
check(missingArch.length === 0, "every focus maps to real archetypes",
      "focuses pointing at missing archetypes: " + missingArch.join(", "));
const unmapped = focuses.filter(f => !E.FOCUS_ARCHETYPES[f.key]);
check(unmapped.length === 0, "every focus has an archetype",
      "focuses with no archetype: " + unmapped.map(f => f.key).join(", "));

// A set whose text names each of its reps in order ("4 x 50 as A / B / C / D")
// cannot be rescaled: "6 x 50 as A / B / C / D" is nonsense. These have to be
// stored with reps null so the engine treats them as fixed.
const enumerating = exercises.filter(x => {
  const st = x.structure || "";
  if (!x.reps || !x.rep_distance_m) return false;
  if ((st.match(/\d+\s*x/gi) || []).length !== 1) return false;
  const lead = st.match(/^\s*(\d+)\s*x\s*(\d+)?/i);
  if (!lead || Number(lead[1]) !== x.reps) return false;
  const parts = st.slice(lead[0].length).split("/").filter(p => p.trim());
  return x.reps >= 3 && parts.length === x.reps;
});
check(enumerating.length === 0, "no rescalable set names its own reps one by one",
      "these enumerate their reps and must have reps null: " + enumerating.map(x => x.code).join(", "));

// A whole-session set is only offered to the big-set shape, and that shape has
// only a main_set slot. Any whole-session set in another role can never be
// chosen at all, which is a silent way to lose library items.
const bigsetRoles = new Set((E.ARCHETYPES.bigset || []).map(b => b.role));
const unreachable = exercises.filter(x => x.whole_body && !bigsetRoles.has(x.role));
check(unreachable.length === 0, "every whole-session set sits in a role the big-set shape can reach",
      "unreachable whole-session sets: " + unreachable.map(x => x.code + " (" + x.role + ")").join(", "));

// Every role an archetype asks for must exist in the library, otherwise that
// block is silently skipped and the session comes out short.
const libRoles = new Set(exercises.filter(x => !x.whole_body).map(x => x.role));
const askedRoles = new Set();
Object.values(E.ARCHETYPES).forEach(a => a.forEach(b => askedRoles.add(b.role)));
const missingRoles = [...askedRoles].filter(r => !libRoles.has(r));
check(missingRoles.length === 0, "every role the archetypes ask for exists in the library",
      "archetypes ask for roles with no sets: " + missingRoles.join(", "));

// ---------------------------------------------------------------------------
// 4. Simulate a season: 3 sessions a week, alternating endings
// ---------------------------------------------------------------------------
const N = 200;
// SEEDS=1-40 node verify.js  sweeps a wider range when you want more confidence.
const SEEDS = (function(){
  var spec = process.env.SEEDS;
  if (!spec) return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  var m = String(spec).match(/^(\d+)-(\d+)$/);
  if (m){
    var out = [];
    for (var i = Number(m[1]); i <= Number(m[2]); i++) out.push(i);
    return out;
  }
  return String(spec).split(",").map(Number).filter(function(n){ return n > 0; });
})();
console.log("\n=== 4. Simulating " + SEEDS.length + " seasons of " + N +
            " sessions (3 a week, Mon/Thu/Sat), seeds " + SEEDS[0] + " to " + SEEDS[SEEDS.length-1]);

const dayCycle = [[1, "mon_1830"], [4, "thu_1930"], [6, "sat_1600"]];
function addDays(iso, n){
  const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function runSeason(seed){
  setSeed(seed);
  const sessions = [], items = {};
  let nextId = 1, cursor = "2026-08-03";      // a Monday
  const results = [], relax = {};
  let nulls = 0;
  for (let n = 0; n < N; n++){
    const [dow, slot] = dayCycle[n % 3];
    if (n > 0 && n % 3 === 0) cursor = addDays(cursor, 7);
    const date = addDays(cursor, dow - 1);
    const ending = (n % 4 === 3) ? "game" : "cooldown";
    E.setData({ sessions, items });
    const sk = E.buildSkeleton({ date, slot, group: "advanced", ending });
    if (!sk){ nulls++; continue; }
    (sk.relaxations || []).forEach(r => {
      const key = r.replace(/\(.*?\)/g, "").slice(0, 46);
      relax[key] = (relax[key] || 0) + 1;
    });
    const id = nextId++;
    const rows = E.blocksToItems(sk, id);
    items[id] = rows.map((r, i) => Object.assign({ id: id * 1000 + i }, r));
    sessions.unshift({
      id, session_date: date, slot, group_level: "advanced", focus_key: sk.focus_key,
      title: sk.title, goal: sk.goal, ending: sk.ending, status: "done",
      planned_total_m: sk.planned_total_m, planned_minutes: sk.planned_minutes,
      engine: "rules", coach_id: null, warnings: sk.warnings,
      generation_inputs: { steady_s: sk.steady_s, strong_s: sk.strong_s }
    });
    results.push(sk);
  }
  return { seed, sessions, items, results, relax, nulls };
}

const seasons = SEEDS.map(runSeason);
// everything downstream reads these, so keep the original names
const results = [].concat.apply([], seasons.map(s => s.results));
const sessions = seasons[0].sessions;
const items = seasons[0].items;
let nullSkeletons = seasons.reduce((a, s) => a + s.nulls, 0);
const relaxCounts = {};
seasons.forEach(s => Object.keys(s.relax).forEach(k => {
  relaxCounts[k] = (relaxCounts[k] || 0) + s.relax[k];
}));
console.log("  " + results.length + " sessions generated in total");

check(nullSkeletons === 0, "the generator produced a session every single time",
      "buildSkeleton returned nothing " + nullSkeletons + " times — the button would do nothing");

// ---- 4a. the clock -------------------------------------------------------
console.log("\n=== 5. The clock");
const endMinOf = sk => sk.ending === "game" ? S.game_minutes : S.cooldown_minutes;
let overLong = 0, tooShort = 0;
const minutes = [];
results.forEach(sk => {
  const mainSeconds = (S.total_minutes - S.warmup_minutes - endMinOf(sk)) * 60;
  if (!isFinite(sk.steady_s)) bad("session on " + sk.date + " has a non-finite duration");
  if (sk.steady_s > mainSeconds + 60) overLong++;
  if (sk.steady_s < mainSeconds - 330) tooShort++;
  minutes.push(sk.planned_minutes);
});
minutes.sort((a, b) => a - b);
const med = minutes[Math.floor(minutes.length / 2)];
console.log("  planned minutes: min " + minutes[0] + ", median " + med + ", max " + minutes[minutes.length - 1]);
check(overLong === 0, "no session runs long for the slower half",
      overLong + " of " + results.length + " sessions run more than a minute long");
check(tooShort === 0, "no session leaves more than 5 min unused",
      tooShort + " of " + results.length + " sessions finish more than 5 min early");
check(minutes[minutes.length - 1] <= 61 && minutes[0] >= 55,
      "every session lands between 55 and 61 minutes",
      "planned minutes ranged " + minutes[0] + " to " + minutes[minutes.length - 1]);

// the faster half must also fit inside the hour
const strongOver = results.filter(sk => {
  const mainSeconds = (S.total_minutes - S.warmup_minutes - endMinOf(sk)) * 60;
  return sk.strong_s > mainSeconds;
}).length;
check(strongOver === 0, "the faster half fits inside the hour too",
      strongOver + " sessions overrun for the faster swimmers");

// Which sessions finish early, and what were they made of.
if (tooShort){
  console.log("  sessions finishing more than 5 min early:");
  let shown = 0;
  results.forEach(sk => {
    const mainSeconds = (S.total_minutes - S.warmup_minutes - endMinOf(sk)) * 60;
    if (sk.steady_s >= mainSeconds - 330 || shown >= 6) return;
    shown++;
    console.log("    " + sk.planned_minutes + " min, focus " + sk.focus_key + ", " +
      sk.blocks.length + " blocks: " +
      sk.blocks.map(b => b.item.code + "=" + b.distance_m + "m").join(", "));
  });
}

// When the clock check fails, say which sets did it. Guessing wastes more time
// than printing the blame table.
if (overLong || tooShort){
  const blame = {}, fixed = {};
  results.forEach(sk => {
    const mainSeconds = (S.total_minutes - S.warmup_minutes - endMinOf(sk)) * 60;
    if (sk.steady_s <= mainSeconds + 60) return;
    const totalM = sk.blocks.reduce((a, b) => a + b.distance_m, 0);
    sk.blocks.forEach(b => {
      const want = totalM * b.share;
      if (b.distance_m > want * 1.25){
        const k = b.item.code + " [" + b.block_role + "]";
        blame[k] = (blame[k] || 0) + 1;
        const groups = (b.item.structure.match(/\d+\s*x/gi) || []).length;
        const lead = b.item.structure.match(/^\s*(\d+)\s*x\s*(\d+)?/i);
        const resc = !!(b.item.reps && b.item.rep_distance_m && groups === 1 &&
                        lead && Number(lead[1]) === b.item.reps);
        if (!resc) fixed[k] = true;
      }
    });
  });
  console.log("  the long sessions in full:");
  let sh = 0;
  seasons.forEach(season => season.results.forEach((sk, i) => {
    const ms = (S.total_minutes - S.warmup_minutes - endMinOf(sk)) * 60;
    if (sk.steady_s <= ms + 60 || sh >= 4) return;
    sh++;
    console.log("    seed " + season.seed + " session " + i + ": " + sk.planned_minutes +
      " min, focus " + sk.focus_key + ", ending " + sk.ending);
    sk.blocks.forEach(b => console.log("        " + b.block_role.padEnd(16) +
      String(b.distance_m).padStart(5) + "m  share " + (b.share||0).toFixed(2) +
      "  " + b.item.code + (b.reps ? "  reps " + b.reps : "  fixed")));
  }));
  console.log("  sets running over their share in the long sessions:");
  Object.entries(blame).sort((a, b) => b[1] - a[1]).slice(0, 14).forEach(([k, c]) => {
    console.log("    " + String(c) + "x  " + k + (fixed[k] ? "   (fixed distance, cannot be trimmed)" : ""));
  });
}

// ---- 4b. volume ---------------------------------------------------------
console.log("\n=== 6. Volume");
const mains = results.map(sk => sk.blocks.reduce((a, b) => a + b.distance_m, 0));
mains.sort((a, b) => a - b);
const outOfRange = mains.filter(m => m < S.main_min_m - 250 || m > S.main_max_m + 150).length;
console.log("  main block metres: min " + mains[0] + ", median " + mains[Math.floor(mains.length/2)] +
            ", max " + mains[mains.length - 1]);
check(outOfRange === 0, "main block volume stays near the 1500 to 1800 m target",
      outOfRange + " sessions fell outside 1250 to 1950 m");

// ---- 4c. the no-repeat window ------------------------------------------
console.log("\n=== 7. Anti-repetition");
const roleActive = {};
exercises.forEach(x => {
  const key = x.role + (x.whole_body ? ":whole" : "");
  roleActive[key] = (roleActive[key] || 0) + 1;
});
const poolSizeFor = x => roleActive[x.role + (x.whole_body ? ":whole" : "")] || 1;
const byId = {}; exercises.forEach(x => byId[x.id] = x);

let winViolations = 0, famViolations = 0;
const violationDetail = [];
const allChrono = [];
seasons.forEach(season => {
const items = season.items;
const chrono = season.sessions.slice().reverse();
allChrono.push(chrono);
chrono.forEach((s, idx) => {
  const used = (items[s.id] || []).map(r => r.exercise_id).filter(Boolean);
  used.forEach(eid => {
    const item = byId[eid];
    const win = E.effectiveWindow(item, poolSizeFor(item), S);
    // how many sessions back was it last used, before this one
    for (let back = 1; back <= win; back++){
      const prev = chrono[idx - back];
      if (!prev) break;
      if ((items[prev.id] || []).some(r => r.exercise_id === eid)){
        winViolations++;
        if (violationDetail.length < 5)
          violationDetail.push("seed " + season.seed + ": " + item.code + " (" + item.role +
            ") reused after " + back + " session" + (back === 1 ? "" : "s") + ", window is " + win);
        break;
      }
    }
  });
});
});
check(winViolations === 0, "no set ever came back inside its own window",
      winViolations + " window violations. First few: " + violationDetail.join("; "));

// families: near-identical drills should not cluster
seasons.forEach(season => {
const items = season.items;
const chrono = season.sessions.slice().reverse();
chrono.forEach((s, idx) => {
  const fams = new Set((items[s.id] || []).map(r => byId[r.exercise_id]).filter(Boolean)
    .map(x => x.family).filter(Boolean));
  fams.forEach(fam => {
    for (let back = 1; back <= 1; back++){          // the hard rule: not two sessions running
      const prev = chrono[idx - back];
      if (!prev) break;
      const pf = new Set((items[prev.id] || []).map(r => byId[r.exercise_id]).filter(Boolean)
        .map(x => x.family).filter(Boolean));
      if (pf.has(fam)) famViolations++;
    }
  });
});
});
check(famViolations === 0, "no drill family appeared in two sessions running",
      famViolations + " family clashes between back-to-back sessions");

const relaxTotal = Object.values(relaxCounts).reduce((a, b) => a + b, 0);
console.log("  relaxations reported to the coach: " + relaxTotal + " across " + results.length + " sessions");
Object.keys(relaxCounts).forEach(k => console.log("    " + relaxCounts[k] + "x  " + k));

// ---- 4d. focus spread --------------------------------------------------
console.log("\n=== 8. Focus rotation");
const focusUse = {};
results.forEach(sk => focusUse[sk.focus_key] = (focusUse[sk.focus_key] || 0) + 1);
const unused = focuses.filter(f => !focusUse[f.key]);
check(unused.length === 0, "every focus came up over the season",
      "never used: " + unused.map(f => f.key).join(", "));
let backToBack = 0;
allChrono.forEach(chrono => {
  for (let i = 1; i < chrono.length; i++)
    if (chrono[i].focus_key === chrono[i-1].focus_key) backToBack++;
});
check(backToBack === 0, "the same focus never ran twice in a row",
      backToBack + " back-to-back focus repeats");
const spread = Object.keys(focusUse).map(k => focusUse[k]);
console.log("  per focus over " + results.length + " sessions: min " + Math.min(...spread) +
            ", max " + Math.max(...spread));

// ---- 4e. safety --------------------------------------------------------
console.log("\n=== 9. Safety rules");
let breathBad = 0, breathLast = 0, paddleBad = 0, uwBad = 0, kickBad = 0, noCue = 0, paddleFirst = 0;
results.forEach(sk => {
  const all = sk.blocks.concat(sk.endBlock ? [sk.endBlock] : []);
  const tags = b => (b.item && b.item.safety_tags) || (b.game && b.game.safety_tags) || [];
  const bIdx = [];
  sk.blocks.forEach((b, i) => { if (tags(b).includes("breath_control")) bIdx.push(i); });
  if (bIdx.length > S.max_breath_blocks) breathBad++;
  if (bIdx.length && bIdx[bIdx.length - 1] === sk.blocks.length - 1) breathLast++;
  let pm = 0;
  all.forEach(b => { if (((b.item && b.item.equipment) || []).includes("paddles")) pm += b.distance_m; });
  if (pm > S.max_paddle_m) paddleBad++;
  if (sk.blocks.length > 1 && ((sk.blocks[0].item && sk.blocks[0].item.equipment) || []).includes("paddles")) paddleFirst++;
  if (all.filter(b => tags(b).includes("underwater")).length > S.max_underwater_blocks) uwBad++;
  if (sk.blocks.filter(b => b.block_role === "kick_set").length > 2) kickBad++;
  all.forEach(b => { if (!(b.cue || (b.item && b.item.cue) || (b.game && b.game.why_it_is_useful))) noCue++; });
});
check(breathBad === 0, "never more than one breath-restricted block", breathBad + " sessions had two or more");
check(breathLast === 0, "breath-restricted work is never the last block", breathLast + " sessions ended on one");
check(paddleBad === 0, "paddle volume always under " + S.max_paddle_m + " m", paddleBad + " sessions over the cap");
check(paddleFirst === 0, "paddles never in the first working block", paddleFirst + " sessions started on paddles");
check(uwBad === 0, "never more than " + S.max_underwater_blocks + " underwater blocks", uwBad + " sessions over");
check(kickBad === 0, "never more than two leg blocks", kickBad + " sessions had three");
check(noCue === 0, "every block on every card carries a coaching cue", noCue + " blocks had no cue");

// warnings the coach would actually see
const warned = results.filter(sk => (sk.warnings || []).length).length;
console.log("  sessions carrying a warning banner: " + warned + " of " + results.length);
const warnKinds = {};
results.forEach(sk => (sk.warnings || []).forEach(w => {
  const k = w.replace(/\d+/g, "N").slice(0, 52);
  warnKinds[k] = (warnKinds[k] || 0) + 1;
}));
Object.keys(warnKinds).sort((a, b) => warnKinds[b] - warnKinds[a]).slice(0, 6)
  .forEach(k => console.log("    " + warnKinds[k] + "x  " + k));

// ---- 4f. the printed line must match the numbers ----------------------
console.log("\n=== 10. Printed lines match the computed metres");
let lineDrift = 0, driftEx = [];
results.forEach(sk => {
  sk.blocks.forEach(b => {
    const groups = (b.rendered_text.match(/\d+\s*x/gi) || []).length;
    const m = groups === 1 ? b.rendered_text.match(/^\s*(\d+)\s*x\s*(\d+)\s*m/i) : null;
    if (m){
      const shown = Number(m[1]) * Number(m[2]);
      if (b.item.reps && b.item.rep_distance_m && shown !== b.distance_m){
        lineDrift++;
        if (driftEx.length < 4) driftEx.push(b.item.code + ' prints "' + b.rendered_text.slice(0, 34) +
          '" but counts ' + b.distance_m + " m");
      }
    }
    if (b.reps && b.item.rep_distance_m && b.reps * b.item.rep_distance_m !== b.distance_m){
      lineDrift++;
      if (driftEx.length < 4) driftEx.push(b.item.code + " reps do not multiply out");
    }
  });
});
check(lineDrift === 0, "no card ever prints a rep count that contradicts its own metres",
      lineDrift + " drifting lines. " + driftEx.join("; "));

// ---- 4f2. rep counts a coach would actually say out loud ---------------
console.log("\n=== 10b. Rep counts read like a coach wrote them");
let sillyReps = 0, sillyEx = [], sprintOver = 0;
results.forEach(sk => sk.blocks.forEach(b => {
  const m = (b.rendered_text.match(/\d+\s*x/gi) || []).length === 1
    ? b.rendered_text.match(/^\s*(\d+)\s*x\s*(\d+)\s*m/i) : null;
  if (m){
    const n = Number(m[1]), d = Number(m[2]);
    const tooMany = (d <= 50 && n > 12) || (d > 50 && d <= 100 && n > 10) ||
                    (d > 100 && d <= 200 && n > 6) || (d > 200 && n > 4);
    if (tooMany || n < 1){
      sillyReps++;
      if (sillyEx.length < 5) sillyEx.push(b.item.code + ' -> "' + b.rendered_text.slice(0, 40) + '"');
    }
  }
  const tags = (b.item && b.item.safety_tags) || [];
  if (tags.includes("max_effort") && b.distance_m > 450) sprintOver++;
}));
check(sillyReps === 0, "no card prints an absurd rep count",
      sillyReps + " odd rep counts: " + sillyEx.join("; "));
check(sprintOver === 0, "maximum-effort volume stays under 450 m in a session",
      sprintOver + " sessions had more than 450 m of maximum effort");

// The Adv lines sit directly under the set line. If the set was rescaled, the
// library's own variant text no longer matches, and a contradiction there is
// worse than no guidance at all.
console.log("\n=== 10c. Adv lines never contradict the line above them");
let contradiction = 0, contraEx = [];
results.forEach(sk => sk.blocks.forEach(b => {
  const line = b.rendered_text.match(/^\s*(\d+)\s*x\s*(\d+)\s*m/i);
  if (!line) return;
  const shown = Number(line[1]);
  // A deliberate rep split on a main set is the point, not a contradiction:
  // "12 x 50, Adv 1 8 x 50, Adv 2 16 x 50" is a real prescription. The bug this
  // catches is a set the engine rescaled whose Adv line still carries the
  // library's original rep count.
  const wasScaled = b.item && b.item.reps && b.reps && b.reps !== b.item.reps;
  if (!wasScaled) return;
  [1, 2].forEach(w => {
    const t = w === 1
      ? (b.adv1 != null ? b.adv1 : (b.item && b.item.steady_variant))
      : (b.adv2 != null ? b.adv2 : (b.item && b.item.strong_variant));
    if (!t) return;
    const am = String(t).match(/^\s*(\d+)\s*x\s*(\d+)/);
    if (!am) return;
    if (Math.abs(Number(am[1]) - shown) > 2){
      contradiction++;
      if (contraEx.length < 5)
        contraEx.push(b.item.code + ': line "' + shown + ' x" vs Adv ' + w + ' "' + String(t).slice(0, 26) + '"');
    }
  });
}));
check(contradiction === 0, "no Adv line disagrees with the set printed above it",
      contradiction + " contradictions: " + contraEx.join("; "));

// ---- 4g. Adv 1 / Adv 2 -------------------------------------------------
console.log("\n=== 11. Adv 1 and Adv 2");
let noSplit = 0, hasRestSplit = 0;
results.forEach(sk => sk.blocks.forEach(b => {
  const r1 = b.item.rest_adv1 || b.item.rest, r2 = b.item.rest_adv2 || b.item.rest;
  if (r1 && r2 && r1 !== r2) hasRestSplit++;
  if (!b.item.steady_variant && !b.item.strong_variant && !(r1 && r2 && r1 !== r2)) noSplit++;
}));
const totalBlocks = results.reduce((a, sk) => a + sk.blocks.length, 0);
console.log("  blocks with a rest split (his 30\" adv 1 | 20\" adv 2 style): " + hasRestSplit + " of " + totalBlocks);
check(noSplit === 0, "every block gives the mixed group something to differ on",
      noSplit + " blocks had no Adv 1 / Adv 2 guidance at all");

// ---- 4h. the plain text export ----------------------------------------
console.log("\n=== 12. Export");
const sample = results[7];
const txt = E.asPlainText(sample);
check(txt.includes("Goal:"), "export carries the goal");
check(txt.includes("Warm-up"), "export carries the warm-up line");
check(/Total .* planned \d+ min/.test(txt), "export carries the totals");
check(!/[—–]/.test(txt), "export contains no em or en dashes", "export contains a dash character");

// ---- 4i. prose rules ---------------------------------------------------
console.log("\n=== 13. His writing rules hold across the whole library");
const proseFields = [];
exercises.forEach(x => proseFields.push(["cue", x.code, x.cue], ["watch_for", x.code, x.watch_for],
  ["name", x.code, x.name], ["adv1", x.code, x.steady_variant], ["adv2", x.code, x.strong_variant]));
focuses.forEach(f => proseFields.push(["goal", f.key, f.goal_sentence], ["what", f.key, f.what_it_trains]));
games.forEach(g => proseFields.push(["how", g.code, g.how_it_works], ["why", g.code, g.why_it_is_useful]));
const proseBad = proseFields.filter(([, , v]) => v && !E.prosePasses(v));
check(proseBad.length === 0, proseFields.filter(f => f[2]).length + " text fields pass (no dashes, no banned words)",
      proseBad.length + " fields break the rules: " +
      proseBad.slice(0, 4).map(([f, c]) => c + "." + f).join(", "));

// ---- 4j. AI guard ------------------------------------------------------
console.log("\n=== 14. The AI cannot change the numbers");
const target = E.buildSkeleton({ date: "2026-09-07", slot: "mon_1830", group: "advanced", ending: "cooldown" });
const good = { title: "Test", goal: "A clean goal sentence for today.",
  sets: target.blocks.map(b => ({ distance_m: b.distance_m, structure: b.rendered_text,
    cue: "Hold the water", watch_for: "Elbow dropping", adv1: "less", adv2: "more" })) };
check(E.applyAi(JSON.parse(JSON.stringify(target)), good) === null, "a well-formed reply is accepted");
const cheat = JSON.parse(JSON.stringify(good)); cheat.sets[0].distance_m += 100;
check(E.applyAi(JSON.parse(JSON.stringify(target)), cheat) === "metres",
      "a reply that inflates the distances is rejected");
const shortReply = JSON.parse(JSON.stringify(good)); shortReply.sets.pop();
check(E.applyAi(JSON.parse(JSON.stringify(target)), shortReply) === "shape",
      "a reply with the wrong number of sets is rejected");
const dashy = JSON.parse(JSON.stringify(good)); dashy.sets[0].cue = "Reach — then glide";
check(E.applyAi(JSON.parse(JSON.stringify(target)), dashy) === "prose",
      "a reply containing an em dash is rejected");
const banned = JSON.parse(JSON.stringify(good)); banned.goal = "Today we unlock your catch.";
check(E.applyAi(JSON.parse(JSON.stringify(target)), banned) === "prose",
      "a reply using a banned word is rejected");

// ---- 4k. skipped sessions release their sets --------------------------
console.log("\n=== 15. A session that did not run releases its sets");
E.setData({ sessions, items });
const beforeCount = E.historyForRepeat({ group: "advanced", date: "2030-01-01" }).length;
sessions[0].status = "skipped";
const afterCount = E.historyForRepeat({ group: "advanced", date: "2030-01-01" }).length;
sessions[0].status = "done";
check(afterCount === beforeCount - 1, "marking a session as not run takes it out of the rotation history",
      "history did not change when a session was marked skipped");

// ---------------------------------------------------------------------------
// 16. Every view has to paint
//
// Until now this file called no render function at all. Every drawing function
// in the app could have been gutted to an empty body and the suite would still
// have printed "All checks passed", so it has never protected the interface.
//
// From here on the harness draws every screen and reads what came out. The
// checks are written against content, never against "it did not throw": the
// title, the goal, every set line, every cue, the totals, the tab labels, the
// rows in each list, the words on the deck. A blank screen fails all of them,
// and section 18 proves that by gutting the render functions on purpose and
// insisting the failures show up.
// ---------------------------------------------------------------------------

// Two sets whose names no other name contains, so "is it on screen" has one
// answer. One gets retired and one gets proposed, which is how the views are
// held to the isLive rule: a retired set must disappear from every list and
// every count, a proposed one must appear only in the review list.
const uniqueNamed = exercises.filter(x =>
  x.name && x.name.length >= 8 &&
  exercises.filter(y => y.name && y.name.indexOf(x.name) !== -1).length === 1);
const RETIRED = uniqueNamed[0] || null, PROPOSED = uniqueNamed[1] || null;

const paintLib = exercises.map(x => Object.assign({}, x));
paintLib.forEach(x => {
  if (RETIRED && x.code === RETIRED.code) x.active = false;
  if (PROPOSED && x.code === PROPOSED.code) x.status = "proposed";
});
const paintLive = paintLib.filter(x => x.active !== false && (x.status || "active") === "active");
const paintProposed = paintLib.filter(x => (x.status || "active") === "proposed");
const paintSessions = seasons[0].sessions.map(s => Object.assign({}, s));
paintSessions[0].difficulty_rating = 4;
paintSessions[0].coach_id = "coach-1";
const paintItems = seasons[0].items;
const paintCoaches = [{ id: "coach-1", display_name: "Vlad" }];
const paintUser = { access_token: "t", user: { id: "coach-1", email: "vlad@example.com" } };

// his notation again: the card prints "1,850 m", the test should accept either
function hasNumber(t, n){
  const s = String(Math.round(n));
  return t.indexOf(s) !== -1 || t.indexOf(s.replace(/\B(?=(\d{3})+(?!\d))/g, ",")) !== -1;
}
// When a row the harness expected is not there, the check has to say so rather
// than throw on arr[0] and take the rest of the suite down with it.
const NOTHING = fakeEl("nothing");
function at(arr, i){ return (arr && arr[i]) || NOTHING; }

// One sweep, driven through the same seam the app exposes. Returns findings
// rather than calling check() directly, because section 18 runs this same sweep
// against deliberately broken copies of the app and needs the failures back as
// data instead of as output.
function paintSweep(env){
  const out = [], seenClass = {}, seenId = {}, seenToken = {}, table = [], dead = [];
  const E = env.E, doc = env.doc, W = env.win;
  const result = () => ({ findings: out, classes: seenClass, ids: seenId,
                          tokens: seenToken, table, dead });
  function want(what, cond, detail){
    out.push({ what, ok: !!cond, detail: detail == null ? "" : String(detail) });
  }
  function harvest(viewName){
    walk(doc.documentElement, e => {
      classesOf(e).forEach(c => { seenClass[c] = true; });
      if (e.attrs.id) seenId[e.attrs.id] = true;
      Object.keys(e.style || {}).forEach(k => {
        (String(e.style[k]).match(/var\(\s*--[-\w]+/g) || [])
          .forEach(v => { seenToken[v.replace(/var\(\s*/, "")] = true; });
      });
      if (e.tagName === "BUTTON" && !(e.listeners.click || []).length)
        dead.push(viewName + ' "' + label(e) + '"');
    });
  }
  // Every view goes through here, so a gutted renderer trips the floor even if
  // no named piece of copy happens to be checked for it.
  function shot(viewName, root, floorEls, floorChars){
    harvest(viewName);
    const els = countEls(root), chars = label(root).length;
    table.push({ viewName, els, chars });
    want("the " + viewName + " screen paints a tree with words in it",
         els >= floorEls && chars >= floorChars,
         els + " elements and " + chars + " characters, wanted " + floorEls + " and " + floorChars);
    return textOf(root);
  }

  // A tile is a label and a value. Read the value that belongs to one label.
  function tileValue(root, lbl){
    const tl = byClass(root, "tile")
      .filter(x => byClass(x, "lbl").some(l => label(l) === lbl))[0];
    return tl ? label(at(byClass(tl, "val"), 0)) : "";
  }
  // Everything the library stored for a set has to end up in front of him: the
  // line, the coaching cue, the rest split, and the Adv 1 and Adv 2 guidance the
  // mixed group swims off. Presence only, never format, so rewording the card in
  // pass 2 does not fight the harness.
  function missingFrom(screenText, session){
    const gaps = [];
    const advOf = (b, w) => (w === 1
      ? (b.adv1 != null ? b.adv1 : (b.item && b.item.steady_variant))
      : (b.adv2 != null ? b.adv2 : (b.item && b.item.strong_variant))) || "";
    (session.blocks || []).forEach((b, i) => {
      const where = "block " + i + " ";
      if (screenText.indexOf(b.rendered_text) === -1) gaps.push(where + "line");
      const cue = b.cue || (b.item && b.item.cue);
      if (cue && screenText.indexOf(cue) === -1) gaps.push(where + "cue");
      const rest = b.rest_adv1 || (b.item && (b.item.rest_adv1 || b.item.rest));
      if (rest && screenText.indexOf(rest) === -1) gaps.push(where + "rest");
      [1, 2].forEach(w => {
        const a = advOf(b, w);
        if (a && screenText.indexOf(a) === -1) gaps.push(where + "Adv " + w);
      });
    });
    if (session.endBlock && screenText.indexOf(session.endBlock.rendered_text) === -1)
      gaps.push("the ending");
    return gaps;
  }

  const needed = ["render","startPool","hydrate","setUi","setData","buildSkeleton","asPlainText"];
  const gone = needed.filter(k => typeof E[k] !== "function");
  want("the test seam in index.html still exports what these checks drive",
       gone.length === 0, "missing: " + gone.join(", "));
  if (gone.length) return result();

  const APP = doc.getElementById("app"), WHO = doc.getElementById("who");
  want("index.html still carries the two ids the app boots from, #app and #who",
       !!APP && !!WHO, "#app " + (APP ? "found" : "missing") + ", #who " + (WHO ? "found" : "missing"));
  if (!APP || !WHO) return result();

  setSeed(4242);
  setNow(BASE_NOW);
  E.setData({ focuses, library: paintLib, games, settings: S,
              sessions: paintSessions, items: paintItems, coaches: paintCoaches });

  // ---- the three screens before he is logged in ---------------------------
  W.supabase = null;
  E.setUi({ configured: false, sb: null, session: null, coachRow: null, notCoach: false,
            offline: false, staleMirror: false, loginError: "", busy: false,
            generating: false, draft: null, view: "today" });
  E.render();
  let t = shot("unconfigured", APP, 5, 60);
  want("the unconfigured app names the file to edit",
       /config\.js/.test(t) && /SETUP\.md/.test(t), t.slice(0, 60));

  E.setUi({ configured: true });
  W.supabase = null;
  E.render();
  t = shot("database library missing", APP, 3, 30);
  want("a missing database library is explained instead of leaving a blank screen",
       /database library/i.test(t) && /reload/i.test(t), t.slice(0, 60));

  W.supabase = {};
  E.setUi({ sb: sbStub(), session: null, loginError: "Invalid login credentials" });
  E.render();
  t = shot("login", APP, 6, 40);
  const loginCard = byClass(APP, "login"), inputs = byTag(APP, "input");
  want("the login screen paints two fields and one button, inside the full width .login card",
       loginCard.length === 1 && inputs.length === 2 && byTag(APP, "button").length === 1,
       "login cards " + loginCard.length + ", inputs " + inputs.length +
       ", buttons " + byTag(APP, "button").length);
  want("the login fields are an email and a password",
       inputs.length === 2 && inputs[0].getAttribute("type") === "email" &&
       inputs[1].getAttribute("type") === "password",
       inputs.map(i => i.getAttribute("type")).join(", "));
  want("the login screen says why the last attempt failed",
       /Invalid login credentials/.test(t) && byClass(APP, "err").length === 1, t.slice(0, 70));

  E.setUi({ session: paintUser, loginError: "", notCoach: true });
  E.render();
  t = shot("not a coach", APP, 8, 200);
  const pre = at(byTag(APP, "pre"), 0);
  want("the not a coach screen shows his own address and the exact SQL to run",
       t.indexOf(paintUser.user.email) !== -1 &&
       /insert into public\.tr_coaches/.test(t) && t.indexOf(paintUser.user.id) !== -1,
       t.slice(0, 70));
  want("the SQL block uses the .codeblock class and carries no inline background",
       classesOf(pre).indexOf("codeblock") !== -1 && !pre.style.background,
       "class " + pre.className + ", background " + pre.style.background);

  // ---- Today, empty ------------------------------------------------------
  E.setUi({ notCoach: false, coachRow: paintCoaches[0], draft: null, view: "today" });
  E.render();
  t = shot("Today with nothing generated", APP, 20, 200);
  const tabBtns = byTag(at(byClass(APP, "tabs"), 0), "button");
  want("the four tabs paint, each with a label and exactly one handler",
       tabBtns.length === 4 &&
       tabBtns.every(b => label(b).length > 2 && (b.listeners.click || []).length === 1) &&
       ["Today","History","Library","Insights"].every(n => tabBtns.some(b => label(b) === n)),
       tabBtns.map(b => label(b) + "/" + (b.listeners.click || []).length).join(" "));
  want("exactly one tab is marked as the open one", byClass(APP, "active").length === 1,
       byClass(APP, "active").length + " marked active");
  want("the empty Today screen tells him what the button will do",
       /Press the button/.test(t) && /never repeats/.test(t), t.slice(-90));
  want("the date defaults to the next class day, not to today",
       byTag(APP, "input").some(i => i.getAttribute("type") === "date" && i.value === NEXT_CLASS),
       "wanted " + NEXT_CLASS + ", got " +
       byTag(APP, "input").map(i => i.getAttribute("type") + "=" + i.value).join(" "));
  want("the header carries his name and a way out",
       /Vlad/.test(textOf(WHO)) && /Log out/.test(textOf(WHO)), label(WHO));

  // ---- Today, with a fresh unsaved session -------------------------------
  const sk = E.buildSkeleton({ date: NEXT_CLASS, slot: "mon_1830", group: "advanced", ending: "cooldown" });
  want("the generator produced a session to draw", !!sk && sk.blocks.length >= 1);
  if (!sk) return result();
  sk.engine = "ai";
  sk.fallbackNote = "Claude took too long, so this one is written straight from the library.";
  sk.relaxations = ["Reused a recent focus (focus cooldown), the library is thin."];
  sk.warnings = (sk.warnings || []).concat(["Runs about 2 min long for the slower swimmers."]);
  E.setUi({ draft: sk, view: "today" });
  E.render();
  t = shot("Today with a session on it", APP, 60, 600);

  const cardMissing = [];
  if (t.indexOf(sk.title) === -1) cardMissing.push("title");
  if (t.indexOf(sk.goal) === -1) cardMissing.push("goal");
  if (!/Warm-up/.test(t)) cardMissing.push("warm-up");
  want("the card carries the title, the goal and the warm-up",
       cardMissing.length === 0, "missing: " + cardMissing.join(", "));
  // Read each number out of its own tile. A search across the whole screen finds
  // 1,850 somewhere on a busy card whatever the tile says.
  const mainM = sk.blocks.reduce((a, b) => a + b.distance_m, 0);
  want("the four tiles carry the metres, the minutes, the main body and the ending",
       hasNumber(tileValue(APP, "Total"), sk.planned_total_m) &&
       tileValue(APP, "Planned") === sk.planned_minutes + " min" &&
       hasNumber(tileValue(APP, "Main body"), mainM) &&
       tileValue(APP, "Ending") === (sk.ending === "game" ? "Game" : "Cool-down"),
       ["Total","Planned","Main body","Ending"].map(k => k + ' "' + tileValue(APP, k) + '"').join(", "));

  const setsMissing = missingFrom(t, sk);
  want("every set on the card reaches the screen: the line, the cue, the rest and both Adv lines",
       setsMissing.length === 0,
       (sk.blocks || []).length + " blocks, missing: " + setsMissing.slice(0, 4).join(", "));
  want("one block card per set, plus the warm-up and the ending",
       byClass(APP, "blk").length === sk.blocks.length + 1 + (sk.endBlock ? 1 : 0),
       byClass(APP, "blk").length + " block cards for " + sk.blocks.length + " sets");

  const banners = byClass(APP, "banner").map(label);
  want("the fallback note, the relaxation and the warning all reach him",
       banners.some(b => /took too long/.test(b)) &&
       banners.some(b => /library is thin/.test(b)) &&
       banners.some(b => /^Check this: /.test(b)),
       banners.length + " banners: " + banners.map(b => b.slice(0, 24)).join(" | "));

  let acts = byTag(APP, "button").map(label);
  want("the card offers the four things he does with it, and a Save",
       ["Start pool view","Copy as text","Print","Save"].every(x => acts.indexOf(x) !== -1),
       acts.join(" | ").slice(0, 120));
  want("a rescalable set gets its rep steppers",
       !sk.blocks.some(b => b.item && b.item.reps) ||
       (acts.indexOf("−1 rep") !== -1 && acts.indexOf("+1 rep") !== -1),
       acts.filter(x => /rep$/.test(x)).join(" "));
  want("the card says who wrote it", /Claude/.test(t), t.slice(0, 40));

  // ---- Today, reopened from the database ---------------------------------
  const saved = E.hydrate(paintSessions[0]);
  const storedRows = (paintItems[paintSessions[0].id] || [])
    .filter(r => r.block_role !== "warmup");
  want("a saved session hydrates back into as many blocks as were stored",
       !!saved && saved.blocks.length + (saved.endBlock ? 1 : 0) === storedRows.length,
       saved ? saved.blocks.length + " blocks plus " + (saved.endBlock ? 1 : 0) +
               " ending for " + storedRows.length + " stored rows" : "hydrate returned nothing");
  E.setUi({ draft: saved, view: "today" });
  E.render();
  t = shot("a reopened session", APP, 60, 600);
  const rowsMissing = storedRows.filter(r => r.rendered_text && t.indexOf(r.rendered_text) === -1);
  const advMissing = storedRows.filter(r =>
    r.steady_variant && t.indexOf(r.steady_variant) === -1);
  want("every stored set line comes back out of the database and onto the card",
       rowsMissing.length === 0, rowsMissing.slice(0, 3).map(r => r.rendered_text).join(" | "));
  want("the stored Adv 1 and Adv 2 lines survive the round trip",
       advMissing.length === 0, advMissing.slice(0, 3).map(r => r.steady_variant).join(" | "));
  acts = byTag(APP, "button").map(label);
  want("a saved session offers Mark done and Did not run instead of Save",
       acts.indexOf("Mark done") !== -1 && acts.indexOf("Did not run") !== -1 &&
       acts.indexOf("Save") === -1, acts.join(" | ").slice(0, 120));
  const rate = byTag(APP, "button").filter(b => /^[1-5]$/.test(label(b)));
  want("the after session card shows the 1 to 5 buttons with the stored 4 marked",
       rate.length === 5 && classesOf(at(rate, 3)).indexOf("primary") !== -1 &&
       /How hard was it/.test(t),
       rate.map(b => label(b) + ":" + b.className).join(" "));

  // ---- the pool view -----------------------------------------------------
  // The one screen read at arm's length with wet hands, and the one pass 2
  // rebuilds from scratch.
  env.timers.reset();
  E.setUi({ draft: null, view: "today" });
  E.startPool(sk);
  let poolEl = doc.getElementById("pool");
  want("the pool view paints one overlay carrying the id its stylesheet targets",
       !!poolEl && findAll(doc.documentElement, e => e.attrs.id === "pool").length === 1,
       poolEl ? "one #pool" : "no #pool at all");
  want("the pool clock schedules exactly one tick", env.timers.pending() === 1,
       env.timers.pending() + " timers pending");
  E.render();
  want("re-drawing the pool view leaves one overlay and one tick, not two",
       findAll(doc.documentElement, e => e.attrs.id === "pool").length === 1 &&
       env.timers.pending() === 1,
       findAll(doc.documentElement, e => e.attrs.id === "pool").length + " overlays, " +
       env.timers.pending() + " timers");
  poolEl = doc.getElementById("pool");
  if (!poolEl) return result();
  const pt = shot("pool", poolEl, 20, 300);
  const deckMissing = missingFrom(pt, sk);
  if (pt.indexOf(sk.goal) === -1) deckMissing.push("goal");
  want("everything on the card is on the deck too: lines, cues, rest and both Adv lines",
       deckMissing.length === 0, "missing: " + deckMissing.slice(0, 4).join(", "));
  const pblks = byClass(poolEl, "pblk");
  want("one tappable card per set on the deck, plus the warm-up and the ending",
       pblks.length === sk.blocks.length + 1 + (sk.endBlock ? 1 : 0) &&
       (at(pblks, 1).listeners.click || []).length === 1,
       pblks.length + " deck cards for " + sk.blocks.length + " sets");
  const poolActs = byTag(poolEl, "button").map(label);
  want("the deck keeps Close, Mark done and Copy",
       ["Close","Mark done","Copy"].every(x => poolActs.indexOf(x) !== -1), poolActs.join(" | "));

  const clock = at(byClass(poolEl, "clock"), 0);
  want("the clock starts at 0:00", label(clock) === "0:00", label(clock) || "no clock at all");
  advance(90 * 60 * 1000);
  env.timers.runOne();
  want("the clock counts up in minutes and seconds", label(clock) === "90:00", label(clock));
  want("with nothing ticked off yet the clock does not call him behind",
       classesOf(clock).indexOf("behind") === -1, clock.className);
  const tapped = at(pblks, 1);
  const toggled = fire(tapped, "click");
  want("tapping a set on the deck marks it done, by class and not by colour alone",
       toggled === 1 && classesOf(tapped).indexOf("done") !== -1,
       "handlers " + toggled + ", class " + tapped.className);
  env.timers.runOne();
  want("once there is progress to compare against, behind schedule inverts the clock",
       classesOf(clock).indexOf("behind") !== -1, clock.className);
  // The done and behind classes only exist after those two taps, so harvest again
  // or section 17 never sees them.
  harvest("pool part way through");
  fire(at(byTag(poolEl, "button").filter(b => label(b) === "Close"), 0), "click");
  want("closing the deck takes the overlay off the page and stops the clock",
       doc.getElementById("pool") === null && env.timers.pending() === 0,
       (doc.getElementById("pool") ? "overlay still there" : "overlay gone") + ", " +
       env.timers.pending() + " timers left");

  // ---- History, Library, Insights, reached the way he reaches them --------
  // Back to a known screen first. If the Close button above is broken, that is
  // one failure, and the rest of the sweep should still report on itself.
  E.setUi({ draft: saved, view: "today" });
  E.render();
  function tab(name){
    const b = byTag(APP, "button").filter(x => label(x) === name)[0];
    if (!b) return false;
    fire(b, "click");
    return true;
  }
  want("the History tab is wired to something", tab("History"));
  t = shot("History", APP, 30, 300);
  const hrows = byClass(APP, "hrow");
  want("history lists every saved session, newest first, each one tappable",
       hrows.length === paintSessions.length &&
       label(at(hrows, 0)).indexOf(paintSessions[0].title) !== -1 &&
       hrows.every(r => (r.listeners.click || []).length === 1),
       hrows.length + " rows for " + paintSessions.length + " sessions");
  want("history groups by week and shows the slot, the metres, the coach and the rating",
       /Week of /.test(t) && /Vlad/.test(t) && /4\/5/.test(t) &&
       hasNumber(label(at(hrows, 0)), paintSessions[0].planned_total_m),
       label(at(hrows, 0)).slice(0, 80));

  want("the Library tab is wired to something", tab("Library"));
  t = shot("Library", APP, 30, 300);
  const lrows = byClass(APP, "lrow");
  want("the library lists every live set, and the proposed one on top of that",
       lrows.length === paintLive.length + paintProposed.length,
       lrows.length + " rows for " + paintLive.length + " live plus " +
       paintProposed.length + " proposed");
  want("the library counts live sets only, so a retired set is not in the total",
       t.indexOf(paintLive.length + " sets") !== -1,
       "wanted " + paintLive.length + " sets");
  want("a retired set is not listed anywhere",
       !RETIRED || t.indexOf(RETIRED.name) === -1, RETIRED ? RETIRED.name : "no fixture");
  want("a set Claude proposed is offered for review, and marked as such",
       !PROPOSED || (t.indexOf(PROPOSED.name) !== -1 && /Claude suggests/.test(t)),
       PROPOSED ? PROPOSED.name : "no fixture");
  want("the library says when a set is still locked out by the no-repeat window",
       byClass(APP, "badge").map(label).some(x => /^back in \d+ session/.test(x)),
       byClass(APP, "badge").map(label).slice(0, 6).join(" | "));

  want("the Insights tab is wired to something", tab("Insights"));
  t = shot("Insights", APP, 40, 400);
  want("insights counts the sessions and the live library, not the retired one",
       tileValue(APP, "Sessions") === String(paintSessions.length) &&
       tileValue(APP, "Library") === String(paintLive.length),
       'Sessions "' + tileValue(APP, "Sessions") + '" wanted ' + paintSessions.length +
       ', Library "' + tileValue(APP, "Library") + '" wanted ' + paintLive.length);
  want("one focus balance bar per focus", byClass(APP, "bar").length === focuses.length,
       byClass(APP, "bar").length + " bars for " + focuses.length + " focuses");
  want("the settings rows paint their current values",
       /Steady pace/.test(t) &&
       byTag(APP, "input").some(i => i.value === String(S.pace_steady_s_per_100)),
       byTag(APP, "input").map(i => i.value).join(" "));

  // ---- the offline banners -----------------------------------------------
  tab("Today");
  E.setUi({ offline: true, staleMirror: false });
  E.render();
  t = shot("Today offline", APP, 20, 200);
  want("offline says what still works and what will not be saved",
       /No connection/.test(t) && /saved on this phone/.test(t), t.slice(0, 80));
  E.setUi({ staleMirror: true });
  E.render();
  t = textOf(APP);
  harvest("Today offline and stale");
  want("a copy more than ten days old says so", /ten days old/.test(t), t.slice(0, 80));
  E.setUi({ offline: false, staleMirror: false });

  want("no view paints a button with nothing behind it", dead.length === 0,
       dead.slice(0, 5).join(", "));
  return result();
}

console.log("\n=== 16. Every view has to paint");
let sweep;
try{
  sweep = paintSweep(env);
}catch(e){
  // A throw here is a regression too, it just cannot report itself, so say where
  // it happened and let the rest of the suite finish and print its summary.
  bad("the paint sweep threw: " + e.message);
  console.log("    " + String(e.stack || "").split("\n")[1]);
  sweep = { findings: [], classes: {}, ids: {}, tokens: {}, table: [], dead: [] };
}
sweep.findings.forEach(f =>
  check(f.ok, f.what, f.what + (f.detail ? "  [" + f.detail + "]" : "")));
console.log("  painted: " + sweep.table
  .map(r => r.viewName + " " + r.els + "el/" + r.chars + "ch").join(", "));

// ---------------------------------------------------------------------------
// 17. The engine and the stylesheet have to agree
//
// The bug class the harness could not see: the engine hands out a class or an id,
// the stylesheet knows a different name, and the screen goes plain. Nothing
// throws, no text is missing, every other check passes, and the app looks broken
// only on the phone. So the sweep above collects every class, id and custom
// property the engine actually assigned, and this section holds them against the
// stylesheet that shipped with them.
// ---------------------------------------------------------------------------
const styleSrc = (html.match(/<style>([\s\S]*?)<\/style>/) || ["", ""])[1]
  .replace(/\/\*[\s\S]*?\*\//g, "");
const styledClasses = new Set([...styleSrc.matchAll(/\.(-?[A-Za-z_][-\w]*)/g)].map(m => m[1]));
// A hex colour is not an id. Values sit after a colon, so requiring whitespace or
// a combinator in front of the # plus rejecting hex-shaped names is enough.
const styledIds = new Set([...styleSrc.matchAll(/(^|[\s,>+~(])#([A-Za-z_][-\w]*)/g)]
  .map(m => m[2]).filter(n => !/^[0-9a-fA-F]{3,8}$/.test(n)));
const definedTokens = new Set([...styleSrc.matchAll(/(--[-\w]+)\s*:/g)].map(m => m[1]));
// Every themed surface is defined twice, once plainly and once inside the dark
// block, and some are defined a third time for Increase Contrast. A token that
// only survives inside one of those blocks is undefined for everyone the block
// does not match, which on a pool deck in daylight is most people. So the
// unconditional definitions are counted on their own.
function withoutMediaBlocks(css){
  let out = "";
  for (let i = 0; i < css.length; i++){
    if (css.startsWith("@media", i)){
      const open = css.indexOf("{", i);
      if (open !== -1){
        let depth = 0, j = open;
        for (; j < css.length; j++){
          if (css[j] === "{") depth++;
          else if (css[j] === "}" && --depth === 0){ j++; break; }
        }
        i = j - 1;
        continue;
      }
    }
    out += css[i];
  }
  return out;
}
const baseTokens = new Set([...withoutMediaBlocks(styleSrc).matchAll(/(--[-\w]+)\s*:/g)].map(m => m[1]));
const cssTokenUses = new Set([...styleSrc.matchAll(/var\(\s*(--[-\w]+)/g)].map(m => m[1]));
const idLookups = [...new Set([...appScript.matchAll(/getElementById\(\s*"([^"]+)"/g)].map(m => m[1]))];
const markupIds = new Set();
walk(parseBody(html).root, e => { if (e.attrs.id) markupIds.add(e.attrs.id); });

function analyse(s){
  const out = [];
  function want(what, cond, detail){
    out.push({ what, ok: !!cond, detail: detail == null ? "" : String(detail) });
  }
  const live = Object.keys(s.ids);
  const strayLookup = idLookups.filter(id => live.indexOf(id) === -1);
  want("every id the engine looks up exists, in the markup or because the engine makes it",
       strayLookup.length === 0,
       "getElementById asks for " + strayLookup.join(", ") + " and nothing has that id");
  const strayStyled = [...styledIds].filter(id => live.indexOf(id) === -1);
  want("every id the stylesheet targets is an id something actually has",
       strayStyled.length === 0,
       "the stylesheet styles #" + strayStyled.join(", #") + " and nothing carries it");
  const unstyled = Object.keys(s.classes).filter(c => !styledClasses.has(c));
  want("every class the engine assigns is a class the stylesheet styles",
       unstyled.length === 0,
       "assigned but unstyled: " + unstyled.join(", "));
  const strayToken = Object.keys(s.tokens).filter(v => !definedTokens.has(v));
  want("every custom property an inline style reaches for is defined",
       strayToken.length === 0,
       "used in a style prop but never defined: " + strayToken.join(", "));
  const strayCssToken = [...cssTokenUses].filter(v => !definedTokens.has(v));
  want("every custom property the stylesheet reaches for is defined",
       strayCssToken.length === 0, "used in CSS but never defined: " + strayCssToken.join(", "));
  const conditional = [...cssTokenUses].concat(Object.keys(s.tokens))
    .filter(v => definedTokens.has(v) && !baseTokens.has(v));
  want("every custom property in use has a plain definition, not only one inside a media query",
       conditional.length === 0,
       "defined only inside a media query, so it is missing whenever that query does not match: " +
       [...new Set(conditional)].join(", "));
  return out;
}

console.log("\n=== 17. The engine and the stylesheet agree on names");
analyse(sweep).forEach(f =>
  check(f.ok, f.what, f.what + (f.detail ? "  [" + f.detail + "]" : "")));
console.log("  " + Object.keys(sweep.classes).length + " classes painted, " +
  styledClasses.size + " styled, " + definedTokens.size + " tokens defined");
// The dead-CSS list moved to 17c, which knows about class names the sweep never
// paints and so stops calling them dead.

// ---------------------------------------------------------------------------
// 17c. The vocabulary, the tokens and the class names, read as text
//
// Sections 16 and 17 can only judge code that actually ran. Three kinds of
// interface bug sit outside that reach and ship green today:
//
//  1. A screen this sweep never opens reaches for classList, dataset, closest,
//     matches, getBoundingClientRect or style.setProperty. The stub has none of
//     them, so the day something drives that screen the check throws instead of
//     reporting. The stub is not the reason they are banned. This is hand-written
//     vanilla JS with one small h() helper, each of them has a plain equivalent
//     (className, an attribute, a variable the handler already closes over), and
//     the ban is what keeps every screen driveable with no browser at all.
//  2. A var(--x) in a branch nothing paints, or in a style attribute in <body>,
//     which the runtime harvest cannot see at all: a parsed attribute lands in
//     attrs, it never reaches el.style, so harvest() reads none of it. A missing
//     token was reported against this file for a week and turned out not to
//     exist. Reading every var() in the file settles that argument for good
//     instead of settling it for one seeded season.
//  3. A class literal in a branch nothing paints. The generating branch is the
//     live example: nothing here ever sets generating true, so the row at
//     index.html:1743 is invisible to section 16 by construction.
//
// All three are text, so this adds no seed, no clock and no sandbox, and section
// 19 proves each one fails when the text is wrong.
// ---------------------------------------------------------------------------

// Comments and string bodies are blanked before the vocabulary scan, newlines
// kept so the reported index.html line is the real one. Without that, "Nothing
// matches." in a piece of copy reads as a call to Element.matches, and a check
// that cries wolf on day one is a check somebody deletes on day two.
function scrub(src, keepStrings){
  let out = "", i = 0;
  const n = src.length;
  while (i < n){
    const c = src[i], d = src[i + 1];
    if (c === "/" && d === "/"){ while (i < n && src[i] !== "\n") i++; continue; }
    if (c === "/" && d === "*"){
      const j = src.indexOf("*/", i + 2), end = j === -1 ? n : j + 2;
      out += src.slice(i, end).replace(/[^\n]/g, " ");
      i = end; continue;
    }
    if (c === '"' || c === "'" || c === "`"){
      const q = c;
      out += keepStrings ? c : " "; i++;
      while (i < n){
        if (src[i] === "\\"){ out += keepStrings ? src.slice(i, i + 2) : "  "; i += 2; continue; }
        if (src[i] === q){ out += keepStrings ? q : " "; i++; break; }
        out += keepStrings ? src[i] : (src[i] === "\n" ? "\n" : " ");
        i++;
      }
      continue;
    }
    out += c; i++;
  }
  return out;
}

// The index.html line the engine script starts on, so a failure names a line he
// can open rather than an offset into a string.
const SCRIPT_AT = html.slice(0, html.indexOf(appScript)).split("\n").length - 1;

// Member expressions, never bare words, so a local variable or a piece of copy
// called "matches" is not an offence. An entry may allow exactly one known line.
const BANNED = [
  { name: "classList",              re: /\.classList\b/ },
  { name: "dataset",                re: /\.dataset\b/ },
  { name: "closest(",               re: /\.closest\s*\(/ },
  { name: "matches(",               re: /\.matches\s*\(/ },
  { name: "getBoundingClientRect(", re: /\.getBoundingClientRect\s*\(/ },
  { name: "setProperty(",           re: /\.setProperty\s*\(/ },
  // h() owns the app's only innerHTML write, the html: branch. Anywhere else it
  // is both invisible to the stub and a way to inject markup, because every
  // string on these screens comes back out of the database.
  { name: "innerHTML",              re: /\.innerHTML\b/,
    allow: raw => /k\s*===\s*"html"/.test(raw) }
];

function staticAudit(scriptText, htmlText){
  const out = [];
  function want(what, cond, detail){
    out.push({ what, ok: !!cond, detail: detail == null ? "" : String(detail) });
  }
  // If scrub loses track of where a string ends it blanks live code instead, and
  // a scan over blanked code cannot fail: it reports all clear for ever. Keeping
  // the strings and compiling the result is the canary. Compiling is not running.
  const kept = scrub(scriptText, true);
  let reads = true, why = "";
  try{ new vm.Script(kept, { filename: "vocabulary-scan" }); }
  catch(e){ reads = false; why = e.message; }
  want("the text scanner reads the script instead of blanking it",
       reads, "the comment-stripped script no longer compiles, so every scan below " +
       "is blind and passing means nothing: " + why);

  const code = scrub(scriptText, false);
  const codeLines = code.split("\n"), rawLines = scriptText.split("\n");
  const offenders = [];
  BANNED.forEach(rule => {
    const at = [];
    codeLines.forEach((L, i) => {
      if (!rule.re.test(L)) return;
      if (rule.allow && rule.allow(rawLines[i] || "")) return;
      at.push(SCRIPT_AT + i + 1);
    });
    if (at.length) offenders.push(rule.name + " at index.html:" + at.join(" and :"));
  });
  want("the engine keeps to the DOM vocabulary the harness can drive",
       offenders.length === 0,
       "the stub has no such thing, so this throws on his phone before it throws " +
       "here: " + offenders.join("; "));

  const css = (htmlText.match(/<style>([\s\S]*?)<\/style>/) || ["", ""])[1]
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const defined = new Set([...css.matchAll(/(--[-\w]+)\s*:/g)].map(m => m[1]));
  const styled = new Set([...css.matchAll(/\.(-?[A-Za-z_][-\w]*)/g)].map(m => m[1]));
  // Every var() in the file, not only the ones a painted element happened to
  // carry. This is the check that makes the missing-token argument unrepeatable.
  const scanned = htmlText.replace(/<!--[\s\S]*?-->/g, "");
  const used = [...new Set([...scanned.matchAll(/var\(\s*(--[-\w]+)/g)].map(m => m[1]))];
  const stray = used.filter(v => !defined.has(v));
  want("every var(--x) anywhere in index.html resolves to a token index.html defines",
       stray.length === 0, "used but never defined: " + stray.join(", "));

  // Class names as written, so both arms of a ternary count even though a single
  // sweep can only ever paint one of them.
  const lits = new Set();
  const addNames = s => String(s).split(/\s+/).filter(Boolean)
    .forEach(n => { if (/^-?[A-Za-z_][-\w]*$/.test(n)) lits.add(n); });
  [...kept.matchAll(/\bclass\s*:\s*"([^"]*)"/g)].forEach(m => addNames(m[1]));
  [...kept.matchAll(/\bclassName\s*=\s*"([^"]*)"/g)].forEach(m => addNames(m[1]));
  [...kept.matchAll(/\bclass(?:\s*:|Name\s*=)\s*[^,\n]*?\?\s*"([^"]*)"\s*:\s*"([^"]*)"/g)]
    .forEach(m => { addNames(m[1]); addNames(m[2]); });
  const unstyled = [...lits].filter(c => !styled.has(c));
  want("every class name written into the script has a rule in the stylesheet",
       unstyled.length === 0, "written but styled nowhere: ." + unstyled.join(", ."));

  const htmlClasses = new Set();
  walk(parseBody(htmlText).root, e => classesOf(e).forEach(c => htmlClasses.add(c)));
  return { findings: out, lits, styled, defined, htmlClasses,
           htmlProps: [...kept.matchAll(/(^|[{,\s])html\s*:/g)].length };
}

console.log("\n=== 17c. The script text keeps to the contract");
const audit = staticAudit(appScript, html);
audit.findings.forEach(f =>
  check(f.ok, f.what, f.what + (f.detail ? "  [" + f.detail + "]" : "")));
console.log("  " + audit.lits.size + " class names written in the script, " +
  audit.defined.size + " tokens defined, engine script starts at index.html:" +
  (SCRIPT_AT + 1));
// Reported, never failed. A rule can be for a state nothing reaches yet, and a
// harness that fails on dead CSS would fight every half-finished pass 2 edit. The
// union is what stops the false alarm: a class assigned only in an unpainted
// branch is not dead, it is unreached, and the runtime list alone cannot tell.
const assignedClasses = new Set([...Object.keys(sweep.classes), ...audit.lits,
                                 ...audit.htmlClasses]);
const orphanClasses = [...audit.styled].filter(c => !assignedClasses.has(c));
console.log("  " + (orphanClasses.length
  ? "styled but assigned nowhere, so probably dead: ." + orphanClasses.join(", .")
  : "every styled class is assigned somewhere"));
if (audit.htmlProps)
  console.log("  note: " + audit.htmlProps + " h() call" +
    (audit.htmlProps === 1 ? "" : "s") + " pass raw markup through html:, and the " +
    "stub cannot see inside those, so their contents are unchecked");

// ---------------------------------------------------------------------------
// 18. The paint checks can actually fail
//
// A check that draws a screen and shrugs is worse than no check, because it
// reads as protection. So the suite breaks the app on purpose, five ways, loads
// each broken copy into its own sandbox, and runs the same sweep against it. If
// a mutant comes back clean, the sweep is decoration and this section says so.
//
// Two of the mutants only change a name, never a word on screen. Those must slip
// past section 16 and be caught by section 17, which is the whole point of 17.
// ---------------------------------------------------------------------------
console.log("\n=== 18. The paint checks fail when the app is broken (control)");
const MUTANTS = [
  { what: "renderSessionCard gutted to an empty body",
    from: "function renderSessionCard(sk, editable){",
    to:   "function renderSessionCard(sk, editable){ if (1) return;",
    caughtBy: "paint" },
  { what: "renderPool gutted to an empty body",
    from: "function renderPool(){",
    to:   "function renderPool(){ if (1) return;",
    caughtBy: "paint" },
  { what: "h() dropping every child, so the whole app paints empty boxes",
    from: "for (var i=2;i<arguments.length;i++){",
    to:   "for (var i=2;i<2;i++){",
    caughtBy: "paint" },
  { what: "the pool overlay renamed away from the id the stylesheet targets",
    from: 'h("div",{id:"pool"})',
    to:   'h("div",{id:"deck"})',
    caughtBy: "either" },
  { what: "the goal box renamed to a class the stylesheet does not style",
    from: 'h("div",{class:"goalbox"}',
    to:   'h("div",{class:"goalbx"}',
    caughtBy: "names" },
  { what: "an inline style reaching for a custom property that does not exist",
    from: 'style:{color:"var(--accent-text)"}',
    to:   'style:{color:"var(--accent-ink)"}',
    caughtBy: "names" }
];
const healthy = sweep.findings.every(f => f.ok);
MUTANTS.forEach(m => {
  const broken = appScript.split(m.from).join(m.to);
  if (broken === appScript){
    bad('the control cannot break the app that way any more, so it proves nothing: "' +
        m.from.slice(0, 46) + '"');
    return;
  }
  const menv = makeEnv(broken);
  let paintFails = [], nameFails = [];
  if (menv.error){
    paintFails = [{ what: "the broken copy would not even load: " + menv.error.message }];
  } else {
    try{
      const ms = paintSweep(menv);
      paintFails = ms.findings.filter(f => !f.ok);
      nameFails = analyse(ms).filter(f => !f.ok);
    }catch(e){
      paintFails = [{ what: "the sweep threw: " + e.message }];
    }
  }
  const first = (paintFails[0] || nameFails[0] || {}).what || "";
  if (m.caughtBy === "paint" || m.caughtBy === "either"){
    check(paintFails.length + nameFails.length > 0,
      m.what + ": caught, " + (paintFails.length + nameFails.length) +
      " checks fail, first is \"" + first.slice(0, 52) + "\"",
      m.what + ": NOT CAUGHT. Section 16 passes on a broken app, so it is decoration.");
  } else {
    // The isolation half of the claim only means anything while section 16 is
    // green. Once the app itself is failing, the same failure turns up in every
    // mutant and says nothing about this control.
    check(nameFails.length > 0 && (!healthy || paintFails.length === 0),
      m.what + ": slips past the words on screen and is caught by the name check",
      m.what + ": " + (nameFails.length ? "" : "NOT CAUGHT by the name check. ") +
      (healthy && paintFails.length ? paintFails.length + " paint checks also failed, so the control is not isolating anything." : ""));
  }
});
// The sweep left the seeded generator and the frozen clock where the mutants put
// them, so put them back for anything that runs after this.
setSeed(1);
setNow(BASE_NOW);

// ---------------------------------------------------------------------------
// 19. The text checks fail when the text is wrong (control)
//
// Same rule as section 18: a check that cannot fail is decoration that reads as
// protection. Each of these three is an edit that was actually proposed for pass
// 2, and each one is invisible to sections 16 and 17, so they show what 17c is
// for as well as that it works. Text in, findings out, no sandbox and no clock.
// ---------------------------------------------------------------------------
console.log("\n=== 19. The text checks fail when the text is wrong (control)");
const TEXT_MUTANTS = [
  { what: "h() moved from className to classList, the way the draft edits write it",
    inScript: true,
    from: 'if (k === "class") e.className = v;',
    to:   'if (k === "class") e.classList.add(v);' },
  { what: "a var() token in a <body> style attribute, which no painted element carries",
    inScript: false,
    from: '<div id="app"></div>',
    to:   '<div id="app" style="color:var(--accent-ink)"></div>' },
  { what: "a class typo in the generating branch, which nothing here ever paints",
    inScript: true,
    from: 'generating ? h("div",{class:"small muted"},',
    to:   'generating ? h("div",{class:"smal muted"},' }
];
TEXT_MUTANTS.forEach(m => {
  const script = m.inScript ? appScript.split(m.from).join(m.to) : appScript;
  const page = m.inScript ? html : html.split(m.from).join(m.to);
  if (m.inScript ? script === appScript : page === html){
    bad('the control cannot break it that way any more, so it proves nothing: "' +
        m.from.slice(0, 46) + '"');
    return;
  }
  let fails;
  try{
    fails = staticAudit(script, page).findings.filter(f => !f.ok);
  }catch(e){
    fails = [{ what: "the audit threw: " + e.message }];
  }
  check(fails.length > 0,
    m.what + ": caught by \"" + ((fails[0] || {}).what || "").slice(0, 44) + "\"",
    m.what + ": NOT CAUGHT, so section 17c is decoration.");
});

// ---------------------------------------------------------------------------
console.log("\n" + "=".repeat(64));
if (failures === 0){
  console.log(OK + "  All checks passed. " + results.length + " simulated sessions, " +
              exercises.length + " library sets.");
} else {
  console.log(BAD + "  " + failures + " check" + (failures === 1 ? "" : "s") + " failed.");
}
console.log("=".repeat(64) + "\n");
process.exit(failures === 0 ? 0 : 1);
