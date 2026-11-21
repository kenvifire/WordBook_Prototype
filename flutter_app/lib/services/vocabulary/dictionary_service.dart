import 'dart:convert';
import 'package:http/http.dart' as http;

class DictionaryService {
  // Free Dictionary API - no auth required
  static const String _dictionaryApiUrl = 'https://api.dictionaryapi.dev/api/v2/entries/en';

  /// Fetch word definition from Free Dictionary API
  Future<WordDefinition?> getDefinition(String word) async {
    try {
      final response = await http.get(
        Uri.parse('$_dictionaryApiUrl/${word.toLowerCase()}'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as List;
        if (data.isNotEmpty) {
          return _parseDefinition(data[0]);
        }
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  WordDefinition _parseDefinition(Map<String, dynamic> data) {
    final word = data['word'] as String? ?? '';
    final phonetic = data['phonetic'] as String? ?? '';

    String? audioUrl;
    if (data['phonetics'] != null && (data['phonetics'] as List).isNotEmpty) {
      final phonetics = data['phonetics'] as List;
      for (final p in phonetics) {
        if (p is Map && p['audio'] != null && (p['audio'] as String).isNotEmpty) {
          audioUrl = p['audio'] as String;
          break;
        }
      }
    }

    final definitions = <String>[];
    final examples = <String>[];
    final synonyms = <String>[];
    final antonyms = <String>[];
    String? partOfSpeech;

    if (data['meanings'] != null) {
      final meanings = data['meanings'] as List;

      for (final meaning in meanings) {
        if (meaning is Map) {
          if (partOfSpeech == null && meaning['partOfSpeech'] != null) {
            partOfSpeech = meaning['partOfSpeech'] as String;
          }

          if (meaning['definitions'] != null) {
            final defs = meaning['definitions'] as List;
            for (final def in defs) {
              if (def is Map) {
                if (def['definition'] != null) {
                  definitions.add(def['definition'] as String);
                }
                if (def['example'] != null) {
                  examples.add(def['example'] as String);
                }
              }
            }
          }

          if (meaning['synonyms'] != null) {
            final syns = meaning['synonyms'] as List;
            synonyms.addAll(syns.map((s) => s.toString()));
          }

          if (meaning['antonyms'] != null) {
            final ants = meaning['antonyms'] as List;
            antonyms.addAll(ants.map((a) => a.toString()));
          }
        }
      }
    }

    return WordDefinition(
      word: word,
      phonetic: phonetic,
      audioUrl: audioUrl,
      partOfSpeech: partOfSpeech,
      definitions: definitions,
      examples: examples,
      synonyms: synonyms,
      antonyms: antonyms,
    );
  }

  /// Simple translation using MyMemory Translation API (free, limited).
  /// [sourceLanguage] is the language the word is in (e.g., book language).
  /// [targetLanguage] is the language to translate to (e.g., user's native language).
  Future<String?> getTranslation(String word, {
    String sourceLanguage = 'en',
    String targetLanguage = 'es',
  }) async {
    try {
      final response = await http.get(
        Uri.parse(
          'https://api.mymemory.translated.net/get?q=${Uri.encodeComponent(word)}&langpair=$sourceLanguage|$targetLanguage',
        ),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['responseData'] != null && data['responseData']['translatedText'] != null) {
          return data['responseData']['translatedText'] as String;
        }
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  /// Batch get definitions for multiple words
  Future<Map<String, WordDefinition>> getDefinitions(List<String> words) async {
    final results = <String, WordDefinition>{};

    for (final word in words) {
      // Add delay to avoid rate limiting
      await Future.delayed(const Duration(milliseconds: 200));

      final definition = await getDefinition(word);
      if (definition != null) {
        results[word] = definition;
      }
    }

    return results;
  }

  /// Get example sentences for a word
  Future<List<String>> getExamples(String word) async {
    final definition = await getDefinition(word);
    return definition?.examples ?? [];
  }

  /// Get synonyms for a word
  Future<List<String>> getSynonyms(String word) async {
    final definition = await getDefinition(word);
    return definition?.synonyms ?? [];
  }

  /// Check if a word exists in dictionary
  Future<bool> wordExists(String word) async {
    final definition = await getDefinition(word);
    return definition != null;
  }

  /// Get structured dictionary result with full meanings
  Future<DictionaryResult?> getStructuredDefinition(String word) async {
    try {
      final response = await http.get(
        Uri.parse('$_dictionaryApiUrl/${word.toLowerCase()}'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as List;
        if (data.isNotEmpty) {
          return _parseStructuredDefinition(data[0]);
        }
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  DictionaryResult _parseStructuredDefinition(Map<String, dynamic> data) {
    final word = data['word'] as String? ?? '';
    final phonetic = data['phonetic'] as String?;

    String? audioUrl;
    if (data['phonetics'] != null && (data['phonetics'] as List).isNotEmpty) {
      final phonetics = data['phonetics'] as List;
      for (final p in phonetics) {
        if (p is Map && p['audio'] != null && (p['audio'] as String).isNotEmpty) {
          audioUrl = p['audio'] as String;
          break;
        }
      }
    }

    final meanings = <MeaningResult>[];

    if (data['meanings'] != null) {
      final meaningsData = data['meanings'] as List;

      for (final meaning in meaningsData) {
        if (meaning is Map) {
          final partOfSpeech = meaning['partOfSpeech'] as String? ?? 'unknown';
          final definitions = <DefinitionResult>[];

          if (meaning['definitions'] != null) {
            final defs = meaning['definitions'] as List;
            for (final def in defs) {
              if (def is Map) {
                definitions.add(DefinitionResult(
                  definition: def['definition'] as String? ?? '',
                  example: def['example'] as String?,
                ));
              }
            }
          }

          meanings.add(MeaningResult(
            partOfSpeech: partOfSpeech,
            definitions: definitions,
          ));
        }
      }
    }

    return DictionaryResult(
      word: word,
      phonetic: phonetic,
      audioUrl: audioUrl,
      meanings: meanings,
    );
  }
}

class WordDefinition {
  final String word;
  final String phonetic;
  final String? audioUrl;
  final String? partOfSpeech;
  final List<String> definitions;
  final List<String> examples;
  final List<String> synonyms;
  final List<String> antonyms;

  WordDefinition({
    required this.word,
    required this.phonetic,
    this.audioUrl,
    this.partOfSpeech,
    required this.definitions,
    required this.examples,
    required this.synonyms,
    required this.antonyms,
  });

  String get primaryDefinition => definitions.isNotEmpty ? definitions.first : '';
  String get primaryExample => examples.isNotEmpty ? examples.first : '';

  @override
  String toString() {
    return 'WordDefinition(word: $word, definitions: ${definitions.length}, '
        'examples: ${examples.length}, synonyms: ${synonyms.length})';
  }
}

/// Structured result for dictionary lookup with full meaning details
class DictionaryResult {
  final String word;
  final String? phonetic;
  final String? audioUrl;
  final List<MeaningResult> meanings;

  DictionaryResult({
    required this.word,
    this.phonetic,
    this.audioUrl,
    required this.meanings,
  });

  String get primaryDefinition {
    if (meanings.isEmpty) return '';
    if (meanings.first.definitions.isEmpty) return '';
    return meanings.first.definitions.first.definition;
  }

  String get primaryExample {
    if (meanings.isEmpty) return '';
    for (final meaning in meanings) {
      for (final def in meaning.definitions) {
        if (def.example != null && def.example!.isNotEmpty) {
          return def.example!;
        }
      }
    }
    return '';
  }
}

class MeaningResult {
  final String partOfSpeech;
  final List<DefinitionResult> definitions;

  MeaningResult({
    required this.partOfSpeech,
    required this.definitions,
  });
}

class DefinitionResult {
  final String definition;
  final String? example;

  DefinitionResult({
    required this.definition,
    this.example,
  });
}
