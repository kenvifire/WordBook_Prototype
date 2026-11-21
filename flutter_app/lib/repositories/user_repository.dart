import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/stores/user_store.dart';
import '../models/user.dart';

final userRepositoryProvider = Provider<UserRepository>((ref) => UserRepository());

class UserRepository {
  final UserStore _store = createUserStore();

  Future<User?> getUserById(String userId) async {
    return _store.getById(userId);
  }

  Future<void> saveUser(User user) async {
    user.updatedAt = DateTime.now();
    await _store.put(user);
  }

  Future<void> updateUserProfile({
    required String userId,
    String? displayName,
  }) async {
    final user = await getUserById(userId);

    if (user != null) {
      if (displayName != null) user.displayName = displayName;

      await saveUser(user);
    }
  }

  Future<void> updateUserPreferences({
    required String userId,
    double? fontSize,
    String? fontFamily,
    AppThemeMode? themeMode,
    double? vocabularyThreshold,
    int? defaultSectionSize,
    SectionType? defaultSectionType,
  }) async {
    final user = await getUserById(userId);

    if (user != null) {
      if (fontSize != null) user.defaultFontSize = fontSize;
      if (fontFamily != null) user.defaultFontFamily = fontFamily;
      if (themeMode != null) user.themeMode = themeMode;
      if (vocabularyThreshold != null) user.vocabularyThreshold = vocabularyThreshold;
      if (defaultSectionSize != null) user.defaultSectionSize = defaultSectionSize;
      if (defaultSectionType != null) user.defaultSectionType = defaultSectionType;

      await saveUser(user);
    }
  }

  Future<void> deleteUser(String userId) async {
    await _store.deleteById(userId);
  }
}
