import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';
import { isAlreadyExistsError } from '@/lib/firebase/errors';
import { invalidate } from '@/lib/cache/serverCache';
import { splitByFixedWordCount } from '@/lib/text/sectionize';
import { generateStory } from '@/lib/ai/deepseek';
import { translateWord } from '@/lib/translate/translateApi';
import { getUserProfile } from '@/lib/users/userProfile';
import { buildWordId } from '@/lib/firebase/wordId';
import { normalizeQuotes, normalizeToken, normalizeWord, TOKEN_PATTERN_SOURCE } from '@/lib/text/normalizeWord';

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

// Fix 4: mirrors extractVocabulary.ts's own tokenization exactly, so the
// presence-check is consistent with how normalizeWord will have already
// normalized each vocabulary word below — a word like "dragon" correctly
// matches a "dragon's" occurrence in the text, since normalizeToken strips
// the possessive clitic on both sides of the comparison. Previously this
// used a deliberately simpler whitespace-split + light edge-punctuation
// strip, which missed exactly this case.
function tokenizeSectionText(text: string): Set<string> {
  const tokens = normalizeQuotes(text).match(new RegExp(TOKEN_PATTERN_SOURCE, 'gu')) ?? [];
  const result = new Set<string>();
  for (const raw of tokens) {
    const word = normalizeToken(raw);
    if (word) result.add(word);
  }
  return result;
}

