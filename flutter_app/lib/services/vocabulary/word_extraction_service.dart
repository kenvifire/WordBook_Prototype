import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:epub_parser/epub_parser.dart' as epub;
import 'package:syncfusion_flutter_pdf/pdf.dart';
import '../../data/file_io/book_file_io.dart';
import '../../models/word.dart';
import '../../models/book.dart';
import '../../repositories/book_repository.dart';
import '../../repositories/word_repository.dart';
import 'package:uuid/uuid.dart';
import 'word_processor.dart';
import 'language_detection_service.dart';
import '../epub_pagination.dart';

class WordExtractionService {
  final WordProcessor _wordProcessor = WordProcessor();
  final LanguageDetectionService _languageDetector = LanguageDetectionService();
  final Uuid _uuid = const Uuid();
  final BookRepository _bookRepository = BookRepository();
  final WordRepository _wordRepository = WordRepository();

  /// Detect language from book content
  Future<String> detectBookLanguage(Book book) async {
    final format = book.format.toLowerCase();
    final resolvedPath = await _bookRepository.resolveFilePath(book);

    // Get a sample of text from the book
    String sampleText = '';

    try {
      switch (format) {
        case 'txt':
          final bytes = await createBookFileIO().readBytes(resolvedPath);
          final content = utf8.decode(bytes);
          sampleText = content.substring(0, content.length.clamp(0, 5000));
          break;
        case 'pdf':
          sampleText = await _getSampleFromPdf(resolvedPath);
          break;
        case 'epub':
          sampleText = await _getSampleFromEpub(resolvedPath);
          break;
        default:
          return 'en'; // Default to English
      }
    } catch (e) {
      return 'en'; // Default to English on error
    }

    return _languageDetector.detectLanguage(sampleText);
  }

  Future<String> _getSampleFromPdf(String filePath) async {
    final bytes = await createBookFileIO().readBytes(filePath);
    final document = PdfDocument(inputBytes: bytes);

    final textExtractor = PdfTextExtractor(document);
    final buffer = StringBuffer();

    // Get text from first few pages
    final pagesToSample = document.pages.count.clamp(0, 5);
    for (int i = 0; i < pagesToSample; i++) {
      buffer.write(textExtractor.extractText(startPageIndex: i, endPageIndex: i));
      buffer.write(' ');
    }

    document.dispose();
    return buffer.toString();
  }

  Future<String> _getSampleFromEpub(String filePath) async {
    final bytes = await createBookFileIO().readBytes(filePath);
    final epubBook = await epub.EpubReader.readBook(bytes);

    final buffer = StringBuffer();

    if (epubBook.Chapters != null && epubBook.Chapters!.isNotEmpty) {
      // Get text from first chapter
      final chapter = epubBook.Chapters!.first;
      if (chapter.HtmlContent != null) {
        buffer.write(_stripHtmlTags(chapter.HtmlContent!));
      }
    }

    return buffer.toString();
  }

  /// Delete all words for a book
  Future<void> deleteWordsForBook(String bookId) async {
    await _wordRepository.deleteWordsByBook(bookId);
  }

  /// Re-extract words for a book (deletes existing and extracts new)
  Future<List<Word>> reExtractWordsForBook(Book book) async {
    // Delete existing words
    await deleteWordsForBook(book.bookId);

    // Extract new words
    return extractWordsFromBook(book);
  }

