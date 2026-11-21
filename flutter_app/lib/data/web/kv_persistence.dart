/// Platform-agnostic key-value persistence contract used by the web entity
/// and file stores so their data survives a page reload. [T] is the stored
/// value type: a JSON string for entity records, raw bytes for file blobs.
///
/// Production code depends only on this interface plus
/// `createJsonPersistence`/`createBytesPersistence` from
/// `kv_persistence_factory.dart`; it never names the concrete IndexedDB or
/// no-op implementation directly, so it compiles against whichever one the
/// conditional export resolves to (real IndexedDB in an actual web build,
/// a no-op stub under the VM test runner, which has no JS runtime for
/// `package:web`'s interop to call into).
abstract class KvPersistence<T> {
  /// All persisted values, in no particular order. The key each value was
  /// saved under isn't returned: every value already carries its own
  /// natural id (bookId, wordId, ...), and the key is only ever needed
  /// again to [save] or [delete] that same record.
  Future<List<T>> loadAll();

  /// A single record by the key it was [save]d under, or null if there is
  /// none. For callers that don't want [loadAll]'s eager-load-everything
  /// cost — large file blobs in particular.
  Future<T?> get(String key);

  Future<void> save(String key, T value);

  Future<void> delete(String key);
}
