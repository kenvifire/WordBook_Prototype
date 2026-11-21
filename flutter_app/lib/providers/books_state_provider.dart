import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import 'package:path/path.dart' as path;
import 'package:uuid/uuid.dart';
import '../data/file_io/book_file_io.dart';
import '../models/book.dart';
import '../services/book/book_service.dart';
import '../services/book_generation/book_generation_service.dart';
import '../services/vocabulary/vocabulary_knowledge_service.dart';
import '../services/vocabulary/word_extraction_service.dart';
import '../services/cover_extraction_service.dart';
import 'auth_provider.dart';
import 'book_provider.dart';
import 'language_provider.dart';

final booksStateProvider = StateNotifierProvider<BooksStateNotifier, BooksState>((ref) {
  return BooksStateNotifier(ref);
});

class BooksStateNotifier extends StateNotifier<BooksState> {
  final Ref ref;
  final Uuid _uuid = const Uuid();
  bool _cancelUploadRequested = false;

  BooksStateNotifier(this.ref) : super(BooksState.initial()) {
    loadBooks();
  }

  /// Requests that an in-progress uploadBook() stop at its next checkpoint.
  void cancelUpload() {
    _cancelUploadRequested = true;
  }

  /// Checked between the expensive steps of uploadBook(). If a cancel was
  /// requested, cleans up anything created so far and resets upload state.
  /// Returns true if the caller should stop.
  Future<bool> _bailIfUploadCancelled({Book? addedBook, String? localFilePath}) async {
    if (!_cancelUploadRequested) return false;

    if (addedBook != null) {
      await ref.read(bookRepositoryProvider).deleteBook(addedBook.bookId);
    }
    if (localFilePath != null) {
      await createBookFileIO().deleteByReference(localFilePath);
    }

    _cancelUploadRequested = false;
    state = state.copyWith(isUploading: false);
    return true;
  }

  Future<void> loadBooks() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final user = ref.read(currentUserProvider);
      final repository = ref.read(bookRepositoryProvider);
      final books = await repository.getAllBooks(userId: user?.uid);

