import 'package:isar/isar.dart';
import '../../models/word.dart';
import '../../services/database_service.dart';
import '../isar/entities/word_entity.dart';
import 'word_store.dart';

/// Isar-backed [WordStore] for native platforms (iOS/Android/macOS/Windows/
/// Linux). Wraps today's exact `isar.words...` calls, now operating on
/// [WordEntity], converting to/from the plain [Word] domain model at the
/// boundary.
class NativeWordStore implements WordStore {
  @override
  Future<List<Word>> getByBook(String bookId, {bool sortByWord = false}) async {
    final isar = await DatabaseService.isar;

    final entities = sortByWord
        ? await isar.wordEntitys
            .filter()
            .bookIdEqualTo(bookId)
            .sortByWord()
            .findAll()
        : await isar.wordEntitys.filter().bookIdEqualTo(bookId).findAll();

    return entities.map((e) => e.toDomain()).toList();
  }

  @override
  Future<List<Word>> getByUser(String? userId) async {
    final isar = await DatabaseService.isar;
    // userIdEqualTo(null) matches rows whose userId column is itself null,
    // same as this used to do inline as isar.words.filter().userIdEqualTo(...).
    final entities =
        await isar.wordEntitys.filter().userIdEqualTo(userId).findAll();
    return entities.map((e) => e.toDomain()).toList();
  }

  @override
  Future<List<Word>> getByIds(List<String> wordIds) async {
    final isar = await DatabaseService.isar;
    final entities = await isar.wordEntitys
        .filter()
        .anyOf(wordIds, (q, wordId) => q.wordIdEqualTo(wordId))
        .findAll();
    return entities.map((e) => e.toDomain()).toList();
  }

  @override
  Future<Word?> getByBookAndWord(String bookId, String word) async {
    final isar = await DatabaseService.isar;
    final entity = await isar.wordEntitys
        .filter()
        .bookIdEqualTo(bookId)
        .wordEqualTo(word)
        .findFirst();
    return entity?.toDomain();
  }

  @override
  Future<List<Word>> getDue(String bookId, DateTime now) async {
    final isar = await DatabaseService.isar;
    final entities = await isar.wordEntitys
        .filter()
        .bookIdEqualTo(bookId)
        .group((q) => q.nextReviewDateIsNull().or().nextReviewDateLessThan(now))
        .findAll();
    return entities.map((e) => e.toDomain()).toList();
  }

  @override
  Future<Word?> getById(String wordId) async {
    final isar = await DatabaseService.isar;
    final entity =
        await isar.wordEntitys.filter().wordIdEqualTo(wordId).findFirst();
    return entity?.toDomain();
  }

  @override
  Future<int> count(String bookId, {WordStatus? status}) async {
    final isar = await DatabaseService.isar;

    if (status != null) {
      return await isar.wordEntitys
          .filter()
          .bookIdEqualTo(bookId)
          .statusEqualTo(status)
          .count();
    }

    return await isar.wordEntitys.filter().bookIdEqualTo(bookId).count();
  }

  @override
  Future<void> put(Word word) async {
    final isar = await DatabaseService.isar;
    final entity = WordEntity.fromDomain(word);

    await isar.writeTxn(() async {
      final newId = await isar.wordEntitys.put(entity);
      word.id = newId;
    });
  }

  @override
  Future<void> putAll(List<Word> words) async {
    final isar = await DatabaseService.isar;
    final entities = words.map((w) => WordEntity.fromDomain(w)).toList();

    await isar.writeTxn(() async {
      final newIds = await isar.wordEntitys.putAll(entities);
      for (var i = 0; i < words.length; i++) {
        words[i].id = newIds[i];
      }
    });
  }

  @override
  Future<void> deleteById(String wordId) async {
    final isar = await DatabaseService.isar;
    await isar.writeTxn(() async {
      await isar.wordEntitys.filter().wordIdEqualTo(wordId).deleteFirst();
    });
  }

  @override
  Future<void> deleteByBook(String bookId) async {
    final isar = await DatabaseService.isar;
    await isar.writeTxn(() async {
      await isar.wordEntitys.filter().bookIdEqualTo(bookId).deleteAll();
    });
  }
}

WordStore createWordStore() => NativeWordStore();
