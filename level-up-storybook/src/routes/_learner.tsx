import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { BookOpen, Flame, RotateCcw, TrendingUp } from "lucide-react";
import { Logo } from "@/components/wb/logo";
import { SignOutButton } from "@/components/wb/sign-out-button";
import { copy } from "@/content/copy";
import { useQuery } from "@tanstack/react-query";
import { activityQuery } from "@/data/review";
import { requireConsent } from "@/lib/guards";
import { LoadingState, ErrorState } from "@/components/wb/query-states";


export const Route = createFileRoute("/_learner")({ ssr: false, beforeLoad: ({ context }) => requireConsent(context.queryClient), pendingComponent: LoadingState, errorComponent: ErrorState, component: LearnerLayout });

const tabs = [
  { to: "/library", label: copy.tabs.library, Icon: BookOpen },
  { to: "/review", label: copy.tabs.review, Icon: RotateCcw },
  { to: "/progress", label: copy.tabs.progress, Icon: TrendingUp },
] as const;

function LearnerLayout() {
  const streakDays = useQuery(activityQuery()).data?.streakDays ?? 0;
  return (
    <div className="min-h-screen pb-[var(--tabbar-h)] md:pb-0">
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-page py-2">
          <Logo />
          <nav className="hidden gap-2 md:flex" aria-label="Main">
            {tabs.map((t) => (
              <Link key={t.to} to={t.to} className="flex min-h-11 items-center rounded-full px-4 font-semibold hover:bg-muted" activeProps={{ className: "bg-secondary" }}>{t.label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-2"><span className="flex min-h-11 items-center gap-1 rounded-full border-2 border-ink bg-lime px-3 text-sm font-bold" aria-label={copy.streak(streakDays)}>
            <Flame className="h-4 w-4" aria-hidden /> {streakDays}
          </span>
          <SignOutButton compact /></div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-page py-section"><Outlet /></main>
      <nav aria-label="Tabs" className="fixed inset-x-0 bottom-0 z-30 flex h-[var(--tabbar-h)] border-t-2 border-ink bg-card md:hidden">
        {tabs.map(({ to, label, Icon }) => (
          <Link key={to} to={to} className="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-bold" activeProps={{ className: "bg-secondary" }}>
            <Icon className="h-5 w-5" aria-hidden />{label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
