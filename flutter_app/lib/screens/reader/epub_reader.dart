import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:epub_parser/epub_parser.dart' as epub;
import '../../data/file_io/book_file_io.dart';
import '../../models/book.dart';
import '../../providers/language_provider.dart';
import '../../repositories/book_repository.dart';
import '../../services/epub_pagination.dart';
import '../../widgets/common/word_lookup_sheet.dart';
import '../../widgets/reader/swipe_page_turner.dart';

class EpubReader extends StatefulWidget {
  final Book book;
  final double fontSize;
  final int? initialPage;
  /// For section-based reading: restrict navigation to this page range.
  /// A "page" here is the same [EpubPagination.wordsPerPage]-word chunk
  /// that section generation and word extraction use, so a section's
  /// startPage/endPage line up exactly with what's shown here — not a
  /// chapter (a chapter can span 100+ of these pages).
  final int? minPage;
  final int? maxPage;
  /// Callback when user reaches end of section and wants to complete it
  final VoidCallback? onSectionComplete;

  const EpubReader({
    super.key,
    required this.book,
    required this.fontSize,
    this.initialPage,
    this.minPage,
    this.maxPage,
    this.onSectionComplete,
  });

  @override
  State<EpubReader> createState() => _EpubReaderState();
}

class _EpubReaderState extends State<EpubReader> {
  List<String> _words = [];
  List<bool> _isParagraphStart = [];
  int _totalPages = 0;
  int _currentPage = 1;
  bool _isLoading = true;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _loadEpub();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadEpub() async {
    setState(() => _isLoading = true);

    try {
      Uint8List? bytes;
      if (kIsWeb) {
        bytes = await createBookFileIO().readBytes(widget.book.localPath);
      } else {
        final file = File(widget.book.localPath);
        if (await file.exists()) {
          bytes = await file.readAsBytes();
        }
      }

      if (bytes != null) {
        final epubBook = await epub.EpubReader.readBook(bytes);

        final flattened = EpubPagination.flattenToWordsWithParagraphBreaks(epubBook.Chapters);
        final words = flattened.words;
        final totalPages = words.isEmpty
            ? 0
            : (words.length / EpubPagination.wordsPerPage).ceil();

        final minPage = widget.minPage ?? 1;
        final maxPage = widget.maxPage ?? totalPages;
        var startPage = widget.initialPage ?? widget.book.currentPage;
        if (startPage < 1) startPage = 1;
        startPage = startPage.clamp(minPage, maxPage == 0 ? 1 : maxPage);

        setState(() {
          _words = words;
          _isParagraphStart = flattened.isParagraphStart;
          _totalPages = totalPages;
          _currentPage = startPage;
          _isLoading = false;
        });

        _updateTotalPages(totalPages);
      } else {
        setState(() {
          _isLoading = false;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('EPUB file not found')),
          );
        }
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading EPUB: $e')),
        );
      }
    }
  }

  Future<void> _updateTotalPages(int totalPages) async {
    try {
      final book = await BookRepository().getBookById(widget.book.bookId);

      if (book != null && book.totalPages == 0) {
        book.totalPages = totalPages;
        await BookRepository().updateBook(book);
      }
    } catch (e) {
      debugPrint('Error updating total pages: $e');
    }
  }

  Future<void> _updateProgress(int page) async {
    try {
      final book = await BookRepository().getBookById(widget.book.bookId);

      if (book != null) {
        book.currentPage = page;
        await BookRepository().updateBook(book);
      }
    } catch (e) {
      debugPrint('Error updating progress: $e');
    }
  }

  void _previousPage() {
    final minPage = widget.minPage ?? 1;
    if (_currentPage > minPage) {
      setState(() {
        _currentPage--;
      });
      _updateProgress(_currentPage);
      _scrollController.jumpTo(0);
    }
  }

  void _nextPage() {
    final maxPage = widget.maxPage ?? _totalPages;
    if (_currentPage < maxPage) {
      setState(() {
        _currentPage++;
      });
      _updateProgress(_currentPage);
      _scrollController.jumpTo(0);
    }
  }

  void _showWordDefinition(String word) {
    WordLookupSheet.show(
      context,
      word: word,
      book: widget.book,
      targetLanguage: ProviderScope.containerOf(context)
          .read(nativeLanguageProvider),
    );
  }

  String get _currentPageText {
    final start = (_currentPage - 1) * EpubPagination.wordsPerPage;
    final end = (_currentPage * EpubPagination.wordsPerPage).clamp(0, _words.length);
    if (start >= _words.length || start >= end) return '';

    final buffer = StringBuffer(_words[start]);
    for (var i = start + 1; i < end; i++) {
      buffer.write(_isParagraphStart[i] ? '\n\n' : ' ');
      buffer.write(_words[i]);
    }
    return buffer.toString();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_words.isEmpty) {
      return const Center(
        child: Text('Error loading EPUB or no content found'),
      );
    }

    final content = _currentPageText;

    return Column(
      children: [
        Expanded(
          child: SwipePageTurner(
            onSwipeNext: _nextPage,
            onSwipePrevious: _previousPage,
            child: SingleChildScrollView(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              child: SelectableText(
                content,
                style: TextStyle(
                  fontSize: widget.fontSize,
                  height: 1.6,
                ),
                onSelectionChanged: (selection, cause) {
                  if (selection.isCollapsed) return;

                  final word = content.substring(
                    selection.start,
                    selection.end,
                  ).trim();

                  if (word.isNotEmpty && word.split(' ').length == 1) {
                    _showWordDefinition(word);
                  }
                },
              ),
            ),
          ),
        ),
        Builder(
          builder: (context) {
            final minPage = widget.minPage ?? 1;
            final maxPage = widget.maxPage ?? _totalPages;
            final canGoPrevious = _currentPage > minPage;
            final canGoNext = _currentPage < maxPage;
            final isAtSectionEnd = widget.maxPage != null && _currentPage >= maxPage;

            final bool isSectionMode = widget.minPage != null || widget.maxPage != null;
            final String pageInfo = isSectionMode
                ? 'Page $_currentPage (${_currentPage - minPage + 1} of ${maxPage - minPage + 1})'
                : 'Page $_currentPage of $_totalPages';

            return Container(
              color: Theme.of(context).colorScheme.surface,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon: const Icon(Icons.chevron_left),
                    onPressed: canGoPrevious ? _previousPage : null,
                  ),
                  Expanded(
                    child: Text(
                      pageInfo,
                      style: Theme.of(context).textTheme.bodyMedium,
                      textAlign: TextAlign.center,
                    ),
                  ),
                  // Show "Complete Section" button at end of section, otherwise show next button
                  if (isAtSectionEnd && widget.onSectionComplete != null)
                    TextButton.icon(
                      onPressed: widget.onSectionComplete,
                      icon: const Icon(Icons.check_circle, color: Colors.green),
                      label: const Text('Complete Section', style: TextStyle(color: Colors.green)),
                    )
                  else
                    IconButton(
                      icon: const Icon(Icons.chevron_right),
                      onPressed: canGoNext ? _nextPage : null,
                    ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }
}
