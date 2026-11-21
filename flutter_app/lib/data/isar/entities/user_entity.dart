import 'package:isar/isar.dart';
import '../../../models/user.dart';

part 'user_entity.g.dart';

/// Native-only Isar persistence model for [User]. Mirrors every field of the
/// plain domain model plus the `@Index(unique: true)`/`@enumerated`
/// placement `User` used to have before Isar was stripped out of it.
///
/// This file must never be imported outside `user_store_native.dart`: Isar's
/// generated `*.g.dart` part contains 64-bit literals that dart2js cannot
/// compile, so merely importing an `@collection`-annotated model would drag
/// that into a web build.
@collection
@Name('User')
class UserEntity {
  Id id = Isar.autoIncrement;

  @Index(unique: true)
  late String userId;

  late String email;

  String? displayName;

  String? photoUrl;

  @enumerated
  late AuthProvider authProvider;

  String? nativeLanguage;

  String? learningLanguage;

  int defaultSectionSize = 75;

  @enumerated
  SectionType defaultSectionType = SectionType.pages;

  double vocabularyThreshold = 0.8;

  double defaultFontSize = 16.0;

  String defaultFontFamily = 'Inter';

  @enumerated
  late AppThemeMode themeMode;

  DateTime createdAt = DateTime.now();

  DateTime updatedAt = DateTime.now();

  User toDomain() => User()
    ..id = id
    ..userId = userId
    ..email = email
    ..displayName = displayName
    ..photoUrl = photoUrl
    ..authProvider = authProvider
    ..nativeLanguage = nativeLanguage
    ..learningLanguage = learningLanguage
    ..defaultSectionSize = defaultSectionSize
    ..defaultSectionType = defaultSectionType
    ..vocabularyThreshold = vocabularyThreshold
    ..defaultFontSize = defaultFontSize
    ..defaultFontFamily = defaultFontFamily
    ..themeMode = themeMode
    ..createdAt = createdAt
    ..updatedAt = updatedAt;

  static UserEntity fromDomain(User u) => UserEntity()
    ..id = u.id == 0 ? Isar.autoIncrement : u.id
    ..userId = u.userId
    ..email = u.email
    ..displayName = u.displayName
    ..photoUrl = u.photoUrl
    ..authProvider = u.authProvider
    ..nativeLanguage = u.nativeLanguage
    ..learningLanguage = u.learningLanguage
    ..defaultSectionSize = u.defaultSectionSize
    ..defaultSectionType = u.defaultSectionType
    ..vocabularyThreshold = u.vocabularyThreshold
    ..defaultFontSize = u.defaultFontSize
    ..defaultFontFamily = u.defaultFontFamily
    ..themeMode = u.themeMode
    ..createdAt = u.createdAt
    ..updatedAt = u.updatedAt;
}
