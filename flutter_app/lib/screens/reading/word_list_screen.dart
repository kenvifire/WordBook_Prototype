import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../models/book.dart';
import '../../models/word.dart';
import '../../repositories/word_repository.dart';
import '../../services/vocabulary/word_extraction_service.dart';
import '../../providers/auth_provider.dart';

class WordListScreen extends ConsumerStatefulWidget {
  final Book book;

  /// If provided, only show words with these IDs (scoped to a section).
  final List<String>? wordIds;

  const WordListScreen({super.key, required this.book, this.wordIds});

  @override
  ConsumerState<WordListScreen> createState() => _WordListScreenState();
}

class _WordListScreenState extends ConsumerState<WordListScreen> {
  List<Word> _words = [];
  List<Word> _filteredWords = [];
  bool _isLoading = true;
  bool _isExtracting = false;
  String _searchQuery = '';
  WordStatus? _statusFilter;
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadWords();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadWords() async {
    setState(() => _isLoading = true);

    try {
      final allWords = await WordRepository()
          .getWordsByBook(widget.book.bookId, sortByWord: true);

      // Filter by section word IDs if scoped
      List<Word> words;
      if (widget.wordIds != null && widget.wordIds!.isNotEmpty) {
        final idSet = widget.wordIds!.toSet();
        words = allWords.where((w) => idSet.contains(w.wordId)).toList();
      } else {
        words = allWords;
      }

      setState(() {
        _words = words;
        _applyFilters();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading words: $e')),
        );
      }
    }
  }

  void _applyFilters() {
    _filteredWords = _words.where((word) {
      // Search filter
      if (_searchQuery.isNotEmpty &&
          !word.word.toLowerCase().contains(_searchQuery.toLowerCase())) {
        return false;
      }

      // Status filter
      if (_statusFilter != null && word.status != _statusFilter) {
        return false;
      }

      return true;
    }).toList();
  }

