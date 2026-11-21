class Statistics {
  int id = 0;

  late String statisticsId;

  late String bookId;

  String? userId;

  int totalPages = 0;

  int pagesRead = 0;

  int totalWords = 0;

  int wordsLearned = 0;

  int wordsMastered = 0;

  int totalPracticeTime = 0;

  int totalReadingTime = 0;

  DateTime? startedAt;

  DateTime? completedAt;

  DateTime createdAt = DateTime.now();

  DateTime updatedAt = DateTime.now();

  double get readingProgress {
    if (totalPages == 0) return 0.0;
    return (pagesRead / totalPages).clamp(0.0, 1.0);
  }

  double get vocabularyProgress {
    if (totalWords == 0) return 0.0;
    return (wordsLearned / totalWords).clamp(0.0, 1.0);
  }
}
