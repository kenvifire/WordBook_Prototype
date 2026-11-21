import 'package:flutter_test/flutter_test.dart';
import 'package:wordbook/data/stores/statistics_store_web.dart';
import 'package:wordbook/models/statistics.dart';
import 'package:wordbook/repositories/statistics_repository.dart';

Statistics _stat({
  required String statisticsId,
  required String bookId,
  String? userId,
}) {
  return Statistics()
    ..statisticsId = statisticsId
    ..bookId = bookId
    ..userId = userId
    ..totalPages = 100
    ..pagesRead = 10
    ..totalWords = 50
    ..wordsLearned = 5;
}

void main() {
  group('WebStatisticsStore', () {
    test('put assigns a fresh id for id==0, overwrites for an existing id',
        () async {
      final store = WebStatisticsStore();
      final a = _stat(statisticsId: 's1', bookId: 'b1', userId: 'u1');
      await store.put(a);
      expect(a.id, isNot(0));
      final fetchedId = a.id;

      a.pagesRead = 20;
      await store.put(a);

      final fetched = await store.getByUser('u1');
      expect(fetched.length, 1);
      expect(fetched.first.id, fetchedId);
      expect(fetched.first.pagesRead, 20);
    });

    test('getByUser returns only statistics for that user', () async {
      final store = WebStatisticsStore();
      await store.put(_stat(statisticsId: 's1', bookId: 'b1', userId: 'u1'));
      await store.put(_stat(statisticsId: 's2', bookId: 'b1', userId: 'u2'));

      final stats = await store.getByUser('u1');

      expect(stats.length, 1);
      expect(stats.first.statisticsId, 's1');
    });

    test('getByUser excludes records with a null userId (no sentinel coercion)',
        () async {
      final store = WebStatisticsStore();
      await store.put(_stat(statisticsId: 's1', bookId: 'b1', userId: null));
      await store.put(_stat(statisticsId: 's2', bookId: 'b1', userId: 'u1'));

      final stats = await store.getByUser('u1');

      expect(stats.length, 1);
      expect(stats.first.statisticsId, 's2');
    });
  });

  group('createStatisticsStore', () {
    test(
        'returns the same in-memory store across calls, so a record put '
        'through one reference is visible through another (regression: '
        'StatisticsRepository constructs ad hoc at every call site — a '
        'non-memoized factory would mean nothing written ever survives to '
        'the next call)', () async {
      final first = createStatisticsStore();
      final second = createStatisticsStore();

      final stat = _stat(statisticsId: 'shared', bookId: 'b1', userId: 'u1');
      await first.put(stat);

      final fromSecond = await second.getByUser('u1');
      expect(fromSecond.any((s) => s.statisticsId == 'shared'), isTrue);
    });
  });

  group('StatisticsRepository addStatistics vs updateStatistics', () {
    test(
        'addStatistics does a raw put and does NOT bump updatedAt — the '
        'cloud-sync "brand-new statistics from cloud" case relies on the '
        "cloud's own updatedAt surviving, not being stomped with now()",
        () async {
      final repo = StatisticsRepository(WebStatisticsStore());
      final originalUpdatedAt = DateTime(2020, 1, 1);
      final stat = _stat(statisticsId: 'add-1', bookId: 'b1', userId: 'u1')
        ..updatedAt = originalUpdatedAt;

      await repo.addStatistics(stat);

      final fetched = await repo.getStatisticsByUser('u1');
      expect(fetched.length, 1);
      expect(fetched.first.updatedAt, originalUpdatedAt);
    });

    test(
        'updateStatistics bumps updatedAt to now before putting — for '
        'mutating a record that already exists locally', () async {
      final repo = StatisticsRepository(WebStatisticsStore());
      final staleUpdatedAt = DateTime(2020, 1, 1);
      final stat = _stat(statisticsId: 'update-1', bookId: 'b1', userId: 'u1')
        ..updatedAt = staleUpdatedAt;

      // Seed it first via addStatistics (as if it already existed locally).
      await repo.addStatistics(stat);

      final before = DateTime.now();
      await repo.updateStatistics(stat);
      final after = DateTime.now();

      expect(stat.updatedAt, isNot(staleUpdatedAt));
      expect(
        stat.updatedAt.isAfter(before.subtract(const Duration(seconds: 1))),
        isTrue,
      );
      expect(
        stat.updatedAt.isBefore(after.add(const Duration(seconds: 1))),
        isTrue,
      );

      final fetched = await repo.getStatisticsByUser('u1');
      expect(fetched.first.updatedAt, stat.updatedAt);
    });
  });
}
