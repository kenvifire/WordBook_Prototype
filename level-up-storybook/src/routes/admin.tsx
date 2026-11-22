import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Logo } from "@/components/wb/logo";
import { SignOutButton } from "@/components/wb/sign-out-button";
import { adminCopy } from "@/content/copy";
import { requireStaff } from "@/lib/guards";
import { LoadingState, ErrorState } from "@/components/wb/query-states";


export const Route = createFileRoute("/admin")({ ssr: false, beforeLoad: () => requireStaff(), pendingComponent: LoadingState, errorComponent: ErrorState, component: AdminLayout });

function AdminLayout() {
  const items = [
    { to: "/admin/stories", label: adminCopy.nav.stories },
    { to: "/admin/metrics", label: adminCopy.nav.metrics },
    { to: "/library", label: adminCopy.nav.back },
  ] as const;
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b-2 border-ink bg-card p-4 md:min-h-screen md:w-60 md:border-b-0 md:border-r-2">
        <Logo />
        <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Admin</p>
        <nav className="mt-4 flex gap-2 md:flex-col" aria-label="Admin">
          {items.map((i) => (
            <Link key={i.to} to={i.to} className="flex min-h-11 items-center rounded-xl px-3 font-semibold hover:bg-muted" activeProps={{ className: "bg-secondary" }}>{i.label}</Link>
          ))}
        </nav>
        <div className="mt-4"><SignOutButton /></div>
      </aside>
      <main className="flex-1 px-page py-section"><Outlet /></main>
    </div>
  );
}
