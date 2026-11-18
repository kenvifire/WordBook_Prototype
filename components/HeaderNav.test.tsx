import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeaderNav } from './HeaderNav';

describe('HeaderNav', () => {
  test('renders a settings link and no Library/Review text links', () => {
    render(<HeaderNav />);

    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
    expect(screen.queryByRole('link', { name: /library/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /review/i })).toBeNull();
  });
});
