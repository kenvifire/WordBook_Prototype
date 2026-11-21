import 'package:isar/isar.dart';
import '../../models/statistics.dart';
import '../../services/database_service.dart';
import '../isar/entities/statistics_entity.dart';
import 'statistics_store.dart';

/// Isar-backed [StatisticsStore] for native platforms (iOS/Android/macOS/
/// Windows/Linux). Wraps today's exact `isar.statistics...` calls, now
/// operating on [StatisticsEntity], converting to/from the plain
/// [Statistics] domain model at the boundary.
class NativeStatisticsStore implements StatisticsStore {
  @override
  Future<List<Statistics>> getByUser(String userId) async {
    final isar = await DatabaseService.isar;
    final entities = await isar.statisticsEntitys
        .filter()
        .userIdEqualTo(userId)
        .findAll();
    return entities.map((e) => e.toDomain()).toList();
  }

  @override
  Future<void> put(Statistics stat) async {
    final isar = await DatabaseService.isar;
    final entity = StatisticsEntity.fromDomain(stat);

    await isar.writeTxn(() async {
      final newId = await isar.statisticsEntitys.put(entity);
      stat.id = newId;
    });
  }
}

StatisticsStore createStatisticsStore() => NativeStatisticsStore();
