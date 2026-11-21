# PDF Reader — Tap-to-Lookup & Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tap-to-lookup and full-text search to the PDF reader by building an invisible word-position overlay using Syncfusion's text extraction.

**Architecture:** A 3-layer stack using `PdfViewPinch` (pinch-zoom PDF renderer which exposes `zoomRatio`, `viewRect`, `getPageRect()` via `PdfControllerPinch`) → `WordTapOverlay` (invisible tappable rects positioned using PDF→layout→screen coordinate mapping) → `WordLookupSheet` (existing dictionary sheet). Coordinate chain: PDF points → page-fraction → layout position → zoom × offset → screen pixels.

**Tech Stack:** Flutter, pdfx 2.9.2 (PDF rendering), syncfusion_flutter_pdf 24.1.46 (text position extraction), Riverpod (state)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `lib/services/vocabulary/pdf_text_position_service.dart` | CREATE | Extract word positions per page via Syncfusion |
| `lib/widgets/reader/word_tap_overlay.dart` | CREATE | Invisible GestureDetector overlay per word |
| `lib/widgets/reader/reader_search_dialog.dart` | CREATE | Full-text search dialog with results list |
| `lib/screens/reader/pdf_reader.dart` | MODIFY | Stack PdfView + overlay, wire search & dictionary |
| `lib/widgets/common/word_lookup_sheet.dart` | MODIFY | Accept optional initial word, remove hardcoded Spanish |

---

### Task 1: PdfTextPositionService — Extract word positions from PDF pages

**Files:**
- Create: `lib/services/vocabulary/pdf_text_position_service.dart`

- [ ] **Step 1: Write the service**

```dart
import 'dart:io';
import 'package:syncfusion_flutter_pdf/pdf.dart';

class PdfWordPosition {
  final String text;
  final double x;
  final double y;
  final double width;
  final double height;
  final int pageIndex;

  const PdfWordPosition({
    required this.text,
    required this.x,
    required this.y,
    required this.width,
    required this.height,
    required this.pageIndex,
  });
}

class PdfTextPositionService {
  /// Extract word positions from a single page of a PDF file.
  /// Returns empty list if extraction fails (scanned PDF, etc).
  List<PdfWordPosition> extractWordsFromPage(String filePath, int pageIndex) {
    try {
      final file = File(filePath);
      if (!file.existsSync()) return [];

      final bytes = file.readAsBytesSync();
      final document = PdfDocument(inputBytes: bytes);

      final textLines = PdfTextExtractor(document).extractTextLines(
        startPageIndex: pageIndex,
        endPageIndex: pageIndex,
      );

      final words = <PdfWordPosition>[];

      for (final line in textLines) {
        for (final word in line.wordCollection) {
          if (word.text.trim().isEmpty) continue;

          words.add(PdfWordPosition(
            text: word.text.trim(),
            x: word.bounds.left,
            y: word.bounds.top,
            width: word.bounds.width,
            height: word.bounds.height,
            pageIndex: pageIndex,
          ));
        }
      }

      document.dispose();
      return words;
    } catch (e) {
      debugPrint('Text position extraction error: $e');
      return [];
    }
  }

  /// Extract text from a page range for search functionality.
  Map<int, String> extractPageTexts(String filePath, {int? startPage, int? endPage}) {
    try {
      final file = File(filePath);
      if (!file.existsSync()) return {};

      final bytes = file.readAsBytesSync();
      final document = PdfDocument(inputBytes: bytes);

      final textLines = PdfTextExtractor(document).extractTextLines(
        startPageIndex: startPage,
        endPageIndex: endPage,
      );

      final pageTexts = <int, StringBuffer>{};
      for (final line in textLines) {
        final text = line.wordCollection.map((w) => w.text).join(' ');
        pageTexts.putIfAbsent(line.pageIndex, () => StringBuffer())
          ..write(text)
          ..write(' ');
      }

      document.dispose();
      return pageTexts.map((k, v) => MapEntry(k + 1, v.toString())); // 1-indexed pages
    } catch (e) {
      debugPrint('Text extraction error: $e');
      return {};
    }
  }
}
```

