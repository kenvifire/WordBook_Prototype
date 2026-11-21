import 'package:flutter_test/flutter_test.dart';
import 'package:wordbook/models/word.dart';
import 'package:wordbook/services/vocabulary/vocabulary_knowledge_service.dart';

Word _word(
  String text, {
  String language = 'es',
  WordStatus status = WordStatus.learning,
  String bookId = 'book-1',
}) =>
    Word()
      ..wordId = 'w-${text.hashCode}-${status.name}-$bookId'
      ..word = text
      ..bookId = bookId
      ..language = language
      ..status = status
      ..extractionMethod = ExtractionMethod.automatic;

void main() {
  group('sampleKnownWords', () {
    test('includes words past newWord status in the target language', () {
      final words = [_word('casa', status: WordStatus.learning)];

      final result = sampleKnownWords(words, 'es', 300);

      expect(result, contains('casa'));
    });

    test('excludes words still at newWord status', () {
      final words = [_word('casa', status: WordStatus.newWord)];

      final result = sampleKnownWords(words, 'es', 300);

      expect(result, isEmpty);
    });

    test('excludes words in a different language', () {
      final words = [_word('house', language: 'en', status: WordStatus.learning)];

      final result = sampleKnownWords(words, 'es', 300);

      expect(result, isEmpty);
    });

    test('deduplicates the same word text across books/case', () {
      final words = [
        _word('Casa', status: WordStatus.learning, bookId: 'book-1'),
        _word('casa', status: WordStatus.mastered, bookId: 'book-2'),
      ];

      final result = sampleKnownWords(words, 'es', 300);

      expect(result.length, 1);
    });

    test('caps the result to sampleSize when there are more matches', () {
      final words = List.generate(
        10,
        (i) => _word('word$i', status: WordStatus.learning),
      );

      final result = sampleKnownWords(words, 'es', 5);

      expect(result.length, 5);
    });

    test('returns an empty result for an empty input list', () {
      final result = sampleKnownWords(<Word>[], 'es', 300);

      expect(result, isEmpty);
    });
  });
}