      state = state.copyWith(
        books: books,
        isLoading: false,
        viewMode: state.viewMode,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> uploadBook() async {
    _cancelUploadRequested = false;
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['txt', 'pdf', 'epub', 'mobi'],
      );

      if (result == null || result.files.isEmpty) {
        return;
      }

      final file = result.files.first;

      // On web, PlatformFile.path's getter throws (not just returns null)
      // whenever it's accessed at all, so `file.path` itself can never be
      // touched on web — not even for a null check. Resolve it once, up
      // front, guarded by kIsWeb, and use this local everywhere below.
      final filePath = kIsWeb ? null : file.path;

      if (filePath == null && file.bytes == null) {
        state = state.copyWith(error: 'Could not access file');
        return;
      }

      state = state.copyWith(isUploading: true, error: null);

      final bookService = ref.read(bookServiceProvider);

      // On web, file_picker never gives a real path — only bytes — so the
      // extension has to come from the picked file's name instead of a
      // path. Native keeps using the real path exactly as before.
      final extension = filePath != null
          ? path.extension(filePath).substring(1)
          : path.extension(file.name).substring(1);

      final bookContent = filePath != null
          ? await bookService.parseBook(filePath)
          : await bookService.parseBookBytes(
              file.bytes!,
              extension,
              path.basenameWithoutExtension(file.name),
            );

      if (await _bailIfUploadCancelled()) return;

      final fileName = filePath != null ? path.basename(filePath) : file.name;

      final book = await _ingestBook(
        content: bookContent,
        extension: extension,
        bytes: file.bytes ?? Uint8List(0),
        fileName: fileName,
        sourcePath: filePath,
        onError: (msg) => state = state.copyWith(isUploading: false, error: msg),
      );
      if (book == null) return;

      state = state.copyWith(isUploading: false);
    } catch (e) {
      state = state.copyWith(
        isUploading: false,
        error: 'Failed to upload book: ${e.toString()}',
      );
    }
  }

  /// Shared tail for both [uploadBook] and [generateBook]: once the raw
  /// bytes and parsed [BookContent] are in hand, both flows do the exact
  /// same thing with them — duplicate check, file storage, Book creation,
  /// language detection (unless [knownLanguage] is already known, as it is
  /// for a generated book), cover extraction, and background vocabulary
  /// extraction. Returns the created [Book], or null if it was a duplicate
  /// (reported via [onError]) or the upload was cancelled mid-flight
  /// (silently — [_bailIfUploadCancelled] already updates state itself).
  ///
  /// [checkCancellation] is false for [generateBook]: unlike an upload, a
  /// generation request has no user-facing "cancel" affordance and is
  /// expected to keep running in the background even if the user
  /// navigates away, so it must never be aborted by a stray
  /// `_cancelUploadRequested` left over from an unrelated upload.
  Future<Book?> _ingestBook({
    required BookContent content,
    required String extension,
    required Uint8List bytes,
    required String fileName,
    String? sourcePath,
    String? knownLanguage,
    bool checkCancellation = true,
    required void Function(String message) onError,
  }) async {
    final user = ref.read(currentUserProvider);
    final repository = ref.read(bookRepositoryProvider);

    // Check for duplicate book (same title and author for same user)
    final existingBooks = await repository.getAllBooks(userId: user?.uid);
    final isDuplicate = existingBooks.any((existing) =>
        existing.title.toLowerCase() == content.title.toLowerCase() &&
        (existing.author?.toLowerCase() ?? '') == (content.author?.toLowerCase() ?? ''));

    if (isDuplicate) {
      onError('This book already exists in your library: "${content.title}"');
      return null;
    }

    // Generated upfront so it can be used as the BookFileIO key below,
    // before the Book itself is persisted (BookRepository.addBook would
    // otherwise be the one to assign it, but only after the file is
    // already stored).
    final bookId = _uuid.v4();
    final localPath = await createBookFileIO().store(
      bookId,
      fileName,
      bytes,
      sourcePath: sourcePath,
    );

    if (checkCancellation && await _bailIfUploadCancelled(localFilePath: localPath)) {
      return null;
    }

    // Inherit translation language from user's native language setting
    final nativeLanguage = ref.read(nativeLanguageProvider);

    final book = Book()
      ..bookId = bookId
      ..title = content.title
      ..author = content.author
      ..format = extension
      ..localPath = localPath
      ..totalPages = content.totalPages
      ..currentPage = 0
      ..status = BookStatus.notStarted
      ..userId = user?.uid
      ..translationLanguage = nativeLanguage;

    await repository.addBook(book);

    if (checkCancellation &&
        await _bailIfUploadCancelled(addedBook: book, localFilePath: localPath)) {
      return null;
    }

    if (knownLanguage != null) {
      book.language = knownLanguage;
    } else {
      // Detect and set book language
      final extractionService = WordExtractionService();
      book.language = await extractionService.detectBookLanguage(book);
    }

    // Extract cover image if available
    final coverService = CoverExtractionService();
    final coverPath = await coverService.extractCover(localPath, book.bookId);
    if (coverPath != null) {
      book.coverUrl = coverPath;
      debugPrint('Cover extracted: $coverPath');
    }

    if (checkCancellation &&
        await _bailIfUploadCancelled(addedBook: book, localFilePath: localPath)) {
      return null;
    }

    await repository.updateBook(book);

    await loadBooks();

    // Extract vocabulary in the background
    _extractVocabularyInBackground(book);

    return book;
  }

  /// Generates a book via AI (see BookGenerationService) and ingests it
  /// exactly like an uploaded .txt file. Survives the user navigating
  /// away: this notifier is a plain, non-autoDispose provider, so the
  /// request and ingestion keep running regardless of what screen is
  /// active when they finish.
  Future<void> generateBook({
    required String language,
    required String level,
    required String topic,
    required int wordCount,
    required int newWordPercentage,
  }) async {
    state = state.copyWith(isGenerating: true, generationError: null);
    try {
      final user = ref.read(currentUserProvider);
      final knownWords = await VocabularyKnowledgeService()
          .knownWordsForLanguage(user?.uid, language);

      final request = BookGenerationRequest(
        language: language,
        level: level,
        topic: topic,
        wordCount: wordCount,
        newWordPercentage: newWordPercentage,
        knownWords: knownWords,
      );

      final text = await BookGenerationService().generate(request);

      // Timestamped so two generations on the same topic never collide
      // with the duplicate-title check in _ingestBook.
      final title = '$topic ($level, ${DateTime.now().millisecondsSinceEpoch})';
      final bytes = Uint8List.fromList(utf8.encode(text));
      final content = await ref
          .read(bookServiceProvider)
          .parseBookBytes(bytes, '.txt', title);

      final book = await _ingestBook(
        content: content,
        extension: 'txt',
        bytes: bytes,
        fileName: '$title.txt',
        knownLanguage: language,
        checkCancellation: false,
        onError: (msg) =>
            state = state.copyWith(isGenerating: false, generationError: msg),
      );
      if (book == null) return;

      state = state.copyWith(isGenerating: false);
    } on BookGenerationException catch (e) {
      state = state.copyWith(isGenerating: false, generationError: e.message);
    } catch (e) {
      state = state.copyWith(
        isGenerating: false,
        generationError: 'Failed to generate book: ${e.toString()}',
      );
    }
  }

  Future<void> _extractVocabularyInBackground(Book book) async {
    try {
      state = state.copyWith(
        isExtracting: true,
        extractionProgress: 0.0,
        extractingBookId: book.bookId,
      );

      final extractionService = WordExtractionService();

      // Extract words from book (skip enrichment for speed)
      // Enrichment will happen lazily when user views words
      state = state.copyWith(extractionProgress: 0.1);

      final words = await extractionService.extractWordsFromBook(book);

      state = state.copyWith(extractionProgress: 0.9);

      // Log extraction result
      debugPrint('Extraction complete: ${words.length} words extracted from ${book.title}');

      state = state.copyWith(
        isExtracting: false,
        extractionProgress: 1.0,
        clearExtractingBookId: true,
      );
    } catch (e) {
      debugPrint('Extraction error: $e');
      state = state.copyWith(
        isExtracting: false,
        extractionProgress: 0.0,
        clearExtractingBookId: true,
      );
    }
  }

  Future<void> extractVocabularyForBook(String bookId) async {
    try {
      final repository = ref.read(bookRepositoryProvider);
      final book = await repository.getBookById(bookId);

      if (book != null) {
        await _extractVocabularyInBackground(book);
      }
    } catch (e) {
      state = state.copyWith(
        error: 'Failed to extract vocabulary: ${e.toString()}',
      );
    }
  }

  /// Update book language and re-extract vocabulary
  Future<void> updateBookLanguage(String bookId, String newLanguage) async {
    try {
      state = state.copyWith(isLoading: true, error: null);

      final repository = ref.read(bookRepositoryProvider);
      final book = await repository.getBookById(bookId);

      if (book != null) {
        // Update book language
        book.language = newLanguage;
        await repository.updateBook(book);

        // Delete existing words and re-extract
        final extractionService = WordExtractionService();
        await extractionService.deleteWordsForBook(bookId);

        await loadBooks();

        // Re-extract vocabulary in the background
        _extractVocabularyInBackground(book);
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to update book language: ${e.toString()}',
      );
    }
  }

  /// Detect and set book language
  Future<String> detectAndSetBookLanguage(String bookId) async {
    try {
      final repository = ref.read(bookRepositoryProvider);
      final book = await repository.getBookById(bookId);

      if (book != null) {
        final extractionService = WordExtractionService();
        final detectedLanguage = await extractionService.detectBookLanguage(book);

        // Update book with detected language
        book.language = detectedLanguage;
        await repository.updateBook(book);
        await loadBooks();

        return detectedLanguage;
      }

      return 'en';
    } catch (e) {
      return 'en';
    }
  }

  Future<void> deleteBook(String bookId) async {
    try {
      state = state.copyWith(isLoading: true, error: null);

      final repository = ref.read(bookRepositoryProvider);
      final book = await repository.getBookById(bookId);

      if (book != null) {
        await createBookFileIO().deleteByReference(book.localPath);

        // Delete cover if exists
        if (book.coverUrl != null) {
          final coverService = CoverExtractionService();
          await coverService.deleteCover(book.coverUrl);
        }

        await repository.deleteBook(bookId);
        await loadBooks();
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to delete book: ${e.toString()}',
      );
    }
  }

  void toggleViewMode() {
    state = state.copyWith(
      viewMode: state.viewMode == ViewMode.grid ? ViewMode.list : ViewMode.grid,
    );
  }

  void clearError() {
    state = state.copyWith(error: null);
  }

  void clearGenerationError() {
    state = state.copyWith(generationError: null);
  }
}

