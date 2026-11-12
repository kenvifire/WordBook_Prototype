import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GateStatusView } from './GateStatusView';

test('GateStatusView shows unlocked messaging when passed, study messaging otherwise', () => {
  const { rerender } = render(<GateStatusView status={{ recognizedCount: 4, totalCount: 5, recognitionRate: 0.8, passed: true }} />);
  expect(screen.getByText(/unlocked/i)).toBeInTheDocument();
  rerender(<GateStatusView status={{ recognizedCount: 1, totalCount: 5, recognitionRate: 0.2, passed: false }} />);
  expect(screen.getByText(/keep studying/i)).toBeInTheDocument();
});
