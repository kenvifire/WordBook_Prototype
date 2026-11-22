import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Server-side role check for /admin: reviewer or admin only.
export const checkStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (error) throw new Error(error.message);
    return { staff: data === true };
  });
