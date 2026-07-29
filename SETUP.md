# Win and Swim Training Generator — setup

One button generates today's training for the advanced adults group, tells you
the goal of it, saves it against the date, and never repeats a set inside six
sessions. It runs as an app on your phone.

Stack: one static web page (no build tools) + Supabase (free tier) + one
Supabase Edge Function that talks to Claude + GitHub Pages (free). Same shape as
the Finance app and the Swimmers Progress app.

**Do the steps in order.** Steps 1 to 7 give you a working app on your phone.
Steps 8 and 9 add the Claude layer on top. If you stop after step 7 everything
still works: the app writes sessions from the library itself instead of having
Claude write them, and it says so on the card.

---

## 1. Create the Supabase project

The free plan caps how many active projects one organization can have. If
**New project** will not let you add another, just sign up with a second email.
That is the simplest way through and it costs nothing.

1. Go to **supabase.com**, sign in (or sign up with a second email), then
   **New project**.
2. Name it `winandswim-trainings`. Pick a strong database password and save it
   in your password manager. Region: **Frankfurt** or **London**.
3. Wait for it to finish setting up, about two minutes.

Every table this app creates is named `tr_something`, so if you ever prefer to
keep everything in one place you can run step 2 inside the project that already
holds Swimmers Progress instead. Nothing can collide, and the rest of this guide
is identical either way. The only thing that changes is which project's URL and
key go into `config.js` at step 7.

## 2. Create the database

1. In the project, open **SQL Editor** in the left sidebar.
2. Open `supabase-schema.sql` from this folder, select all of it, copy it.
3. Paste it into the SQL Editor and press **Run**.
4. You should see `Success. No rows returned`.

That created nine tables (all named `tr_something`, so they cannot clash with
anything), the security rules, 147 training sets, 15 focuses, 13 games, and 48 of
your own past trainings that Claude reads as a style reference.

The file is safe to run again any time. It never overwrites edits you have made
to the library, and it never duplicates anything.

**Check it all landed.** A half-finished SQL run is the one failure that wastes
time later, so paste this in and run it too:

```sql
with counts as (
  select 'tr_exercises'            t, count(*) n, 147  want from public.tr_exercises
  union all select 'tr_focuses',              count(*), 15   from public.tr_focuses
  union all select 'tr_games',                count(*), 13   from public.tr_games
  union all select 'tr_historical_trainings', count(*), 48   from public.tr_historical_trainings
  union all select 'tr_settings',             count(*), 1    from public.tr_settings
  union all select 'tr_sessions',             count(*), 0    from public.tr_sessions
  union all select 'tr_session_items',        count(*), 0    from public.tr_session_items
  union all select 'tr_ai_generations',       count(*), 0    from public.tr_ai_generations
  union all select 'tr_coaches',              count(*), null from public.tr_coaches
)
select c.t as table_name, c.n as rows_found, c.want as expected,
       case when c.want is null then 'however many coaches you added'
            when c.n = c.want   then 'ok'
            else 'MISMATCH' end as status,
       (select p.relrowsecurity from pg_class p
          join pg_namespace ns on ns.oid = p.relnamespace
         where ns.nspname = 'public' and p.relname = c.t) as rls_on
from counts c order by c.t;
```

Every row should read `ok` with `rls_on` true. `tr_coaches` will be 0 until you
do step 4. If a table errors with "does not exist", the run stopped partway:
just run the whole file again.

## 3. Turn sign-ups OFF

**Do not skip this.** New Supabase projects let anybody in the world create an
account, and the app's key is published in the page.

1. **Authentication** → **Sign In / Providers**.
2. Find **Allow new users to sign up** and switch it **off**. Save.

The database also refuses to show anything to a login that is not in the
`tr_coaches` table, so this is the second lock rather than the only one. Both
are worth having.

## 4. Create the coach logins

For each coach (you, Kesler, Anahi):

1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. Enter their email and a password. **Tick Auto Confirm User.**

