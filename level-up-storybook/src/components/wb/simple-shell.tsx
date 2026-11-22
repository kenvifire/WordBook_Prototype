import { Logo } from "./logo";
export function SimpleShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b-2 border-ink bg-background px-page py-2"><Logo /></header>
      <main className="mx-auto max-w-xl px-page py-section">{children}</main>
    </div>
  );
}
