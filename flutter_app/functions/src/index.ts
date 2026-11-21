import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {defineSecret} from "firebase-functions/params";
import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {TextToSpeechClient} from "@google-cloud/text-to-speech";

initializeApp();
const db = getFirestore();
const ttsClient = new TextToSpeechClient();

// Mirrors TtsService._localeByLanguageCode in the Flutter app. Kept as an
// explicit allowlist so the client can't make this function synthesize an
// arbitrary voice/locale string.
const LOCALE_BY_LANGUAGE_CODE: Record<string, string> = {
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  it: "it-IT",
  pt: "pt-PT",
  nl: "nl-NL",
  ru: "ru-RU",
  ja: "ja-JP",
  ko: "ko-KR",
  zh: "zh-CN",
};

const MAX_TEXT_LENGTH = 200;
// Bounds cost from a single misbehaving client; well above normal usage
// (a learner pronouncing words one at a time).
const DAILY_CHARACTER_CAP = 20000;

interface SynthesizeRequest {
  text?: unknown;
  languageCode?: unknown;
}

// Mirrors SupportedLanguage.all's codes in the Flutter app
// (lib/providers/language_provider.dart). Kept as an explicit allowlist so
// the client can't make this function request an arbitrary language from
// DeepSeek.
const VALID_LANGUAGE_CODES = [
  "ar", "de", "en", "es", "fr", "hi", "id", "it", "ja", "ko",
  "ms", "nl", "pl", "pt", "ru", "th", "tr", "vi", "zh", "zh-TW",
];

const VALID_CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const MAX_WORD_COUNT = 5000;
const MAX_TOPIC_LENGTH = 200;
// Defensive cap on the array the client sends, independent of whatever
// sample size the client's own known-word sampling logic picks.
const MAX_KNOWN_WORDS = 500;
// Bounds cost from a single misbehaving (or malicious) client. Unlike TTS,
// every generation here spends the app owner's own DeepSeek budget for
// every user, not a per-user key, so this cap is load-bearing, not just a
// courtesy.
const DAILY_WORD_CAP = 10000;

const deepseekApiKey = defineSecret("DEEPSEEK_API_KEY");

interface GenerateBookRequest {
  language?: unknown;
  level?: unknown;
  topic?: unknown;
  wordCount?: unknown;
  newWordPercentage?: unknown;
  knownWords?: unknown;
}

/**
 * Cloud TTS fallback for devices whose on-device voice data can't be
 * installed (e.g. no working Play Store). Holds the Cloud Text-to-Speech
 * call server-side so no API key ships in the app, and records per-user/
 * monthly usage for cost monitoring.
 */
