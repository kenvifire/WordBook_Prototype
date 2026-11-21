import 'config/language_config.dart';
import 'config/writing_system.dart';

class WordProcessor {
  final LanguageRegistry _registry = LanguageRegistry();

  /// Runtime overrides for stop words, per-language.
  final Map<String, Set<String>> _stopWordOverrides = {};

  /// Current language code for processing.
  String _language = 'en';

  /// Get the config for the current language.
  LanguageConfig get _config => _registry.get(_language);

  /// Effective stop words for current language (config + overrides).
  Set<String> get _stopWords {
    final overrides = _stopWordOverrides[_language];
    if (overrides == null) return _config.stopWords;
    return {..._config.stopWords, ...overrides};
  }

  /// Set the language for word processing.
  void setLanguage(String languageCode) {
    _language = languageCode;
  }

  /// Process a list of raw words and return a map of unique words with their
  /// frequencies. Each word is cleaned, validated against the language config,
  /// and filtered for stop words and common names.
  Map<String, int> processWords(List<String> rawWords) {
    final config = _config;
    final stopWords = _stopWords;
    final wordFrequency = <String, int>{};

    for (final rawWord in rawWords) {
      final cleaned = _clean(rawWord, config);
      if (cleaned.isEmpty) continue;

      // Length check from config
      if (cleaned.length < config.minLength) continue;
      if (cleaned.length > config.maxLength) continue;

      // Reject words containing digits
      if (config.rejectWordsWithDigits && _containsDigit(cleaned)) continue;

      // Strict script validation
      if (config.validationMode == ValidationMode.strict &&
          !_everyCharValid(cleaned, config)) {
        continue;
      }

      final lower = cleaned.toLowerCase();
      if (stopWords.contains(lower)) continue;
      if (_isName(cleaned, config)) continue;

      wordFrequency[lower] = (wordFrequency[lower] ?? 0) + 1;
    }

    return wordFrequency;
  }

  bool _containsDigit(String word) {
    for (var i = 0; i < word.length; i++) {
      final c = word.codeUnitAt(i);
      if (c >= 0x30 && c <= 0x39) return true;
    }
    return false;
  }

  /// Returns true if every character is in the writing system's script ranges
  /// or in allowedInternalPunctuation.
  bool _everyCharValid(String word, LanguageConfig config) {
    final ws = config.writingSystem;
    for (var i = 0; i < word.length; i++) {
      final char = word[i];
      if (config.allowedInternalPunctuation.contains(char)) continue;
      if (ws.isInScript(char)) continue;
      return false;
    }
    return true;
  }

  /// Clean a raw token into a candidate word using language-specific rules.
  String _clean(String raw, LanguageConfig config) {
    var word = raw.trim();
    if (word.isEmpty) return '';

    // Strip leading/trailing characters that are NOT in the writing system's
    // script ranges AND NOT word chars. This is language-aware because \w
    // (which is [a-zA-Z0-9_]) excludes CJK, Cyrillic, and Arabic chars.
    word = _stripEdgeGarbage(word, config.writingSystem);

    // Strip quote-like characters anywhere in the word.
    const quotes = {'"', "'", '‘', '’', '“', '”'};
    for (final q in quotes) {
      word = word.replaceAll(q, '');
    }

    if (word.isEmpty) return '';

    // Reject pure-number words.
    if (RegExp(r'^\d+$').hasMatch(word)) return '';

    return word;
  }

