import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../models/word.dart';
import '../../models/book.dart';
import '../../repositories/word_repository.dart';
import '../../services/vocabulary/dictionary_service.dart';

class WordLookupSheet extends ConsumerStatefulWidget {
  final String word;
  final Book book;
  final String targetLanguage;
  final String? context; // sentence context where the word appeared

  const WordLookupSheet({
    super.key,
    required this.word,
    required this.book,
    this.targetLanguage = 'en',
    this.context,
  });

  @override
  ConsumerState<WordLookupSheet> createState() => _WordLookupSheetState();

  static Future<void> show(
    BuildContext context, {
    required String word,
    required Book book,
    String targetLanguage = 'en',
    String? sentenceContext,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.5,
        minChildSize: 0.3,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => WordLookupSheet(
          word: word,
          book: book,
          targetLanguage: targetLanguage,
          context: sentenceContext,
        ),
      ),
    );
  }
}

class _WordLookupSheetState extends ConsumerState<WordLookupSheet> {
  final DictionaryService _dictionaryService = DictionaryService();
  DictionaryResult? _definition;
  String? _translation;
  bool _isLoading = true;
  bool _isSaving = false;
  bool _isSaved = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadDefinition();
    _checkIfSaved();
  }

  Future<void> _checkIfSaved() async {
    try {
      final existingWord = await WordRepository().getWordByBookAndText(
        widget.book.bookId,
        widget.word.toLowerCase(),
      );

      if (mounted) {
        setState(() {
          _isSaved = existingWord != null;
        });
      }
    } catch (e) {
      // Ignore
    }
  }

  Future<void> _loadDefinition() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Fetch structured definition
      final definition = await _dictionaryService.getStructuredDefinition(widget.word);

      // Fetch translation: book language → book's translation language (or default)
      final targetLang = widget.book.translationLanguage ?? widget.targetLanguage;
      final translation = await _dictionaryService.getTranslation(
        widget.word,
        sourceLanguage: widget.book.language ?? 'en',
        targetLanguage: targetLang,
      );

      if (mounted) {
        setState(() {
          _definition = definition;
          _translation = translation;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Unable to fetch definition';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _saveWord() async {
    if (_isSaving || _isSaved) return;

    setState(() => _isSaving = true);

    try {
      // Check if word already exists
      final existingWord = await WordRepository().getWordByBookAndText(
        widget.book.bookId,
        widget.word.toLowerCase(),
      );

      if (existingWord != null) {
        if (mounted) {
          setState(() {
            _isSaving = false;
            _isSaved = true;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Word already in vocabulary')),
          );
        }
        return;
      }

      // Create new word
      final word = Word()
        ..wordId = const Uuid().v4()
        ..bookId = widget.book.bookId
        ..word = widget.word.toLowerCase()
        ..definition = _definition?.primaryDefinition
        ..example = _definition?.primaryExample ?? widget.context
        ..translation = _translation
        ..status = WordStatus.newWord
        ..easeFactor = 2.5
        ..interval = 0
        ..repetitions = 0
        ..nextReviewDate = DateTime.now()
        ..createdAt = DateTime.now()
        ..updatedAt = DateTime.now()
        ..extractionMethod = ExtractionMethod.manual
        ..userId = widget.book.userId
        ..language = widget.book.language
        ..enriched = true; // definition/translation already fetched

      await WordRepository().addWord(word);

      if (mounted) {
        setState(() {
          _isSaving = false;
          _isSaved = true;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Added "${widget.word}" to vocabulary')),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving word: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.word,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    if (_definition?.phonetic != null)
                      Text(
                        _definition!.phonetic!,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Colors.grey,
                              fontStyle: FontStyle.italic,
                            ),
                      ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(),

          // Content
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? _buildErrorState()
                    : _buildContent(),
          ),

          // Actions
          const Divider(),
          const SizedBox(height: 12),
          _buildActions(),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.grey),
          const SizedBox(height: 16),
          Text(
            _error ?? 'Unable to load definition',
            style: Theme.of(context).textTheme.bodyLarge,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          TextButton.icon(
            onPressed: _loadDefinition,
            icon: const Icon(Icons.refresh),
            label: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 16),

          // Translation
          if (_translation != null) ...[
            _buildSection(
              'Translation (${widget.book.translationLanguage ?? widget.targetLanguage})',
              Text(
                _translation!,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: Theme.of(context).colorScheme.primary,
                    ),
              ),
            ),
            const SizedBox(height: 20),
          ],

          // Definitions
          if (_definition != null) ...[
            _buildSection(
              'Definition',
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: _definition!.meanings.map((meaning) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Theme.of(context)
                                .colorScheme
                                .primaryContainer,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            meaning.partOfSpeech,
                            style: Theme.of(context)
                                .textTheme
                                .labelMedium
                                ?.copyWith(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onPrimaryContainer,
                                ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        ...meaning.definitions.take(3).map((def) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('• '),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        def.definition,
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodyLarge,
                                      ),
                                      if (def.example != null) ...[
                                        const SizedBox(height: 4),
                                        Container(
                                          padding: const EdgeInsets.all(8),
                                          decoration: BoxDecoration(
                                            color: Theme.of(context)
                                                .colorScheme
                                                .surfaceContainerHighest,
                                            borderRadius:
                                                BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            '"${def.example}"',
                                            style: Theme.of(context)
                                                .textTheme
                                                .bodyMedium
                                                ?.copyWith(
                                                  fontStyle: FontStyle.italic,
                                                ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        }),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
          ],

          // No definition found
          if (_definition == null && _translation == null) ...[
            Center(
              child: Column(
                children: [
                  const Icon(Icons.search_off, size: 48, color: Colors.grey),
                  const SizedBox(height: 16),
                  Text(
                    'No definition found for "${widget.word}"',
                    style: Theme.of(context).textTheme.bodyLarge,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'You can still add it to your vocabulary',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey,
                        ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSection(String title, Widget content) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 8),
        content,
      ],
    );
  }

  Widget _buildActions() {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton.icon(
            onPressed: _isSaved ? null : _saveWord,
            icon: _isSaving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Icon(_isSaved ? Icons.check : Icons.add),
            label: Text(_isSaved ? 'Added to Vocabulary' : 'Add to Vocabulary'),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: widget.word));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Copied to clipboard')),
                  );
                },
                icon: const Icon(Icons.copy),
                label: const Text('Copy'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () async {
                  // Refresh translation with different language
                  final newTranslation = await _dictionaryService.getTranslation(
                    widget.word,
                    sourceLanguage: widget.book.language ?? 'en',
                    targetLanguage: 'ja',
                  );
                  if (mounted && newTranslation != null) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Japanese: $newTranslation')),
                    );
                  }
                },
                icon: const Icon(Icons.translate),
                label: const Text('More'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
