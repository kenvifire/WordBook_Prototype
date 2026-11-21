import '../../models/word.dart';

export 'word_store_native.dart' if (dart.library.html) 'word_store_web.dart';

/// Platform-agnostic persistence contract for [Word]. Production code
/// depends only on this interface and on [createWordStore]; it never names
/// `NativeWordStore` or `WebWordStore` directly, so it compiles against
/// whichever implementation the conditional export below resolves to.
abstract class WordStore {
  Future<List<Word>> getByBook(String bookId, {bool sortByWord = false});

  /// userId == the given value. A null [userId] matches words whose
  /// `userId` field is itself null, mirroring Isar's
  /// `userIdEqualTo(null)` — not "no filter" and not "match nothing".
  Future<List<Word>> getByUser(String? userId);

  Future<List<Word>> getByIds(List<String> wordIds);

  Future<Word?> getByBookAndWord(String bookId, String word);

  /// nextReviewDate == null OR nextReviewDate < now — both conditions,
  /// matching today's `.group(...).or()`.
  Future<List<Word>> getDue(String bookId, DateTime now);

  Future<Word?> getById(String wordId);

  Future<int> count(String bookId, {WordStatus? status});

  Future<void> put(Word word);

  Future<void> putAll(List<Word> words);

  Future<void> deleteById(String wordId);

  Future<void> deleteByBook(String bookId);
}
