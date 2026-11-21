import 'package:isar/isar.dart';
import '../../../models/statistics.dart';

part 'statistics_entity.g.dart';

/// Native-only Isar persistence model for [Statistics]. Mirrors every field
/// of the plain domain model plus the `@Index()` placement `Statistics`
/// used to have before Isar was stripped out of it.
///
/// This file must never be imported outside `statistics_store_native.dart`:
/// Isar's generated `*.g.dart` part contains 64-bit literals that dart2js
/// cannot compile, so merely importing an `@collection`-annotated model
/// would drag that into a web build.
///
/// Note: `Statistics`'s `readingProgress`/`vocabularyProgress` computed
/// getters are pure field math on the domain model only — they are not
/// duplicated here; `toDomain()` just needs the stored fields.
@collection
@Name('Statistics')
class StatisticsEntity {
  Id id = Isar.autoIncrement;

  @Index()
  late String statisticsId;

  @Index()
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

  Statistics toDomain() => Statistics()
    ..id = id
    ..statisticsId = statisticsId
    ..bookId = bookId
    ..userId = userId
    ..totalPages = totalPages
    ..pagesRead = pagesRead
    ..totalWords = totalWords
    ..wordsLearned = wordsLearned
    ..wordsMastered = wordsMastered
    ..totalPracticeTime = totalPracticeTime
    ..totalReadingTime = totalReadingTime
    ..startedAt = startedAt
    ..completedAt = completedAt
    ..createdAt = createdAt
    ..updatedAt = updatedAt;

  static StatisticsEntity fromDomain(Statistics s) => StatisticsEntity()
    ..id = s.id == 0 ? Isar.autoIncrement : s.id
    ..statisticsId = s.statisticsId
    ..bookId = s.bookId
    ..userId = s.userId
    ..totalPages = s.totalPages
    ..pagesRead = s.pagesRead
    ..totalWords = s.totalWords
    ..wordsLearned = s.wordsLearned
    ..wordsMastered = s.wordsMastered
    ..totalPracticeTime = s.totalPracticeTime
    ..totalReadingTime = s.totalReadingTime
    ..startedAt = s.startedAt
    ..completedAt = s.completedAt
    ..createdAt = s.createdAt
    ..updatedAt = s.updatedAt;
}
