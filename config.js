// Win and Swim Training Generator — connection settings.
// From your Supabase project: Project Settings → API Keys.
//
// url      = the project origin ONLY, with no path on the end.
//            Right:  https://wueuvwutbeqtyuhmhglh.supabase.co
//            Wrong:  https://wueuvwutbeqtyuhmhglh.supabase.co/rest/v1/
//
// anonKey  = the key shown under "Publishable key". It starts sb_publishable_.
//            Supabase used to call this the "anon public" key. It is safe to
//            publish in a web page: all the protection comes from having
//            sign-ups switched off and from the tr_coaches table.
//
// NEVER put the Secret key (sb_secret_...) here, and never put the Anthropic
// key here. Those two belong only in Supabase, as Edge Function secrets.
window.WSTRAIN_CONFIG = {
  url: "https://wueuvwutbeqtyuhmhglh.supabase.co",
  anonKey: "sb_publishable_R_tOKzAJAPStxkO4v3q8ZQ_44Or6DeS"
};
