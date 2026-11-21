import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Supported languages for word definitions (native language)
class SupportedLanguage {
  final String code;
  final String name;
  final String nativeName;

  const SupportedLanguage({
    required this.code,
    required this.name,
    required this.nativeName,
  });

  static const List<SupportedLanguage> all = [
    SupportedLanguage(code: 'en', name: 'English', nativeName: 'English'),
    SupportedLanguage(code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文'),
    SupportedLanguage(code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文'),
    SupportedLanguage(code: 'es', name: 'Spanish', nativeName: 'Español'),
    SupportedLanguage(code: 'fr', name: 'French', nativeName: 'Français'),
    SupportedLanguage(code: 'de', name: 'German', nativeName: 'Deutsch'),
    SupportedLanguage(code: 'ja', name: 'Japanese', nativeName: '日本語'),
    SupportedLanguage(code: 'ko', name: 'Korean', nativeName: '한국어'),
    SupportedLanguage(code: 'pt', name: 'Portuguese', nativeName: 'Português'),
    SupportedLanguage(code: 'ru', name: 'Russian', nativeName: 'Русский'),
    SupportedLanguage(code: 'ar', name: 'Arabic', nativeName: 'العربية'),
    SupportedLanguage(code: 'hi', name: 'Hindi', nativeName: 'हिन्दी'),
    SupportedLanguage(code: 'it', name: 'Italian', nativeName: 'Italiano'),
    SupportedLanguage(code: 'nl', name: 'Dutch', nativeName: 'Nederlands'),
    SupportedLanguage(code: 'pl', name: 'Polish', nativeName: 'Polski'),
    SupportedLanguage(code: 'tr', name: 'Turkish', nativeName: 'Türkçe'),
    SupportedLanguage(code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt'),
    SupportedLanguage(code: 'th', name: 'Thai', nativeName: 'ไทย'),
    SupportedLanguage(code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia'),
    SupportedLanguage(code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu'),
  ];

  static SupportedLanguage fromCode(String code) {
    return all.firstWhere(
      (lang) => lang.code == code,
      orElse: () => all.first,
    );
  }
}

/// Supported languages for app UI (i18n)
class AppLanguage {
  final String code;
  final String name;
  final String nativeName;
  final Locale locale;

  const AppLanguage({
    required this.code,
    required this.name,
    required this.nativeName,
    required this.locale,
  });

  /// Languages supported by the app UI
  static const List<AppLanguage> supported = [
    AppLanguage(
      code: 'en',
      name: 'English',
      nativeName: 'English',
      locale: Locale('en'),
    ),
    AppLanguage(
      code: 'zh',
      name: 'Chinese (Simplified)',
      nativeName: '简体中文',
      locale: Locale('zh'),
    ),
    AppLanguage(
      code: 'zh-TW',
      name: 'Chinese (Traditional)',
      nativeName: '繁體中文',
      locale: Locale('zh', 'TW'),
    ),
    AppLanguage(
      code: 'es',
      name: 'Spanish',
      nativeName: 'Español',
      locale: Locale('es'),
    ),
    AppLanguage(
      code: 'ja',
      name: 'Japanese',
      nativeName: '日本語',
      locale: Locale('ja'),
    ),
    AppLanguage(
      code: 'ko',
      name: 'Korean',
      nativeName: '한국어',
      locale: Locale('ko'),
    ),
    AppLanguage(
      code: 'fr',
      name: 'French',
      nativeName: 'Français',
      locale: Locale('fr'),
    ),
  ];

  static AppLanguage fromCode(String code) {
    return supported.firstWhere(
      (lang) => lang.code == code,
      orElse: () => supported.first,
    );
  }

  static List<Locale> get supportedLocales =>
      supported.map((lang) => lang.locale).toList();
}

// ============================================================================
// Native Language (for word definitions)
// ============================================================================

/// Notifier for managing native language preference
class NativeLanguageNotifier extends StateNotifier<String> {
  static const String _prefsKey = 'nativeLanguage';

  NativeLanguageNotifier() : super('en') {
    _loadFromPrefs();
  }

  Future<void> _loadFromPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    final savedCode = prefs.getString(_prefsKey);
    if (savedCode != null) {
      state = savedCode;
    }
  }

  Future<void> setLanguage(String languageCode) async {
    state = languageCode;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, languageCode);
  }

  SupportedLanguage get currentLanguage => SupportedLanguage.fromCode(state);
}

/// Provider for native language code
final nativeLanguageProvider =
    StateNotifierProvider<NativeLanguageNotifier, String>((ref) {
  return NativeLanguageNotifier();
});

/// Provider for the full native language object
final nativeLanguageInfoProvider = Provider<SupportedLanguage>((ref) {
  final code = ref.watch(nativeLanguageProvider);
  return SupportedLanguage.fromCode(code);
});

// ============================================================================
// App Language (for UI i18n)
// ============================================================================

/// Notifier for managing app UI language preference
class AppLanguageNotifier extends StateNotifier<String?> {
  static const String _prefsKey = 'appLanguage';

  AppLanguageNotifier() : super(null) {
    _loadFromPrefs();
  }

  Future<void> _loadFromPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    final savedCode = prefs.getString(_prefsKey);
    state = savedCode; // null means system default
  }

  Future<void> setLanguage(String? languageCode) async {
    state = languageCode;
    final prefs = await SharedPreferences.getInstance();
    if (languageCode == null) {
      await prefs.remove(_prefsKey);
    } else {
      await prefs.setString(_prefsKey, languageCode);
    }
  }

  AppLanguage? get currentLanguage =>
      state != null ? AppLanguage.fromCode(state!) : null;

  Locale? get locale => currentLanguage?.locale;
}

/// Provider for app language code (null = system default)
final appLanguageProvider =
    StateNotifierProvider<AppLanguageNotifier, String?>((ref) {
  return AppLanguageNotifier();
});

/// Provider for app locale (null = follow system)
final appLocaleProvider = Provider<Locale?>((ref) {
  final code = ref.watch(appLanguageProvider);
  if (code == null) return null;
  return AppLanguage.fromCode(code).locale;
});

/// Provider for the full app language object (null = system default)
final appLanguageInfoProvider = Provider<AppLanguage?>((ref) {
  final code = ref.watch(appLanguageProvider);
  if (code == null) return null;
  return AppLanguage.fromCode(code);
});