- [ ] **Step 2: Verify Syncfusion API compiles**

Run: `cd /Users/kenvi/code/WordBook && dart analyze lib/services/vocabulary/pdf_text_position_service.dart 2>&1`

Expected: No errors (or only unused import warnings for `debugPrint` from Flutter foundation — acceptable since this is not a Flutter widget, we'll resolve in integration).

- [ ] **Step 3: Commit**

```bash
git add lib/services/vocabulary/pdf_text_position_service.dart
git commit -m "feat: add PdfTextPositionService for word-level text extraction from PDF"
```

---

### Task 2: WordTapOverlay — Invisible tappable word positions

**Files:**
- Create: `lib/widgets/reader/word_tap_overlay.dart`

- [ ] **Step 1: Write the overlay widget**

```dart
import 'package:flutter/material.dart';
import '../../services/vocabulary/pdf_text_position_service.dart';

class WordTapOverlay extends StatelessWidget {
  final List<PdfWordPosition> words;
  final Size pageSize;    // PDF page dimensions in points (from PdfPage.width/height)
  final Rect pageRect;     // Layout rect in document coordinates (from controller.getPageRect)
  final double zoomRatio;  // Current zoom (from controller.zoomRatio)
  final Rect viewRect;     // Current viewport in document coords (from controller.viewRect)
  final void Function(String word, PdfWordPosition position)? onWordTapped;

  const WordTapOverlay({
    super.key,
    required this.words,
    required this.pageSize,
    required this.pageRect,
    required this.zoomRatio,
    required this.viewRect,
    this.onWordTapped,
  });

  @override
  Widget build(BuildContext context) {
    if (words.isEmpty) return const SizedBox();

    return IgnorePointer(
      ignoring: false,
      child: Stack(
        children: words.map((word) {
          // 1. PDF point → page fraction
          final fx = word.x / pageSize.width;
          final fy = word.y / pageSize.height;
          final fw = word.width / pageSize.width;
          final fh = word.height / pageSize.height;

          // 2. Page fraction → layout position (page's rect in document)
          final layoutX = pageRect.left + fx * pageRect.width;
          final layoutY = pageRect.top + fy * pageRect.height;
          final layoutW = fw * pageRect.width;
          final layoutH = fh * pageRect.height;

          // 3. Layout → screen (apply zoom, subtract view offset)
          final screenX = (layoutX * zoomRatio) - viewRect.left;
          final screenY = (layoutY * zoomRatio) - viewRect.top;
          final screenW = layoutW * zoomRatio;
          final screenH = layoutH * zoomRatio;

          // Expand tap target for small words
          final tapPadding = 4.0;
          final tapRect = Rect.fromLTWH(screenX, screenY, screenW, screenH)
              .inflate(tapPadding);

          return Positioned(
            left: tapRect.left,
            top: tapRect.top,
            width: tapRect.width,
            height: tapRect.height,
            child: GestureDetector(
              behavior: HitTestBehavior.translucent,
              onTap: () => onWordTapped?.call(word.text, word),
            ),
          );
        }).toList(),
      ),
    );
  }
}
```

- [ ] **Step 2: Verify widget compiles**

Run: `cd /Users/kenvi/code/WordBook && dart analyze lib/widgets/reader/word_tap_overlay.dart 2>&1`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/widgets/reader/word_tap_overlay.dart
git commit -m "feat: add WordTapOverlay for invisible tappable word positions on PDF"
```

---

### Task 3: Integrate tap-to-lookup into PdfReader

**Files:**
- Modify: `lib/screens/reader/pdf_reader.dart`

- [ ] **Step 1: Replace the PdfReader to use PdfViewPinch + WordTapOverlay**

```dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:pdfx/pdfx.dart';
import '../../models/book.dart';
import '../../services/database_service.dart';
import '../../services/vocabulary/pdf_text_position_service.dart';
import '../../widgets/reader/word_tap_overlay.dart';
import '../../widgets/common/word_lookup_sheet.dart';
import 'package:isar/isar.dart';

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
  State<PdfReader> createState() => _PdfReaderState();
}

