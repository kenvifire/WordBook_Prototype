import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/book.dart';
import '../../providers/book_provider.dart';
import '../../providers/books_state_provider.dart';
import '../../providers/language_provider.dart';
import '../../services/vocabulary/language_detection_service.dart';
import '../reader/reader_screen.dart';
import '../reading/section_selection_screen.dart';
import '../reading/word_list_screen.dart';

class BookHubScreen extends ConsumerStatefulWidget {
  final Book book;
  const BookHubScreen({super.key, required this.book});

  @override
  ConsumerState<BookHubScreen> createState() => _BookHubScreenState();
}

class _BookHubScreenState extends ConsumerState<BookHubScreen>
    with SingleTickerProviderStateMixin {
  late final _tabController = TabController(length: 3, vsync: this);
  late Book _book;

  @override
  void initState() {
    super.initState();
    _book = widget.book;

    // Detect language if not set
    if (_book.language == null) {
      _detectLanguage();
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _detectLanguage() async {
    final detectedLang = await ref
        .read(booksStateProvider.notifier)
        .detectAndSetBookLanguage(_book.bookId);
    if (mounted) {
      setState(() {
        _book.language = detectedLang;
      });
    }
  }

  Widget _buildLanguageRow(BuildContext context) {
    final currentLanguage = _book.language ?? 'en';
    final languageInfo = LanguageDetectionService.getLanguageByCode(currentLanguage);
    final displayName = languageInfo != null
        ? '${languageInfo.name} (${languageInfo.nativeName})'
        : currentLanguage.toUpperCase();

    return InkWell(
      onTap: () => _showLanguageSelector(),
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            Icon(Icons.language, size: 20, color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Book Language',
                style: Theme.of(context).textTheme.bodyLarge,
              ),
            ),
            Text(
              displayName,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.primary,
                  ),
            ),
            const SizedBox(width: 4),
            Icon(
              Icons.chevron_right,
              size: 20,
              color: Theme.of(context).colorScheme.primary,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTranslationLanguageRow(BuildContext context) {
    final String translationLang = _book.translationLanguage ?? ref.read(nativeLanguageProvider);
    final languageInfo = LanguageDetectionService.getLanguageByCode(translationLang);
    final displayName = languageInfo != null
        ? '${languageInfo.name} (${languageInfo.nativeName})'
        : translationLang.toUpperCase();

    return InkWell(
      onTap: () => _showTranslationLanguageSelector(),
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            Icon(Icons.translate, size: 20, color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Translate To',
                style: Theme.of(context).textTheme.bodyLarge,
              ),
            ),
            Text(
              displayName,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.primary,
                  ),
            ),
            const SizedBox(width: 4),
            Icon(
              Icons.chevron_right,
              size: 20,
              color: Theme.of(context).colorScheme.primary,
            ),
          ],
        ),
      ),
    );
  }

  void _showLanguageSelector() {
    final currentLanguage = _book.language ?? 'en';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.4,
        maxChildSize: 0.8,
        expand: false,
        builder: (context, scrollController) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  Text(
                    'Select Book Language',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: ListView.builder(
                controller: scrollController,
                itemCount: LanguageDetectionService.supportedLanguages.length,
                itemBuilder: (context, index) {
                  final language = LanguageDetectionService.supportedLanguages[index];
                  final isSelected = language.code == currentLanguage;

                  return ListTile(
                    leading: isSelected
                        ? Icon(
                            Icons.check_circle,
                            color: Theme.of(context).colorScheme.primary,
                          )
                        : const Icon(Icons.language),
                    title: Text(language.name),
                    subtitle: Text(language.nativeName),
                    trailing: isSelected
                        ? Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.primaryContainer,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              'Selected',
                              style: TextStyle(
                                fontSize: 12,
                                color: Theme.of(context).colorScheme.onPrimaryContainer,
                              ),
                            ),
                          )
                        : null,
                    onTap: () {
                      Navigator.pop(context);
                      if (!isSelected) {
                        _showLanguageChangeConfirmation(language.code);
                      }
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showLanguageChangeConfirmation(String newLanguage) {
    final newLanguageInfo = LanguageDetectionService.getLanguageByCode(newLanguage);
    final newLanguageName = newLanguageInfo?.name ?? newLanguage;

    showDialog(
      context: context,
      // Named distinctly from the outer `context` on purpose: once the
      // dialog is popped below, this context is no longer in the tree, so
      // it must never be reused afterward (e.g. for ScaffoldMessenger) —
      // only the still-mounted outer `context` (the State's own) may be.
      builder: (dialogContext) => AlertDialog(
        title: const Text('Change Book Language?'),
        content: Text(
          'Changing the book language to $newLanguageName will re-extract all vocabulary words. '
          'Existing extracted words and their learning progress will be deleted.\n\n'
          'Do you want to continue?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(dialogContext);

              // Show loading indicator
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Row(
                    children: [
                      SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      SizedBox(width: 16),
                      Text('Updating book language...'),
                    ],
                  ),
                  duration: Duration(seconds: 2),
                ),
              );

              // Update book language and re-extract
              await ref
                  .read(booksStateProvider.notifier)
                  .updateBookLanguage(_book.bookId, newLanguage);

              if (mounted) {
                setState(() {
                  _book.language = newLanguage;
                });

                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Book language changed to $newLanguageName. Vocabulary is being re-extracted.'),
                  ),
                );
              }
            },
            child: Text(
              'Change Language',
              style: TextStyle(color: Theme.of(dialogContext).colorScheme.primary),
            ),
          ),
        ],
      ),
    );
  }

  void _showTranslationLanguageSelector() {
    final currentLanguage = _book.translationLanguage ?? ref.read(nativeLanguageProvider);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.4,
        maxChildSize: 0.8,
        expand: false,
        builder: (context, scrollController) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  Text(
                    'Translate Words To',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: ListView.builder(
                controller: scrollController,
                itemCount: LanguageDetectionService.supportedLanguages.length,
                itemBuilder: (context, index) {
                  final language = LanguageDetectionService.supportedLanguages[index];
                  final isSelected = language.code == currentLanguage;

                  return ListTile(
                    leading: isSelected
                        ? Icon(
                            Icons.check_circle,
                            color: Theme.of(context).colorScheme.primary,
                          )
                        : const Icon(Icons.translate),
                    title: Text(language.name),
                    subtitle: Text(language.nativeName),
                    onTap: () {
                      Navigator.pop(context);
                      if (!isSelected) {
                        _showTranslationLanguageChangeConfirmation(
                          language.code,
                          language.name,
                        );
                      }
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showTranslationLanguageChangeConfirmation(
    String newLanguage,
    String newLanguageName,
  ) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Change Translation Language?'),
        content: Text(
          'Changing the translation language to $newLanguageName will delete all '
          'extracted vocabulary and SRS progress for this book. The words will be '
          're-extracted with translations in the new language.\n\n'
          'Sections will need to be regenerated.\n\n'
          'Do you want to continue?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _updateTranslationLanguage(newLanguage);
            },
            child: Text(
              'Change Language',
              style: TextStyle(color: Theme.of(context).colorScheme.primary),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _updateTranslationLanguage(String newLanguage) async {
    try {
      // Update book's translation language
      final repository = ref.read(bookRepositoryProvider);
      final updatedBook = await repository.getBookById(_book.bookId);

      if (updatedBook != null) {
        updatedBook.translationLanguage = newLanguage;
        await repository.updateBook(updatedBook);

        if (mounted) {
          setState(() {
            _book.translationLanguage = newLanguage;
          });

          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Row(
                children: [
                  SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  SizedBox(width: 16),
                  Text('Re-extracting vocabulary with new translation language...'),
                ],
              ),
              duration: Duration(seconds: 2),
            ),
          );
        }

        // Delete existing words and re-extract with new translation language
        final booksState = ref.read(booksStateProvider.notifier);
        await booksState.updateBookLanguage(_book.bookId, updatedBook.language ?? 'en');

        await booksState.loadBooks();

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Translation language changed to $newLanguage. Vocabulary is being re-extracted.'),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update translation language: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final progress = _book.totalPages > 0
        ? _book.currentPage / _book.totalPages
        : 0.0;

    return Scaffold(
      appBar: AppBar(title: Text(_book.title)),
      body: Column(
        children: [
          // Book header card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  _getFormatColor(_book.format),
                  _getFormatColor(_book.format).withValues(alpha: 0.7),
                ],
              ),
            ),
            child: Column(
              children: [
                Icon(_getFormatIcon(_book.format), size: 48, color: Colors.white70),
                const SizedBox(height: 8),
                Text(_book.title,
                    style: Theme.of(context).textTheme.titleLarge
                        ?.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
                    textAlign: TextAlign.center),
                if (_book.author != null) ...[
                  const SizedBox(height: 4),
                  Text(_book.author!,
                      style: Theme.of(context).textTheme.bodyMedium
                          ?.copyWith(color: Colors.white70)),
                ],
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(3),
                  child: LinearProgressIndicator(
                    value: progress, minHeight: 6,
                    backgroundColor: Colors.white24, color: Colors.white,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '${(progress * 100).toStringAsFixed(0)}% · ${_book.currentPage}/${_book.totalPages} pages',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.white60),
                ),
              ],
            ),
          ),
          // Tabs
          TabBar(
            controller: _tabController,
            tabs: const [
              Tab(icon: Icon(Icons.auto_stories_outlined), text: 'Read'),
              Tab(icon: Icon(Icons.list_alt_outlined), text: 'Words'),
              Tab(icon: Icon(Icons.trending_up_outlined), text: 'Progress'),
            ],
          ),
          // Tab content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _ReadTab(
                  book: _book,
                  languageRow: _buildLanguageRow(context),
                  translationRow: _buildTranslationLanguageRow(context),
                ),
                WordListScreen(book: _book),
                _ProgressTab(book: _book),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _getFormatColor(String format) {
    switch (format.toLowerCase()) {
      case 'pdf': return Colors.red;
      case 'epub': return Colors.blue;
      case 'txt': return Colors.green;
      case 'mobi': return Colors.orange;
      default: return Colors.grey;
    }
  }

  IconData _getFormatIcon(String format) {
    switch (format.toLowerCase()) {
      case 'pdf': return Icons.picture_as_pdf;
      case 'txt': return Icons.text_snippet;
      default: return Icons.menu_book;
    }
  }
}

class _ReadTab extends StatelessWidget {
  final Book book;
  final Widget languageRow;
  final Widget translationRow;
  const _ReadTab({
    required this.book,
    required this.languageRow,
    required this.translationRow,
  });

  @override
  Widget build(BuildContext context) {
    final isReading = book.status == BookStatus.reading;
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (isReading)
            SizedBox(
              height: 52,
              child: ElevatedButton.icon(
                onPressed: () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => ReaderScreen(book: book))),
                icon: const Icon(Icons.play_arrow),
                label: Text('Continue Reading (Page ${book.currentPage})'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  foregroundColor: Theme.of(context).colorScheme.onPrimary,
                ),
              ),
            ),
          const SizedBox(height: 10),
          SizedBox(
            height: 52,
            child: OutlinedButton.icon(
              onPressed: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => SectionSelectionScreen(book: book))),
              icon: const Icon(Icons.auto_stories_outlined),
              label: const Text('Section Reading'),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 52,
            child: OutlinedButton.icon(
              onPressed: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => ReaderScreen(book: book))),
              icon: const Icon(Icons.menu_book_outlined),
              label: const Text('Free Read'),
            ),
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 4),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: Theme.of(context).dividerColor)),
            ),
            child: Column(
              children: [
                languageRow,
                const Divider(height: 1),
                translationRow,
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ProgressTab extends StatelessWidget {
  final Book book;
  const _ProgressTab({required this.book});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Reading Progress',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          _StatRow(label: 'Status', value: book.status.name),
          _StatRow(label: 'Current Page', value: '${book.currentPage} / ${book.totalPages}'),
          _StatRow(label: 'Progress',
              value: '${book.totalPages > 0 ? (book.currentPage / book.totalPages * 100).toStringAsFixed(0) : 0}%'),
          if (book.lastReadAt != null)
            _StatRow(label: 'Last Read', value: '${book.lastReadAt!.year}-${book.lastReadAt!.month.toString().padLeft(2, '0')}-${book.lastReadAt!.day.toString().padLeft(2, '0')}'),
        ],
      ),
    );
  }
}

class _StatRow extends StatelessWidget {
  final String label, value;
  const _StatRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
          Text(value, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
