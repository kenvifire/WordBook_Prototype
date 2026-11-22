import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/wb/page-header";
import { Card } from "@/components/wb/card";
import { LoadingState, ErrorState } from "@/components/wb/query-states";
import { adminCopy } from "@/content/copy";
import { getMetrics } from "@/lib/metrics.functions";
import { seo } from "@/lib/seo";

const metricsQuery = () => queryOptions({ queryKey: ["admin-metrics"], queryFn: () => getMetrics() });
const c = adminCopy.metrics;

export const Route = createFileRoute("/admin/metrics")({
  loader: ({ context }) => context.queryClient.ensureQueryData(metricsQuery()),
  pendingComponent: LoadingState, errorComponent: ErrorState,
  head: () => seo("Admin metrics", "Pilot metrics.", true), component: Metrics,
});

function Table({ title, head, rows }: { title: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <Card className="overflow-x-auto">
      <h2 className="mb-3 text-xl font-bold">{title}</h2>
      {rows.length === 0 ? <p className="text-muted-foreground">{c.empty}</p> : (
        <table className="w-full text-left">
          <thead><tr>{head.map((h) => <th key={h} className="border-b border-border py-2 pr-4 font-semibold">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className="border-b border-border py-2 pr-4">{v}</td>)}</tr>)}</tbody>
        </table>
      )}
    </Card>
  );
}

function Metrics() {
  const { data } = useSuspenseQuery(metricsQuery());
  return (
    <>
      <PageHeader title={c.title} description={c.desc} />
      <div className="space-y-4">
        <Table title={c.learners} head={[c.name, c.email, c.joined]} rows={data.learners.map((l) => [l.name ?? c.noName, l.email, new Date(l.joined).toLocaleDateString()])} />
        <div className="grid gap-4 md:grid-cols-2">
          <Table title={c.errors} head={[c.word, c.errorCol]} rows={data.errors.map((e) => [e.label, e.count])} />
          <Table title={c.lookups} head={[c.word, c.lookupCol]} rows={data.lookups.map((e) => [e.label, e.count])} />
        </div>
        <Table title={c.stories} head={[c.storyCol, c.opens]} rows={data.stories.map((e) => [e.label, e.count])} />
      </div>
    </>
  );
}