class BooksState {
  final List<Book> books;
  final bool isLoading;
  final bool isUploading;
  final bool isGenerating;
  final bool isExtracting;
  final double extractionProgress;
  final String? extractingBookId;
  final String? error;
  final String? generationError;
  final ViewMode viewMode;

  BooksState({
    required this.books,
    required this.isLoading,
    required this.isUploading,
    required this.isGenerating,
    required this.isExtracting,
    required this.extractionProgress,
    this.extractingBookId,
    this.error,
    this.generationError,
    required this.viewMode,
  });

  factory BooksState.initial() {
    return BooksState(
      books: [],
      isLoading: false,
      isUploading: false,
      isGenerating: false,
      isExtracting: false,
      extractionProgress: 0.0,
      extractingBookId: null,
      viewMode: ViewMode.grid,
    );
  }

  BooksState copyWith({
    List<Book>? books,
    bool? isLoading,
    bool? isUploading,
    bool? isGenerating,
    bool? isExtracting,
    double? extractionProgress,
    String? extractingBookId,
    String? error,
    String? generationError,
    ViewMode? viewMode,
    bool clearExtractingBookId = false,
  }) {
    return BooksState(
      books: books ?? this.books,
      isLoading: isLoading ?? this.isLoading,
      isUploading: isUploading ?? this.isUploading,
      isGenerating: isGenerating ?? this.isGenerating,
      isExtracting: isExtracting ?? this.isExtracting,
      extractionProgress: extractionProgress ?? this.extractionProgress,
      extractingBookId: clearExtractingBookId ? null : (extractingBookId ?? this.extractingBookId),
      error: error,
      generationError: generationError,
      viewMode: viewMode ?? this.viewMode,
    );
  }
}

enum ViewMode {
  grid,
  list,
}
