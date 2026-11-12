export interface PilotMetrics {
  recognitionRateBySection: { section: string; rate: number }[];
  sectionsPerWeek: { learner: string; before: number; after: number }[];
  retentionAfterDays: { days: number; retainedRate: number }[];
}

/**
 * Illustrative/sample pilot data for the three success metrics defined in the
 * project design doc:
 *   1. Recognition rate at the pre-reading gate, tracked across sections.
 *   2. Sections/books completed per week, before vs. after using WordBook.
 *   3. Retention of "mastered" words after several days.
 *
 * This is NOT computed from live usage data or seeded from the demo store —
 * it is a small hand-picked sample meant to show what a pilot readout would
 * look like once real learner data exists.
 */
export function getPilotMetrics(): PilotMetrics {
  return {
    recognitionRateBySection: [
      { section: 'I', rate: 0.68 },
      { section: 'II', rate: 0.74 },
      { section: 'III', rate: 0.79 },
      { section: 'IV', rate: 0.86 },
      { section: 'V', rate: 0.88 },
    ],
    sectionsPerWeek: [
      { learner: 'Learner A', before: 0.5, after: 2.5 },
      { learner: 'Learner B', before: 1, after: 3 },
      { learner: 'Learner C', before: 0, after: 1.5 },
      { learner: 'Learner D', before: 1.5, after: 4 },
    ],
    retentionAfterDays: [
      { days: 1, retainedRate: 0.93 },
      { days: 3, retainedRate: 0.85 },
      { days: 7, retainedRate: 0.75 },
      { days: 14, retainedRate: 0.67 },
    ],
  };
}