class _PdfReaderState extends State<PdfReader> {
  PdfControllerPinch? _pdfController;
  bool _isLoading = true;
  int _currentPage = 1;
  int _totalPages = 0;

  // Tap-to-lookup state
  final PdfTextPositionService _textPositionService = PdfTextPositionService();
  List<PdfWordPosition> _currentWords = [];
  Size _pageSize = const Size(612, 792); // Updated on document load
  bool _hasTextLayer = true;

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
      final file = File(widget.book.localPath);
      if (await file.exists()) {
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
            document: PdfDocument.openFile(widget.book.localPath),
            initialPage: _currentPage,
          );
          _isLoading = false;
        });

        // Listen for zoom/scroll changes to rebuild overlay
        _pdfController!.addListener(_onViewChanged);
      } else {
        setState(() => _isLoading = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('PDF file not found')),
          );
        }
      }
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
    final words = _textPositionService.extractWordsFromPage(
      widget.book.localPath,
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
    );
  }

  Future<void> _updateTotalPages(int totalPages) async {
    try {
      final isar = await DatabaseService.isar;
      final book = await isar.books
          .filter()
          .bookIdEqualTo(widget.book.bookId)
          .findFirst();

      if (book != null && book.totalPages == 0) {
        book.totalPages = totalPages;
        book.updatedAt = DateTime.now();

        await isar.writeTxn(() async {
          await isar.books.put(book);
        });
      }
    } catch (e) {
      debugPrint('Error updating total pages: $e');
    }
  }

  Future<void> _updateProgress(int page) async {
    try {
      final isar = await DatabaseService.isar;
      final book = await isar.books
          .filter()
          .bookIdEqualTo(widget.book.bookId)
          .findFirst();

      if (book != null) {
        book.currentPage = page;
        book.updatedAt = DateTime.now();

        await isar.writeTxn(() async {
          await isar.books.put(book);
        });
      }
    } catch (e) {
      debugPrint('Error updating progress: $e');
    }
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

    // Get current page rect and view state from controller for overlay
    final pageRect = _pdfController!.getPageRect(_currentPage) ??
        Rect.fromLTWH(0, 0, _pageSize.width, _pageSize.height);
    final viewRect = _pdfController!.viewRect;
    final zoomRatio = _pdfController!.zoomRatio;

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
                onDocumentLoaded: (document) {
                  setState(() {
                    _totalPages = document.pagesCount;
                    _pageSize = Size(
                      document.pages.first?.width ?? 612,
                      document.pages.first?.height ?? 792,
                    );
                  });
                  _extractWordsForPage(_currentPage);
                },
              ),
              if (_hasTextLayer)
                WordTapOverlay(
                  words: _currentWords,
                  pageSize: _pageSize,
                  pageRect: pageRect,
                  zoomRatio: zoomRatio,
                  viewRect: viewRect,
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
```

- [ ] **Step 2: Verify the modified file compiles**

Run: `cd /Users/kenvi/code/WordBook && dart analyze lib/screens/reader/pdf_reader.dart 2>&1`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/screens/reader/pdf_reader.dart
git commit -m "feat: integrate tap-to-lookup overlay into PDF reader"
```

---

### Task 4: Add full-text search to PdfReader

**Files:**
- Create: `lib/widgets/reader/reader_search_dialog.dart`
- Modify: `lib/screens/reader/pdf_reader.dart`

- [ ] **Step 1: Write the search dialog**

```dart
import 'package:flutter/material.dart';
import '../../services/vocabulary/pdf_text_position_service.dart';

class ReaderSearchDialog extends StatefulWidget {
  final String filePath;
  final int totalPages;
  final void Function(int page) onNavigateToPage;

  const ReaderSearchDialog({
    super.key,
    required this.filePath,
    required this.totalPages,
    required this.onNavigateToPage,
  });

  @override
  State<ReaderSearchDialog> createState() => _ReaderSearchDialogState();
}

class _ReaderSearchDialogState extends State<ReaderSearchDialog> {
  final _controller = TextEditingController();
  final _service = PdfTextPositionService();
  List<MapEntry<int, String>> _results = [];
  bool _isSearching = false;
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _search(String query) async {
    if (query.trim().isEmpty) {
      setState(() => _results = []);
      return;
    }

    setState(() => _isSearching = true);

    final pageTexts = _service.extractPageTexts(
      widget.filePath,
      startPage: 0,
      endPage: widget.totalPages - 1,
    );

    final results = <MapEntry<int, String>>[];
    final lowerQuery = query.toLowerCase();

    for (final entry in pageTexts.entries) {
      final lowerText = entry.value.toLowerCase();
      if (lowerText.contains(lowerQuery)) {
        int idx = lowerText.indexOf(lowerQuery);
        final start = idx - 30 > 0 ? idx - 30 : 0;
        final end = idx + query.length + 50 < entry.value.length
            ? idx + query.length + 50
            : entry.value.length;
        final snippet = '...${entry.value.substring(start, end)}...';
        results.add(MapEntry(entry.key, snippet));
      }
    }

    if (mounted) {
      setState(() {
        _results = results;
        _isSearching = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: TextField(
        controller: _controller,
        autofocus: true,
        decoration: InputDecoration(
          hintText: 'Search in book...',
          prefixIcon: const Icon(Icons.search),
          suffixIcon: _controller.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    _controller.clear();
                    setState(() => _results = []);
                  },
                )
              : null,
        ),
        onSubmitted: (value) {
          _query = value;
          _search(value);
        },
      ),
      content: SizedBox(
        width: double.maxFinite,
        height: 400,
        child: _isSearching
            ? const Center(child: CircularProgressIndicator())
            : _query.isEmpty
                ? Center(
                    child: Text(
                      'Type to search',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  )
                : _results.isEmpty
                    ? Center(
                        child: Text(
                          'No results for "$_query"',
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                      )
                    : ListView.builder(
                        itemCount: _results.length,
                        itemBuilder: (context, index) {
                          final result = _results[index];
                          return ListTile(
                            title: Text(
                              result.value,
                              style: const TextStyle(fontSize: 13),
                            ),
                            subtitle: Text('Page ${result.key}'),
                            leading: CircleAvatar(
                              radius: 14,
                              child: Text(
                                '${result.key}',
                                style: const TextStyle(fontSize: 11),
                              ),
                            ),
                            onTap: () {
                              Navigator.pop(context);
                              widget.onNavigateToPage(result.key);
                            },
                          );
                        },
                      ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Close'),
        ),
      ],
    );
  }
}
```

- [ ] **Step 2: Wire search into PdfReader's app bar**

Replace the search IconButton in `pdf_reader.dart` (the one at line ~143 showing "Search coming soon!") with:

```dart
IconButton(
  icon: const Icon(Icons.search),
  onPressed: () {
    showDialog(
      context: context,
      builder: (context) => ReaderSearchDialog(
        filePath: widget.book.localPath,
        totalPages: _totalPages,
        onNavigateToPage: (page) {
          _pdfController?.animateToPage(pageNumber: page);
        },
      ),
    );
  },
  tooltip: 'Search',
),
```

- [ ] **Step 3: Verify search compiles and integrates**

Run: `cd /Users/kenvi/code/WordBook && dart analyze lib/widgets/reader/reader_search_dialog.dart lib/screens/reader/pdf_reader.dart 2>&1`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add lib/widgets/reader/reader_search_dialog.dart lib/screens/reader/pdf_reader.dart
git commit -m "feat: add full-text search to PDF reader"
```

---

### Task 5: Integrate word lookup from WordLookupSheet

**Files:**
- Modify: `lib/widgets/common/word_lookup_sheet.dart`

- [ ] **Step 1: Remove hardcoded Spanish, use target language param**

The `_loadDefinition` method at line 88-110 has hardcoded `targetLanguage: 'es'`. Change it to accept a parameter. Update the static `show` method and constructor:

```dart
// Add to WordLookupSheet class fields:
final String targetLanguage;

// Update constructor:
const WordLookupSheet({
  super.key,
  required this.word,
  required this.book,
  required this.targetLanguage,
  this.context,
});

// Update static show method signature:
static Future<void> show(
  BuildContext context, {
  required String word,
  required Book book,
  String targetLanguage = 'en',
  String? sentenceContext,
}) {
  // ... same body, pass targetLanguage to WordLookupSheet
}

// In _loadDefinition, change:
final translation = await _dictionaryService.getTranslation(
  widget.word,
  targetLanguage: widget.targetLanguage,
);
```

- [ ] **Step 2: Verify compiled change**

Run: `cd /Users/kenvi/code/WordBook && dart analyze lib/widgets/common/word_lookup_sheet.dart 2>&1`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/widgets/common/word_lookup_sheet.dart
git commit -m "fix: make word lookup target language configurable instead of hardcoded Spanish"
```

---

### Task 6: Integration test — end-to-end tap-to-lookup flow

**Files:**
- Create: `test/pdf_tap_lookup_test.dart`

- [ ] **Step 1: Write the service-level test**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:wordbook/services/vocabulary/pdf_text_position_service.dart';

void main() {
  group('PdfTextPositionService', () {
    test('extractWordsFromPage returns empty list for non-existent file', () {
      final service = PdfTextPositionService();
      final result = service.extractWordsFromPage('/nonexistent/file.pdf', 0);
      expect(result, isEmpty);
    });

    test('extractPageTexts returns empty map for non-existent file', () {
      final service = PdfTextPositionService();
      final result = service.extractPageTexts('/nonexistent/file.pdf');
      expect(result, isEmpty);
    });
  });

  group('PdfWordPosition', () {
    test('holds correct values', () {
      final pos = PdfWordPosition(
        text: 'hello',
        x: 10.0,
        y: 20.0,
        width: 30.0,
        height: 12.0,
        pageIndex: 0,
      );

      expect(pos.text, 'hello');
      expect(pos.x, 10.0);
      expect(pos.y, 20.0);
      expect(pos.width, 30.0);
      expect(pos.height, 12.0);
      expect(pos.pageIndex, 0);
    });
  });
}
```

- [ ] **Step 2: Run tests**

Run: `cd /Users/kenvi/code/WordBook && flutter test test/pdf_tap_lookup_test.dart 2>&1`

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add test/pdf_tap_lookup_test.dart
git commit -m "test: add unit tests for PdfTextPositionService and PdfWordPosition"
```

---

### Task 7: Build and verify on iOS simulator

- [ ] **Step 1: Run Flutter analyze on the full project**

Run: `cd /Users/kenvi/code/WordBook && flutter analyze 2>&1`

Expected: No new errors introduced (existing warnings may exist, but no errors from our changes).

- [ ] **Step 2: Build and run on simulator**

Run: `cd /Users/kenvi/code/WordBook && flutter run -d ios 2>&1`

Expected: App builds and launches on iOS simulator. Open a PDF book. Verify:
- Tap on a word → dictionary sheet appears with definition
- Search icon → search dialog opens, enter a word → results show page numbers
- Navigate between pages → word overlay updates
- If PDF has no text layer → orange hint bar shows

- [ ] **Step 3: Commit final adjustments**

```bash
git add -A
git commit -m "chore: final adjustments after integration testing"
```
