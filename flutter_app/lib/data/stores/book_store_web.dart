import 'dart:convert';

import '../../models/book.dart';
import '../web/kv_persistence.dart';
import '../web/kv_persistence_factory.dart';
import 'book_store.dart';

Map<String, dynamic> _bookToMap(Book book) => {
      'id': book.id,
      'bookId': book.bookId,
      'title': book.title,
      'author': book.author,
      'coverUrl': book.coverUrl,
      'format': book.format,
      'localPath': book.localPath,
      'totalPages': book.totalPages,
      'currentPage': book.currentPage,
      'status': book.status.name,
      'lastReadAt': book.lastReadAt?.millisecondsSinceEpoch,
      'createdAt': book.createdAt.millisecondsSinceEpoch,
      'updatedAt': book.updatedAt.millisecondsSinceEpoch,
      'userId': book.userId,
      'language': book.language,
      'translationLanguage': book.translationLanguage,
    };

Book _bookFromMap(Map<String, dynamic> map) => Book()
  ..id = map['id'] as int
  ..bookId = map['bookId'] as String
  ..title = map['title'] as String
  ..author = map['author'] as String?
  ..coverUrl = map['coverUrl'] as String?
  ..format = map['format'] as String
  ..localPath = map['localPath'] as String
  ..totalPages = map['totalPages'] as int
  ..currentPage = map['currentPage'] as int
  ..status = BookStatus.values.byName(map['status'] as String)
  ..lastReadAt = map['lastReadAt'] == null
      ? null
      : DateTime.fromMillisecondsSinceEpoch(map['lastReadAt'] as int)
  ..createdAt = DateTime.fromMillisecondsSinceEpoch(map['createdAt'] as int)
  ..updatedAt = DateTime.fromMillisecondsSinceEpoch(map['updatedAt'] as int)
  ..userId = map['userId'] as String?
  ..language = map['language'] as String?
  ..translationLanguage = map['translationLanguage'] as String?;

/// [BookStore] for web, persisted to IndexedDB (via [KvPersistence] —
/// a no-op stub under `flutter test`'s VM runner, which has no JS runtime
/// for IndexedDB to begin with). Keeps an in-memory list as the working
/// copy for synchronous-feeling filtering/sorting, hydrated from
/// IndexedDB once per store instance and kept in sync on every write.
class WebBookStore implements BookStore {
  WebBookStore({KvPersistence<String>? persistence})
      : _persistence = persistence ?? createJsonPersistence('books');

  final KvPersistence<String> _persistence;
  final List<Book> _books = [];
  int _nextId = 1;
  Future<void>? _hydration;

  Future<void> _ensureHydrated() => _hydration ??= _hydrate();

  Future<void> _hydrate() async {
    final stored = await _persistence.loadAll();
    var maxId = 0;
    for (final json in stored) {
      final book = _bookFromMap(jsonDecode(json) as Map<String, dynamic>);
      _books.add(book);
      if (book.id > maxId) maxId = book.id;
    }
    _nextId = maxId + 1;
  }

  @override
  Future<List<Book>> getAll({String? userId}) async {
    await _ensureHydrated();
    final filtered = userId != null
        ? _books.where((b) => b.userId == userId).toList()
        : List<Book>.from(_books);

    filtered.sort((a, b) {
      final aTime = a.lastReadAt;
      final bTime = b.lastReadAt;
      if (aTime == null && bTime == null) return 0;
      if (aTime == null) return 1;
      if (bTime == null) return -1;
      return bTime.compareTo(aTime);
    });

    return filtered;
  }

  @override
  Future<Book?> getById(String bookId) async {
    await _ensureHydrated();
    for (final book in _books) {
      if (book.bookId == bookId) return book;
    }
    return null;
  }

  @override
  Future<void> put(Book book) async {
    await _ensureHydrated();
    if (book.id == 0) {
      book.id = _nextId++;
      _books.add(book);
    } else {
      final index = _books.indexWhere((b) => b.id == book.id);
      if (index == -1) {
        _books.add(book);
      } else {
        _books[index] = book;
      }
    }
    await _persistence.save(book.bookId, jsonEncode(_bookToMap(book)));
  }

  @override
  Future<void> deleteById(String bookId) async {
    await _ensureHydrated();
    _books.removeWhere((b) => b.bookId == bookId);
    await _persistence.delete(bookId);
  }
}

WebBookStore? _instance;

/// Memoized: production code constructs `BookRepository()` ad hoc at many
/// call sites, each holding its own `BookStore` field. On native that's
/// harmless (`NativeBookStore` is stateless, delegating to the one real
/// `DatabaseService.isar` singleton), but `WebBookStore` *is* the data — a
/// fresh instance per call would mean nothing written ever survives to the
/// next `BookRepository()` call, defeating in-memory web persistence
/// entirely. Returning the same instance across calls keeps one in-memory
/// store for the whole session.
BookStore createBookStore() => _instance ??= WebBookStore();
