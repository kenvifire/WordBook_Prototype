import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/file_io/book_file_io.dart';
import '../../models/book.dart';
import '../../repositories/book_repository.dart';
import '../../widgets/reader/reader_search_dialog.dart';
import 'txt_reader.dart';
import 'pdf_reader.dart';
import 'epub_reader.dart';
import 'mobi_reader.dart';
import '../settings/preferences_screen.dart';

class ReaderScreen extends ConsumerStatefulWidget {
  final Book book;
  final int? initialPage;
  final bool embedded;
  /// For section-based reading: restrict navigation to this page range
  final int? minPage;
  final int? maxPage;
  /// Callback when user reaches end of section and wants to complete it
  final VoidCallback? onSectionComplete;

  const ReaderScreen({
    super.key,
    required this.book,
    this.initialPage,
    this.embedded = false,
    this.minPage,
    this.maxPage,
    this.onSectionComplete,
  });

  @override
  ConsumerState<ReaderScreen> createState() => _ReaderScreenState();
}

class _ReaderScreenState extends ConsumerState<ReaderScreen> {
  final _pdfReaderKey = GlobalKey<PdfReaderState>();

  @override
  void initState() {
    super.initState();
    _updateLastRead();
  }

  Future<void> _updateLastRead() async {
    try {
      final book = await BookRepository().getBookById(widget.book.bookId);

      if (book != null) {
        book.lastReadAt = DateTime.now();
        if (book.status == BookStatus.notStarted) {
          book.status = BookStatus.reading;
        }

        await BookRepository().updateBook(book);
      }
    } catch (e) {
      debugPrint('Error updating last read: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final fontSize = ref.watch(fontSizeProvider);

    Widget reader;
    final format = widget.book.format.toLowerCase();

    if (format == 'txt') {
      reader = TxtReader(
        book: widget.book,
        fontSize: fontSize,
        initialPage: widget.initialPage,
        minPage: widget.minPage,
        maxPage: widget.maxPage,
        onSectionComplete: widget.onSectionComplete,
      );
    } else if (format == 'pdf') {
      reader = PdfReader(
        key: _pdfReaderKey,
        book: widget.book,
        fontSize: fontSize,
        initialPage: widget.initialPage,
        minPage: widget.minPage,
        maxPage: widget.maxPage,
        onSectionComplete: widget.onSectionComplete,
      );
    } else if (format == 'epub') {
      reader = EpubReader(
        book: widget.book,
        fontSize: fontSize,
        initialPage: widget.initialPage,
        minPage: widget.minPage,
        maxPage: widget.maxPage,
        onSectionComplete: widget.onSectionComplete,
      );
    } else if (format == 'mobi') {
      reader = MobiReader(
        book: widget.book,
        fontSize: fontSize,
        initialPage: widget.initialPage,
        minPage: widget.minPage,
        maxPage: widget.maxPage,
        onSectionComplete: widget.onSectionComplete,
      );
    } else {
      reader = Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64),
              const SizedBox(height: 16),
              Text(
                'Unsupported format: ${widget.book.format}',
                style: Theme.of(context).textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    // When embedded, just return the reader widget without Scaffold
    if (widget.embedded) {
      return reader;
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.book.title),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () async {
              if (widget.book.format.toLowerCase() != 'pdf') {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Search coming soon!')),
                );
                return;
              }
              final resolvedPath = await BookRepository().resolveFilePath(widget.book);
              final bytes = await createBookFileIO().readBytes(resolvedPath);
              if (!context.mounted) return;
              showDialog(
                context: context,
                builder: (context) => ReaderSearchDialog(
                  bytes: bytes,
                  totalPages: widget.book.totalPages,
                  onNavigateToPage: (page) {
                    _pdfReaderKey.currentState?.jumpToPage(page);
                  },
                ),
              );
            },
            tooltip: 'Search',
          ),
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'settings') {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const PreferencesScreen(),
                  ),
                );
              } else if (value == 'info') {
                _showBookInfo();
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'settings',
                child: Row(
                  children: [
                    Icon(Icons.settings),
                    SizedBox(width: 12),
                    Text('Reading Settings'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'info',
                child: Row(
                  children: [
                    Icon(Icons.info_outline),
                    SizedBox(width: 12),
                    Text('Book Info'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: reader,
    );
  }

  void _showBookInfo() {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.book.title,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              if (widget.book.author != null) ...[
                const SizedBox(height: 8),
                Text(
                  widget.book.author!,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: Colors.grey,
                      ),
                ),
              ],
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 16),
              _InfoRow(
                label: 'Format',
                value: widget.book.format.toUpperCase(),
              ),
              const SizedBox(height: 12),
              _InfoRow(
                label: 'Total Pages',
                value: '${widget.book.totalPages}',
              ),
              const SizedBox(height: 12),
              _InfoRow(
                label: 'Current Page',
                value: '${widget.book.currentPage}',
              ),
              const SizedBox(height: 12),
              _InfoRow(
                label: 'Progress',
                value: widget.book.totalPages > 0
                    ? '${((widget.book.currentPage / widget.book.totalPages) * 100).toStringAsFixed(1)}%'
                    : '0%',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        Text(
          value,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w500,
              ),
        ),
      ],
    );
  }
}
