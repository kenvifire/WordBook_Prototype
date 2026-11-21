import 'package:isar/isar.dart';

part 'reading_progress.g.dart';

@collection
class ReadingProgress {
  Id id = Isar.autoIncrement;

  @Index()
  late String progressId;

  @Index()
  late String bookId;

  String? userId;

  int currentPage = 0;

  int totalPages = 0;

  int sectionSize = 10;

  @enumerated
  late SectionType sectionType;

  double vocabularyThreshold = 0.8;

  bool canProceedToNextSection = false;

  int wordsLearned = 0;

  int totalWordsInSection = 0;

  DateTime? sectionStartedAt;

  DateTime? sectionCompletedAt;

  DateTime createdAt = DateTime.now();

  DateTime updatedAt = DateTime.now();
}

enum SectionType {
  pages,
  chapters,
}
