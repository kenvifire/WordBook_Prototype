import '../../models/user.dart';

export 'user_store_native.dart' if (dart.library.html) 'user_store_web.dart';

/// Platform-agnostic persistence contract for [User]. Production code
/// depends only on this interface and on [createUserStore]; it never names
/// `NativeUserStore` or `WebUserStore` directly, so it compiles against
/// whichever implementation the conditional export below resolves to.
abstract class UserStore {
  Future<User?> getById(String userId);

  /// Insert when user.id == 0 (assigns a fresh id), else overwrite the
  /// matching id.
  Future<void> put(User user);

  Future<void> deleteById(String userId);
}