// Same field shape as bookService.ts's `newWordDoc` (SM-2 defaults,
// `addedFromReader: false`, etc.) — duplicated rather than imported, per
// AGENTS.md's "no new abstractions for one caller" rule and because this
// one differs in a deliberate way `newWordDoc` doesn't need to: it takes
// the already-computed set of section refs this word was actually found
// present in (see `runGeneration` below), rather than a single
// {bookId, sectionId} pair tied to the one section currently being
// extracted — a generated book's words are resolved against every section
// up front, not one section at a time.
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

  // Tracked outside the try block so the catch below can best-effort clean
  // up any section docs already written before a later failure (e.g. a
  // genuine Firestore error partway through the word-creation loop, not a
  // generateStory rejection) — a book that ends up generationStatus:
  // 'failed' must never be left with orphaned section docs behind it.
  let sectionDocRefs: FirebaseFirestore.DocumentReference[] = [];

  try {
    const result = await generateStory({
      topic: input.topic,
      difficulty: input.difficulty,
      language: input.language,
      targetWordCount: input.targetWordCount,
    });

    const sections = splitByFixedWordCount(result.text);
    const sectionsCollection = bookRef.collection('sections');
    sectionDocRefs = await Promise.all(
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

    // Unlike extractAndLinkWords (which always knows exactly which section
    // a candidate word came from, since it extracts candidates FROM that
    // section's own text), generateStory returns one flat `vocabulary`
    // list for the WHOLE story, with no per-section breakdown. Per the
    // task brief, this step doesn't re-run real vocabulary extraction —
    // but it DOES still need to know which section(s) each word is
    // genuinely in, because every section of a generated book sharing the
    // exact same wordIds would make every section's recognition rate
    // identical, letting one rating cascade through
    // app/api/words/[wordId]/rate/route.ts's per-sectionRef unlock loop
    // and unlock the whole book at once (AGENTS.md sharp edge #3's sibling
    // concern). So each section's own text is checked for literal
    // (case-insensitive) presence of each vocabulary word — simple
    // whitespace tokenization, not extractVocabulary's stopword/clitic
    // machinery. A vocabulary word that isn't literally found in any
    // section's text ends up with sectionRefs: [] for this book, the same
    // already-established degraded shape a reader-added word with no
    // section has — not treated as an error.
    const sectionWordSets = sections.map((section) => tokenizeSectionText(section.text));

    const { nativeLanguage } = await getUserProfile(input.userId);
    const wordsCollection = db.collection('words');

    // Fix 4: run every generated vocabulary word through this app's shared
    // normalizeWord (lib/text/normalizeWord.ts) — the same normalization
    // extractVocabulary.ts and the reader's lookup route already use —
    // BEFORE deduping/building ids. Without this, case-only variants
    // ("Run" vs "run") or curly-quote/decomposed-accent variants would
    // create a second word doc the reader's own normalizeWord-based lookup
    // could never resolve to, and a raw value like "and/or" would reach
    // buildWordId with a '/' in it, corrupting its Firestore document path.
    // normalizeWord returns '' for a token with no letters at all; those
    // are filtered out. Dedupe happens after normalization, since
    // buildWordId is deterministic and the same normalized word listed
    // twice (or two raw spellings normalizing to the same word) would
    // otherwise translate and attempt-create it twice for no reason (the
    // second .create() always loses the race below, harmlessly, but
    // there's no reason to do the extra translateWord call).
    const normalizedVocabulary = result.vocabulary.map(normalizeWord).filter((w) => w.length > 0);
    const uniqueWords = Array.from(new Set(normalizedVocabulary));

    // sectionWordIds[i] collects every word id actually found present in
    // sections[i]'s text, for the batch update below.
    const sectionWordIds: string[][] = sections.map(() => []);

    const wordLinkEntries = await Promise.all(
      uniqueWords.map(async (word) => {
        const wordId = buildWordId(input.userId, input.language, word);
        const definition = await translateWord(word, input.language, nativeLanguage).catch(
          () => null
        );

        // `word` is already normalized (via normalizeWord, above), so it's
        // directly comparable against tokenizeSectionText's normalizeToken-
        // based Set without re-normalizing.
        const sectionRefs: { bookId: string; sectionId: string }[] = [];
        sectionWordSets.forEach((tokens, i) => {
          if (tokens.has(word)) {
            sectionWordIds[i].push(wordId);
            sectionRefs.push({ bookId, sectionId: sectionDocRefs[i].id });
          }
        });

        try {
          await wordsCollection.doc(wordId).create(
            newGeneratedWordDoc({
              userId: input.userId,
              word,
              language: input.language,
              definition,
              sectionRefs,
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
          // race is simply tolerated here. Either way wordId/sectionRefs
          // computed above are still correct to link below.
        }

        return { wordId, sectionRefs };
      })
    );

    const batch = db.batch();
    let hasBatchOps = false;
    for (let i = 0; i < sectionDocRefs.length; i++) {
      if (sectionWordIds[i].length > 0) {
        batch.update(sectionDocRefs[i], { wordIds: FieldValue.arrayUnion(...sectionWordIds[i]) });
        hasBatchOps = true;
      }
    }
    for (const { wordId, sectionRefs } of wordLinkEntries) {
      if (sectionRefs.length > 0) {
        batch.update(wordsCollection.doc(wordId), {
          sectionRefs: FieldValue.arrayUnion(...sectionRefs),
        });
        hasBatchOps = true;
      }
    }
    if (hasBatchOps) {
      await batch.commit();
    }

    await bookRef.update({ title: result.title, generationStatus: 'ready' });
  } catch (error) {
    // Matches app/api/words/[wordId]/rate/route.ts's unlock-check catch
    // pattern: log server-side, never throw out of this fire-and-forget
    // worker.
    console.error('Story generation failed for book', bookId, error);

    // Best-effort cleanup of any section docs already written before this
    // failure — wrapped in its own try/catch so a cleanup failure can
    // never mask the original error or throw out of this catch block.
    // Word docs already created before the failure are deliberately left
    // alone: they're legitimate global per-user vocabulary now,
    // independent of this specific book's fate (same reasoning as why
    // this app never deletes words elsewhere).
    if (sectionDocRefs.length > 0) {
      try {
        await Promise.all(sectionDocRefs.map((ref) => ref.delete()));
      } catch (cleanupError) {
        console.error(
          'Failed to clean up partially-created sections for book',
          bookId,
          cleanupError
        );
      }
    }

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

  // Invalidate right after creating the pending book doc so the new (still
  // 'pending') book shows up on the Bookshelf immediately, not after
  // listBooks' cache TTL expires.
  invalidate(`books:${input.userId}`);

  // Not awaited — see runGeneration's own comment above. Its promise is
  // deliberately discarded (not returned, not chained) so this function's
  // own await/return below is never blocked on generation completing.
  void runGeneration(bookId, input);

  return { bookId };
}
