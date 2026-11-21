import 'package:uuid/uuid.dart';
import '../data/file_io/book_file_io.dart';
import '../data/stores/book_store.dart';
import '../models/book.dart';

class BookRepository {
  final Uuid _uuid = const Uuid();
  final BookStore _store = createBookStore();

  /// Resolve the actual file reference for a book, falling back to the
  /// current documents directory when a stored absolute path no longer
  /// exists (e.g., after app redeploy changes the sandbox container).
  /// On web, an in-memory reference never goes stale, so this is a no-op.
  Future<String> resolveFilePath(Book book) async {
    final resolved = await createBookFileIO().resolveStalePath(book.localPath);
    if (resolved != null) {
      book.localPath = resolved;
      await updateBook(book);
    }
    return book.localPath;
  }

  Future<List<Book>> getAllBooks({String? userId}) async {
    return _store.getAll(userId: userId);
  }

  Future<Book?> getBookById(String bookId) async {
    return _store.getById(bookId);
  }

  Future<void> addBook(Book book) async {
    if (book.bookId.isEmpty) {
      book.bookId = _uuid.v4();
    }

    await _store.put(book);
  }

  Future<void> updateBook(Book book) async {
    book.updatedAt = DateTime.now();
    await _store.put(book);
  }

  Future<void> deleteBook(String bookId) async {
    await _store.deleteById(bookId);
  }

  Future<void> updateReadingProgress({
    required String bookId,
    required int currentPage,
  }) async {
    final book = await getBookById(bookId);

    if (book != null) {
      book.currentPage = currentPage;
      book.lastReadAt = DateTime.now();

      if (currentPage >= book.totalPages) {
        book.status = BookStatus.completed;
      } else if (currentPage > 0) {
        book.status = BookStatus.reading;
      }

      await updateBook(book);
    }
  }
}
