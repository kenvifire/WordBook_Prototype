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

  // The locked and practicing fills are both too light for white (text-paper)
  // text to pass WCAG AA at this badge's text-xs size (computed ~2.5:1 and
  // ~2.7:1 in light mode) — text-ink against those same fills passes
  // comfortably (~5.2:1/~5.0:1), without changing the fill hues themselves.
  test('locked and practicing badges use text-ink for sufficient contrast, not text-paper', () => {
    render(<SectionStatusBadge status="locked" />);
    expect(screen.getByText('Locked').className).not.toContain('text-paper');

    render(<SectionStatusBadge status="ready_to_practice" />);
    expect(screen.getByText('Practice to unlock').className).not.toContain('text-paper');
  });
});
