import 'package:isar/isar.dart';
import '../../../models/reading_section.dart';

part 'reading_section_entity.g.dart';

/// Native-only Isar persistence model for [ReadingSection]. Mirrors every
/// field of the plain domain model plus the `@Index()`/`@enumerated`
/// placement `ReadingSection` used to have before Isar was stripped out of
/// it.
///
/// This file must never be imported outside `reading_section_store_native.dart`:
/// Isar's generated `*.g.dart` part contains 64-bit literals that dart2js
/// cannot compile, so merely importing an `@collection`-annotated model
/// would drag that into a web build.
@collection
@Name('ReadingSection')
class ReadingSectionEntity {
  Id id = Isar.autoIncrement;

  @Index()
  late String sectionId;

  @Index()
  late String bookId;

  late String userId;

  late int sectionNumber;

  late int startPage;

  late int endPage;

  @enumerated
  late SectionType sectionType;

  @enumerated
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

  ReadingSection toDomain() => ReadingSection()
    ..id = id
    ..sectionId = sectionId
    ..bookId = bookId
    ..userId = userId
    ..sectionNumber = sectionNumber
    ..startPage = startPage
    ..endPage = endPage
    ..sectionType = sectionType
    ..status = status
    ..totalWords = totalWords
    ..masteredWords = masteredWords
    ..recognitionRate = recognitionRate
    ..isUnlocked = isUnlocked
    ..practiceStartedAt = practiceStartedAt
    ..practiceCompletedAt = practiceCompletedAt
    ..readingStartedAt = readingStartedAt
    ..readingCompletedAt = readingCompletedAt
    ..createdAt = createdAt
    ..updatedAt = updatedAt;

  static ReadingSectionEntity fromDomain(ReadingSection s) =>
      ReadingSectionEntity()
        ..id = s.id == 0 ? Isar.autoIncrement : s.id
        ..sectionId = s.sectionId
        ..bookId = s.bookId
        ..userId = s.userId
        ..sectionNumber = s.sectionNumber
        ..startPage = s.startPage
        ..endPage = s.endPage
        ..sectionType = s.sectionType
        ..status = s.status
        ..totalWords = s.totalWords
        ..masteredWords = s.masteredWords
        ..recognitionRate = s.recognitionRate
        ..isUnlocked = s.isUnlocked
        ..practiceStartedAt = s.practiceStartedAt
        ..practiceCompletedAt = s.practiceCompletedAt
        ..readingStartedAt = s.readingStartedAt
        ..readingCompletedAt = s.readingCompletedAt
        ..createdAt = s.createdAt
        ..updatedAt = s.updatedAt;
}
