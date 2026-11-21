import 'dart:convert';

import '../../models/statistics.dart';
import '../web/kv_persistence.dart';
import '../web/kv_persistence_factory.dart';
import 'statistics_store.dart';

Map<String, dynamic> _statsToMap(Statistics stat) => {
      'id': stat.id,
      'statisticsId': stat.statisticsId,
      'bookId': stat.bookId,
      'userId': stat.userId,
      'totalPages': stat.totalPages,
      'pagesRead': stat.pagesRead,
      'totalWords': stat.totalWords,
      'wordsLearned': stat.wordsLearned,
      'wordsMastered': stat.wordsMastered,
      'totalPracticeTime': stat.totalPracticeTime,
      'totalReadingTime': stat.totalReadingTime,
      'startedAt': stat.startedAt?.millisecondsSinceEpoch,
      'completedAt': stat.completedAt?.millisecondsSinceEpoch,
      'createdAt': stat.createdAt.millisecondsSinceEpoch,
      'updatedAt': stat.updatedAt.millisecondsSinceEpoch,
    };

DateTime? _dt(dynamic ms) =>
    ms == null ? null : DateTime.fromMillisecondsSinceEpoch(ms as int);

Statistics _statsFromMap(Map<String, dynamic> map) => Statistics()
  ..id = map['id'] as int
  ..statisticsId = map['statisticsId'] as String
  ..bookId = map['bookId'] as String
  ..userId = map['userId'] as String?
  ..totalPages = map['totalPages'] as int
  ..pagesRead = map['pagesRead'] as int
  ..totalWords = map['totalWords'] as int
  ..wordsLearned = map['wordsLearned'] as int
  ..wordsMastered = map['wordsMastered'] as int
  ..totalPracticeTime = map['totalPracticeTime'] as int
  ..totalReadingTime = map['totalReadingTime'] as int
  ..startedAt = _dt(map['startedAt'])
  ..completedAt = _dt(map['completedAt'])
  ..createdAt = DateTime.fromMillisecondsSinceEpoch(map['createdAt'] as int)
  ..updatedAt = DateTime.fromMillisecondsSinceEpoch(map['updatedAt'] as int);

/// [StatisticsStore] for web, persisted to IndexedDB (via [KvPersistence] —
/// a no-op stub under `flutter test`'s VM runner, which has no JS runtime
/// for IndexedDB to begin with). Keeps an in-memory list as the working
/// copy, hydrated from IndexedDB once per store instance and kept in sync
/// on every write.
class WebStatisticsStore implements StatisticsStore {
  WebStatisticsStore({KvPersistence<String>? persistence})
      : _persistence = persistence ?? createJsonPersistence('statistics');

  final KvPersistence<String> _persistence;
  final List<Statistics> _stats = [];
  int _nextId = 1;
  Future<void>? _hydration;

  Future<void> _ensureHydrated() => _hydration ??= _hydrate();

  Future<void> _hydrate() async {
    final stored = await _persistence.loadAll();
    var maxId = 0;
    for (final json in stored) {
      final stat = _statsFromMap(jsonDecode(json) as Map<String, dynamic>);
      _stats.add(stat);
      if (stat.id > maxId) maxId = stat.id;
    }
    _nextId = maxId + 1;
  }

  @override
  Future<List<Statistics>> getByUser(String userId) async {
    await _ensureHydrated();
    return _stats.where((s) => s.userId == userId).toList();
  }

  @override
  Future<void> put(Statistics stat) async {
    await _ensureHydrated();
    if (stat.id == 0) {
      stat.id = _nextId++;
      _stats.add(stat);
    } else {
      final index = _stats.indexWhere((s) => s.id == stat.id);
      if (index == -1) {
        _stats.add(stat);
      } else {
        _stats[index] = stat;
      }
    }
    await _persistence.save(stat.statisticsId, jsonEncode(_statsToMap(stat)));
  }
}

WebStatisticsStore? _instance;

/// Memoized: production code constructs `StatisticsRepository()` ad hoc at
/// many call sites, each holding its own `StatisticsStore` field. On
/// native that's harmless (`NativeStatisticsStore` is stateless, delegating
/// to the one real `DatabaseService.isar` singleton), but
/// `WebStatisticsStore` *is* the data — a fresh instance per call would
/// mean nothing written ever survives to the next `StatisticsRepository()`
/// call, defeating in-memory web persistence entirely. Returning the same
/// instance across calls keeps one in-memory store for the whole session.
StatisticsStore createStatisticsStore() => _instance ??= WebStatisticsStore();
