import 'package:isar/isar.dart';
import '../../models/book.dart';
import '../../services/database_service.dart';
import '../isar/entities/book_entity.dart';
import 'book_store.dart';

/// Isar-backed [BookStore] for native platforms (iOS/Android/macOS/Windows/
/// Linux). Wraps today's exact `isar.books...` calls, now operating on
/// [BookEntity], converting to/from the plain [Book] domain model at the
/// boundary.
class NativeBookStore implements BookStore {
  @override
  Future<List<Book>> getAll({String? userId}) async {
    final isar = await DatabaseService.isar;

    final entities = userId != null
        ? await isar.bookEntitys
            .filter()
            .userIdEqualTo(userId)
            .sortByLastReadAtDesc()
            .findAll()
        : await isar.bookEntitys.where().sortByLastReadAtDesc().findAll();

    return entities.map((e) => e.toDomain()).toList();
  }

  @override
  Future<Book?> getById(String bookId) async {
    final isar = await DatabaseService.isar;
    final entity =
        await isar.bookEntitys.filter().bookIdEqualTo(bookId).findFirst();
    return entity?.toDomain();
  }

  @override
  Future<void> put(Book book) async {
    final isar = await DatabaseService.isar;
    final entity = BookEntity.fromDomain(book);

    await isar.writeTxn(() async {
      final newId = await isar.bookEntitys.put(entity);
      book.id = newId;
    });
  }

  @override
  Future<void> deleteById(String bookId) async {
    final isar = await DatabaseService.isar;
    final entity =
        await isar.bookEntitys.filter().bookIdEqualTo(bookId).findFirst();

    if (entity != null) {
      await isar.writeTxn(() async {
        await isar.bookEntitys.delete(entity.id);
      });
    }
  }
}

BookStore createBookStore() => NativeBookStore();