  /// Strip leading/trailing characters that are NOT in the writing system's
  /// script ranges AND NOT ASCII word characters (a-z, A-Z, 0-9).
  /// This preserves CJK, Cyrillic, Arabic, etc. which \w does not cover.
  String _stripEdgeGarbage(String word, WritingSystem ws) {
    // Build the predicate: is this character garbage at the edge?
    bool isGarbage(String ch) {
      if (ch.isEmpty) return false;
      final cp = ch.codeUnitAt(0);
      // Keep ASCII word chars
      if ((cp >= 0x30 && cp <= 0x39) || // 0-9
          (cp >= 0x41 && cp <= 0x5A) || // A-Z
          (cp >= 0x61 && cp <= 0x7A) || // a-z
          cp == 0x5F) {
        // underscore
        return false;
      }
      // Keep chars in the writing system's script ranges
      if (ws.isInScript(ch)) return false;
      return true;
    }

    // Strip from start
    while (word.isNotEmpty && isGarbage(word[0])) {
      word = word.substring(1);
    }
    // Strip from end
    while (word.isNotEmpty && isGarbage(word[word.length - 1])) {
      word = word.substring(0, word.length - 1);
    }

    return word;
  }

  /// Returns true if [word] should be filtered as a person name.
  bool _isName(String word, LanguageConfig config) {
    final lower = word.toLowerCase();

    if (config.commonNames.contains(lower)) return true;

    if (!config.filterCapitalizedAsNames) return false;

    // Heuristic: starts uppercase and rest is lowercase — likely a proper noun.
    if (word.length > 1 &&
        word[0] != word[0].toLowerCase() &&
        word.substring(1) == word.substring(1).toLowerCase()) {
      if (!config.stopWords.contains(lower)) {
        return true;
      }
    }

    return false;
  }

  /// ── Public API preserved from original WordProcessor ──

  /// Get the top N most frequent words.
  List<MapEntry<String, int>> getTopWords(Map<String, int> wordFrequency, int count) {
    final sortedEntries = wordFrequency.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    return sortedEntries.take(count).toList();
  }

  /// Get words that appear within a specific frequency range.
  List<String> getWordsByFrequencyRange(
    Map<String, int> wordFrequency,
    int minFrequency,
    int maxFrequency,
  ) {
    return wordFrequency.entries
        .where((e) => e.value >= minFrequency && e.value <= maxFrequency)
        .map((e) => e.key)
        .toList();
  }

  /// Get rare words (appear only once or twice).
  List<String> getRareWords(Map<String, int> wordFrequency) {
    return getWordsByFrequencyRange(wordFrequency, 1, 2);
  }

  /// Get common words in the text (appear frequently).
  List<String> getCommonWords(Map<String, int> wordFrequency, {int threshold = 10}) {
    return wordFrequency.entries
        .where((e) => e.value >= threshold)
        .map((e) => e.key)
        .toList();
  }

  /// Calculate vocabulary statistics.
  VocabularyStats calculateStats(Map<String, int> wordFrequency) {
    final totalWords = wordFrequency.values.fold(0, (sum, freq) => sum + freq);
    final uniqueWords = wordFrequency.length;
    final rareWords = getRareWords(wordFrequency).length;
    final commonWords = getCommonWords(wordFrequency).length;

    return VocabularyStats(
      totalWords: totalWords,
      uniqueWords: uniqueWords,
      rareWords: rareWords,
      commonWords: commonWords,
      averageFrequency: uniqueWords > 0 ? totalWords / uniqueWords : 0,
    );
  }

  /// Add a custom stop word for the current language.
  void addStopWord(String word) {
    _stopWordOverrides.putIfAbsent(_language, () => {}).add(word.toLowerCase());
  }

  /// Remove a stop word for the current language.
  void removeStopWord(String word) {
    _stopWordOverrides[_language]?.remove(word.toLowerCase());
  }

  /// Check if a word is a stop word for the current language.
  bool isStopWord(String word) {
    return _stopWords.contains(word.toLowerCase());
  }
}

class VocabularyStats {
  final int totalWords;
  final int uniqueWords;
  final int rareWords;
  final int commonWords;
  final double averageFrequency;

  VocabularyStats({
    required this.totalWords,
    required this.uniqueWords,
    required this.rareWords,
    required this.commonWords,
    required this.averageFrequency,
  });

  @override
  String toString() {
    return 'VocabularyStats(total: $totalWords, unique: $uniqueWords, '
        'rare: $rareWords, common: $commonWords, avg: ${averageFrequency.toStringAsFixed(2)})';
  }
}