  Future<List<Word>> extractWordsFromBook(Book book) async {
    final format = book.format.toLowerCase();

    // Resolve file path (survives app redeploy)
    final resolvedPath = await _bookRepository.resolveFilePath(book);
    // Native: a cheap existence check via dart:io, instead of pulling a
    // whole (possibly large) PDF into memory just to discard it.
    // Web: `localFileExists` isn't wired to the in-memory web store (it's
    // only ever used for the native TTS/audio cache's arbitrary-path
    // checks) and always returns false there, so fall back to the actual
    // bytes read, which is the only way to know whether the web store has
    // this reference.
    if (kIsWeb) {
      try {
        await createBookFileIO().readBytes(resolvedPath);
      } catch (_) {
        throw Exception('File not found at path: $resolvedPath');
      }
    } else if (!await localFileExists(resolvedPath)) {
      throw Exception('File not found at path: $resolvedPath');
    }

    // Set language for word processor
    final language = book.language ?? 'en';
    _wordProcessor.setLanguage(language);

    List<String> words = [];
    switch (format) {
      case 'txt':
        words = await _extractFromTxt(resolvedPath);
        break;
      case 'pdf':
        words = await _extractFromPdf(resolvedPath);
        break;
      case 'epub':
        words = await _extractFromEpub(resolvedPath);
        break;
      case 'mobi':
        // MOBI not currently supported, would need additional package
        throw UnsupportedError('MOBI format not yet supported');
      default:
        throw UnsupportedError('Unknown format: $format');
    }

    // Process and filter words based on book language
    final processedWords = _wordProcessor.processWords(words);

    // Create Word objects
    final wordObjects = <Word>[];
    final now = DateTime.now();

    // Get all existing words for this user to check for learned words
    final existingWords = await _wordRepository.getWordsByUser(book.userId);

    // Create a map of word -> best status for quick lookup
    final learnedWordsMap = <String, Word>{};
    for (final existingWord in existingWords) {
      final wordKey = existingWord.word.toLowerCase();
      if (!learnedWordsMap.containsKey(wordKey) ||
          existingWord.status.index > learnedWordsMap[wordKey]!.status.index) {
        learnedWordsMap[wordKey] = existingWord;
      }
    }

    for (final entry in processedWords.entries) {
      final wordKey = entry.key.toLowerCase();
      final existingLearnedWord = learnedWordsMap[wordKey];

      final word = Word()
        ..wordId = _uuid.v4()
        ..word = entry.key
        ..bookId = book.bookId
        ..userId = book.userId
        ..language = language
        ..createdAt = now
        ..updatedAt = now
        ..extractionMethod = ExtractionMethod.automatic;

      // If the word was already learned in another book, copy its status
      if (existingLearnedWord != null &&
          existingLearnedWord.status != WordStatus.newWord) {
        word.status = existingLearnedWord.status;
        word.repetitions = existingLearnedWord.repetitions;
        word.easeFactor = existingLearnedWord.easeFactor;
        word.interval = existingLearnedWord.interval;
        word.nextReviewDate = existingLearnedWord.nextReviewDate;
        word.definition = existingLearnedWord.definition;
        word.translation = existingLearnedWord.translation;
        word.example = existingLearnedWord.example;
      } else {
        word.status = WordStatus.newWord;
        word.repetitions = 0;
        word.easeFactor = 2.5;
        word.interval = 0;
      }

      wordObjects.add(word);
    }

    // Delete old words for this book so that re-extraction with updated
    // filtering (stop words, language config) fully replaces them.
    // Cross-book SRS progress was already preserved in wordObjects above.
    await deleteWordsForBook(book.bookId);

    // Save to database
    await _saveWords(wordObjects);

    return wordObjects;
  }

  Future<List<String>> _extractFromTxt(String filePath) async {
    try {
      final bytes = await createBookFileIO().readBytes(filePath);
      final content = utf8.decode(bytes);
      return content.split(RegExp(r'\s+'));
    } catch (e) {
      throw Exception('Error extracting from TXT: $e');
    }
  }

  Future<List<String>> _extractFromPdf(String filePath) async {
    try {
      final bytes = await createBookFileIO().readBytes(filePath);
      final document = PdfDocument(inputBytes: bytes);
      final words = <String>[];

      // Extract text from all pages
      final textExtractor = PdfTextExtractor(document);
      for (int i = 0; i < document.pages.count; i++) {
        final pageText = textExtractor.extractText(startPageIndex: i, endPageIndex: i);
        if (pageText.isNotEmpty) {
          words.addAll(pageText.split(RegExp(r'\s+')));
        }
      }

      document.dispose();
      return words;
    } catch (e) {
      throw Exception('Error extracting from PDF: $e');
    }
  }

  Future<List<String>> _extractFromEpub(String filePath) async {
    try {
      final bytes = await createBookFileIO().readBytes(filePath);
      final epubBook = await epub.EpubReader.readBook(bytes);

      // Same chapter set (and same dominant-language filtering, to leave
      // out front/back matter in a different language) as the per-section
      // extraction and the upload-time page count, so all three paths
      // agree on what's actually part of the book.
      final words = EpubPagination.flattenToWords(epubBook.Chapters);

      // Also try to extract from Content if Chapters is empty
      if (words.isEmpty && epubBook.Content != null) {
        final content = epubBook.Content!;
        if (content.Html != null) {
          for (final htmlEntry in content.Html!.entries) {
            final htmlContent = htmlEntry.value.Content;
            if (htmlContent != null) {
              final text = _stripHtmlTags(htmlContent);
              words.addAll(text.split(RegExp(r'\s+')));
            }
          }
        }
      }

      return words;
    } catch (e) {
      throw Exception('Error extracting from EPUB: $e');
    }
  }

