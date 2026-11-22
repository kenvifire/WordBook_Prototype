import { redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { learnerQuery } from "@/data/learner";
import { checkStaff } from "@/lib/admin.functions";

export async function requireUser() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw redirect({ to: "/signin" });
  return data.user;
}

export async function requireConsent(queryClient: QueryClient) {
  await requireUser();
  const learner = await queryClient.ensureQueryData(learnerQuery());
  if (!learner?.consent_at) throw redirect({ to: "/consent" });
  return learner;
}

export async function requireStaff() {
  await requireUser();
  const { staff } = await checkStaff();
  if (!staff) throw redirect({ to: "/library" });
}
