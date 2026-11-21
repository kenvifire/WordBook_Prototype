import 'dart:convert';

import '../../models/word.dart';
import '../web/kv_persistence.dart';
import '../web/kv_persistence_factory.dart';
import 'word_store.dart';

Map<String, dynamic> _wordToMap(Word word) => {
      'id': word.id,
      'wordId': word.wordId,
      'word': word.word,
      'definition': word.definition,
      'translation': word.translation,
      'example': word.example,
      'bookId': word.bookId,
      'userId': word.userId,
      'language': word.language,
      'repetitions': word.repetitions,
      'easeFactor': word.easeFactor,
      'interval': word.interval,
      'nextReviewDate': word.nextReviewDate?.millisecondsSinceEpoch,
      'createdAt': word.createdAt.millisecondsSinceEpoch,
      'updatedAt': word.updatedAt.millisecondsSinceEpoch,
      'status': word.status.name,
      'extractionMethod': word.extractionMethod.name,
      'enriched': word.enriched,
      'audioPath': word.audioPath,
    };

Word _wordFromMap(Map<String, dynamic> map) => Word()
  ..id = map['id'] as int
  ..wordId = map['wordId'] as String
  ..word = map['word'] as String
  ..definition = map['definition'] as String?
  ..translation = map['translation'] as String?
  ..example = map['example'] as String?
  ..bookId = map['bookId'] as String
  ..userId = map['userId'] as String?
  ..language = map['language'] as String?
  ..repetitions = map['repetitions'] as int
  ..easeFactor = (map['easeFactor'] as num).toDouble()
  ..interval = map['interval'] as int
  ..nextReviewDate = map['nextReviewDate'] == null
      ? null
      : DateTime.fromMillisecondsSinceEpoch(map['nextReviewDate'] as int)
  ..createdAt = DateTime.fromMillisecondsSinceEpoch(map['createdAt'] as int)
  ..updatedAt = DateTime.fromMillisecondsSinceEpoch(map['updatedAt'] as int)
  ..status = WordStatus.values.byName(map['status'] as String)
  ..extractionMethod =
      ExtractionMethod.values.byName(map['extractionMethod'] as String)
  ..enriched = map['enriched'] as bool
  ..audioPath = map['audioPath'] as String?;

/// [WordStore] for web, persisted to IndexedDB (via [KvPersistence] — a
/// no-op stub under `flutter test`'s VM runner, which has no JS runtime for
/// IndexedDB to begin with). Keeps an in-memory list as the working copy
/// for synchronous-feeling filtering/sorting, hydrated from IndexedDB once
/// per store instance and kept in sync on every write.
class WebWordStore implements WordStore {
  WebWordStore({KvPersistence<String>? persistence})
      : _persistence = persistence ?? createJsonPersistence('words');

  final KvPersistence<String> _persistence;
  final List<Word> _words = [];
  int _nextId = 1;
  Future<void>? _hydration;

  Future<void> _ensureHydrated() => _hydration ??= _hydrate();

  Future<void> _hydrate() async {
    final stored = await _persistence.loadAll();
    var maxId = 0;
    for (final json in stored) {
      final word = _wordFromMap(jsonDecode(json) as Map<String, dynamic>);
      _words.add(word);
      if (word.id > maxId) maxId = word.id;
    }
    _nextId = maxId + 1;
  }

  @override
  Future<List<Word>> getByBook(String bookId, {bool sortByWord = false}) async {
    await _ensureHydrated();
    final filtered = _words.where((w) => w.bookId == bookId).toList();
    if (sortByWord) {
      filtered.sort((a, b) => a.word.compareTo(b.word));
    }
    return filtered;
  }

  @override
  Future<List<Word>> getByUser(String? userId) async {
    await _ensureHydrated();
    // `==` here already matches Isar's userIdEqualTo(null) semantics: when
    // userId is null, this matches words whose own userId is null too.
    return _words.where((w) => w.userId == userId).toList();
  }

  @override
  Future<List<Word>> getByIds(List<String> wordIds) async {
    await _ensureHydrated();
    final idSet = wordIds.toSet();
    return _words.where((w) => idSet.contains(w.wordId)).toList();
  }

  @override
  Future<Word?> getByBookAndWord(String bookId, String word) async {
    await _ensureHydrated();
    for (final w in _words) {
      if (w.bookId == bookId && w.word == word) return w;
    }
    return null;
  }

  @override
  Future<List<Word>> getDue(String bookId, DateTime now) async {
    await _ensureHydrated();
    return _words
        .where((w) =>
            w.bookId == bookId &&
            (w.nextReviewDate == null || w.nextReviewDate!.isBefore(now)))
        .toList();
  }

  @override
  Future<Word?> getById(String wordId) async {
    await _ensureHydrated();
    for (final w in _words) {
      if (w.wordId == wordId) return w;
    }
    return null;
  }

  @override
  Future<int> count(String bookId, {WordStatus? status}) async {
    await _ensureHydrated();
    return _words
        .where((w) =>
            w.bookId == bookId && (status == null || w.status == status))
        .length;
  }

  @override
  Future<void> put(Word word) async {
    await _ensureHydrated();
    if (word.id == 0) {
      word.id = _nextId++;
      _words.add(word);
    } else {
      final index = _words.indexWhere((w) => w.id == word.id);
      if (index == -1) {
        _words.add(word);
      } else {
        _words[index] = word;
      }
    }
    await _persistence.save(word.wordId, jsonEncode(_wordToMap(word)));
  }

  @override
  Future<void> putAll(List<Word> words) async {
    for (final word in words) {
      await put(word);
    }
  }

  @override
  Future<void> deleteById(String wordId) async {
    await _ensureHydrated();
    _words.removeWhere((w) => w.wordId == wordId);
    await _persistence.delete(wordId);
  }

  @override
  Future<void> deleteByBook(String bookId) async {
    await _ensureHydrated();
    final toDelete = _words.where((w) => w.bookId == bookId).toList();
    _words.removeWhere((w) => w.bookId == bookId);
    for (final word in toDelete) {
      await _persistence.delete(word.wordId);
    }
  }
}

WebWordStore? _instance;

/// Memoized: production code constructs `WordRepository()` ad hoc at many
/// call sites, each holding its own `WordStore` field. On native that's
/// harmless (`NativeWordStore` is stateless, delegating to the one real
/// `DatabaseService.isar` singleton), but `WebWordStore` *is* the data — a
/// fresh instance per call would mean nothing written ever survives to the
/// next `WordRepository()` call, defeating in-memory web persistence
/// entirely. Returning the same instance across calls keeps one in-memory
/// store for the whole session.
WordStore createWordStore() => _instance ??= WebWordStore();