  String _stripHtmlTags(String htmlString) {
    final RegExp exp = RegExp(r"<[^>]*>", multiLine: true, caseSensitive: true);
    return htmlString.replaceAll(exp, '').replaceAll('&nbsp;', ' ').trim();
  }

  Future<void> _saveWords(List<Word> words) async {
    try {
      // Batch save in chunks of 500 to avoid memory issues
      const batchSize = 500;
      for (var i = 0; i < words.length; i += batchSize) {
        final end = (i + batchSize > words.length) ? words.length : i + batchSize;
        final batch = words.sublist(i, end);

        await _wordRepository.batchAddWords(batch);
      }
    } catch (e) {
      throw Exception('Error saving words: $e');
    }
  }

  Future<List<Word>> extractWordsFromSection({
    required Book book,
    required int startPage,
    required int endPage,
  }) async {
    final format = book.format.toLowerCase();
    final resolvedPath = await _bookRepository.resolveFilePath(book);

    List<String> words = [];
    switch (format) {
      case 'txt':
        words = await _extractFromTxtSection(resolvedPath, startPage, endPage);
        break;
      case 'pdf':
        words = await _extractFromPdfSection(resolvedPath, startPage, endPage);
        break;
      case 'epub':
        words = await _extractFromEpubSection(resolvedPath, startPage, endPage);
        break;
      default:
        throw UnsupportedError('Unknown format: $format');
    }

    final processedWords = _wordProcessor.processWords(words);

    // Words for this section, whether they were just created here or already
    // exist (e.g. from the whole-book background extraction that runs right
    // after upload) — the section needs to practice all of them, not just
    // the ones it happens to create itself.
    final sectionWords = <Word>[];
    final newWordObjects = <Word>[];
    final now = DateTime.now();

    // One bulk query instead of one per word — a per-word findFirst() here
    // made this take minutes on large sections.
    final existingWordsForBook = await _wordRepository.getWordsByBook(book.bookId);
    final existingByWord = <String, Word>{
      for (final w in existingWordsForBook) w.word: w,
    };

    for (final entry in processedWords.entries) {
      final existingWord = existingByWord[entry.key];

      if (existingWord != null) {
        sectionWords.add(existingWord);
      } else {
        final word = Word()
          ..wordId = _uuid.v4()
          ..word = entry.key
          ..bookId = book.bookId
          ..userId = book.userId
          ..language = book.language
          ..repetitions = 0
          ..easeFactor = 2.5
          ..interval = 0
          ..createdAt = now
          ..updatedAt = now
          ..status = WordStatus.newWord
          ..extractionMethod = ExtractionMethod.automatic;

        sectionWords.add(word);
        newWordObjects.add(word);
      }
    }

    if (newWordObjects.isNotEmpty) {
      await _saveWords(newWordObjects);
    }

    return sectionWords;
  }

  /// 1-indexed page numbers where each real chapter ends, for chapter-based
  /// section generation. Only meaningful for EPUBs — txt/pdf have no chapter
  /// structure in this app, so the UI only offers chapter-based sections for
  /// format 'epub'.
  Future<List<int>> extractChapterEndPages(Book book) async {
    final resolvedPath = await _bookRepository.resolveFilePath(book);
    final bytes = await createBookFileIO().readBytes(resolvedPath);
    final epubBook = await epub.EpubReader.readBook(bytes);
    return EpubPagination.chapterEndPages(epubBook.Chapters);
  }

  /// Distinct processed vocabulary words found on each single page of the
  /// book, in page order (index 0 = page 1). Used by section generation to
  /// size sections by vocabulary density instead of a fixed page count — the
  /// opening pages of a book introduce far more new words per page than
  /// later pages, which mostly recycle vocabulary already seen.
  Future<List<Set<String>>> extractDistinctWordsByPage(Book book) async {
    final format = book.format.toLowerCase();
    final resolvedPath = await _bookRepository.resolveFilePath(book);
    _wordProcessor.setLanguage(book.language ?? 'en');

    List<List<String>> rawWordsByPage;
    switch (format) {
      case 'txt':
        rawWordsByPage = await _rawWordsByPageFromTxt(resolvedPath);
        break;
      case 'pdf':
        rawWordsByPage = await _rawWordsByPageFromPdf(resolvedPath);
        break;
      case 'epub':
        rawWordsByPage = await _rawWordsByPageFromEpub(resolvedPath);
        break;
      default:
        throw UnsupportedError('Unknown format: $format');
    }

    return rawWordsByPage
        .map((pageWords) => _wordProcessor.processWords(pageWords).keys.toSet())
        .toList();
  }

