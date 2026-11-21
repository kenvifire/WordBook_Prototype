import 'package:flutter_test/flutter_test.dart';
import 'package:wordbook/services/vocabulary/word_processor.dart';
import 'package:wordbook/services/vocabulary/config/language_config.dart';
import 'package:wordbook/services/vocabulary/config/builtin_languages.dart';

// PdfTextPositionService/PdfWordPosition tests moved to
// test/services/vocabulary/pdf_text_position_service_test.dart, which
// exercises the service against a real generated PDF rather than a
// nonexistent file path (the service is bytes-based now, not path-based).

void main() {
  group('WordProcessor — config-driven validation', () {
    setUpAll(() {
      // Register built-in language configs
      LanguageRegistry().registerAll(BuiltinLanguages.all());
    });

    test('rejects garbage words with internal punctuation', () {
      final processor = WordProcessor();
      processor.setLanguage('es');

      final result = processor.processWords(['0P.IS2', 'EJ.S', 'abc123']);

      expect(result.isEmpty, isTrue,
          reason: '0P.IS2, EJ.S, abc123 should all be rejected');
    });

    test('accepts valid Spanish words', () {
      final processor = WordProcessor();
      processor.setLanguage('es');

      final result = processor.processWords(
        ['hola', 'mundo', 'español', 'lección'],
      );

      expect(result.containsKey('hola'), isTrue);
      expect(result.containsKey('mundo'), isTrue);
      expect(result.containsKey('español'), isTrue);
      expect(result.containsKey('lección'), isTrue);
    });

    test('accepts English contractions and hyphenated words', () {
      final processor = WordProcessor();
      processor.setLanguage('en');

      final result = processor.processWords(["don't", 'well-known']);

      // Quote-stripping cleans "don't" → "dont"
      expect(result.containsKey('dont'), isTrue,
          reason: "don't should be cleaned to dont");
      // Hyphen is allowed internal punctuation
      expect(result.containsKey('well-known'), isTrue);
    });

    test('German allows capitalized nouns', () {
      final processor = WordProcessor();
      processor.setLanguage('de');

      final result = processor.processWords(
        ['Haus', 'Buch', 'Straße', 'Mädchen'],
      );

      expect(result.containsKey('haus'), isTrue,
          reason: 'Haus should pass since filterCapitalizedAsNames=false');
      expect(result.containsKey('buch'), isTrue);
      expect(result.containsKey('straße'), isTrue);
      expect(result.containsKey('mädchen'), isTrue);
    });

    test('Japanese allows single kanji', () {
      final processor = WordProcessor();
      processor.setLanguage('ja');

      final result = processor.processWords(['本', '学生']);

      expect(result.containsKey('本'), isTrue,
          reason: 'minLength=1 for Japanese');
      expect(result.containsKey('学生'), isTrue);
    });
  });
}
