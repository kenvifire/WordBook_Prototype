/// Plain domain model for a user. Platform-specific persistence lives in
/// `lib/data/stores/user_store*.dart` and the Isar-only mirror in
/// `lib/data/isar/entities/user_entity.dart`; this file must stay free of
/// any Isar import so it can be compiled for web.
class User {
  int id = 0;

  late String userId;

  late String email;

  String? displayName;

  String? photoUrl;

  late AuthProvider authProvider;

  String? nativeLanguage;

  String? learningLanguage;

  int defaultSectionSize = 75;

  SectionType defaultSectionType = SectionType.pages;

  double vocabularyThreshold = 0.8;

  double defaultFontSize = 16.0;

  String defaultFontFamily = 'Inter';

  late AppThemeMode themeMode;

  DateTime createdAt = DateTime.now();

  DateTime updatedAt = DateTime.now();
}

enum AuthProvider {
  email,
  google,
  facebook,
  apple,
}

enum SectionType {
  pages,
  chapters,
}

enum AppThemeMode {
  light,
  dark,
  system,
}
