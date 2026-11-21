import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_provider.dart';
import '../../models/book.dart';
import '../../repositories/book_repository.dart';
import 'word_practice_screen.dart';

class VocabularyScreen extends ConsumerStatefulWidget {
  const VocabularyScreen({super.key});

  @override
  ConsumerState<VocabularyScreen> createState() => _VocabularyScreenState();
}

class _VocabularyScreenState extends ConsumerState<VocabularyScreen> {
  Map<String, List<Book>> _booksByLanguage = {};
  bool _isLoading = true;
  String? _selectedLanguage;

  // Language code to display name mapping
  static const Map<String, String> _languageNames = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'nl': 'Dutch',
    'pl': 'Polish',
    'sv': 'Swedish',
    'tr': 'Turkish',
    'vi': 'Vietnamese',
    'th': 'Thai',
  };

  String _getLanguageName(String code) {
    return _languageNames[code] ?? code.toUpperCase();
  }

  @override
  void initState() {
    super.initState();
    _loadBooks();
  }

  Future<void> _loadBooks() async {
    setState(() => _isLoading = true);

    try {
      final user = ref.read(currentUserProvider);
      if (user == null) return;

      final books = await BookRepository().getAllBooks(userId: user.uid);

      // Group books by language
      final groupedBooks = <String, List<Book>>{};
      for (final book in books) {
        final lang = book.language ?? 'en';
        groupedBooks.putIfAbsent(lang, () => []).add(book);
      }

      if (mounted) {
        setState(() {
          _booksByLanguage = groupedBooks;
          // Auto-select first language if none selected
          if (_selectedLanguage == null && groupedBooks.isNotEmpty) {
            _selectedLanguage = groupedBooks.keys.first;
          }
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading books: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Vocabulary Practice'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _booksByLanguage.isEmpty
              ? _buildEmptyState()
              : _buildLanguageView(),
    );
  }

  Widget _buildLanguageView() {
    final languages = _booksByLanguage.keys.toList();

    return Column(
      children: [
        // Language tabs
        Container(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            child: Row(
              children: languages.map((lang) {
                final isSelected = lang == _selectedLanguage;
                final bookCount = _booksByLanguage[lang]?.length ?? 0;
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: FilterChip(
                    selected: isSelected,
                    label: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_getLanguageName(lang)),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? Theme.of(context).colorScheme.onPrimary.withValues(alpha: 0.2)
                                : Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '$bookCount',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: isSelected
                                  ? Theme.of(context).colorScheme.onPrimary
                                  : Theme.of(context).colorScheme.primary,
                            ),
                          ),
                        ),
                      ],
                    ),
                    onSelected: (selected) {
                      setState(() {
                        _selectedLanguage = lang;
                      });
                    },
                  ),
                );
              }).toList(),
            ),
          ),
        ),
        // Book list for selected language
        Expanded(
          child: _buildBookList(),
        ),
      ],
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.school_outlined,
              size: 120,
              color: Theme.of(context).colorScheme.primary.withValues(alpha:0.5),
            ),
            const SizedBox(height: 24),
            Text(
              'No books to practice',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 12),
            Text(
              'Add books to your library to start practicing vocabulary',
              style: Theme.of(context).textTheme.bodyLarge,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBookList() {
    final books = _booksByLanguage[_selectedLanguage] ?? [];

    if (books.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Text(
            'No books in ${_getLanguageName(_selectedLanguage ?? 'en')}',
            style: Theme.of(context).textTheme.bodyLarge,
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadBooks,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: books.length,
        itemBuilder: (context, index) {
          final book = books[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                child: Icon(
                  Icons.book,
                  color: Theme.of(context).colorScheme.onPrimaryContainer,
                ),
              ),
              title: Text(
                book.title,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              subtitle: Text(
                book.author ?? 'Unknown author',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => WordPracticeScreen(book: book),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
