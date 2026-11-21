import '../../models/book.dart';

export 'book_store_native.dart' if (dart.library.html) 'book_store_web.dart';

/// Platform-agnostic persistence contract for [Book]. Production code
/// depends only on this interface and on [createBookStore]; it never names
/// `NativeBookStore` or `WebBookStore` directly, so it compiles against
/// whichever implementation the conditional export below resolves to.
abstract class BookStore {
  /// Always sorted by lastReadAt desc, matching today's behavior in both
  /// branches.
  Future<List<Book>> getAll({String? userId});

  Future<Book?> getById(String bookId);

  /// Insert when book.id == 0 (assigns a fresh id), else overwrite the
  /// matching id.
  Future<void> put(Book book);

  Future<void> deleteById(String bookId);
}
