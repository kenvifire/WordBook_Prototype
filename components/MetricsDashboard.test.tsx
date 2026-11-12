import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricsDashboard } from './MetricsDashboard';
import type { PilotMetrics } from '@/lib/metrics/pilotData';

test('MetricsDashboard labels the data as pilot data and renders each metric', () => {
  const metrics: PilotMetrics = {
    recognitionRateBySection: [{ section: 'I', rate: 0.82 }],
    sectionsPerWeek: [{ learner: 'A', before: 1, after: 3 }],
    retentionAfterDays: [{ days: 7, retainedRate: 0.75 }],
  };
  render(<MetricsDashboard metrics={metrics} />);
  expect(screen.getByText(/pilot/i)).toBeInTheDocument();
  expect(screen.getByText(/82%/)).toBeInTheDocument();
});
