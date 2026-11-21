import 'package:isar/isar.dart';
import '../../models/user.dart';
import '../../services/database_service.dart';
import '../isar/entities/user_entity.dart';
import 'user_store.dart';

/// Isar-backed [UserStore] for native platforms (iOS/Android/macOS/Windows/
/// Linux). Wraps today's exact `isar.users...` calls, now operating on
/// [UserEntity], converting to/from the plain [User] domain model at the
/// boundary.
class NativeUserStore implements UserStore {
  @override
  Future<User?> getById(String userId) async {
    final isar = await DatabaseService.isar;
    final entity =
        await isar.userEntitys.filter().userIdEqualTo(userId).findFirst();
    return entity?.toDomain();
  }

  @override
  Future<void> put(User user) async {
    final isar = await DatabaseService.isar;
    final entity = UserEntity.fromDomain(user);

    await isar.writeTxn(() async {
      final newId = await isar.userEntitys.put(entity);
      user.id = newId;
    });
  }

  @override
  Future<void> deleteById(String userId) async {
    final isar = await DatabaseService.isar;
    final entity =
        await isar.userEntitys.filter().userIdEqualTo(userId).findFirst();

    if (entity != null) {
      await isar.writeTxn(() async {
        await isar.userEntitys.delete(entity.id);
      });
    }
  }
}

UserStore createUserStore() => NativeUserStore();