  Future<void> _extractWords() async {
    setState(() => _isExtracting = true);

    try {
      final extractionService = WordExtractionService();
      await extractionService.extractWordsFromBook(widget.book);
      await _loadWords();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Extracted ${_words.length} words')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error extracting words: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isExtracting = false);
      }
    }
  }

  Future<void> _addWord() async {
    final result = await showDialog<Word>(
      context: context,
      builder: (context) => _AddEditWordDialog(
        book: widget.book,
        userId: ref.read(currentUserProvider)?.uid,
      ),
    );

    if (result != null) {
      await WordRepository().addWord(result);
      await _loadWords();
    }
  }

  Future<void> _editWord(Word word) async {
    final result = await showDialog<Word>(
      context: context,
      builder: (context) => _AddEditWordDialog(
        book: widget.book,
        userId: ref.read(currentUserProvider)?.uid,
        existingWord: word,
      ),
    );

    if (result != null) {
      await WordRepository().updateWord(result);
      await _loadWords();
    }
  }

  Future<void> _deleteWord(Word word) async {
    await WordRepository().deleteWord(word.wordId);
    await _loadWords();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.book.title,
              style: const TextStyle(fontSize: 14),
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              '${_filteredWords.length} words',
              style: const TextStyle(fontSize: 12),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _addWord,
            tooltip: 'Add Word',
          ),
          PopupMenuButton<WordStatus?>(
            icon: Icon(
              Icons.filter_list,
              color: _statusFilter != null
                  ? Theme.of(context).colorScheme.primary
                  : null,
            ),
            tooltip: 'Filter by status',
            onSelected: (status) {
              setState(() {
                _statusFilter = status;
                _applyFilters();
              });
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: null,
                child: Row(
                  children: [
                    Icon(
                      _statusFilter == null ? Icons.check : null,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    const Text('All'),
                  ],
                ),
              ),
              PopupMenuItem(
                value: WordStatus.newWord,
                child: Row(
                  children: [
                    Icon(
                      _statusFilter == WordStatus.newWord ? Icons.check : null,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    const Text('New'),
                  ],
                ),
              ),
              PopupMenuItem(
                value: WordStatus.learning,
                child: Row(
                  children: [
                    Icon(
                      _statusFilter == WordStatus.learning ? Icons.check : null,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    const Text('Learning'),
                  ],
                ),
              ),
              PopupMenuItem(
                value: WordStatus.reviewing,
                child: Row(
                  children: [
                    Icon(
                      _statusFilter == WordStatus.reviewing ? Icons.check : null,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    const Text('Reviewing'),
                  ],
                ),
              ),
              PopupMenuItem(
                value: WordStatus.mastered,
                child: Row(
                  children: [
                    Icon(
                      _statusFilter == WordStatus.mastered ? Icons.check : null,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    const Text('Mastered'),
                  ],
                ),
              ),
            ],
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search words...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          setState(() {
                            _searchQuery = '';
                            _applyFilters();
                          });
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
                fillColor: Theme.of(context).colorScheme.surface,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16),
              ),
              onChanged: (value) {
                setState(() {
                  _searchQuery = value;
                  _applyFilters();
                });
              },
            ),
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _filteredWords.isEmpty
              ? _buildEmptyState()
              : _buildWordList(),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addWord,
        icon: const Icon(Icons.add),
        label: const Text('Add Word'),
      ),
    );
  }

  Widget _buildEmptyState() {
    if (_searchQuery.isNotEmpty || _statusFilter != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.search_off,
              size: 64,
              color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.3),
            ),
            const SizedBox(height: 16),
            const Text('No words match your filters'),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () {
                _searchController.clear();
                setState(() {
                  _searchQuery = '';
                  _statusFilter = null;
                  _applyFilters();
                });
              },
              child: const Text('Clear filters'),
            ),
          ],
        ),
      );
    }

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.abc,
              size: 64,
              color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.3),
            ),
            const SizedBox(height: 16),
            const Text('No words yet'),
            const SizedBox(height: 8),
            const Text(
              'Extract words from this book to start managing your vocabulary',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            if (_isExtracting)
              const Column(
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Extracting words...'),
                ],
              )
            else
              ElevatedButton.icon(
                onPressed: _extractWords,
                icon: const Icon(Icons.auto_fix_high),
                label: const Text('Extract Words'),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildWordList() {
    return RefreshIndicator(
      onRefresh: _loadWords,
      child: ListView.builder(
        padding: const EdgeInsets.only(bottom: 80),
        itemCount: _filteredWords.length,
        itemBuilder: (context, index) {
          final word = _filteredWords[index];
          return _WordListItem(
            word: word,
            onEdit: () => _editWord(word),
            onDelete: () => _deleteWord(word),
          );
        },
      ),
    );
  }
}

class _WordListItem extends StatelessWidget {
  final Word word;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _WordListItem({
    required this.word,
    required this.onEdit,
    required this.onDelete,
  });

  Color _getStatusColor(WordStatus status) {
    switch (status) {
      case WordStatus.newWord:
        return Colors.grey;
      case WordStatus.learning:
        return Colors.orange;
      case WordStatus.reviewing:
        return Colors.blue;
      case WordStatus.mastered:
        return Colors.green;
    }
  }

  String _getStatusLabel(WordStatus status) {
    switch (status) {
      case WordStatus.newWord:
        return 'New';
      case WordStatus.learning:
        return 'Learning';
      case WordStatus.reviewing:
        return 'Reviewing';
      case WordStatus.mastered:
        return 'Mastered';
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListTile(
        title: Text(
          word.word,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (word.translation != null)
              Text(
                word.translation!,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
            if (word.definition != null)
              Text(
                word.definition!,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7),
                ),
              ),
          ],
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: _getStatusColor(word.status).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                _getStatusLabel(word.status),
                style: TextStyle(
                  fontSize: 12,
                  color: _getStatusColor(word.status),
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.edit, size: 20),
              onPressed: onEdit,
            ),
            IconButton(
              icon: const Icon(Icons.delete, size: 20),
              color: Colors.red.withValues(alpha: 0.7),
              onPressed: onDelete,
            ),
          ],
        ),
        onTap: onEdit,
      );
  }
}

