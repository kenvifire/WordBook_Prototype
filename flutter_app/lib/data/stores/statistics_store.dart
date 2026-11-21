import '../../models/statistics.dart';

export 'statistics_store_native.dart'
    if (dart.library.html) 'statistics_store_web.dart';

/// Platform-agnostic persistence contract for [Statistics]. Production
/// code depends only on this interface and on [createStatisticsStore]; it
/// never names `NativeStatisticsStore` or `WebStatisticsStore` directly, so
/// it compiles against whichever implementation the conditional export
/// below resolves to.
abstract class StatisticsStore {
  Future<List<Statistics>> getByUser(String userId);

  /// Insert when stat.id == 0 (assigns a fresh id), else overwrite the
  /// matching id. Does not touch `updatedAt` — callers are responsible for
  /// that.
  Future<void> put(Statistics stat);
}
