import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import SpeakButton from './SpeakButton';

describe('SpeakButton', () => {
  test('clicking the speak button calls window.speechSynthesis.speak with an utterance for the word', () => {
    const speak = vi.fn();
    vi.stubGlobal('speechSynthesis', { speak });
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        text: string;
        constructor(text: string) {
          this.text = text;
        }
      }
    );

    render(<SpeakButton word="ephemeral" />);
    fireEvent.click(screen.getByRole('button'));

    expect(speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'ephemeral' }));
  });
});
