import 'writing_system.dart';
import 'builtin_languages.dart';

enum ValidationMode {
  /// Every character must be in the language's script ranges or allowedInternalPunctuation.
  /// Catches "0P.IS2", "EJ.S", "123abc".
  strict,

  /// At least one character must be in the script ranges.
  /// For mixed-script texts or loanwords.
  relaxed,
}

class LanguageConfig {
  /// ISO 639-1 code, e.g. 'en', 'es', 'ja'.
  final String code;

  /// Human-readable English name.
  final String name;

  /// Writing system family this language belongs to.
  final WritingSystem writingSystem;

  /// How strictly character-level script validation is applied.
  final ValidationMode validationMode;

  /// Punctuation characters allowed to appear INSIDE a word.
  /// e.g., {'\'', '-'} for English allows "don't", "well-known".
  /// Period, comma, digits are NOT included — they will cause rejection.
  final Set<String> allowedInternalPunctuation;

  /// Whether capitalized words trigger name filtering.
  /// true for English/French/Spanish. false for German (all nouns capitalized).
  final bool filterCapitalizedAsNames;

  /// Minimum word length in characters.
  final int minLength;

  /// Maximum word length (filters concatenated garbage).
  final int maxLength;

  /// If true, any word containing an ASCII digit [0-9] is rejected.
  /// Catches "0P.IS2", "word123", "3rd".
  final bool rejectWordsWithDigits;

  /// Stop words for this language (lowercase).
  final Set<String> stopWords;

  /// Common given names to filter (lowercase).
  final Set<String> commonNames;

  const LanguageConfig({
    required this.code,
    required this.name,
    required this.writingSystem,
    this.validationMode = ValidationMode.strict,
    this.allowedInternalPunctuation = const {},
    this.filterCapitalizedAsNames = true,
    this.minLength = 3,
    this.maxLength = 30,
    this.rejectWordsWithDigits = true,
    this.stopWords = const {},
    this.commonNames = const {},
  });
}

class LanguageRegistry {
  static LanguageRegistry? _instance;
  final Map<String, LanguageConfig> _configs = {};

  LanguageRegistry._() {
    _registerBuiltins();
  }

  factory LanguageRegistry() {
    _instance ??= LanguageRegistry._();
    return _instance!;
  }

  void _registerBuiltins() {
    registerAll(BuiltinLanguages.all());
  }

  /// Get the config for a language code. Falls back to English.
  LanguageConfig get(String code) {
    return _configs[code] ?? _configs['en']!;
  }

  /// Register a single language config.
  void register(LanguageConfig config) {
    _configs[config.code] = config;
  }

  /// Register multiple language configs.
  void registerAll(List<LanguageConfig> configs) {
    for (final c in configs) {
      _configs[c.code] = c;
    }
  }

  /// Check if a language code is registered.
  bool hasLanguage(String code) => _configs.containsKey(code);

  /// All registered language codes.
  Iterable<String> get languages => _configs.keys;
}
