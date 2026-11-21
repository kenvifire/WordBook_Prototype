@TestOn('chrome')
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:wordbook/models/word.dart';
import 'package:wordbook/services/vocabulary/vocabulary_service.dart';

Word _newWord(String text, {String language = 'en'}) => Word()
  ..wordId = 'test-${text.hashCode}'
  ..word = text
  ..bookId = 'book-1'
  ..language = language
  ..status = WordStatus.newWord
  ..extractionMethod = ExtractionMethod.automatic;

void main() {
  group('VocabularyService.enrichWord', () {
    test(
        'translates to real Chinese via GoogleTranslator, not a '
        'low-quality MyMemory passthrough (regression: this app\'s "zh" '
        'code isn\'t in the translator package\'s language list, only '
        '"zh-cn" is — GoogleTranslator rejected every Chinese-targeting '
        'word with LanguageNotSupportedException before ever making a '
        'request, silently falling back to MyMemory, which for some words '
        '(e.g. "digital") returns the English word unchanged as its top '
        'crowd-sourced match)', () async {
      final word = _newWord('digital');

      await VocabularyService().enrichWord(word, targetLanguage: 'zh');

      expect(word.translation, isNotNull);
      expect(word.translation, isNot('digital'));
    });

    test('translates to real Chinese for Traditional Chinese (zh-TW) too',
        () async {
      final word = _newWord('digital');

      await VocabularyService().enrichWord(word, targetLanguage: 'zh-TW');

      expect(word.translation, isNotNull);
      expect(word.translation, isNot('digital'));
    });
  });
}
