import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/practice',
}));

import { TabBar } from './TabBar';

describe('TabBar', () => {
  test('marks the current route as active', () => {
    render(<TabBar />);
    expect(screen.getByRole('link', { name: /practice/i })).toHaveAttribute('aria-current', 'page');
  });

  test('renders links to Bookshelf, Practice, and Statistics', () => {
    render(<TabBar />);
    expect(screen.getByRole('link', { name: /bookshelf/i })).toHaveAttribute('href', '/bookshelf');
    expect(screen.getByRole('link', { name: /practice/i })).toHaveAttribute('href', '/practice');
    expect(screen.getByRole('link', { name: /statistics/i })).toHaveAttribute('href', '/statistics');
  });

  test('does not mark inactive tabs as active', () => {
    render(<TabBar />);
    expect(screen.getByRole('link', { name: /bookshelf/i })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: /statistics/i })).not.toHaveAttribute('aria-current');
  });

  test('gives the active tab text-ink and inactive tabs text-ink-muted', () => {
    render(<TabBar />);
    // 'text-ink-muted' contains 'text-ink' as a substring, so the active-tab
    // assertion checks the exact class token, not a loose substring match —
    // otherwise an inactive-muted class on the active tab would false-pass.
    const activeClasses = screen.getByRole('link', { name: /practice/i }).className.split(' ');
    expect(activeClasses).toContain('text-ink');
    expect(activeClasses).not.toContain('text-ink-muted');

    expect(screen.getByRole('link', { name: /bookshelf/i }).className.split(' ')).toContain(
      'text-ink-muted'
    );
    expect(screen.getByRole('link', { name: /statistics/i }).className.split(' ')).toContain(
      'text-ink-muted'
    );
  });
});
