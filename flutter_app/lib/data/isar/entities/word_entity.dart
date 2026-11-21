import 'package:isar/isar.dart';
import '../../../models/word.dart';

part 'word_entity.g.dart';

/// Native-only Isar persistence model for [Word]. Mirrors every field of the
/// plain domain model plus the `@Index()`/`@enumerated` placement `Word`
/// used to have before Isar was stripped out of it.
///
/// This file must never be imported outside `word_store_native.dart`: Isar's
/// generated `*.g.dart` part contains 64-bit literals that dart2js cannot
/// compile, so merely importing an `@collection`-annotated model would drag
/// that into a web build.
@collection
@Name('Word')
class WordEntity {
  Id id = Isar.autoIncrement;

  @Index()
  late String wordId;

  @Index()
  late String word;

  String? definition;

  String? translation;

  String? example;

  @Index()
  late String bookId;

  String? userId;

  String? language;

  int repetitions = 0;

  double easeFactor = 2.5;

  int interval = 0;

  DateTime? nextReviewDate;

  DateTime createdAt = DateTime.now();

  DateTime updatedAt = DateTime.now();

  @enumerated
  late WordStatus status;

  @enumerated
  late ExtractionMethod extractionMethod;

  /// Whether enrichment (definition/translation) has been attempted.
  /// Prevents re-enriching the same word on every section entry.
  bool enriched = false;

  /// Local file path of a cached pronunciation clip fetched from the cloud
  /// TTS fallback (used when the device's own TTS voice isn't installed).
  /// Null until the first successful cloud fetch for this word.
  String? audioPath;

  Word toDomain() => Word()
    ..id = id
    ..wordId = wordId
    ..word = word
    ..definition = definition
    ..translation = translation
    ..example = example
    ..bookId = bookId
    ..userId = userId
    ..language = language
    ..repetitions = repetitions
    ..easeFactor = easeFactor
    ..interval = interval
    ..nextReviewDate = nextReviewDate
    ..createdAt = createdAt
    ..updatedAt = updatedAt
    ..status = status
    ..extractionMethod = extractionMethod
    ..enriched = enriched
    ..audioPath = audioPath;

  static WordEntity fromDomain(Word w) => WordEntity()
    ..id = w.id == 0 ? Isar.autoIncrement : w.id
    ..wordId = w.wordId
    ..word = w.word
    ..definition = w.definition
    ..translation = w.translation
    ..example = w.example
    ..bookId = w.bookId
    ..userId = w.userId
    ..language = w.language
    ..repetitions = w.repetitions
    ..easeFactor = w.easeFactor
    ..interval = w.interval
    ..nextReviewDate = w.nextReviewDate
    ..createdAt = w.createdAt
    ..updatedAt = w.updatedAt
    ..status = w.status
    ..extractionMethod = w.extractionMethod
    ..enriched = w.enriched
    ..audioPath = w.audioPath;
}
