import 'package:flutter_test/flutter_test.dart';
import 'package:wordbook/data/stores/user_store_web.dart';
import 'package:wordbook/models/user.dart';

void main() {
  group('WebUserStore', () {
    test('put assigns a fresh id for id==0, overwrites for an existing id',
        () async {
      final store = WebUserStore();
      final a = User()
        ..userId = 'u1'
        ..email = 'a@example.com'
        ..authProvider = AuthProvider.email
        ..themeMode = AppThemeMode.system;
      await store.put(a);
      expect(a.id, isNot(0));
      final fetchedId = a.id;

      a.displayName = 'changed';
      await store.put(a);

      final fetched = await store.getById('u1');
      expect(fetched, isNotNull);
      expect(fetched!.id, fetchedId);
      expect(fetched.displayName, 'changed');
    });

    test('put-then-get round-trips correctly', () async {
      final store = WebUserStore();
      final user = User()
        ..userId = 'u2'
        ..email = 'b@example.com'
        ..displayName = 'Bea'
        ..authProvider = AuthProvider.google
        ..nativeLanguage = 'en'
        ..learningLanguage = 'fr'
        ..themeMode = AppThemeMode.dark;

      await store.put(user);

      final fetched = await store.getById('u2');
      expect(fetched, isNotNull);
      expect(fetched!.userId, 'u2');
      expect(fetched.email, 'b@example.com');
      expect(fetched.displayName, 'Bea');
      expect(fetched.authProvider, AuthProvider.google);
      expect(fetched.nativeLanguage, 'en');
      expect(fetched.learningLanguage, 'fr');
      expect(fetched.themeMode, AppThemeMode.dark);
    });

    test('getById returns null when no user matches', () async {
      final store = WebUserStore();
      expect(await store.getById('missing'), isNull);
    });

    test('deleteById removes only the matching user', () async {
      final store = WebUserStore();
      final a = User()
        ..userId = 'u3'
        ..email = 'c@example.com'
        ..authProvider = AuthProvider.email
        ..themeMode = AppThemeMode.light;
      final b = User()
        ..userId = 'u4'
        ..email = 'd@example.com'
        ..authProvider = AuthProvider.email
        ..themeMode = AppThemeMode.light;
      await store.put(a);
      await store.put(b);

      await store.deleteById('u3');

      expect(await store.getById('u3'), isNull);
      expect(await store.getById('u4'), isNotNull);
    });
  });

  group('createUserStore', () {
    test(
        'returns the same in-memory store across calls, so a user put '
        'through one reference is visible through another (regression: '
        'UserRepository constructs ad hoc at every call site — a '
        'non-memoized factory would mean nothing written ever survives to '
        'the next call)', () async {
      final first = createUserStore();
      final second = createUserStore();

      final user = User()
        ..userId = 'shared'
        ..email = 'shared@example.com'
        ..authProvider = AuthProvider.email
        ..themeMode = AppThemeMode.system;
      await first.put(user);

      expect(await second.getById('shared'), isNotNull);
    });
  });
}
