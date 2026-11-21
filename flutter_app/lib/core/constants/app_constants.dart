class AppConstants {
  static const String appName = 'WordBook';

  static const int defaultSectionPages = 10;
  static const double defaultRecognitionThreshold = 0.8;

  static const int maxBooksDisplay = 100;

  static const List<String> supportedEbookFormats = [
    'txt',
    'pdf',
    'epub',
    'mobi',
  ];

  static const String privacyPolicyUrl =
      'https://claude.ai/artifact/QG4LoZ4EkWjWoWkVrTHCGK#privacy';
  static const String termsOfServiceUrl =
      'https://claude.ai/artifact/QG4LoZ4EkWjWoWkVrTHCGK#terms';
}

class StorageKeys {
  static const String userTheme = 'user_theme';
  static const String fontSize = 'font_size';
  static const String fontFamily = 'font_family';
  static const String recognitionThreshold = 'recognition_threshold';
  static const String defaultSectionSize = 'default_section_size';
}

class FirestoreCollections {
  static const String users = 'users';
  static const String books = 'books';
  static const String words = 'words';
  static const String progress = 'progress';
  static const String statistics = 'statistics';
}
