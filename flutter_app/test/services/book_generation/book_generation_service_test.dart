import 'package:flutter_test/flutter_test.dart';
import 'package:wordbook/services/book_generation/book_generation_service.dart';

void main() {
  group('looksLikeWrongLanguage', () {
    const englishSample =
        'The cat is on the mat and it was there with her for a while.';

    test('returns true when the text is clearly not the expected language', () {
      expect(looksLikeWrongLanguage(englishSample, 'es'), isTrue);
    });

    test('returns false when the text matches the expected language', () {
      expect(looksLikeWrongLanguage(englishSample, 'en'), isFalse);
    });
  });

  group('BookGenerationException', () {
    test('exposes a readable message', () {
      const exception = BookGenerationException('Something went wrong.');

      expect(exception.message, 'Something went wrong.');
    });
  });
}
