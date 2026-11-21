import 'package:isar/isar.dart';
import '../../../models/book.dart';

part 'book_entity.g.dart';

/// Native-only Isar persistence model for [Book]. Mirrors every field of the
/// plain domain model plus the `@Index()`/`@enumerated` placement `Book`
/// used to have before Isar was stripped out of it.
///
/// This file must never be imported outside `book_store_native.dart`: Isar's
/// generated `*.g.dart` part contains 64-bit literals that dart2js cannot
/// compile, so merely importing an `@collection`-annotated model would drag
/// that into a web build.
@collection
@Name('Book')
class BookEntity {
  Id id = Isar.autoIncrement;

  @Index()
  late String bookId;

  late String title;

  String? author;

  String? coverUrl;

  late String format;

  late String localPath;

  int totalPages = 0;

  int currentPage = 0;

  @enumerated
  late BookStatus status;

  DateTime? lastReadAt;

  DateTime createdAt = DateTime.now();

  DateTime updatedAt = DateTime.now();

  String? userId;

  String? language;

  String? translationLanguage;

  Book toDomain() => Book()
    ..id = id
    ..bookId = bookId
    ..title = title
    ..author = author
    ..coverUrl = coverUrl
    ..format = format
    ..localPath = localPath
    ..totalPages = totalPages
    ..currentPage = currentPage
    ..status = status
    ..lastReadAt = lastReadAt
    ..createdAt = createdAt
    ..updatedAt = updatedAt
    ..userId = userId
    ..language = language
    ..translationLanguage = translationLanguage;

  static BookEntity fromDomain(Book b) => BookEntity()
    ..id = b.id == 0 ? Isar.autoIncrement : b.id
    ..bookId = b.bookId
    ..title = b.title
    ..author = b.author
    ..coverUrl = b.coverUrl
    ..format = b.format
    ..localPath = b.localPath
    ..totalPages = b.totalPages
    ..currentPage = b.currentPage
    ..status = b.status
    ..lastReadAt = b.lastReadAt
    ..createdAt = b.createdAt
    ..updatedAt = b.updatedAt
    ..userId = b.userId
    ..language = b.language
    ..translationLanguage = b.translationLanguage;
}
