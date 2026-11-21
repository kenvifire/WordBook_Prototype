import '../../models/reading_section.dart';

export 'reading_section_store_native.dart'
    if (dart.library.html) 'reading_section_store_web.dart';

/// Platform-agnostic persistence contract for [ReadingSection]. Production
/// code depends only on this interface and on [createReadingSectionStore];
/// it never names `NativeReadingSectionStore` or `WebReadingSectionStore`
/// directly, so it compiles against whichever implementation the
/// conditional export below resolves to.
abstract class ReadingSectionStore {
  /// Always sorted by sectionNumber, matching today's behavior in both
  /// branches.
  Future<List<ReadingSection>> getByBook(String bookId);

  Future<List<ReadingSection>> getByUser(String userId);

  Future<ReadingSection?> getBySectionId(String sectionId);

  Future<ReadingSection?> getByBookAndNumber(String bookId, int sectionNumber);

  /// Insert when section.id == 0 (assigns a fresh id), else overwrite the
  /// matching id. Does not touch `updatedAt` — callers are responsible for
  /// that.
  Future<void> put(ReadingSection section);

  Future<void> putAll(List<ReadingSection> sections);

  Future<void> deleteByBook(String bookId);
}
