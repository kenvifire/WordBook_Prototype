import '../data/stores/reading_section_store.dart';
import '../models/reading_section.dart';

class ReadingSectionRepository {
  final ReadingSectionStore _store;

  /// [store] is an injectable seam for tests only — production call sites
  /// always use the no-arg constructor, which resolves to whichever
  /// [ReadingSectionStore] the platform's conditional export picks
  /// (`createReadingSectionStore()`). Tests pass a [WebReadingSectionStore]
  /// explicitly so the addSection/updateSection timestamp distinction can
  /// be verified without depending on which store a plain VM `flutter
  /// test` run happens to resolve to.
  ReadingSectionRepository([ReadingSectionStore? store])
      : _store = store ?? createReadingSectionStore();

  Future<List<ReadingSection>> getSectionsByBook(String bookId) async {
    return _store.getByBook(bookId);
  }

  Future<List<ReadingSection>> getSectionsByUser(String userId) async {
    return _store.getByUser(userId);
  }

  Future<ReadingSection?> getSectionById(String sectionId) async {
    return _store.getBySectionId(sectionId);
  }

  Future<ReadingSection?> getSectionByNumber(
      String bookId, int sectionNumber) async {
    return _store.getByBookAndNumber(bookId, sectionNumber);
  }

  /// Deletes all existing sections for the book, then inserts the new list
  /// (one transaction on native).
  Future<void> replaceSections(
      String bookId, List<ReadingSection> sections) async {
    await _store.deleteByBook(bookId);
    await _store.putAll(sections);
  }

  /// Raw put, no timestamp change — for a section that doesn't exist
  /// locally yet (e.g. downloaded from cloud sync), so its own `updatedAt`
  /// isn't stomped with `now()`.
  Future<void> addSection(ReadingSection section) async {
    await _store.put(section);
  }

  /// Bumps `updatedAt` then puts — for mutating a section that already
  /// exists locally.
  Future<void> updateSection(ReadingSection section) async {
    section.updatedAt = DateTime.now();
    await _store.put(section);
  }
}
