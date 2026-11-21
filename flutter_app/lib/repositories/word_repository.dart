import 'package:uuid/uuid.dart';
import '../data/stores/word_store.dart';
import '../models/word.dart';

class WordRepository {
  final Uuid _uuid = const Uuid();
  final WordStore _store = createWordStore();

  Future<List<Word>> getWordsByBook(String bookId, {bool sortByWord = false}) async {
    return _store.getByBook(bookId, sortByWord: sortByWord);
  }

  /// A null [userId] matches words whose own `userId` is null, mirroring
  /// the original Isar `userIdEqualTo(null)` behavior rather than matching
  /// nothing.
  Future<List<Word>> getWordsByUser(String? userId) async {
    return _store.getByUser(userId);
  }

  Future<List<Word>> getWordsByIds(List<String> wordIds) async {
    return _store.getByIds(wordIds);
  }

  Future<Word?> getWordByBookAndText(String bookId, String word) async {
    return _store.getByBookAndWord(bookId, word);
  }

  Future<List<Word>> getDueWords(String bookId) async {
    return _store.getDue(bookId, DateTime.now());
  }

  Future<Word?> getWordById(String wordId) async {
    return _store.getById(wordId);
  }

  Future<void> addWord(Word word) async {
    if (word.wordId.isEmpty) {
      word.wordId = _uuid.v4();
    }

    await _store.put(word);
  }

  Future<void> updateWord(Word word) async {
    word.updatedAt = DateTime.now();
    await _store.put(word);
  }

  Future<void> deleteWord(String wordId) async {
    await _store.deleteById(wordId);
  }

  Future<void> deleteWordsByBook(String bookId) async {
    await _store.deleteByBook(bookId);
  }

  Future<int> getWordCount(String bookId, WordStatus? status) async {
    return _store.count(bookId, status: status);
  }

  Future<void> batchAddWords(List<Word> words) async {
    for (var word in words) {
      if (word.wordId.isEmpty) {
        word.wordId = _uuid.v4();
      }
    }
    await _store.putAll(words);
  }
}