  Future<List<List<String>>> _rawWordsByPageFromTxt(String filePath) async {
    final bytes = await createBookFileIO().readBytes(filePath);
    final content = utf8.decode(bytes);
    final lines = content.split('\n');
    // Must match _extractFromTxtSection's linesPerPage so section page
    // ranges line up with what was actually counted here.
    const linesPerPage = 50;

    final pages = <List<String>>[];
    for (var i = 0; i < lines.length; i += linesPerPage) {
      final end = (i + linesPerPage).clamp(0, lines.length);
      pages.add(lines.sublist(i, end).join('\n').split(RegExp(r'\s+')));
    }
    return pages;
  }

  Future<List<List<String>>> _rawWordsByPageFromPdf(String filePath) async {
    final bytes = await createBookFileIO().readBytes(filePath);
    final document = PdfDocument(inputBytes: bytes);
    final textExtractor = PdfTextExtractor(document);

    final pages = <List<String>>[];
    for (var i = 0; i < document.pages.count; i++) {
      final pageText = textExtractor.extractText(startPageIndex: i, endPageIndex: i);
      pages.add(pageText.isEmpty ? <String>[] : pageText.split(RegExp(r'\s+')));
    }

    document.dispose();
    return pages;
  }

  Future<List<List<String>>> _rawWordsByPageFromEpub(String filePath) async {
    final bytes = await createBookFileIO().readBytes(filePath);
    final epubBook = await epub.EpubReader.readBook(bytes);

    // Must match _extractFromEpubSection's wordsPerPage so section page
    // ranges line up with what was actually counted here.
    final words = EpubPagination.flattenToWords(epubBook.Chapters);
    final pages = <List<String>>[];
    for (var i = 0; i < words.length; i += EpubPagination.wordsPerPage) {
      final end = (i + EpubPagination.wordsPerPage).clamp(0, words.length);
      pages.add(words.sublist(i, end));
    }
    return pages;
  }

  Future<List<String>> _extractFromTxtSection(
    String filePath,
    int startPage,
    int endPage,
  ) async {
    final bytes = await createBookFileIO().readBytes(filePath);
    final content = utf8.decode(bytes);
    final lines = content.split('\n');

    // Estimate pages (assuming ~50 lines per page)
    const linesPerPage = 50;
    final startLine = (startPage - 1) * linesPerPage;
    final endLine = endPage * linesPerPage;

    final sectionLines = lines.sublist(
      startLine.clamp(0, lines.length),
      endLine.clamp(0, lines.length),
    );

    return sectionLines.join('\n').split(RegExp(r'\s+'));
  }

  Future<List<String>> _extractFromPdfSection(
    String filePath,
    int startPage,
    int endPage,
  ) async {
    final bytes = await createBookFileIO().readBytes(filePath);
    final document = PdfDocument(inputBytes: bytes);
    final words = <String>[];

    // Adjust page indices (0-based)
    final start = (startPage - 1).clamp(0, document.pages.count - 1);
    final end = (endPage - 1).clamp(0, document.pages.count - 1);

    final textExtractor = PdfTextExtractor(document);
    for (int i = start; i <= end; i++) {
      final pageText = textExtractor.extractText(startPageIndex: i, endPageIndex: i);
      if (pageText.isNotEmpty) {
        words.addAll(pageText.split(RegExp(r'\s+')));
      }
    }

    document.dispose();
    return words;
  }

  Future<List<String>> _extractFromEpubSection(
    String filePath,
    int startPage,
    int endPage,
  ) async {
    final bytes = await createBookFileIO().readBytes(filePath);
    final epubBook = await epub.EpubReader.readBook(bytes);

    // Must match book_service.dart's _parseEpub exactly (same flattening,
    // same wordsPerPage) so that page N here is the same page N that
    // generateSections() counted against when it sized this section.
    final words = EpubPagination.flattenToWords(epubBook.Chapters);
    if (words.isEmpty) return [];

    final totalPages = (words.length / EpubPagination.wordsPerPage).ceil();
    final start = (startPage - 1).clamp(0, totalPages - 1);
    final end = (endPage - 1).clamp(0, totalPages - 1);

    final startIndex = start * EpubPagination.wordsPerPage;
    final endIndex = ((end + 1) * EpubPagination.wordsPerPage).clamp(0, words.length);

    return words.sublist(startIndex, endIndex);
  }
}
