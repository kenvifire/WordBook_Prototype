// All learning rules read their numbers from here.
import type { Level } from "@/mock/types";

// Reading levels the app offers (CEFR), easiest first.
export const LEVELS: readonly Level[] = ["A2", "B1", "B2", "C1"];
export const DEFAULT_LEVEL: Level = "B1";
export const isLevel = (v: unknown): v is Level => typeof v === "string" && (LEVELS as readonly string[]).includes(v);
// Other levels ordered by distance (used when a level has no stories yet): A2 → B1, B2, C1.
export const nearestLevels = (l: Level): Level[] =>
  [...LEVELS].filter((x) => x !== l).sort((a, b) => Math.abs(LEVELS.indexOf(a) - LEVELS.indexOf(l)) - Math.abs(LEVELS.indexOf(b) - LEVELS.indexOf(l)) || LEVELS.indexOf(a) - LEVELS.indexOf(b));
export const GATE_THRESHOLD_DEFAULT = 0.8;
export const GATE_THRESHOLD_OPTIONS = [0.7, 0.8, 0.9] as const;
export const GATE_BATCH_SIZE = 5;
export const SRS_INTERVALS_DAYS = [0, 1, 3, 7, 14] as const;
export const REQUEUE_AFTER_CARDS = { dont_know: 3, almost: 6 } as const;
export const MAX_FAILED_ATTEMPTS_BEFORE_OVERRIDE = 3;
export const REVIEW_SESSION_MAX = 20;
export const STREAK_EVENT_TYPES = ["card_rated", "gate_finished", "section_completed"] as const;

// Books a learner uploads (PDF, EPUB or TXT). Cards are made by AI, one part at a time.
export const OWN_BOOK_SECTION_WORDS = 400; // target words per part; paragraphs are never cut unless very long
export const OWN_BOOK_CARDS_PER_SECTION = 12; // most cards a part can get; the quiz needs at least 4
export const OWN_BOOK_WORDS_PER_CARD = 33; // a 400-word part asks for 12 cards, a 150-word part for 5
export const OWN_BOOK_MIN_CARDS = 4;
export const OWN_BOOK_MIN_WORDS = 150;
export const OWN_BOOK_MAX_WORDS = 250_000; // about a long novel
export const OWN_BOOK_MAX_FILE_MB = 30;
export const OWN_BOOK_AI_MODEL = "google/gemini-3.7-flash";
export const OWN_BOOK_AI_FALLBACK_MODEL = "google/gemini-2.5-flash"; // used only if the main model does not answer