export const synthesizeSpeech = onCall(
  {region: "us-central1", cors: true},
  async (request) => {
    const auth = request.auth;
    if (!auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const data = request.data as SynthesizeRequest;
    const text = data?.text;
    const languageCode = data?.languageCode;

    if (typeof text !== "string" || text.trim().length === 0) {
      throw new HttpsError("invalid-argument", "text is required.");
    }
    if (text.length > MAX_TEXT_LENGTH) {
      throw new HttpsError("invalid-argument", "text is too long.");
    }
    if (typeof languageCode !== "string") {
      throw new HttpsError("invalid-argument", "languageCode is required.");
    }
    const locale = LOCALE_BY_LANGUAGE_CODE[languageCode];
    if (!locale) {
      throw new HttpsError(
        "invalid-argument",
        `Unsupported languageCode: ${languageCode}`
      );
    }

    const charCount = text.length;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const month = today.slice(0, 7); // YYYY-MM
    const userDailyRef = db
      .collection("ttsUsage")
      .doc(`user_${auth.uid}_${today}`);

    const userDailySnap = await userDailyRef.get();
    const usedToday =
      (userDailySnap.data()?.characters as number | undefined) ?? 0;
    if (usedToday + charCount > DAILY_CHARACTER_CAP) {
      logger.warn("synthesizeSpeech: daily cap exceeded", {
        uid: auth.uid,
        usedToday,
        charCount,
      });
      throw new HttpsError(
        "resource-exhausted",
        "Daily pronunciation limit reached."
      );
    }

    let audioContent: Uint8Array | string | undefined;
    try {
      const [response] = await ttsClient.synthesizeSpeech({
        input: {text},
        voice: {languageCode: locale, ssmlGender: "NEUTRAL"},
        audioConfig: {audioEncoding: "MP3", speakingRate: 0.9},
      });
      audioContent = response.audioContent ?? undefined;
    } catch (err) {
      logger.error("synthesizeSpeech: TTS API call failed", {
        uid: auth.uid,
        locale,
        error: String(err),
      });
      throw new HttpsError("internal", "Speech synthesis failed.");
    }

    if (!audioContent) {
      throw new HttpsError("internal", "No audio returned.");
    }

    const base64Audio =
      typeof audioContent === "string"
        ? audioContent
        : Buffer.from(audioContent).toString("base64");

    logger.info("synthesizeSpeech: success", {
      uid: auth.uid,
      languageCode,
      locale,
      charCount,
    });

    const batch = db.batch();
    batch.set(
      userDailyRef,
      {
        uid: auth.uid,
        date: today,
        characters: FieldValue.increment(charCount),
        calls: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      {merge: true}
    );
    batch.set(
      db.collection("ttsUsage").doc(`monthly_${month}`),
      {
        month,
        characters: FieldValue.increment(charCount),
        calls: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      {merge: true}
    );
    await batch.commit();

    return {audioContentBase64: base64Audio, format: "mp3"};
  }
);

function buildGenerateBookPrompt(
  language: string,
  level: string,
  topic: string,
  wordCount: number,
  newWordPercentage: number,
  knownWords: string[]
): string {
  const knownWordsClause =
    knownWords.length > 0 ?
      `The reader already knows these words: ${knownWords.join(", ")}. ` +
        "Use mostly words from that list, plus ordinary function words " +
        `appropriate for a ${level} learner. ` :
      "The reader has no prior known-word history in this language yet — " +
        `write using only vocabulary typical for a ${level} learner, by ` +
        "your own judgment. ";

  return (
    `Write entirely in the language with ISO 639-1 code "${language}", ` +
    `at CEFR level ${level}, on the topic: ${topic}. ` +
    `Target length: approximately ${wordCount} words. ` +
    knownWordsClause +
    `For roughly ${newWordPercentage}% of the distinct content words in ` +
    "the text, deliberately use vocabulary NOT in the known-words list " +
    `above, while staying within what's typical for a ${level} learner — ` +
    "never esoteric, even for a native speaker. " +
    "Output ONLY the body text itself, in that language — no title, no " +
    "headings, no markdown formatting, no commentary, no translation."
  );
}

/**
 * AI book generation for vocabulary practice. Holds the DeepSeek API call
 * server-side so no key ships in the app (same reasoning as
 * synthesizeSpeech above, and the same per-user/monthly usage tracking for
 * cost monitoring) — the difference here is every call spends the app
 * owner's own budget for every user, not a per-user key, so the daily cap
 * is load-bearing rather than a courtesy.
 */
export const generateBook = onCall(
  {region: "us-central1", cors: true, secrets: [deepseekApiKey]},
  async (request) => {
    const auth = request.auth;
    if (!auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const data = request.data as GenerateBookRequest;
    const language = data?.language;
    const level = data?.level;
    const topic = data?.topic;
    const wordCount = data?.wordCount;
    const newWordPercentage = data?.newWordPercentage;
    const knownWords = data?.knownWords;

    if (
      typeof language !== "string" ||
      !VALID_LANGUAGE_CODES.includes(language)
    ) {
      throw new HttpsError("invalid-argument", `Unsupported language: ${language}`);
    }
    if (typeof level !== "string" || !VALID_CEFR_LEVELS.includes(level)) {
      throw new HttpsError("invalid-argument", `Unsupported level: ${level}`);
    }
    if (typeof topic !== "string" || topic.trim().length === 0) {
      throw new HttpsError("invalid-argument", "topic is required.");
    }
    if (topic.length > MAX_TOPIC_LENGTH) {
      throw new HttpsError("invalid-argument", "topic is too long.");
    }
    if (
      typeof wordCount !== "number" ||
      !Number.isFinite(wordCount) ||
      wordCount < 1 ||
      wordCount > MAX_WORD_COUNT
    ) {
      throw new HttpsError(
        "invalid-argument",
        `wordCount must be between 1 and ${MAX_WORD_COUNT}.`
      );
    }
    if (
      typeof newWordPercentage !== "number" ||
      !Number.isFinite(newWordPercentage) ||
      newWordPercentage < 0 ||
      newWordPercentage > 100
    ) {
      throw new HttpsError(
        "invalid-argument",
        "newWordPercentage must be between 0 and 100."
      );
    }
    if (
      !Array.isArray(knownWords) ||
      !knownWords.every((w) => typeof w === "string")
    ) {
      throw new HttpsError("invalid-argument", "knownWords must be a string array.");
    }
    if (knownWords.length > MAX_KNOWN_WORDS) {
      throw new HttpsError(
        "invalid-argument",
        `knownWords must have at most ${MAX_KNOWN_WORDS} entries.`
      );
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const month = today.slice(0, 7); // YYYY-MM
    const userDailyRef = db
      .collection("bookGenerationUsage")
      .doc(`user_${auth.uid}_${today}`);

    const userDailySnap = await userDailyRef.get();
    const usedToday = (userDailySnap.data()?.words as number | undefined) ?? 0;
    if (usedToday + wordCount > DAILY_WORD_CAP) {
      logger.warn("generateBook: daily cap exceeded", {
        uid: auth.uid,
        usedToday,
        wordCount,
      });
      throw new HttpsError(
        "resource-exhausted",
        "Daily book generation limit reached."
      );
    }

    const prompt = buildGenerateBookPrompt(
      language,
      level,
      topic,
      wordCount,
      newWordPercentage,
      knownWords as string[]
    );

    let text: string | undefined;
    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${deepseekApiKey.value()}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {role: "system", content: prompt},
            {role: "user", content: "Write the text now."},
          ],
          max_tokens: Math.min(wordCount * 4, 8000),
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek responded with status ${response.status}`);
      }

      const body = (await response.json()) as {
        choices?: Array<{message?: {content?: string}}>;
      };
      text = body.choices?.[0]?.message?.content;
    } catch (err) {
      logger.error("generateBook: DeepSeek call failed", {
        uid: auth.uid,
        language,
        level,
        error: String(err),
      });
      throw new HttpsError("internal", "Book generation failed.");
    }

    if (!text || text.trim().length === 0) {
      throw new HttpsError("internal", "Book generation returned no text.");
    }

    const actualWordCount = text.trim().split(/\s+/).length;

    logger.info("generateBook: success", {
      uid: auth.uid,
      language,
      level,
      requestedWordCount: wordCount,
      actualWordCount,
    });

    const batch = db.batch();
    batch.set(
      userDailyRef,
      {
        uid: auth.uid,
        date: today,
        words: FieldValue.increment(actualWordCount),
        calls: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      {merge: true}
    );
    batch.set(
      db.collection("bookGenerationUsage").doc(`monthly_${month}`),
      {
        month,
        words: FieldValue.increment(actualWordCount),
        calls: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      {merge: true}
    );
    await batch.commit();

    return {text};
  }
);
