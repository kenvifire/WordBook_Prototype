import '../data/stores/statistics_store.dart';
import '../models/statistics.dart';

class StatisticsRepository {
  final StatisticsStore _store;

  /// [store] is an injectable seam for tests only — production call sites
  /// always use the no-arg constructor, which resolves to whichever
  /// [StatisticsStore] the platform's conditional export picks
  /// (`createStatisticsStore()`). Tests pass a [WebStatisticsStore]
  /// explicitly so the addStatistics/updateStatistics timestamp
  /// distinction can be verified without depending on which store a plain
  /// VM `flutter test` run happens to resolve to.
  StatisticsRepository([StatisticsStore? store])
      : _store = store ?? createStatisticsStore();

  Future<List<Statistics>> getStatisticsByUser(String userId) async {
    return _store.getByUser(userId);
  }

  /// Raw put, no timestamp change — for a record that doesn't exist
  /// locally yet (e.g. downloaded from cloud sync), so its own `updatedAt`
  /// isn't stomped with `now()`.
  Future<void> addStatistics(Statistics stat) async {
    await _store.put(stat);
  }

  /// Bumps `updatedAt` then puts — for mutating a record that already
  /// exists locally.
  Future<void> updateStatistics(Statistics stat) async {
    stat.updatedAt = DateTime.now();
    await _store.put(stat);
  }
}