Then open **SQL Editor** and run this once, with the real email addresses:

```sql
insert into public.tr_coaches (id, display_name)
select id, split_part(email, '@', 1)
from auth.users
where email in ('you@example.com', 'kesler@example.com', 'anahi@example.com')
on conflict (id) do nothing;
```

Check it worked, and tidy the names if you want:

```sql
select id, display_name from public.tr_coaches;
update public.tr_coaches set display_name = 'Vlad' where display_name = 'vlad';
```

Anyone without a row in `tr_coaches` can log in but will see nothing, and the
app shows them the exact line to run. Every coach sees every session, on
purpose: if Kesler ran Thursday, your Saturday must not repeat it.

## 5. Connect the app to your project

1. In Supabase: **Project Settings** → **API Keys**.
2. Copy the key under **Publishable key**. It starts with `sb_publishable_`.
   (Supabase used to call this the "anon public" key. The **Secret key** below
   it, `sb_secret_...`, is a different thing and must never go in this file.)
3. Go to **Project Settings** → **General** for the **Project URL**, or just
   take it off your browser address bar. You need the bare origin with no path:
   - Right: `https://xxxxxxxx.supabase.co`
   - Wrong: `https://xxxxxxxx.supabase.co/rest/v1/`
4. Open `config.js` in this folder and paste them in:

```js
window.WSTRAIN_CONFIG = {
  url: "https://xxxxxxxx.supabase.co",
  anonKey: "sb_publishable_...."
};
```

The publishable key is meant to be public and sits in the page for anyone to
read. All the protection comes from step 3 and step 4. **Never put the Secret
key here, and never put the Anthropic key here.**

## 6. Put it online

1. Create a GitHub repository called `winandswim-trainings`.
2. Upload every file in this folder: `index.html`, `config.js`,
   `supabase-schema.sql`, `manifest.webmanifest`, `sw.js`, the three `.png`
   icons, `SETUP.md`, `verify.js`, and the `edge-function` folder.
3. Repo → **Settings** → **Pages** → Source: **Deploy from a branch** →
   Branch `main`, folder `/ (root)` → **Save**.
4. After a minute it is live at
   `https://vlad72-glitch.github.io/winandswim-trainings/`.

## 7. Put it on your phone

1. Open the address above in Safari on your phone.
2. Log in.
3. **Share** → **Add to Home Screen**.

**One thing to do before class:** iPhones lock the screen after a minute and a
web app cannot stop that. Set **Settings** → **Display & Brightness** →
**Auto-Lock** to **5 minutes** before you start, or the pool view will keep
going dark in your hand. Android does not have this problem.

## 8. Add your Anthropic key as a secret

By now the app already works. This step is what gets Claude writing the
coaching notes instead of the library.

1. Go to **console.anthropic.com**, sign in, **API keys** → **Create key**.
   Copy it. It starts with `sk-ant-`.
2. Add some credit under **Plans and billing**. Five euros lasts months: a
   generated session costs about five to ten cents, so three classes a week is
   well under a euro a month.
3. In Supabase: **Edge Functions** in the left sidebar, then the **Secrets**
   tab, then **Add new secret**. It is not under Project Settings, whatever you
   may remember. Straight there:
   `https://supabase.com/dashboard/project/wueuvwutbeqtyuhmhglh/functions/secrets`
   - Name: `ANTHROPIC_API_KEY`
   - Value: paste the key
   - Save.

Do not confuse this with **Project Settings** → **Integrations** → **Vault**.
Vault is for database secrets and the function cannot read it.

The key lives only here. It is never in the web page, never in GitHub, and the
app never sees it. Your phone asks the Supabase function, and the function talks
to Claude.

## 9. Deploy the Edge Function

1. In Supabase: **Edge Functions** → **Deploy a new function** →
   **Via editor**.
2. Name it exactly `generate-session`. The name has to match or the app cannot
   find it.
