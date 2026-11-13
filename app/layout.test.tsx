import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeaderNav } from './layout';

describe('HeaderNav', () => {
  test('I3: links to Library, Review, and Settings are always rendered', () => {
    render(<HeaderNav />);

    expect(screen.getByRole('link', { name: 'Library' })).toHaveAttribute('href', '/library');
    expect(screen.getByRole('link', { name: 'Review' })).toHaveAttribute('href', '/review');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
  });
});
