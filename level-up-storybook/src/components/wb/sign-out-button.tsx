import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { copy } from "@/content/copy";
import { notify } from "./toast";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  async function handle() {
    setBusy(true);
    try {
      await qc.cancelQueries();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      qc.clear();
      navigate({ to: "/signin", replace: true });
    } catch {
      notify.error(copy.common.signOutError);
      setBusy(false);
    }
  }
  return (
    <button type="button" onClick={handle} disabled={busy} aria-label={copy.common.signOut}
      className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border-2 border-ink bg-card px-3 text-sm font-bold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60">
      <LogOut className="h-4 w-4" aria-hidden />
      <span className={compact ? "hidden sm:inline" : ""}>{copy.common.signOut}</span>
    </button>
  );
}
