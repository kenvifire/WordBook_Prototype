import 'dart:async';
import 'dart:js_interop';
import 'dart:typed_data';

import 'package:web/web.dart' as web;

import 'kv_persistence.dart';

const String _dbName = 'wordbook';
const int _dbVersion = 2;

/// Every object store this app persists on web, created together the first
/// time the database is opened (or whenever `_dbVersion` is bumped). Keeping
/// them in one database/one upgrade transaction is simpler than one
/// database per entity and costs nothing — IndexedDB object stores are
/// cheap and independent of each other.
const List<String> _objectStoreNames = [
  'books',
  'words',
  'users',
  'reading_sections',
  'statistics',
  'files',
  'tts_cache',
];

Future<web.IDBDatabase>? _dbFuture;

/// Opens (or returns the already-open) shared IndexedDB database, creating
/// every object store in `_objectStoreNames` on first open. Memoized at the
/// module level — every [IndexedDbJsonPersistence]/[IndexedDbBytesPersistence]
/// instance, regardless of which object store it targets, shares the one
/// open connection rather than each opening its own.
Future<web.IDBDatabase> _openDatabase() {
  return _dbFuture ??= () {
    final completer = Completer<web.IDBDatabase>();
    final request = web.window.indexedDB.open(_dbName, _dbVersion);

    request.onupgradeneeded =
        (JSAny _) {
          final db = request.result as web.IDBDatabase;
          for (final name in _objectStoreNames) {
            if (!db.objectStoreNames.contains(name)) {
              db.createObjectStore(name);
            }
          }
        }.toJS;

    request.onsuccess =
        (JSAny _) {
          completer.complete(request.result as web.IDBDatabase);
        }.toJS;

    request.onerror =
        (JSAny _) {
          completer.completeError(
            Exception('Failed to open IndexedDB database "$_dbName"'),
          );
        }.toJS;

    return completer.future;
  }();
}

/// Wraps a single [web.IDBRequest] (get/getAll/put/delete — anything that
/// fires one success-or-error event) as a [Future].
Future<JSAny?> _await(web.IDBRequest request) {
  final completer = Completer<JSAny?>();

  request.onsuccess =
      (JSAny _) {
        completer.complete(request.result);
      }.toJS;

  request.onerror =
      (JSAny _) {
        completer.completeError(
          Exception('IndexedDB request failed: ${request.error?.message}'),
        );
      }.toJS;

  return completer.future;
}

web.IDBObjectStore _store(web.IDBDatabase db, String storeName, String mode) {
  final transaction = db.transaction(storeName.toJS, mode);
  return transaction.objectStore(storeName);
}

/// IndexedDB-backed [KvPersistence] for JSON-string entity records (books,
/// words, users, reading sections, statistics). Each record is stored
/// whole, as the JSON string the caller already serialized it to, under an
/// out-of-line key (the entity's own id) rather than a declared keyPath.
class IndexedDbJsonPersistence implements KvPersistence<String> {
  IndexedDbJsonPersistence(this.storeName);

  final String storeName;

  @override
  Future<List<String>> loadAll() async {
    final db = await _openDatabase();
    final request = _store(db, storeName, 'readonly').getAll();
    final result = await _await(request);
    final values = (result as JSArray<JSAny?>).toDart;
    return values.map((v) => (v as JSString).toDart).toList();
  }

  @override
  Future<String?> get(String key) async {
    final db = await _openDatabase();
    final result = await _await(
      _store(db, storeName, 'readonly').get(key.toJS),
    );
    return (result as JSString?)?.toDart;
  }

  @override
  Future<void> save(String key, String value) async {
    final db = await _openDatabase();
    await _await(_store(db, storeName, 'readwrite').put(value.toJS, key.toJS));
  }

  @override
  Future<void> delete(String key) async {
    final db = await _openDatabase();
    await _await(_store(db, storeName, 'readwrite').delete(key.toJS));
  }
}

/// IndexedDB-backed [KvPersistence] for raw file bytes (book bytes, cover
/// images), keyed the same way as [IndexedDbJsonPersistence].
class IndexedDbBytesPersistence implements KvPersistence<Uint8List> {
  IndexedDbBytesPersistence(this.storeName);

  final String storeName;

  @override
  Future<List<Uint8List>> loadAll() async {
    final db = await _openDatabase();
    final request = _store(db, storeName, 'readonly').getAll();
    final result = await _await(request);
    final values = (result as JSArray<JSAny?>).toDart;
    return values.map((v) => (v as JSUint8Array).toDart).toList();
  }

  @override
  Future<Uint8List?> get(String key) async {
    final db = await _openDatabase();
    final result = await _await(
      _store(db, storeName, 'readonly').get(key.toJS),
    );
    return (result as JSUint8Array?)?.toDart;
  }

  @override
  Future<void> save(String key, Uint8List value) async {
    final db = await _openDatabase();
    await _await(_store(db, storeName, 'readwrite').put(value.toJS, key.toJS));
  }

  @override
  Future<void> delete(String key) async {
    final db = await _openDatabase();
    await _await(_store(db, storeName, 'readwrite').delete(key.toJS));
  }
}

KvPersistence<String> createJsonPersistence(String storeName) =>
    IndexedDbJsonPersistence(storeName);

KvPersistence<Uint8List> createBytesPersistence(String storeName) =>
    IndexedDbBytesPersistence(storeName);
