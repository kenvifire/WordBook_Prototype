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
    // exact: false, since "completed" now prefixes the label with a
    // checkmark glyph — this still fails correctly if the wrong label
    // substring were ever rendered, it just tolerates the added glyph.
    expect(screen.getByText(label, { exact: false })).toBeInTheDocument();
  });

  test('locked status uses the locked color', () => {
    render(<SectionStatusBadge status="locked" />);
    expect(screen.getByText('Locked').className).toContain('bg-locked');
  });

  test('ready_to_practice status uses the practicing color', () => {
    render(<SectionStatusBadge status="ready_to_practice" />);
    expect(screen.getByText('Practice to unlock').className).toContain('bg-practicing');
  });

  test('ready_to_read status uses the unlocked color with no checkmark', () => {
    render(<SectionStatusBadge status="ready_to_read" />);
    const badge = screen.getByText('Ready to read', { exact: false });
    expect(badge.className).toContain('bg-unlocked');
    expect(badge.textContent).not.toContain('✓');
  });

  test('completed status uses the unlocked color WITH a checkmark', () => {
    render(<SectionStatusBadge status="completed" />);
    const badge = screen.getByText('Completed', { exact: false });
    expect(badge.className).toContain('bg-unlocked');
    expect(badge.textContent).toContain('✓');
  });
});
