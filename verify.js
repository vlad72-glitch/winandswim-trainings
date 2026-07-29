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
// 2. Load the engine out of index.html behind a minimal DOM stub
// ---------------------------------------------------------------------------
function fakeEl(){
  const el = {
    className: "", style: {}, textContent: "", value: "", children: [], firstChild: null,
    append(){ for (const a of arguments) el.children.push(a); },
    appendChild(c){ el.children.push(c); return c; },
    removeChild(){ return null; },
    addEventListener(){}, removeEventListener(){}, setAttribute(){}, getAttribute(){ return null; },
    remove(){}, select(){}, focus(){}, contains(){ return false; },
    querySelector(){ return null; }, querySelectorAll(){ return []; },
    nodeType: 1
  };
  return el;
}
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const appScript = scripts.find(s => s.includes("WSTRAIN_ENGINE"));
if (!appScript){ console.log(BAD + " could not find the app script in index.html"); process.exit(1); }

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

const win = {
  WSTRAIN_CONFIG: { url: "https://YOUR-PROJECT.supabase.co", anonKey: "YOUR-ANON-KEY" },
  supabase: null,
  addEventListener(){}, removeEventListener(){}, scrollTo(){}, print(){},
  localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
  navigator: { clipboard: null },
  alert(){}, confirm(){ return false; }, setTimeout, clearTimeout, fetch: null,
  Intl, Date, Math: SeededMath, JSON, console
};
win.window = win;
const doc = {
  getElementById(){ return fakeEl(); }, createElement(){ return fakeEl(); },
  createTextNode(t){ return { nodeType: 3, textContent: String(t) }; },
  body: fakeEl(), activeElement: null, addEventListener(){}, execCommand(){ return true; }
};

const vm = require("vm");
const ctx = vm.createContext(Object.assign(win, {
  document: doc, localStorage: win.localStorage, navigator: win.navigator,
  AbortController: class { constructor(){ this.signal = {}; } abort(){} }
}));
try{
  vm.runInContext(appScript, ctx, { filename: "index.html" });
}catch(e){
  console.log("\n" + BAD + " the app script threw while loading: " + e.message);
  console.log(e.stack.split("\n").slice(0, 4).join("\n"));
  process.exit(1);
}
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
console.log("\n" + "=".repeat(64));
if (failures === 0){
  console.log(OK + "  All checks passed. " + results.length + " simulated sessions, " +
              exercises.length + " library sets.");
} else {
  console.log(BAD + "  " + failures + " check" + (failures === 1 ? "" : "s") + " failed.");
}
console.log("=".repeat(64) + "\n");
process.exit(failures === 0 ? 0 : 1);
