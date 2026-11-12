import { MetricsDashboard } from '@/components/MetricsDashboard';
import { getPilotMetrics } from '@/lib/metrics/pilotData';

export default function MetricsPage() {
  const metrics = getPilotMetrics();

  return (
    <main>
      <MetricsDashboard metrics={metrics} />
    </main>
  );
}