3. Open `edge-function/generate-session/index.ts` from this folder, select all,
   copy, and paste it over the example code in the editor, replacing everything.
4. Press **Deploy**.

If, after this, generating a session says *"The function cannot reach the
database"*, your project is on Supabase's newer key system and the function needs
the Secret key handed to it directly. Add one more secret the same way as in
step 8:

- Name: `SB_SECRET_KEY`
- Value: **Project Settings** → **API Keys** → **Secret keys** → the eye icon to
  reveal `sb_secret_...`, then copy it.

That key belongs only in Supabase secrets. It must never go into `config.js` or
GitHub.

---

## Using it

**Today.** Open it, press **Generate today's training**. The date and the slot
fill themselves in from the day of the week. It picks a focus you have not done
recently, fills the 45 minutes from the library, and Claude writes the coaching
notes. About 30 seconds.

You can change the date to prepare Thursday's session on Wednesday evening. You
can switch the ending between a 5 minute cool-down and a 10 minute game. You can
force a focus if you already know what you want to work on.

Every block shows the set, a cue to shout, what to watch for, and an **Adv 1**
and **Adv 2** line, because you split the group by rest rather than by distance.
The **−1 rep** and **+1 rep** buttons adjust a block and recalculate the clock
straight away.

**Pool view** is the one to use on the deck: full screen, big type, a running
clock against the planned minutes. Tap a block to tick it off. Big targets,
because your hands are wet.

**After the session**, mark it **done**, tap a difficulty from 1 to 5, and add
one line if you want. Two 5s in a row and the next session comes down 100 m; two
1s and it goes up. If a class did not happen, mark it **did not run** and its
sets go straight back into the rotation.

**Copy as text** puts the whole session on the clipboard for Notes or WhatsApp.

**Library** is all 147 sets. You can retire one, and an amber label tells you
which are resting inside the no-repeat window. **Ask Claude for new sets**
suggests five new ones for whichever role is thinnest; you approve or reject
each. That is how the library grows.

**Insights** shows the focus balance over the last weeks, which roles are
getting thin, sets you have never used, and what Claude has cost this month.
The two pace numbers at the bottom are what make the clock come out right:
adjust them after two real sessions if the sessions feel long or short.

---

## When something is wrong

**"Almost there, needs setup"** — `config.js` still has the placeholder text.
Step 5.

**"Not set up as a coach yet"** — that login has no row in `tr_coaches`. The
screen shows you the exact line to run. Step 4.

**"Written from the library, Claude wasn't reachable"** — the session is fine
and fully usable; only the wording came from the library instead of Claude. The
banner says why. Common reasons: the function is not deployed (step 9), the key
is not set (step 8), the account is out of credit, or the pool wifi is bad.

**"Can't reach the database"** — free Supabase projects **pause after about a
week of no use**. Open the Supabase dashboard and press **Restore**, wait a
minute, then reload. Worth doing before the first class after a holiday.

**Nothing loads and you have no signal** — the app keeps a copy of the library
on your phone and will still generate a session from it. It cannot save until
you are back online, so use **Copy as text** if you need a record.

---

## After you change any file

1. Upload the changed files to GitHub, branch `main`.
2. **Bump the version in `sw.js`**: `ws-training-v1` becomes `ws-training-v2`,
   and so on. Phones cache the old version aggressively and this is what tells
   them to drop it.
3. On the phone, close the app fully and reopen it.

## Checking the generator still works

There is a test you can run if you ever change the library or the engine. With
Node installed, in this folder:

```bash
node verify.js
```

It simulates twelve seasons of 200 sessions and checks the things that matter:
every session lands between 55 and 61 minutes, no set comes back too soon, the
safety rules hold, no card prints a rep count that contradicts its own
distances, and Claude cannot change any of the numbers. It should end with
**All checks passed**.

It is seeded, so the same run always gives the same answer. For more confidence
after a big change, sweep a wider range:

```bash
SEEDS=1-40 node verify.js
```
