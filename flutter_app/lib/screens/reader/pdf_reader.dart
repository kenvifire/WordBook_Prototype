import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pdfx/pdfx.dart';
import '../../data/file_io/book_file_io.dart';
import '../../models/book.dart';
import '../../providers/language_provider.dart';
import '../../repositories/book_repository.dart';
import '../../services/vocabulary/pdf_text_position_service.dart';
import '../../widgets/reader/word_tap_overlay.dart';
import '../../widgets/common/word_lookup_sheet.dart';

class PdfReader extends StatefulWidget {
  final Book book;
  final double fontSize;
  final int? initialPage;
  final int? minPage;
  final int? maxPage;
  final VoidCallback? onSectionComplete;

  const PdfReader({
    super.key,
    required this.book,
    required this.fontSize,
    this.initialPage,
    this.minPage,
    this.maxPage,
    this.onSectionComplete,
  });

  @override
  State<PdfReader> createState() => PdfReaderState();
}

class PdfReaderState extends State<PdfReader> {
  PdfControllerPinch? _pdfController;
  bool _isLoading = true;
  int _currentPage = 1;
  int _totalPages = 0;
  String _resolvedPath = '';

  // Tap-to-lookup state
  final PdfTextPositionService _textPositionService = PdfTextPositionService();
  final BookRepository _bookRepository = BookRepository();
  List<PdfWordPosition> _currentWords = [];
  Size _pageSize = const Size(612, 792); // Updated on document load
  bool _hasTextLayer = true;
  Uint8List? _pdfBytes;

  @override
  void initState() {
    super.initState();
    _loadPdf();
  }

  @override
  void dispose() {
    _pdfController?.dispose();
    super.dispose();
  }

