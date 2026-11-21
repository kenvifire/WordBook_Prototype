class ReadingSection {
  int id = 0;

  late String sectionId;

  late String bookId;

  late String userId;

  late int sectionNumber;

  late int startPage;

  late int endPage;

  late SectionType sectionType;

  late SectionStatus status;

  int totalWords = 0;

  int masteredWords = 0;

  double recognitionRate = 0.0;

  bool isUnlocked = false;

  DateTime? practiceStartedAt;

  DateTime? practiceCompletedAt;

  DateTime? readingStartedAt;

  DateTime? readingCompletedAt;

  DateTime createdAt = DateTime.now();

  DateTime updatedAt = DateTime.now();
}

enum SectionType {
  pages,
  chapters,
  // Appended, not inserted — Isar stores this enum by ordinal, so existing
  // sections' stored pages/chapters values must keep their indices.
  wordCount,
}

enum SectionStatus {
  locked,        // Not ready to practice
  readyToPractice, // Can start practicing
  practicing,    // Currently practicing
  readyToRead,   // Met threshold, can read
  reading,       // Currently reading
  completed,     // Finished reading
}
