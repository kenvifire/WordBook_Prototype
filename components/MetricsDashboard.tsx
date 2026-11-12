import type { PilotMetrics } from '@/lib/metrics/pilotData';

export interface MetricsDashboardProps {
  metrics: PilotMetrics;
}

export function MetricsDashboard({ metrics }: MetricsDashboardProps) {
  return (
    <div>
      <h1>Pilot metrics (sample data)</h1>
      <p>
        The figures below are illustrative sample data, not computed from live usage.
      </p>

      <section>
        <h2>Recognition rate by section</h2>
        <ul>
          {metrics.recognitionRateBySection.map(({ section, rate }) => (
            <li key={section}>
              Section {section}: {Math.round(rate * 100)}%
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Sections/week, before vs. after</h2>
        <ul>
          {metrics.sectionsPerWeek.map(({ learner, before, after }) => (
            <li key={learner}>
              {learner}: {before} before, {after} after
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>SRS retention after N days</h2>
        <ul>
          {metrics.retentionAfterDays.map(({ days, retainedRate }) => (
            <li key={days}>
              Day {days}: {Math.round(retainedRate * 100)}% retained
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
