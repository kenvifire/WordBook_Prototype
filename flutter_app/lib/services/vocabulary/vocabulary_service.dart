import 'package:translator/translator.dart';
import 'dictionary_service.dart';
import '../../models/word.dart';
import '../../repositories/word_repository.dart';

class VocabularyService {
  final GoogleTranslator _translator = GoogleTranslator();
  final DictionaryService _dictionaryService = DictionaryService();

  /// Enrich a word with definition and translation
  Future<void> enrichWord(Word word, {String targetLanguage = 'en'}) async {
    try {
      // The dictionary API only has English entries — calling it for a
      // Spanish/French/etc. word is a guaranteed 404 that just burns a
      // round-trip, so skip it for non-English words. Kick off the
      // definition lookup and the translation at the same time (they're
      // independent) instead of waiting on one before starting the other.
      final isEnglish = (word.language ?? 'en') == 'en';
      final definitionFuture = isEnglish
          ? _dictionaryService.getDefinition(word.word)
          : Future<WordDefinition?>.value(null);
      final translationFuture = _translateWord(word, targetLanguage);

      final definition = await definitionFuture;
      await translationFuture;

      if (definition != null) {
        word.definition = definition.primaryDefinition;
        if (definition.primaryExample.isNotEmpty) {
          word.example = definition.primaryExample;
        }
      }
    } catch (e) {
      // Continue to save even if enrichment failed
    }

    // Mark enrichment as attempted so we don't retry on every section entry
    word.enriched = true;
    await WordRepository().updateWord(word);
  }

  /// Maps this app's language codes to the ones the `translator` package's
  /// `LanguageList` actually recognizes. Found via a live production bug:
  /// a user with Chinese set as their target language got only
  /// low-quality/untranslated MyMemory fallback results (e.g. "digital" ->
  /// "digital") for every single word, because this app's Chinese codes
  /// ('zh', 'zh-TW') aren't in the package's list (only 'zh-cn'/'zh-tw'
  /// are), so GoogleTranslator — a real machine translator, far better
  /// than MyMemory's crowd-sourced translation-memory matches — was being
  /// rejected with LanguageNotSupportedException before ever making a
  /// request, for every Chinese-targeting word.
  static const Map<String, String> _translatorPackageLanguageCodes = {
    'zh': 'zh-cn',
    'zh-TW': 'zh-tw',
  };

  String _toTranslatorPackageCode(String appLanguageCode) =>
      _translatorPackageLanguageCodes[appLanguageCode] ?? appLanguageCode;

  Future<void> _translateWord(Word word, String targetLanguage) async {
    try {
      final translation = await _translator.translate(
        word.word,
        from: _toTranslatorPackageCode(word.language ?? 'auto'),
        to: _toTranslatorPackageCode(targetLanguage),
      );
      word.translation = translation.text;
    } catch (e) {
      // Fallback to MyMemory API
      final fallbackTranslation = await _dictionaryService.getTranslation(
        word.word,
        sourceLanguage: word.language ?? 'en',
        targetLanguage: targetLanguage,
      );
      if (fallbackTranslation != null) {
        word.translation = fallbackTranslation;
      }
    }
  }

  /// Batch enrich multiple words
  Future<void> enrichWords(List<Word> words, {String targetLanguage = 'en'}) async {
    for (final word in words) {
      await enrichWord(word, targetLanguage: targetLanguage);
      // Add delay to avoid rate limiting
      await Future.delayed(const Duration(milliseconds: 300));
    }
  }

  /// Enrich words incrementally with progress callback
  Future<void> enrichWordsWithProgress(
    List<Word> words, {
    String targetLanguage = 'en',
    Function(int current, int total)? onProgress,
  }) async {
    for (int i = 0; i < words.length; i++) {
      await enrichWord(words[i], targetLanguage: targetLanguage);
      onProgress?.call(i + 1, words.length);
      await Future.delayed(const Duration(milliseconds: 300));
    }
  }
}
