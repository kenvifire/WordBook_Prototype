import 'dart:typed_data';

import 'kv_persistence.dart';

/// No-op persistence: never actually reached in a real web build (see the
/// conditional import in `kv_persistence_factory.dart`). It exists so that
/// `flutter test`'s default VM runner — which has no JS runtime for
/// `package:web`'s interop to call into — can still compile and run the
/// web store files that depend on this factory, getting pure in-memory
/// (non-persisted) behavior identical to what those stores had before
/// IndexedDB persistence existed.
class NoopKvPersistence<T> implements KvPersistence<T> {
  @override
  Future<List<T>> loadAll() async => [];

  @override
  Future<T?> get(String key) async => null;

  @override
  Future<void> save(String key, T value) async {}

  @override
  Future<void> delete(String key) async {}
}

KvPersistence<String> createJsonPersistence(String storeName) =>
    NoopKvPersistence<String>();

KvPersistence<Uint8List> createBytesPersistence(String storeName) =>
    NoopKvPersistence<Uint8List>();
