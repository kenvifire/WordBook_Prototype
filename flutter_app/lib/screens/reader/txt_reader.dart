import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/file_io/book_file_io.dart';
import '../../models/book.dart';
import '../../providers/language_provider.dart';
import '../../repositories/book_repository.dart';
import '../../widgets/common/word_lookup_sheet.dart';
import '../../widgets/reader/swipe_page_turner.dart';

class TxtReader extends StatefulWidget {
  final Book book;
  final double fontSize;
  final int? initialPage;
  /// For section-based reading: restrict navigation to this page range
  final int? minPage;
  final int? maxPage;
  /// Callback when user reaches end of section and wants to complete it
  final VoidCallback? onSectionComplete;

  const TxtReader({
    super.key,
    required this.book,
    required this.fontSize,
    this.initialPage,
    this.minPage,
    this.maxPage,
    this.onSectionComplete,
  });

  @override
  State<TxtReader> createState() => _TxtReaderState();
}

class _TxtReaderState extends State<TxtReader> {
  List<String> _pages = [];
  int _currentPage = 0;
  bool _isLoading = true;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _loadContent();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadContent() async {
    setState(() => _isLoading = true);

    try {
      String? content;
      if (kIsWeb) {
        final bytes = await createBookFileIO().readBytes(widget.book.localPath);
        content = utf8.decode(bytes);
      } else {
        final resolvedPath = await BookRepository().resolveFilePath(widget.book);
        final file = File(resolvedPath);
        if (await file.exists()) {
          content = await file.readAsString();
        }
      }

      if (content != null) {
        // Split content into pages (approximately 2000 characters per page)
        const pageSize = 2000;
        _pages = [];
        for (int i = 0; i < content.length; i += pageSize) {
          _pages.add(content.substring(
            i,
            (i + pageSize > content.length) ? content.length : i + pageSize,
          ));
        }

        // Determine initial page
        int startPage = widget.initialPage ?? widget.book.currentPage;

        // Convert to 0-indexed
        if (startPage > 0) startPage = startPage - 1;

        // Enforce section restrictions (convert from 1-indexed to 0-indexed)
        final minIdx = widget.minPage != null ? widget.minPage! - 1 : 0;
        final maxIdx = widget.maxPage != null ? widget.maxPage! - 1 : _pages.length - 1;

        startPage = startPage.clamp(minIdx, maxIdx);

        setState(() {
          _currentPage = startPage;
          _isLoading = false;
        });

        _updateTotalPages(_pages.length);
      } else {
        setState(() {
          _pages = ['Error: File not found'];
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _pages = ['Error loading file: $e'];
        _isLoading = false;
      });
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
        book.currentPage = page + 1; // Convert to 1-indexed
        await BookRepository().updateBook(book);
      }
    } catch (e) {
      debugPrint('Error updating progress: $e');
    }
  }

  void _previousPage() {
    final minIdx = widget.minPage != null ? widget.minPage! - 1 : 0;
    if (_currentPage > minIdx) {
      setState(() {
        _currentPage--;
      });
      _updateProgress(_currentPage);
      _scrollController.jumpTo(0);
    }
  }

  void _nextPage() {
    final maxIdx = widget.maxPage != null ? widget.maxPage! - 1 : _pages.length - 1;
    if (_currentPage < maxIdx) {
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

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_pages.isEmpty) {
      return const Center(
        child: Text('No content available'),
      );
    }

    final pageContent = _pages[_currentPage];

    // Calculate effective min/max for navigation (0-indexed)
    final minIdx = widget.minPage != null ? widget.minPage! - 1 : 0;
    final maxIdx = widget.maxPage != null ? widget.maxPage! - 1 : _pages.length - 1;
    final canGoPrevious = _currentPage > minIdx;
    final canGoNext = _currentPage < maxIdx;
    final isAtSectionEnd = widget.maxPage != null && _currentPage >= maxIdx;

    // For section mode, show section page info
    final bool isSectionMode = widget.minPage != null || widget.maxPage != null;
    final String pageInfo = isSectionMode
        ? 'Page ${_currentPage + 1} (${_currentPage - minIdx + 1} of ${maxIdx - minIdx + 1})'
        : 'Page ${_currentPage + 1} of ${_pages.length}';

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
                pageContent,
                style: TextStyle(
                  fontSize: widget.fontSize,
                  height: 1.6,
                ),
                onSelectionChanged: (selection, cause) {
                  if (selection.isCollapsed) return;

                  final word = pageContent.substring(
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
        Container(
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
        ),
      ],
    );
  }
}
