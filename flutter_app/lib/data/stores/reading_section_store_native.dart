import 'package:isar/isar.dart';
import '../../models/reading_section.dart';
import '../../services/database_service.dart';
import '../isar/entities/reading_section_entity.dart';
import 'reading_section_store.dart';

/// Isar-backed [ReadingSectionStore] for native platforms (iOS/Android/
/// macOS/Windows/Linux). Wraps today's exact `isar.readingSections...`
/// calls, now operating on [ReadingSectionEntity], converting to/from the
/// plain [ReadingSection] domain model at the boundary.
class NativeReadingSectionStore implements ReadingSectionStore {
  @override
  Future<List<ReadingSection>> getByBook(String bookId) async {
    final isar = await DatabaseService.isar;
    final entities = await isar.readingSectionEntitys
        .filter()
        .bookIdEqualTo(bookId)
        .sortBySectionNumber()
        .findAll();
    return entities.map((e) => e.toDomain()).toList();
  }

  @override
  Future<List<ReadingSection>> getByUser(String userId) async {
    final isar = await DatabaseService.isar;
    final entities = await isar.readingSectionEntitys
        .filter()
        .userIdEqualTo(userId)
        .findAll();
    return entities.map((e) => e.toDomain()).toList();
  }

  @override
  Future<ReadingSection?> getBySectionId(String sectionId) async {
    final isar = await DatabaseService.isar;
    final entity = await isar.readingSectionEntitys
        .filter()
        .sectionIdEqualTo(sectionId)
        .findFirst();
    return entity?.toDomain();
  }

  @override
  Future<ReadingSection?> getByBookAndNumber(
      String bookId, int sectionNumber) async {
    final isar = await DatabaseService.isar;
    final entity = await isar.readingSectionEntitys
        .filter()
        .bookIdEqualTo(bookId)
        .sectionNumberEqualTo(sectionNumber)
        .findFirst();
    return entity?.toDomain();
  }

  @override
  Future<void> put(ReadingSection section) async {
    final isar = await DatabaseService.isar;
    final entity = ReadingSectionEntity.fromDomain(section);

    await isar.writeTxn(() async {
      final newId = await isar.readingSectionEntitys.put(entity);
      section.id = newId;
    });
  }

  @override
  Future<void> putAll(List<ReadingSection> sections) async {
    final isar = await DatabaseService.isar;
    final entities =
        sections.map((s) => ReadingSectionEntity.fromDomain(s)).toList();

    await isar.writeTxn(() async {
      final newIds = await isar.readingSectionEntitys.putAll(entities);
      for (var i = 0; i < sections.length; i++) {
        sections[i].id = newIds[i];
      }
    });
  }

  @override
  Future<void> deleteByBook(String bookId) async {
    final isar = await DatabaseService.isar;
    await isar.writeTxn(() async {
      await isar.readingSectionEntitys
          .filter()
          .bookIdEqualTo(bookId)
          .deleteAll();
    });
  }
}

ReadingSectionStore createReadingSectionStore() => NativeReadingSectionStore();