  Future<void> _loadPdf() async {
    setState(() => _isLoading = true);

    try {
      _resolvedPath = await _bookRepository.resolveFilePath(widget.book);

      // Read bytes once up front: PdfTextPositionService needs them for
      // every tap-to-lookup extraction regardless of platform (previously
      // it re-read the whole file from disk on every single page turn),
      // and web's viewer can only open from bytes (no real file path
      // exists there) — native keeps opening the real file by path below,
      // for pdfx's more memory-efficient lazy page streaming on large PDFs.
      _pdfBytes = await createBookFileIO().readBytes(_resolvedPath);

      int startPage = widget.initialPage ?? widget.book.currentPage;
      if (startPage <= 0) startPage = 1;

      if (widget.minPage != null && startPage < widget.minPage!) {
        startPage = widget.minPage!;
      }
      if (widget.maxPage != null && startPage > widget.maxPage!) {
        startPage = widget.maxPage!;
      }

      setState(() {
        _totalPages = 0;
        _currentPage = startPage;
        _pdfController = PdfControllerPinch(
          // A *copy* of _pdfBytes — on web, pdfx hands this to a pdf.js
          // worker, which transfers (detaches) whatever ArrayBuffer it's
          // given rather than copying it. _pdfBytes itself is read again
          // on every page turn by _extractWordsForPage below, so it must
          // never be the buffer pdf.js took ownership of.
          document: kIsWeb
              ? PdfDocument.openData(Uint8List.fromList(_pdfBytes!))
              : PdfDocument.openFile(_resolvedPath),
          initialPage: _currentPage,
        );
        _isLoading = false;
      });

      // Listen for zoom/scroll changes to rebuild overlay
      _pdfController!.addListener(_onViewChanged);
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading PDF: $e')),
        );
      }
    }
  }

  void _onViewChanged() {
    // Rebuild overlay when user zooms or scrolls
    if (mounted) setState(() {});
  }

  void _extractWordsForPage(int page) {
    if (_pdfBytes == null) return;

    final words = _textPositionService.extractWordsFromPage(
      _pdfBytes!,
      page - 1, // Syncfusion uses 0-indexed pages
    );

    setState(() {
      _currentWords = words;
      _hasTextLayer = words.isNotEmpty;
    });
  }

  void _onWordTapped(String word, PdfWordPosition position) {
    WordLookupSheet.show(
      context,
      word: word,
      book: widget.book,
      targetLanguage: ProviderScope.containerOf(context)
          .read(nativeLanguageProvider),
    );
  }

  Future<void> _updateProgress(int page) async {
    try {
      final book = await _bookRepository.getBookById(widget.book.bookId);

      if (book != null) {
        book.currentPage = page;
        await _bookRepository.updateBook(book);
      }
    } catch (e) {
      debugPrint('Error updating progress: $e');
    }
  }

  void jumpToPage(int page) {
    _pdfController?.animateToPage(pageNumber: page);
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_pdfController == null) {
      return const Center(child: Text('Error loading PDF'));
    }

    final effectiveMinPage = widget.minPage ?? 1;
    final effectiveMaxPage = widget.maxPage ?? _totalPages;
    final canGoPrevious = _currentPage > effectiveMinPage;
    final canGoNext = _currentPage < effectiveMaxPage;
    final isAtSectionEnd = widget.maxPage != null && _currentPage >= effectiveMaxPage;

    final bool isSectionMode = widget.minPage != null || widget.maxPage != null;
    final String pageInfo = isSectionMode
        ? 'Page $_currentPage (${_currentPage - effectiveMinPage + 1} of ${effectiveMaxPage - effectiveMinPage + 1})'
        : 'Page $_currentPage of $_totalPages';

    // Controller properties throw if PdfViewPinch hasn't attached yet.
    ({Rect pageRect, Rect viewRect, double zoomRatio}) metrics;
    try {
      metrics = (
        pageRect: _pdfController!.getPageRect(_currentPage) ??
            Rect.fromLTWH(0, 0, _pageSize.width, _pageSize.height),
        viewRect: _pdfController!.viewRect,
        zoomRatio: _pdfController!.zoomRatio,
      );
    } catch (_) {
      metrics = (
        pageRect: Rect.fromLTWH(0, 0, _pageSize.width, _pageSize.height),
        viewRect: Rect.fromLTWH(0, 0, _pageSize.width, _pageSize.height),
        zoomRatio: 1.0,
      );
    }

    return Column(
      children: [
        if (!_hasTextLayer)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            color: Colors.orange.withValues(alpha: 0.15),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.info_outline, size: 14, color: Colors.orange[700]),
                const SizedBox(width: 6),
                Text(
                  'Text selection via long-press (image-based page)',
                  style: TextStyle(fontSize: 11, color: Colors.orange[700]),
                ),
              ],
            ),
          ),
        Expanded(
          child: Stack(
            children: [
              PdfViewPinch(
                controller: _pdfController!,
                onPageChanged: (page) {
                  if (widget.minPage != null && page < widget.minPage!) {
                    _pdfController?.animateToPage(
                      pageNumber: widget.minPage!,
                      duration: Duration.zero,
                    );
                    return;
                  }
                  if (widget.maxPage != null && page > widget.maxPage!) {
                    _pdfController?.animateToPage(
                      pageNumber: widget.maxPage!,
                      duration: Duration.zero,
                    );
                    return;
                  }
                  setState(() => _currentPage = page);
                  _updateProgress(page);
                  _extractWordsForPage(page);
                },
                onDocumentLoaded: (document) async {
                  final pagesCount = document.pagesCount;
                  double pageWidth = 612;
                  double pageHeight = 792;
                  try {
                    final firstPage = await document.getPage(1);
                    pageWidth = firstPage.width;
                    pageHeight = firstPage.height;
                  } catch (_) {
                    // Fall back to default dimensions
                  }
                  setState(() {
                    _totalPages = pagesCount;
                    _pageSize = Size(pageWidth, pageHeight);
                  });
                  _extractWordsForPage(_currentPage);
                },
              ),
              if (_hasTextLayer)
                WordTapOverlay(
                  words: _currentWords,
                  pageSize: _pageSize,
                  pageRect: metrics.pageRect,
                  zoomRatio: metrics.zoomRatio,
                  viewRect: metrics.viewRect,
                  onWordTapped: _onWordTapped,
                ),
            ],
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
                onPressed: canGoPrevious
                    ? () {
                        _pdfController?.previousPage(
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeInOut,
                        );
                      }
                    : null,
              ),
              Text(pageInfo, style: Theme.of(context).textTheme.bodyMedium),
              if (isAtSectionEnd && widget.onSectionComplete != null)
                TextButton.icon(
                  onPressed: widget.onSectionComplete,
                  icon: const Icon(Icons.check_circle, color: Colors.green),
                  label: const Text('Complete Section',
                      style: TextStyle(color: Colors.green)),
                )
              else
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  onPressed: canGoNext
                      ? () {
                          _pdfController?.nextPage(
                            duration: const Duration(milliseconds: 300),
                            curve: Curves.easeInOut,
                          );
                        }
                      : null,
                ),
            ],
          ),
        ),
      ],
    );
  }
}
