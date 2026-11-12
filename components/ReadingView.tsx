'use client';

import { useState } from 'react';
import { WordPopover } from './WordPopover';

export interface ReadingViewProps {
  sectionId: string;
  text: string;
}

// Matches a run of letters (any script), optionally with apostrophes/hyphens
// after the first letter — the same notion of "word" used elsewhere in the
// app (see lib/text/tokenize.ts), kept local here since this only needs to
// know where words start/end for rendering, not full tokenization.
const WORD_RE = /\p{L}[\p{L}'-]*/gu;

// Splits text into sentence-ish chunks (each chunk ends at '.', '!' or '?',
// or runs to the end of the text). Concatenating the chunks reproduces the
// original text exactly, so no whitespace is lost when rendering.
function splitIntoSentenceChunks(text: string): string[] {
  const chunks = text.match(/[^.!?]+[.!?]*/g);
  return chunks ?? [text];
}

type RenderToken = { type: 'word' | 'text'; value: string };

// Splits one sentence chunk into word tokens and everything else
// (whitespace/punctuation), preserving exact substrings so they can be
// rendered back-to-back without altering the original text.
function tokenizeChunk(chunk: string): RenderToken[] {
  const tokens: RenderToken[] = [];
  let lastIndex = 0;

  for (const match of chunk.matchAll(WORD_RE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      tokens.push({ type: 'text', value: chunk.slice(lastIndex, start) });
    }
    tokens.push({ type: 'word', value: match[0] });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < chunk.length) {
    tokens.push({ type: 'text', value: chunk.slice(lastIndex) });
  }

  return tokens;
}

export function ReadingView({ sectionId, text }: ReadingViewProps) {
  const [selection, setSelection] = useState<{ key: string; token: string; sentence: string } | null>(null);

  const chunks = splitIntoSentenceChunks(text);

  return (
    <div>
      <p>
        {chunks.map((chunk, chunkIndex) => {
          const sentence = chunk.trim();
          const tokens = tokenizeChunk(chunk);

          return tokens.map((token, tokenIndex) => {
            const key = `${chunkIndex}-${tokenIndex}`;
            if (token.type !== 'word') {
              return <span key={key}>{token.value}</span>;
            }

            return (
              <span
                key={key}
                role="button"
                tabIndex={0}
                onClick={() => setSelection({ key, token: token.value, sentence })}
                style={{ cursor: 'pointer' }}
              >
                {token.value}
              </span>
            );
          });
        })}
      </p>
      {selection && (
        <WordPopover
          key={selection.key}
          sectionId={sectionId}
          token={selection.token}
          sentence={selection.sentence}
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  );
}
