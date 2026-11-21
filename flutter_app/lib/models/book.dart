class Book {
  int id = 0;

  late String bookId;

  late String title;

  String? author;

  String? coverUrl;

  late String format;

  late String localPath;

  int totalPages = 0;

  int currentPage = 0;

  late BookStatus status;

  DateTime? lastReadAt;

  DateTime createdAt = DateTime.now();

  DateTime updatedAt = DateTime.now();

  String? userId;

  String? language;

  /// Target language for word translations (e.g., 'en' for English).
  /// Set from user's native language when the book is added.
  /// Can be changed per-book without affecting vocabulary data.
  String? translationLanguage;
}

enum BookStatus {
  notStarted,
  reading,
  completed,
}
