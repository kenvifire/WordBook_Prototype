import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SimpleShell } from "@/components/wb/simple-shell";
import { PageHeader } from "@/components/wb/page-header";
import { Card } from "@/components/wb/card";
import { Button } from "@/components/wb/button";
import { copy } from "@/content/copy";
import { seo } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { fetchLearner } from "@/data/learner";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/signin")({ ssr: false, head: () => seo("Sign in", "Sign in to WordBook and read stories at your level."), component: SignIn });

function SignIn() {
  const c = copy.signin;
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  // When a session exists (for example after opening the email link), send the learner on.
  useEffect(() => {
    let done = false;
    const go = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user || done) return;
      done = true;
      const learner = await fetchLearner().catch(() => null);
      navigate({ to: learner?.consent_at ? "/library" : "/consent", replace: true });
    };
    go();
    const { data: sub } = supabase.auth.onAuthStateChange((e) => { if (e === "SIGNED_IN") go(); });
    async function google() {
    setMsg(null);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/signin` });
    if (result.error) { setState("error"); setMsg(c.googleError); }
  }

  return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) { setState("error"); setMsg(c.badEmail); return; }
    setState("sending"); setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/signin` } });
    if (error) { setState("error"); setMsg(c.error); return; }
    setState("sent"); setMsg(c.sent);
  }

  async function google() {
    setMsg(null);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/signin` });
    if (result.error) { setState("error"); setMsg(c.googleError); }
  }

  return (
    <SimpleShell>
      <PageHeader title={c.title} description={c.desc} />
      <Card>
        <Button type="button" variant="secondary" className="w-full" onClick={google}>
          <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
          {c.google}
        </Button>
        <p className="my-4 text-center text-sm font-semibold text-muted-foreground">{c.or}</p>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <label className="block font-semibold">{c.email}
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border-2 border-ink bg-background px-3" placeholder="you@example.com" />
          </label>
          <Button type="submit" disabled={state === "sending"}>{state === "sending" ? c.sending : c.button}</Button>
          {msg && <p role="status" className={`rounded-xl border-2 border-ink p-3 font-semibold ${state === "error" ? "bg-mint" : "bg-lime"}`}>{msg}</p>}
        </form>
      </Card>
    </SimpleShell>
  );
}
