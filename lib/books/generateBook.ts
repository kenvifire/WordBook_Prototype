import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';
import { isAlreadyExistsError } from '@/lib/firebase/errors';
import { splitByFixedWordCount } from '@/lib/text/sectionize';
import { generateStory } from '@/lib/ai/deepseek';
import { translateWord } from '@/lib/translate/translateApi';
import { getUserProfile } from '@/lib/users/userProfile';
import { buildWordId } from '@/lib/firebase/wordId';

export type GenerateBookInput = {
  topic: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  targetWordCount: number;
  userId: string;
};

export type GenerateBookResult = { bookId: string };

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

// Same field shape as bookService.ts's `newWordDoc` (SM-2 defaults,
// `addedFromReader: false`, etc.) — duplicated rather than imported, per
// AGENTS.md's "no new abstractions for one caller" rule and because this
// one differs in a deliberate way `newWordDoc` doesn't need to: it takes
// the full set of this book's section refs up front (see the "link every
// word to every section" note in `runGeneration` below), not a single
// {bookId, sectionId} pair tied to the section currently being extracted.
function newGeneratedWordDoc(params: {
  userId: string;
  word: string;
  language: string;
  definition: string | null;
  sectionRefs: { bookId: string; sectionId: string }[];
}): Record<string, unknown> {
  return {
    userId: params.userId,
    word: params.word,
    language: params.language,
    definition: params.definition,
    sectionRefs: params.sectionRefs,
    repetitions: 0,
    easeFactor: 2.5,
    intervalDays: 1,
    nextReviewDate: todayDateString(),
    lastRating: null,
    // Immutable origin flag, set once at creation and never written again —
    // same contract as bookService.ts's newWordDoc. A generated word is
    // never reader-added.
    addedFromReader: false,
  };
}

// The fire-and-forget inner worker. Deliberately a plain async function
// that `startGeneratingBook` below invokes WITHOUT `await` and without
// returning its promise — every possible failure path inside here (the
// generateStory call itself, sectioning, translation, Firestore writes) is
// caught by this function's own try/catch, so nothing it does can ever
// produce an unhandled promise rejection or make the caller wait on it.
async function runGeneration(bookId: string, input: GenerateBookInput): Promise<void> {
  const db = getFirestore(getAdminApp());
  const bookRef = db.collection('books').doc(bookId);

  try {
    const result = await generateStory({
      topic: input.topic,
      difficulty: input.difficulty,
      language: input.language,
      targetWordCount: input.targetWordCount,
    });

    const sections = splitByFixedWordCount(result.text);
    const sectionsCollection = bookRef.collection('sections');
    const sectionDocRefs = await Promise.all(
      sections.map((section) =>
        sectionsCollection.add({
          sectionNumber: section.sectionNumber,
          startWordIndex: section.startWordIndex,
          endWordIndex: section.endWordIndex,
          text: section.text,
          status: section.sectionNumber === 1 ? 'ready_to_practice' : 'locked',
          wordIds: [] as string[],
        })
      )
    );

    // Design note (no analog in extractAndLinkWords, which always knows
    // exactly which section a candidate word came from because it extracts
    // candidates FROM that section's own text): generateStory returns one
    // flat `vocabulary` list for the WHOLE story, not a per-section
    // breakdown, and per the task brief this step does not re-verify
    // placement (no scanning each section's text to confirm/assign a
    // word to "its" section) — it trusts the model's list as-is. The
    // simplest choice consistent with "don't verify placement" is to link
    // every generated vocabulary word to every section of this book, so
    // every section's practice-to-unlock set is well-formed (non-empty)
    // rather than only the first section ever having a gate.
    const allSectionRefs = sectionDocRefs.map((ref) => ({ bookId, sectionId: ref.id }));

    const { nativeLanguage } = await getUserProfile(input.userId);
    const wordsCollection = db.collection('words');

    // Dedupe the model's own vocabulary list before touching Firestore.
    // buildWordId is deterministic, so the same word listed twice would
    // otherwise translate and attempt-create it twice for no reason (the
    // second .create() always loses the race below, harmlessly, but
    // there's no reason to do the extra translateWord call).
    const uniqueWords = Array.from(new Set(result.vocabulary));

    const wordIds = await Promise.all(
      uniqueWords.map(async (word) => {
        const wordId = buildWordId(input.userId, input.language, word);
        const definition = await translateWord(word, input.language, nativeLanguage).catch(
          () => null
        );

        try {
          await wordsCollection.doc(wordId).create(
            newGeneratedWordDoc({
              userId: input.userId,
              word,
              language: input.language,
              definition,
              sectionRefs: allSectionRefs,
            })
          );
        } catch (error) {
          if (!isAlreadyExistsError(error)) {
            throw error;
          }
          // Either the model listed this exact word twice, or it's a
          // genuine pre-existing word doc for this user+language (e.g.
          // from another book) — per the brief, a freshly generated book's
          // vocabulary is assumed new, so this is not optimized with a
          // select-first get() the way extractAndLinkWords's loop is; the
          // race is simply tolerated here. Either way wordId is still the
          // right id to link below.
        }

        return wordId;
      })
    );

    if (wordIds.length > 0) {
      const batch = db.batch();
      for (const sectionRef of sectionDocRefs) {
        batch.update(sectionRef, { wordIds: FieldValue.arrayUnion(...wordIds) });
      }
      for (const wordId of wordIds) {
        batch.update(wordsCollection.doc(wordId), {
          sectionRefs: FieldValue.arrayUnion(...allSectionRefs),
        });
      }
      await batch.commit();
    }

    await bookRef.update({ title: result.title, generationStatus: 'ready' });
  } catch (error) {
    // Matches app/api/words/[wordId]/rate/route.ts's unlock-check catch
    // pattern: log server-side, never throw out of this fire-and-forget
    // worker.
    console.error('Story generation failed for book', bookId, error);
    await bookRef.update({ generationStatus: 'failed' }).catch((updateError) => {
      console.error('Failed to mark book generation as failed', bookId, updateError);
    });
  }
}

export async function startGeneratingBook(input: GenerateBookInput): Promise<GenerateBookResult> {
  const db = getFirestore(getAdminApp());

  // The book's real title isn't known until generateStory resolves, so the
  // topic is used as a placeholder (overwritten with the generated story's
  // own title once generation succeeds) — every book doc always has a
  // non-null title, even while `generationStatus` is still 'pending'.
  const bookRef = await db.collection('books').add({
    userId: input.userId,
    title: input.topic,
    author: null,
    format: 'text',
    language: input.language,
    source: 'ai_generated',
    sectioningMethod: 'fixed_word_count',
    pagesPerSection: null,
    detectedChapterBreaks: null,
    topic: input.topic,
    difficultyLevel: input.difficulty,
    targetWordCount: input.targetWordCount,
    generationStatus: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  });

  const bookId = bookRef.id;

  // Not awaited — see runGeneration's own comment above. Its promise is
  // deliberately discarded (not returned, not chained) so this function's
  // own await/return below is never blocked on generation completing.
  void runGeneration(bookId, input);

  return { bookId };
}
