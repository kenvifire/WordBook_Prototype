import { requireUser } from "@/lib/guards";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/wb/page-header";
import { Card } from "@/components/wb/card";
import { Button } from "@/components/wb/button";
import { Badge, GenreBadge, LevelBadge } from "@/components/wb/badge";
import { ProgressBar } from "@/components/wb/progress-bar";
import { Modal } from "@/components/wb/modal";
import { notify } from "@/components/wb/toast";
import { EmptyState } from "@/components/wb/empty-state";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/styleguide")({ ssr: false, beforeLoad: () => requireUser(), head: () => seo("Styleguide", "WordBook design system.", true), component: Styleguide });

const swatches = ["paper", "ink", "lemon", "lime", "aqua", "mint", "card", "muted"];

function Styleguide() {
  const [open, setOpen] = useState(false);
  return (
    <main className="mx-auto max-w-5xl space-y-section px-page py-section">
      <PageHeader title="Styleguide" description="Tokens and components." />
      <section><h2 className="mb-3 text-2xl font-bold">Colors</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{swatches.map((s) => (
          <div key={s} className="card-block overflow-hidden"><div className="h-16" style={{ background: `var(--${s})` }} /><p className="bg-card p-2 font-semibold">--{s}</p></div>
        ))}</div>
      </section>
      <section><h2 className="mb-3 text-2xl font-bold">Type</h2>
        <h1 className="text-5xl font-extrabold">Display heading</h1>
        <p className="reader-text mt-2 max-w-xl">Reader text is 18px or more with a line height of 1.6. It is easy to read.</p>
      </section>
      <section className="flex flex-wrap gap-3"><Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="ghost">Ghost</Button><Button disabled>Disabled</Button></section>
      <section className="flex flex-wrap gap-2"><LevelBadge level="A2" /><LevelBadge level="B1" /><LevelBadge level="B2" /><LevelBadge level="C1" /><GenreBadge genre="fantasy" /><GenreBadge genre="mystery" /><GenreBadge genre="funny" /><Badge className="bg-muted">draft</Badge></section>
      <section className="grid gap-4 sm:grid-cols-2"><Card><h3 className="text-xl font-bold">Card</h3><p>Simple content block.</p></Card><Card><ProgressBar value={65} label="Progress" /></Card></section>
      <section className="flex flex-wrap gap-3"><Button onClick={() => setOpen(true)}>Open modal</Button><Button variant="secondary" onClick={() => notify.success("Saved!")}>Show toast</Button></section>
      <Modal open={open} onOpenChange={setOpen} title="A modal" description="Short text inside a modal."><Button onClick={() => setOpen(false)}>OK</Button></Modal>
      <EmptyState title="Nothing here" text="This is the empty state." action={<Button size="sm">Do something</Button>} />
    </main>
  );
}
