import 'dart:typed_data';

import '../web/kv_persistence.dart';
import '../web/kv_persistence_factory.dart';
import 'book_file_io.dart';

/// [BookFileIO] for web, persisted to IndexedDB (via [KvPersistence] — a
/// no-op stub under `flutter test`'s VM runner, which has no JS runtime for
/// IndexedDB to begin with). Keeps an in-memory cache of bytes this
/// instance has already stored or read, so repeat reads in the same
/// session skip IndexedDB; a cache miss (first read after a page reload)
/// falls back to a fetch by reference, since loading every stored
/// book/cover blob up front — rather than only the ones actually reopened
/// — would be wasteful. Covers are stored the same way as book bytes,
/// under a distinct reference prefix so a book's bytes and its cover never
/// collide.
class WebBookFileIO implements BookFileIO {
  WebBookFileIO({KvPersistence<Uint8List>? persistence})
    : _persistence = persistence ?? createBytesPersistence('files');

  final KvPersistence<Uint8List> _persistence;
  final Map<String, Uint8List> _bytesByReference = {};
  int _nextId = 1;

  String _generateReference(String prefix, String bookId, String fileName) {
    final id = _nextId++;
    return '$prefix:$bookId:$id:$fileName';
  }

  @override
  Future<String> store(
    String bookId,
    String fileName,
    Uint8List bytes, {
    String? sourcePath,
  }) async {
    final ref = _generateReference('book', bookId, fileName);
    _bytesByReference[ref] = bytes;
    await _persistence.save(ref, bytes);
    return ref;
  }

  @override
  Future<Uint8List> readBytes(String reference) async {
    final cached = _bytesByReference[reference];
    if (cached != null) return cached;

    final persisted = await _persistence.get(reference);
    if (persisted != null) {
      _bytesByReference[reference] = persisted;
      return persisted;
    }

    throw Exception('No file found for reference: $reference');
  }

  @override
  Future<void> deleteByReference(String reference) async {
    _bytesByReference.remove(reference);
    await _persistence.delete(reference);
  }

  @override
  Future<String?> storeCover(String bookId, Uint8List bytes) async {
    final ref = _generateReference('cover', bookId, 'cover.jpg');
    _bytesByReference[ref] = bytes;
    await _persistence.save(ref, bytes);
    return ref;
  }

  @override
  Future<String?> resolveStalePath(String storedReference) async => null;

  @override
  bool get supportsPersistentCache => false;
}

/// See the free-standing-helpers note in `book_file_io.dart`. Never
/// actually reached in practice — see that note.
Uint8List? readPdfBytesSync(String filePath) => null;

/// See the free-standing-helpers note in `book_file_io.dart`. Never
/// actually reached in practice — see that note.
Future<bool> localFileExists(String path) async => false;

/// See the free-standing-helpers note in `book_file_io.dart`. Writes
/// through to the TTS cache's IndexedDB store, keyed by [path] (really the
/// bare cache key — see [resolveTtsCachePath]).
Future<void> writeLocalFile(String path, Uint8List bytes) async {
  _ttsBytesByKey[path] = bytes;
  await _ttsCache().save(path, bytes);
}

final Map<String, Uint8List> _ttsBytesByKey = {};

KvPersistence<Uint8List>? _ttsCachePersistence;

KvPersistence<Uint8List> _ttsCache() =>
    _ttsCachePersistence ??= createBytesPersistence('tts_cache');

/// See the free-standing-helpers note in `book_file_io.dart`. Web has no
/// real file path for the TTS cache — [key] is used directly as the
/// IndexedDB key.
Future<String> resolveTtsCachePath(String key) async => key;

/// See the free-standing-helpers note in `book_file_io.dart`. Checks an
/// in-memory cache before IndexedDB, the same pattern [WebBookFileIO] uses
/// for book/cover bytes — repeat reads in the same session skip IndexedDB
/// entirely, and it's what makes this cache round-trip under `flutter
/// test`'s VM runner, which has no real IndexedDB for the persisted half.
Future<Uint8List?> readLocalFile(String path) async {
  final cached = _ttsBytesByKey[path];
  if (cached != null) return cached;

  final persisted = await _ttsCache().get(path);
  if (persisted != null) _ttsBytesByKey[path] = persisted;
  return persisted;
}

WebBookFileIO? _instance;

/// Memoized: production code calls `createBookFileIO()` ad hoc at many call
/// sites, each getting its own reference to whatever this returns. On
/// native that's harmless (`NativeBookFileIO` is stateless, delegating to
/// the real filesystem), but `WebBookFileIO` *is* the data — a fresh
/// instance per call would mean nothing stored ever survives to the next
/// `createBookFileIO()` call, defeating in-memory web persistence entirely
/// (the same bug class already caught and fixed for the entity stores).
/// Returning the same instance across calls keeps one in-memory file store
/// for the whole session.
BookFileIO createBookFileIO() => _instance ??= WebBookFileIO();
