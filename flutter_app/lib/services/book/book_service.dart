import 'dart:io';
import 'dart:convert';
import 'dart:typed_data';
import 'package:epub_parser/epub_parser.dart' as epub;
import 'package:pdfx/pdfx.dart';
import 'package:path/path.dart' as path;
import '../epub_pagination.dart';

class BookService {
  Future<BookContent> parseBook(String filePath) async {
    final extension = path.extension(filePath).toLowerCase();

    // MOBI stays path-based — it isn't supported on any platform yet (see
    // _parseMobi) and so has no bytes-based variant either.
    if (extension == '.mobi') {
      return await _parseMobi(filePath);
    }

    final file = File(filePath);
    final bytes = await file.readAsBytes();
    return parseBookBytes(bytes, extension, path.basenameWithoutExtension(filePath));
  }

  /// Bytes-based counterpart to [parseBook], usable wherever only raw bytes
  /// are available (web uploads via file_picker, or `createBookFileIO()`
  /// reads). [extension] may be given with or without a leading dot.
  /// [fileNameForTitle] is used as a fallback title (e.g. for .txt, or for
  /// .epub files with no embedded title).
  Future<BookContent> parseBookBytes(
    Uint8List bytes,
    String extension,
    String fileNameForTitle,
  ) async {
    final normalizedExtension = extension.startsWith('.') ? extension.toLowerCase() : '.${extension.toLowerCase()}';

    switch (normalizedExtension) {
      case '.txt':
        return _parseTxtBytes(bytes, fileNameForTitle);
      case '.epub':
        return await _parseEpubBytes(bytes, fileNameForTitle);
      case '.pdf':
        return await _parsePdfBytes(bytes, fileNameForTitle);
      default:
        throw Exception('Unsupported book format: $normalizedExtension');
    }
  }

  BookContent _parseTxtBytes(Uint8List bytes, String fileNameForTitle) {
    final content = utf8.decode(bytes);

    final lines = content.split('\n');
    final pages = <String>[];
    const linesPerPage = 30;

    for (var i = 0; i < lines.length; i += linesPerPage) {
      final end = (i + linesPerPage < lines.length) ? i + linesPerPage : lines.length;
      pages.add(lines.sublist(i, end).join('\n'));
    }

    return BookContent(
      title: fileNameForTitle,
      pages: pages,
      totalPages: pages.length,
    );
  }

  Future<BookContent> _parseEpubBytes(Uint8List bytes, String fileNameForTitle) async {
    final epubBook = await epub.EpubReader.readBook(bytes);

    // Pages are fixed-size word chunks, not one page per chapter — a
    // chapter can be an entire novel, which previously made "page 1-10"
    // cover almost the whole book.
    final words = EpubPagination.flattenToWords(epubBook.Chapters);
    final pages = <String>[];
    for (var i = 0; i < words.length; i += EpubPagination.wordsPerPage) {
      final end = (i + EpubPagination.wordsPerPage).clamp(0, words.length);
      pages.add(words.sublist(i, end).join(' '));
    }

    return BookContent(
      title: epubBook.Title ?? fileNameForTitle,
      author: epubBook.Author,
      pages: pages,
      totalPages: pages.length,
    );
  }

  /// [BookContent.pages] here is never actually shown to the reader — PDF
  /// viewing renders the real pages via pdfx directly (see
  /// `screens/reader/pdf_reader.dart`), and vocabulary extraction does its
  /// own real text extraction (see `WordExtractionService`). This only
  /// needs the page count, for `Book.totalPages`.
  Future<BookContent> _parsePdfBytes(Uint8List bytes, String fileNameForTitle) async {
    // On web, pdfx hands this buffer to a pdf.js worker, which *transfers*
    // (detaches) the underlying ArrayBuffer rather than copying it — the
    // caller's own `bytes` would come back unusable (every further read
    // throws/returns empty) for its own later uses, in practice here the
    // bytes written to IndexedDB right after this call via
    // `createBookFileIO().store()`, which failed with a DataCloneError
    // ("ArrayBuffer is detached") during live verification before this
    // copy was added. A copy keeps pdf.js's detachment local.
    final document = await PdfDocument.openData(Uint8List.fromList(bytes));
    final pageCount = document.pagesCount;

    await document.close();

    final pages = List.generate(
      pageCount,
      (index) => 'Page ${index + 1} of PDF document\n\n'
          '[PDF text extraction requires additional configuration. '
          'For now, this is a placeholder for page ${index + 1}]',
    );

    return BookContent(
      title: fileNameForTitle,
      pages: pages,
      totalPages: pages.length,
    );
  }

  Future<BookContent> _parseMobi(String filePath) async {
    throw UnimplementedError(
      'MOBI format parsing requires additional native libraries. '
      'Please convert MOBI to EPUB format.',
    );
  }

  Future<List<String>> extractWords(String text) async {
    final words = text
        .toLowerCase()
        .split(RegExp(r'[\s\.,;:!?\(\)\[\]{}\"\-]+'))
        .where((word) => word.isNotEmpty && word.length > 2)
        .toList();

    return words.toSet().toList();
  }

  Future<List<String>> extractWordsFromPages(List<String> pages, int startPage, int endPage) async {
    final allWords = <String>{};

    for (var i = startPage; i <= endPage && i < pages.length; i++) {
      final words = await extractWords(pages[i]);
      allWords.addAll(words);
    }

    return allWords.toList();
  }
}

class BookContent {
  final String title;
  final String? author;
  final List<String> pages;
  final int totalPages;

  BookContent({
    required this.title,
    this.author,
    required this.pages,
    required this.totalPages,
  });
}
