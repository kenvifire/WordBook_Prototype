import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/firebase/server', () => ({
  getAuthedUser: vi.fn(),
}));

vi.mock('@/lib/stats/statsService', () => ({
  getStatisticsByLanguage: vi.fn(),
}));

const { mockRedirect } = vi.hoisted(() => ({
  mockRedirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

import { getAuthedUser } from '@/lib/firebase/server';
import { getStatisticsByLanguage, type LanguageStats } from '@/lib/stats/statsService';
import StatisticsPage from './page';

const mockGetAuthedUser = getAuthedUser as unknown as ReturnType<typeof vi.fn>;
const mockGetStatisticsByLanguage = getStatisticsByLanguage as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockRedirect.mockClear();
  mockGetAuthedUser.mockReset();
  mockGetStatisticsByLanguage.mockReset();
});

describe('StatisticsPage', () => {
  test('shows one language at a time; switching language shows that language\'s stats', async () => {
    const stats: LanguageStats[] = [
      {
        language: 'english',
        wordsMastered: 12,
        books: [{ id: 'book-en', title: 'The English Book', completedSections: 2, totalSections: 4 }],
      },
      {
        language: 'spanish',
        wordsMastered: 3,
        books: [{ id: 'book-es', title: 'El Libro Espanol', completedSections: 1, totalSections: 1 }],
      },
    ];
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    mockGetStatisticsByLanguage.mockResolvedValue(stats);

    const jsx = await StatisticsPage();
    render(jsx);

    expect(mockGetStatisticsByLanguage).toHaveBeenCalledWith('user-1');

    // English is shown by default (first language).
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('The English Book')).toBeInTheDocument();
    expect(screen.getByText(/2 of 4/)).toBeInTheDocument();
    expect(screen.queryByText('El Libro Espanol')).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /spanish/i }));

    expect(screen.getByText('El Libro Espanol')).toBeInTheDocument();
    expect(screen.getByText(/1 of 1/)).toBeInTheDocument();
    expect(screen.queryByText('The English Book')).not.toBeInTheDocument();
  });

  test("the selected language chip uses the same bg-ink/text-paper pattern as the Bookshelf", async () => {
    const stats: LanguageStats[] = [
      {
        language: 'english',
        wordsMastered: 12,
        books: [{ id: 'book-en', title: 'The English Book', completedSections: 2, totalSections: 4 }],
      },
      {
        language: 'spanish',
        wordsMastered: 3,
        books: [{ id: 'book-es', title: 'El Libro Espanol', completedSections: 1, totalSections: 1 }],
      },
    ];
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    mockGetStatisticsByLanguage.mockResolvedValue(stats);

    const jsx = await StatisticsPage();
    render(jsx);

    const selected = screen.getByRole('button', { name: /^english$/i });
    expect(selected.className).toContain('bg-ink');
    expect(selected.className).toContain('text-paper');

    const unselected = screen.getByRole('button', { name: /^spanish$/i });
    expect(unselected.className).toContain('bg-surface');
    expect(unselected.className).toContain('border-hairline');
  });

  test('shows a message when the user has no stats in any language yet', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    mockGetStatisticsByLanguage.mockResolvedValue([]);

    const jsx = await StatisticsPage();
    render(jsx);

    expect(screen.getByText(/no statistics yet/i)).toBeInTheDocument();
  });

  test('redirects to /login when there is no authed user', async () => {
    mockGetAuthedUser.mockResolvedValue(null);

    await expect(StatisticsPage()).rejects.toThrow('NEXT_REDIRECT:/login');

    expect(mockRedirect).toHaveBeenCalledWith('/login');
    expect(mockGetStatisticsByLanguage).not.toHaveBeenCalled();
  });
});
