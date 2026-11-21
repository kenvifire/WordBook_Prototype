import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/file_io/book_file_io.dart';
import '../../models/book.dart';
import '../../providers/language_provider.dart';
import '../../repositories/book_repository.dart';
import '../../widgets/common/word_lookup_sheet.dart';
import '../../widgets/reader/swipe_page_turner.dart';

class MobiReader extends StatefulWidget {
  final Book book;
  final double fontSize;
  final int? initialPage;
  /// For section-based reading: restrict navigation to this page range
  final int? minPage;
  final int? maxPage;
  /// Callback when user reaches end of section and wants to complete it
  final VoidCallback? onSectionComplete;

  const MobiReader({
    super.key,
    required this.book,
    required this.fontSize,
    this.initialPage,
    this.minPage,
    this.maxPage,
    this.onSectionComplete,
  });

  @override
  State<MobiReader> createState() => _MobiReaderState();
}

class _MobiReaderState extends State<MobiReader> {
  bool _isLoading = true;
  final ScrollController _scrollController = ScrollController();
  List<String> _pages = [];
  int _currentPage = 0;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadContent();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadContent() async {
    setState(() => _isLoading = true);

    try {
      Uint8List? bytes;
      try {
        bytes = await createBookFileIO().readBytes(widget.book.localPath);
      } catch (_) {
        bytes = null;
      }

      if (bytes != null) {
        final content = _parseMobiContent(bytes);

        // Split into pages (approximate)
        const pageSize = 2000; // characters per page
        _pages = [];
        for (int i = 0; i < content.length; i += pageSize) {
          _pages.add(content.substring(
            i,
            (i + pageSize > content.length) ? content.length : i + pageSize,
          ));
        }

        // Determine initial page
        int startPage = widget.initialPage ?? widget.book.currentPage;

        // Convert to 0-indexed if needed (pages are stored 1-indexed)
        if (startPage > 0) startPage = startPage - 1;

        // Enforce section restrictions (convert from 1-indexed to 0-indexed)
        final minIdx = widget.minPage != null ? widget.minPage! - 1 : 0;
        final maxIdx = widget.maxPage != null ? widget.maxPage! - 1 : (_pages.isEmpty ? 0 : _pages.length - 1);

        startPage = startPage.clamp(minIdx, maxIdx);

        setState(() {
          _currentPage = startPage;
          _isLoading = false;
        });

        _updateTotalPages(_pages.length);
      } else {
        setState(() {
          _errorMessage = 'Error: File not found';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Error loading MOBI file: $e\n\nMOBI format has limited support. Consider converting to EPUB for better compatibility.';
        _isLoading = false;
      });
    }
  }

  String _parseMobiContent(Uint8List bytes) {
    // MOBI files start with PalmDOC header
    // Check for PalmDOC/MOBI magic bytes
    if (bytes.length < 78) {
      throw Exception('Invalid MOBI file: too short');
    }

    // Read PDB header
    final name = String.fromCharCodes(bytes.sublist(0, 32)).replaceAll('\x00', '').trim();

    // Check for BOOKMOBI or TEXtREAd type
    final type = String.fromCharCodes(bytes.sublist(60, 64));

    if (type != 'BOOK' && type != 'TEXt') {
      // Try to extract text anyway
      return _extractTextContent(bytes, name);
    }

    return _extractTextContent(bytes, name);
  }

  String _extractTextContent(Uint8List bytes, String title) {
    final content = StringBuffer();
    content.writeln(title);
    content.writeln('=' * title.length);
    content.writeln();

    // Try to find readable text in the file
    // MOBI files often contain HTML or plain text
    int startIndex = 0;

    // Look for HTML content markers
    final htmlStart = _findSequence(bytes, '<html');
    final bodyStart = _findSequence(bytes, '<body');

    if (htmlStart >= 0) {
      startIndex = htmlStart;
    } else if (bodyStart >= 0) {
      startIndex = bodyStart;
    } else {
      // Skip PDB header and records header (typically around 78-100 bytes)
      startIndex = 78;
      // Find first printable text section
      for (int i = startIndex; i < bytes.length - 10; i++) {
        if (_isPrintableSequence(bytes, i, 10)) {
          startIndex = i;
          break;
        }
      }
    }

    // Extract text content
    final textBytes = <int>[];
    bool inTag = false;

    for (int i = startIndex; i < bytes.length; i++) {
      final byte = bytes[i];

      // Skip HTML tags
      if (byte == 60) { // '<'
        inTag = true;
        continue;
      }
      if (byte == 62) { // '>'
        inTag = false;
        textBytes.add(32); // Add space after tag
        continue;
      }

      if (inTag) continue;

      // Only keep printable ASCII and common extended chars
      if ((byte >= 32 && byte < 127) || byte == 10 || byte == 13) {
        textBytes.add(byte);
      } else if (byte >= 128 && byte < 256) {
        // Extended ASCII - try to convert
        textBytes.add(byte);
      }
    }

    try {
      var text = String.fromCharCodes(textBytes);

      // Clean up the text
      text = text
          .replaceAll(RegExp(r'\s+'), ' ')
          .replaceAll(RegExp(r' {2,}'), ' ')
          .replaceAll('&nbsp;', ' ')
          .replaceAll('&amp;', '&')
          .replaceAll('&lt;', '<')
          .replaceAll('&gt;', '>')
          .replaceAll('&quot;', '"')
          .trim();

      // Add paragraph breaks at sentence endings
      text = text.replaceAllMapped(
        RegExp(r'([.!?])\s+([A-Z])'),
        (match) => '${match.group(1)}\n\n${match.group(2)}',
      );

      content.write(text);
    } catch (e) {
      content.write('Unable to decode text content: $e');
    }

    final result = content.toString();
    if (result.length < 100) {
      return 'Unable to extract content from this MOBI file.\n\n'
          'MOBI is a proprietary format with limited support.\n'
          'For best results, please convert to EPUB format using tools like:\n'
          '- Calibre (https://calibre-ebook.com/)\n'
          '- Online converters';
    }

    return result;
  }

  int _findSequence(Uint8List bytes, String sequence) {
    final seqBytes = sequence.codeUnits;
    for (int i = 0; i < bytes.length - seqBytes.length; i++) {
      bool found = true;
      for (int j = 0; j < seqBytes.length; j++) {
        if (bytes[i + j] != seqBytes[j] &&
            bytes[i + j] != seqBytes[j] + 32 && // case insensitive
            bytes[i + j] != seqBytes[j] - 32) {
          found = false;
          break;
        }
      }
      if (found) return i;
    }
    return -1;
  }

  bool _isPrintableSequence(Uint8List bytes, int start, int length) {
    int printable = 0;
    for (int i = start; i < start + length && i < bytes.length; i++) {
      if ((bytes[i] >= 32 && bytes[i] < 127) || bytes[i] == 10 || bytes[i] == 13) {
        printable++;
      }
    }
    return printable >= length * 0.8;
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

  void _onScroll() {
    // Auto-save reading progress
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

    if (_errorMessage != null || _pages.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.warning_amber, size: 64, color: Colors.orange),
              const SizedBox(height: 16),
              Text(
                'Unable to load MOBI file',
                style: Theme.of(context).textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                _errorMessage ?? 'MOBI format has limited support.\nConsider converting to EPUB for better compatibility.',
                style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    final pageContent = _pages[_currentPage];

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
        Builder(
          builder: (context) {
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
