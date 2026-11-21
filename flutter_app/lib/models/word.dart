class Word {
  int id = 0;

  late String wordId;

  late String word;

  String? definition;

  String? translation;

  String? example;

  late String bookId;

  String? userId;

  String? language;

  int repetitions = 0;

  double easeFactor = 2.5;

  int interval = 0;

  DateTime? nextReviewDate;

  DateTime createdAt = DateTime.now();

  DateTime updatedAt = DateTime.now();

  late WordStatus status;

  late ExtractionMethod extractionMethod;

  /// Whether enrichment (definition/translation) has been attempted.
  /// Prevents re-enriching the same word on every section entry.
  bool enriched = false;

  /// Local file path of a cached pronunciation clip fetched from the cloud
  /// TTS fallback (used when the device's own TTS voice isn't installed).
  /// Null until the first successful cloud fetch for this word.
  String? audioPath;
}

enum WordStatus {
  newWord,
  learning,
  reviewing,
  mastered,
}

enum ExtractionMethod {
  automatic,
  manual,
}
