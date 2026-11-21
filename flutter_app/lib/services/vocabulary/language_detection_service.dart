/// Service for detecting the language of text content
class LanguageDetectionService {
  /// Supported book languages for word extraction
  static const List<BookLanguage> supportedLanguages = [
    BookLanguage(code: 'en', name: 'English', nativeName: 'English'),
    BookLanguage(code: 'es', name: 'Spanish', nativeName: 'Español'),
    BookLanguage(code: 'fr', name: 'French', nativeName: 'Français'),
    BookLanguage(code: 'de', name: 'German', nativeName: 'Deutsch'),
    BookLanguage(code: 'it', name: 'Italian', nativeName: 'Italiano'),
    BookLanguage(code: 'pt', name: 'Portuguese', nativeName: 'Português'),
    BookLanguage(code: 'nl', name: 'Dutch', nativeName: 'Nederlands'),
    BookLanguage(code: 'ru', name: 'Russian', nativeName: 'Русский'),
    BookLanguage(code: 'ja', name: 'Japanese', nativeName: '日本語'),
    BookLanguage(code: 'ko', name: 'Korean', nativeName: '한국어'),
    BookLanguage(code: 'zh', name: 'Chinese', nativeName: '中文'),
  ];

  // Common words for language detection
  static const Map<String, Set<String>> _languageMarkers = {
    'en': {
      'the', 'and', 'is', 'in', 'to', 'of', 'a', 'for', 'on', 'with',
      'that', 'it', 'as', 'was', 'are', 'be', 'this', 'have', 'from', 'or',
      'an', 'they', 'which', 'you', 'were', 'her', 'all', 'she', 'there', 'would',
      'their', 'will', 'when', 'who', 'him', 'been', 'has', 'more', 'if', 'no',
    },
    'es': {
      'el', 'la', 'de', 'que', 'y', 'en', 'los', 'del', 'se', 'las',
      'por', 'un', 'para', 'con', 'no', 'una', 'su', 'al', 'es', 'lo',
      'como', 'más', 'pero', 'sus', 'le', 'ya', 'o', 'este', 'sí', 'porque',
    },
    'fr': {
      'le', 'la', 'de', 'et', 'les', 'des', 'en', 'un', 'du', 'une',
      'que', 'est', 'pour', 'qui', 'dans', 'ce', 'il', 'pas', 'plus', 'par',
      'sur', 'se', 'son', 'avec', 'au', 'sont', 'tout', 'mais', 'nous', 'comme',
    },
    'de': {
      'der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich',
      'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein', 'eine', 'als',
      'auch', 'es', 'an', 'werden', 'aus', 'er', 'hat', 'dass', 'sie', 'nach',
    },
    'it': {
      'il', 'di', 'che', 'la', 'e', 'un', 'in', 'del', 'per', 'non',
      'si', 'una', 'da', 'sono', 'dei', 'con', 'le', 'alla', 'come', 'ha',
      'gli', 'nel', 'anche', 'delle', 'della', 'sul', 'ai', 'essere', 'suo', 'più',
    },
    'pt': {
      'de', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'com', 'não',
      'uma', 'os', 'no', 'se', 'na', 'por', 'mais', 'as', 'dos', 'como',
      'mas', 'ao', 'ele', 'das', 'à', 'seu', 'sua', 'ou', 'quando', 'muito',
    },
    'nl': {
      'de', 'het', 'een', 'van', 'en', 'in', 'is', 'dat', 'op', 'te',
      'voor', 'zijn', 'met', 'die', 'niet', 'aan', 'er', 'om', 'als', 'maar',
      'bij', 'ook', 'naar', 'dan', 'nog', 'wel', 'wat', 'werd', 'door', 'worden',
    },
    'ru': {
      'и', 'в', 'не', 'на', 'я', 'что', 'он', 'с', 'как', 'а',
      'то', 'все', 'она', 'так', 'его', 'но', 'да', 'ты', 'к', 'у',
      'же', 'вы', 'за', 'бы', 'по', 'только', 'её', 'мне', 'было', 'вот',
    },
  };

  // Unicode ranges for script detection
  static const Map<String, List<List<int>>> _scriptRanges = {
    'ja': [
      [0x3040, 0x309F], // Hiragana
      [0x30A0, 0x30FF], // Katakana
    ],
    'ko': [
      [0xAC00, 0xD7AF], // Hangul Syllables
      [0x1100, 0x11FF], // Hangul Jamo
    ],
    'zh': [
      [0x4E00, 0x9FFF], // CJK Unified Ideographs
      [0x3400, 0x4DBF], // CJK Unified Ideographs Extension A
    ],
    'ru': [
      [0x0400, 0x04FF], // Cyrillic
    ],
  };

  /// Detect language from text sample
  String detectLanguage(String text) {
    if (text.isEmpty) return 'en'; // Default to English

    // First check for non-Latin scripts
    final scriptLang = _detectByScript(text);
    if (scriptLang != null) return scriptLang;

    // Then check by common words
    final words = text.toLowerCase().split(RegExp(r'\s+'));
    final wordSet = words.toSet();

    final scores = <String, int>{};

    for (final entry in _languageMarkers.entries) {
      final langCode = entry.key;
      final markers = entry.value;
      final matchCount = wordSet.intersection(markers).length;
      scores[langCode] = matchCount;
    }

    // Find the language with the highest score
    String detectedLang = 'en';
    int maxScore = 0;

    for (final entry in scores.entries) {
      if (entry.value > maxScore) {
        maxScore = entry.value;
        detectedLang = entry.key;
      }
    }

    // If no clear winner, default to English
    if (maxScore < 3) {
      return 'en';
    }

    return detectedLang;
  }

  /// Detect language by script/character set
  String? _detectByScript(String text) {
    final scriptCounts = <String, int>{};

    for (final char in text.runes) {
      for (final entry in _scriptRanges.entries) {
        for (final range in entry.value) {
          if (char >= range[0] && char <= range[1]) {
            scriptCounts[entry.key] = (scriptCounts[entry.key] ?? 0) + 1;
          }
        }
      }
    }

    if (scriptCounts.isEmpty) return null;

    // Find dominant script
    String? dominantScript;
    int maxCount = 0;

    for (final entry in scriptCounts.entries) {
      if (entry.value > maxCount) {
        maxCount = entry.value;
        dominantScript = entry.key;
      }
    }

    // Need at least 10 characters to be confident
    if (maxCount >= 10) {
      return dominantScript;
    }

    return null;
  }

  /// Get BookLanguage by code
  static BookLanguage? getLanguageByCode(String code) {
    try {
      return supportedLanguages.firstWhere((lang) => lang.code == code);
    } catch (_) {
      return null;
    }
  }

  /// Get language name by code
  static String getLanguageName(String code) {
    return getLanguageByCode(code)?.name ?? 'Unknown';
  }
}

/// Represents a book language
class BookLanguage {
  final String code;
  final String name;
  final String nativeName;

  const BookLanguage({
    required this.code,
    required this.name,
    required this.nativeName,
  });
}
