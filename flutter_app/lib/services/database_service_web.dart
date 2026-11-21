/// Web [DatabaseService] implementation.
///
/// There is no native Isar database on web — each entity's web store
/// (`book_store_web.dart`, `word_store_web.dart`, etc.) keeps its own
/// in-memory data instead, so there is nothing to open or close here.
class DatabaseService {
  /// No-op on web: nothing to warm up.
  static Future<void> init() async {}

  Future<void> close() async {}
}