class _AddEditWordDialog extends StatefulWidget {
  final Book book;
  final String? userId;
  final Word? existingWord;

  const _AddEditWordDialog({
    required this.book,
    this.userId,
    this.existingWord,
  });

  @override
  State<_AddEditWordDialog> createState() => _AddEditWordDialogState();
}

class _AddEditWordDialogState extends State<_AddEditWordDialog> {
  late final TextEditingController _wordController;
  late final TextEditingController _translationController;
  late final TextEditingController _definitionController;
  late final TextEditingController _exampleController;
  late WordStatus _status;
  final _formKey = GlobalKey<FormState>();

  bool get isEditing => widget.existingWord != null;

  @override
  void initState() {
    super.initState();
    _wordController = TextEditingController(text: widget.existingWord?.word);
    _translationController =
        TextEditingController(text: widget.existingWord?.translation);
    _definitionController =
        TextEditingController(text: widget.existingWord?.definition);
    _exampleController =
        TextEditingController(text: widget.existingWord?.example);
    _status = widget.existingWord?.status ?? WordStatus.newWord;
  }

  @override
  void dispose() {
    _wordController.dispose();
    _translationController.dispose();
    _definitionController.dispose();
    _exampleController.dispose();
    super.dispose();
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;

    final word = widget.existingWord ?? Word();
    word.wordId = widget.existingWord?.wordId ?? const Uuid().v4();
    word.word = _wordController.text.trim();
    word.translation = _translationController.text.trim().isEmpty
        ? null
        : _translationController.text.trim();
    word.definition = _definitionController.text.trim().isEmpty
        ? null
        : _definitionController.text.trim();
    word.example = _exampleController.text.trim().isEmpty
        ? null
        : _exampleController.text.trim();
    word.bookId = widget.book.bookId;
    word.userId = widget.userId;
    word.language = widget.book.language ?? 'en';
    word.status = _status;
    word.extractionMethod =
        isEditing ? word.extractionMethod : ExtractionMethod.manual;
    word.updatedAt = DateTime.now();
    if (!isEditing) {
      word.createdAt = DateTime.now();
      word.repetitions = 0;
      word.easeFactor = 2.5;
      word.interval = 0;
    }

    Navigator.pop(context, word);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(isEditing ? 'Edit Word' : 'Add Word'),
      content: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _wordController,
                decoration: const InputDecoration(
                  labelText: 'Word *',
                  hintText: 'Enter the word',
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter a word';
                  }
                  return null;
                },
                textCapitalization: TextCapitalization.none,
                autofocus: !isEditing,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _translationController,
                decoration: const InputDecoration(
                  labelText: 'Translation',
                  hintText: 'Enter translation',
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _definitionController,
                decoration: const InputDecoration(
                  labelText: 'Definition',
                  hintText: 'Enter definition',
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _exampleController,
                decoration: const InputDecoration(
                  labelText: 'Example',
                  hintText: 'Enter example sentence',
                ),
                maxLines: 2,
              ),
              if (isEditing) ...[
                const SizedBox(height: 16),
                DropdownButtonFormField<WordStatus>(
                  value: _status,
                  decoration: const InputDecoration(
                    labelText: 'Status',
                  ),
                  items: WordStatus.values.map((status) {
                    return DropdownMenuItem(
                      value: status,
                      child: Text(_getStatusLabel(status)),
                    );
                  }).toList(),
                  onChanged: (value) {
                    if (value != null) {
                      setState(() => _status = value);
                    }
                  },
                ),
              ],
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _save,
          child: Text(isEditing ? 'Save' : 'Add'),
        ),
      ],
    );
  }

  String _getStatusLabel(WordStatus status) {
    switch (status) {
      case WordStatus.newWord:
        return 'New';
      case WordStatus.learning:
        return 'Learning';
      case WordStatus.reviewing:
        return 'Reviewing';
      case WordStatus.mastered:
        return 'Mastered';
    }
  }
}
