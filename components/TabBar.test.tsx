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
});
