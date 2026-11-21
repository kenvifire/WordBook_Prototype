import 'dart:convert';

import '../../models/user.dart';
import '../web/kv_persistence.dart';
import '../web/kv_persistence_factory.dart';
import 'user_store.dart';

Map<String, dynamic> _userToMap(User user) => {
      'id': user.id,
      'userId': user.userId,
      'email': user.email,
      'displayName': user.displayName,
      'photoUrl': user.photoUrl,
      'authProvider': user.authProvider.name,
      'nativeLanguage': user.nativeLanguage,
      'learningLanguage': user.learningLanguage,
      'defaultSectionSize': user.defaultSectionSize,
      'defaultSectionType': user.defaultSectionType.name,
      'vocabularyThreshold': user.vocabularyThreshold,
      'defaultFontSize': user.defaultFontSize,
      'defaultFontFamily': user.defaultFontFamily,
      'themeMode': user.themeMode.name,
      'createdAt': user.createdAt.millisecondsSinceEpoch,
      'updatedAt': user.updatedAt.millisecondsSinceEpoch,
    };

User _userFromMap(Map<String, dynamic> map) => User()
  ..id = map['id'] as int
  ..userId = map['userId'] as String
  ..email = map['email'] as String
  ..displayName = map['displayName'] as String?
  ..photoUrl = map['photoUrl'] as String?
  ..authProvider = AuthProvider.values.byName(map['authProvider'] as String)
  ..nativeLanguage = map['nativeLanguage'] as String?
  ..learningLanguage = map['learningLanguage'] as String?
  ..defaultSectionSize = map['defaultSectionSize'] as int
  ..defaultSectionType =
      SectionType.values.byName(map['defaultSectionType'] as String)
  ..vocabularyThreshold = (map['vocabularyThreshold'] as num).toDouble()
  ..defaultFontSize = (map['defaultFontSize'] as num).toDouble()
  ..defaultFontFamily = map['defaultFontFamily'] as String
  ..themeMode = AppThemeMode.values.byName(map['themeMode'] as String)
  ..createdAt = DateTime.fromMillisecondsSinceEpoch(map['createdAt'] as int)
  ..updatedAt = DateTime.fromMillisecondsSinceEpoch(map['updatedAt'] as int);

/// [UserStore] for web, persisted to IndexedDB (via [KvPersistence] — a
/// no-op stub under `flutter test`'s VM runner, which has no JS runtime for
/// IndexedDB to begin with). Keeps an in-memory list as the working copy,
/// hydrated from IndexedDB once per store instance and kept in sync on
/// every write.
///
/// Note on uniqueness: the native `UserEntity.userId` index is
/// `@Index(unique: true)`. This store does not separately enforce that
/// uniqueness — every call site in this codebase that calls [put] already
/// obtained the [User] it is writing from [getById] (itself keyed by
/// `userId`), so there is no path today that could create two distinct
/// rows sharing the same `userId`. If a future call site starts
/// constructing brand-new [User] objects and saving them without first
/// looking one up by `userId`, this invariant should be revisited.
class WebUserStore implements UserStore {
  WebUserStore({KvPersistence<String>? persistence})
      : _persistence = persistence ?? createJsonPersistence('users');

  final KvPersistence<String> _persistence;
  final List<User> _users = [];
  int _nextId = 1;
  Future<void>? _hydration;

  Future<void> _ensureHydrated() => _hydration ??= _hydrate();

  Future<void> _hydrate() async {
    final stored = await _persistence.loadAll();
    var maxId = 0;
    for (final json in stored) {
      final user = _userFromMap(jsonDecode(json) as Map<String, dynamic>);
      _users.add(user);
      if (user.id > maxId) maxId = user.id;
    }
    _nextId = maxId + 1;
  }

  @override
  Future<User?> getById(String userId) async {
    await _ensureHydrated();
    for (final user in _users) {
      if (user.userId == userId) return user;
    }
    return null;
  }

  @override
  Future<void> put(User user) async {
    await _ensureHydrated();
    if (user.id == 0) {
      user.id = _nextId++;
      _users.add(user);
    } else {
      final index = _users.indexWhere((u) => u.id == user.id);
      if (index == -1) {
        _users.add(user);
      } else {
        _users[index] = user;
      }
    }
    await _persistence.save(user.userId, jsonEncode(_userToMap(user)));
  }

  @override
  Future<void> deleteById(String userId) async {
    await _ensureHydrated();
    _users.removeWhere((u) => u.userId == userId);
    await _persistence.delete(userId);
  }
}

WebUserStore? _instance;

/// Memoized: production code constructs `UserRepository()` ad hoc at many
/// call sites, each holding its own `UserStore` field. On native that's
/// harmless (`NativeUserStore` is stateless, delegating to the one real
/// `DatabaseService.isar` singleton), but `WebUserStore` *is* the data — a
/// fresh instance per call would mean nothing written ever survives to the
/// next `UserRepository()` call, defeating in-memory web persistence
/// entirely. Returning the same instance across calls keeps one in-memory
/// store for the whole session.
UserStore createUserStore() => _instance ??= WebUserStore();
