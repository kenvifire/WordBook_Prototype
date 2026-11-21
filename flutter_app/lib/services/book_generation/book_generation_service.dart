import 'package:cloud_functions/cloud_functions.dart';

import '../vocabulary/language_detection_service.dart';

class BookGenerationRequest {
  final String language; // one of SupportedLanguage.all's codes
  final String level; // CEFR code
  final String topic;
  final int wordCount; // already clamped to <= 5000 by the caller
  final int newWordPercentage; // 0-100
  final List<String> knownWords;

  const BookGenerationRequest({
    required this.language,
    required this.level,
    required this.topic,
    required this.wordCount,
    required this.newWordPercentage,
    required this.knownWords,
  });
}

class BookGenerationException implements Exception {
  final String message; // already user-facing/friendly

  const BookGenerationException(this.message);

  @override
  String toString() => message;
}

/// True when [text] doesn't look like it's actually in [expectedLanguage] —
/// reuses the same heuristic-based detector this app already uses for
/// detecting an uploaded book's language, rather than adding a new
/// dependency just for this check.
bool looksLikeWrongLanguage(String text, String expectedLanguage) {
  final detected = LanguageDetectionService().detectLanguage(text);
  return detected != expectedLanguage;
}

/// Calls the `generateBook` Cloud Function (see functions/src/index.ts),
/// which holds the DeepSeek API key server-side — this service never talks
/// to DeepSeek directly, and the client never sees any key.
class BookGenerationService {
  final FirebaseFunctions _functions = FirebaseFunctions.instance;

  Future<String> generate(BookGenerationRequest request) async {
    dynamic result;
    try {
      result = await _functions.httpsCallable('generateBook').call({
        'language': request.language,
        'level': request.level,
        'topic': request.topic,
        'wordCount': request.wordCount,
        'newWordPercentage': request.newWordPercentage,
        'knownWords': request.knownWords,
      });
    } on FirebaseFunctionsException catch (e) {
      switch (e.code) {
        case 'unauthenticated':
          throw const BookGenerationException('Please sign in and try again.');
        case 'resource-exhausted':
          throw const BookGenerationException(
              "You've hit today's generation limit — try again tomorrow.");
        default:
          throw const BookGenerationException(
              "Couldn't generate the book. Please try again.");
      }
    }

    final text = result.data['text'] as String?;
    if (text == null || text.trim().isEmpty) {
      throw const BookGenerationException('Generation returned no text.');
    }

    if (looksLikeWrongLanguage(text, request.language)) {
      throw const BookGenerationException(
          "The result didn't come back in the requested language — please try again.");
    }

    return text;
  }
}
