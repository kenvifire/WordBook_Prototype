import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import SectionStatusBadge from './SectionStatusBadge';

describe('SectionStatusBadge', () => {
  test.each([
    ['locked', 'Locked'],
    ['ready_to_practice', 'Practice to unlock'],
    ['ready_to_read', 'Ready to read'],
    ['completed', 'Completed'],
  ])('renders the right label for status %s', (status, label) => {
    render(<SectionStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
