import 'dart:math';

import '../../models/word.dart';
import '../../repositories/word_repository.dart';

/// Known words for [language] from [words]: every distinct word text
/// (case-insensitive, deduplicated) where `word.language == language` and
/// `word.status != WordStatus.newWord`, capped and randomly sampled to
/// [sampleSize] when there are more matches than that.
List<String> sampleKnownWords(List<Word> words, String language, int sampleSize) {
  final matches = <String>{};
  for (final word in words) {
    if (word.language != language) continue;
    if (word.status == WordStatus.newWord) continue;
    matches.add(word.word.toLowerCase());
  }

  final result = matches.toList();
  if (result.length <= sampleSize) return result;

  result.shuffle(Random());
  return result.sublist(0, sampleSize);
}

/// Derives what the user already knows in a given language from their own
/// vocabulary history, for feeding into AI book generation's "new word
/// percentage" — there is no separate per-language tracking model; this is
/// computed from the same per-book `Word` records the rest of the app
/// already uses.
class VocabularyKnowledgeService {
  final WordRepository _wordRepository = WordRepository();

  Future<List<String>> knownWordsForLanguage(
    String? userId,
    String language, {
    int sampleSize = 300,
  }) async {
    final words = await _wordRepository.getWordsByUser(userId);
    return sampleKnownWords(words, language, sampleSize);
  }
}
