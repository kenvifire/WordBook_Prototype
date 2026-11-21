import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/book.dart';
import '../../models/reading_section.dart';
import '../../models/word.dart';
import '../../repositories/word_repository.dart';
import '../../services/srs/srs_service.dart';
import '../../services/vocabulary/vocabulary_service.dart';
import '../../services/pronunciation_service.dart';
import '../../providers/section_provider.dart';
import '../../providers/language_provider.dart';
import '../../providers/enrichment_provider.dart';
import '../../screens/settings/words_settings_screen.dart';
import 'word_list_screen.dart';

class SectionPracticeScreen extends ConsumerStatefulWidget {
  final Book book;
  final ReadingSection section;

  const SectionPracticeScreen({
    super.key,
    required this.book,
    required this.section,
  });

  @override
  ConsumerState<SectionPracticeScreen> createState() =>
      _SectionPracticeScreenState();
}

class _SectionPracticeScreenState extends ConsumerState<SectionPracticeScreen>
    with SingleTickerProviderStateMixin {
  List<Word> _words = [];
  int _currentIndex = 0;
  bool _isLoading = true;
  bool _showAnswer = false;
  int _correctCount = 0;
  final SRSService _srsService = SRSService();
  final VocabularyService _vocabularyService = VocabularyService();
  bool _hasStarted = false;
  double _threshold = 0.8;

  // Swipe gesture state
  double _dragOffset = 0;
  bool _isDragging = false;

  @override
  void initState() {
    super.initState();
    _loadThreshold();
    // Deferred to a microtask: startPractice() (called from _loadWords, for
    // a never-before-practiced section) writes to a provider's state as its
    // very first statement, before any await — calling that synchronously
    // from initState means it runs while the widget tree is still
    // building, which Riverpod rejects.
    Future.microtask(_loadWords);
  }

  Future<void> _loadThreshold() async {
    final threshold = ref.read(recognitionThresholdProvider);
    setState(() {
      _threshold = threshold;
    });
  }

  Future<void> _loadWords() async {
    setState(() => _isLoading = true);

    try {
      // First check if section has been practiced before
      if (widget.section.totalWords == 0) {
        // First time - extract words for this section
        final sectionWords = await ref
            .read(sectionProvider(widget.book.bookId).notifier)
            .startPractice(widget.section, widget.book);

        // All extracted words are new — practice them all
        setState(() {
          _words = sectionWords;
          _isLoading = false;
        });

        // Enrich only un-enriched words, in a background queue that keeps
        // running even if this screen is closed before it finishes.
        final needsEnrichment = _words.where((w) => !w.enriched).toList();
        if (needsEnrichment.isNotEmpty) {
          ref
              .read(enrichmentProvider.notifier)
              .enqueue(
                needsEnrichment,
                targetLanguage: widget.book.translationLanguage ??
                    ref.read(nativeLanguageProvider),
              );
        }
      } else {
        // Already practiced before. Word has no stored page/section
        // association, so the only reliable way to know which words belong
        // to THIS section is to re-run the same page-range extraction as
        // the first-time path above — it looks up already-known words by
        // text match rather than recreating them, so this is safe to repeat
        // (bug fixed here: this used to query every word in the whole book
        // and filter by due-date, which on a book with many sections meant
        // reopening section 1 could show nearly the entire book's words).
        final sectionWords = await ref
            .read(sectionProvider(widget.book.bookId).notifier)
            .startPractice(widget.section, widget.book);
        final dueWords = _srsService.getDueWords(sectionWords);

        setState(() {
          _words = dueWords;
          _isLoading = false;
        });

        // Enrich only words that haven't been enriched yet
        final wordsNeedingEnrichment =
            _words.where((w) => !w.enriched).toList();
        if (wordsNeedingEnrichment.isNotEmpty) {
          ref
              .read(enrichmentProvider.notifier)
              .enqueue(
                wordsNeedingEnrichment,
                targetLanguage: widget.book.translationLanguage ??
                    ref.read(nativeLanguageProvider),
              );
        }
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error loading words: $e')));
      }
    }
  }

  /// Pulls the latest DB state for the words currently on screen — called
  /// whenever the background enrichment queue reports progress, so newly
  /// enriched definitions/translations show up without a full reload.
  Future<void> _refreshEnrichedWords() async {
    if (_words.isEmpty) return;

    final wordIds = _words.map((w) => w.wordId).toList();
    final refreshed = await WordRepository().getWordsByIds(wordIds);

    if (!mounted) return;
    setState(() {
      for (final word in refreshed) {
        final index = _words.indexWhere((w) => w.wordId == word.wordId);
        if (index != -1) {
          _words[index] = word;
        }
      }
    });
  }

  Future<void> _pronounce(Word word) async {
    final ok = await PronunciationService.instance.pronounce(word);
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            "Couldn't play pronunciation for this word.",
          ),
        ),
      );
    }
  }

  Future<void> _recordAnswer(int quality) async {
    if (_currentIndex >= _words.length) return;

    final word = _words[_currentIndex];
    final result = _srsService.calculateNextReview(
      word: word,
      quality: quality,
    );

    if (quality >= 3) {
      setState(() {
        _correctCount++;
      });
    }

    word.repetitions = result.repetitions;
    word.easeFactor = result.easeFactor;
    word.interval = result.interval;
    word.nextReviewDate = result.nextReviewDate;
    word.status = result.status;
    word.updatedAt = DateTime.now();

    await WordRepository().updateWord(word);

    setState(() {
      _showAnswer = false;
      _currentIndex++;
    });
  }

  void _showEditDialog() {
    if (_currentIndex >= _words.length) return;
    final word = _words[_currentIndex];
    final controller = TextEditingController(text: word.word);

    final baseWord = word.word;
    // Pre-compute base form candidates by stripping common suffixes
    final candidates = <String>{baseWord};
    for (final suffix in ['s', 'es', 'ed', 'd', 'ing', 'ly', 'er', 'est']) {
      if (baseWord.toLowerCase().endsWith(suffix) &&
          baseWord.length > suffix.length + 1) {
        candidates.add(baseWord.substring(0, baseWord.length - suffix.length));
      }
    }

    showDialog(
      context: context,
      builder:
          (context) => StatefulBuilder(
            builder:
                (context, setDialogState) => AlertDialog(
                  title: const Text('Edit Word'),
                  content: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      TextField(
                        controller: controller,
                        autofocus: true,
                        decoration: const InputDecoration(
                          labelText: 'Word',
                          hintText: 'Enter the correct word',
                        ),
                      ),
                      if (candidates.length > 1) ...[
                        const SizedBox(height: 12),
                        Text(
                          'Quick forms:',
                          style: Theme.of(context).textTheme.labelMedium,
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 4,
                          children:
                              candidates
                                  .where((c) => c != baseWord)
                                  .map(
                                    (candidate) => ActionChip(
                                      label: Text(candidate),
                                      onPressed: () {
                                        controller.text = candidate;
                                        setDialogState(() {});
                                      },
                                    ),
                                  )
                                  .toList(),
                        ),
                      ],
                    ],
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancel'),
                    ),
                    TextButton(
                      onPressed: () {
                        final newWord = controller.text.trim();
                        if (newWord.isNotEmpty && newWord != word.word) {
                          Navigator.pop(context);
                          _updateWord(word, newWord);
                        }
                      },
                      child: const Text('Save'),
                    ),
                  ],
                ),
          ),
    );
  }

  Future<void> _updateWord(Word word, String newText) async {
    try {
      // Update word text
      word.word = newText;
      word.updatedAt = DateTime.now();

      // Enrich immediately with translation/definition
      final nativeLanguage = ref.read(nativeLanguageProvider);
      final targetLang = widget.book.translationLanguage ?? nativeLanguage;
      await _vocabularyService.enrichWord(word, targetLanguage: targetLang);

      // Reload from DB to get enriched data
      final reloaded = await WordRepository().getWordById(word.wordId);

      if (mounted && reloaded != null) {
        setState(() {
          _words[_currentIndex] = reloaded;
          _showAnswer = false;
        });

        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Word updated to "$newText"')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to update word: $e')));
      }
    }
  }

  void _showDeleteConfirmation() {
    if (_currentIndex >= _words.length) return;
    final word = _words[_currentIndex];

    showDialog(
      context: context,
      builder:
          (context) => AlertDialog(
            title: const Text('Remove Word'),
            content: Text(
              'Remove "${word.word}" from your vocabulary?\n\n'
              'This word will be deleted and your SRS progress for it will be lost.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  _deleteCurrentWord();
                },
                child: const Text(
                  'Remove',
                  style: TextStyle(color: Colors.red),
                ),
              ),
            ],
          ),
    );
  }

  Future<void> _deleteCurrentWord() async {
    if (_currentIndex >= _words.length) return;

    final word = _words[_currentIndex];
    try {
      await WordRepository().deleteWord(word.wordId);

      if (mounted) {
        setState(() {
          _words.removeAt(_currentIndex);
          // If we deleted the last word, go to completion screen.
          // Current index stays the same (next word shifts into position).
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('"${word.word}" removed from vocabulary')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to remove word: $e')));
      }
    }
  }

  Future<void> _completeAndUnlock() async {
    final recognitionRate = _srsService.calculateRecognitionRate(
      _words,
      _correctCount,
    );

    // Count mastered words
    final masteredWords =
        _words.where((w) => w.status == WordStatus.mastered).length;

    // Update section progress
    await ref
        .read(sectionProvider(widget.book.bookId).notifier)
        .updatePracticeProgress(
          sectionId: widget.section.sectionId,
          masteredWords: masteredWords,
          recognitionRate: recognitionRate,
          threshold: _threshold,
        );

    if (!mounted) return;

    // Pop with `true` so the caller knows this section just unlocked and can
    // continue straight into the reader instead of leaving the user on the
    // section list with a "Start Reading" button they have to tap again.
    Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<EnrichmentState>(enrichmentProvider, (previous, next) {
      if (next.completed != previous?.completed) {
        _refreshEnrichedWords();
      }
    });

    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: Text('Section ${widget.section.sectionNumber}')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_words.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: Text('Section ${widget.section.sectionNumber}')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.check_circle_outline,
                  size: 120,
                  color: Theme.of(
                    context,
                  ).colorScheme.primary.withValues(alpha: 0.5),
                ),
                const SizedBox(height: 24),
                Text(
                  'No words to practice',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'This section is ready to read!',
                  style: Theme.of(context).textTheme.bodyLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: () async {
                    // Mark section as ready to read and go back
                    await ref
                        .read(sectionProvider(widget.book.bookId).notifier)
                        .updatePracticeProgress(
                          sectionId: widget.section.sectionId,
                          masteredWords: 0,
                          recognitionRate:
                              1.0, // 100% since no words to practice
                          threshold: _threshold,
                        );
                    if (mounted) {
                      Navigator.pop(context);
                    }
                  },
                  child: const Text('Continue'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (!_hasStarted) {
      return _buildStartScreen();
    }

    if (_currentIndex >= _words.length) {
      return _buildCompletionScreen();
    }

    final word = _words[_currentIndex];

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
              'Section ${widget.section.sectionNumber} Practice',
              style: const TextStyle(fontSize: 12),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            tooltip: 'Edit word',
            onPressed: () => _showEditDialog(),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline),
            tooltip: 'Remove word',
            onPressed: () => _showDeleteConfirmation(),
          ),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Center(
              child: Text(
                '${_currentIndex + 1}/${_words.length}',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          LinearProgressIndicator(value: (_currentIndex + 1) / _words.length),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Swipe hint when answer is shown
                  if (_showAnswer)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.arrow_back,
                                size: 16,
                                color: Colors.red.withValues(alpha: 0.7),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'Hard',
                                style: TextStyle(
                                  color: Colors.red.withValues(alpha: 0.7),
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                          Row(
                            children: [
                              Text(
                                'Easy',
                                style: TextStyle(
                                  color: Colors.green.withValues(alpha: 0.7),
                                  fontSize: 12,
                                ),
                              ),
                              const SizedBox(width: 4),
                              Icon(
                                Icons.arrow_forward,
                                size: 16,
                                color: Colors.green.withValues(alpha: 0.7),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  GestureDetector(
                    onHorizontalDragStart:
                        _showAnswer
                            ? (details) {
                              setState(() {
                                _isDragging = true;
                              });
                            }
                            : null,
                    onHorizontalDragUpdate:
                        _showAnswer
                            ? (details) {
                              setState(() {
                                _dragOffset += details.delta.dx;
                              });
                            }
                            : null,
                    onHorizontalDragEnd:
                        _showAnswer
                            ? (details) {
                              final screenWidth =
                                  MediaQuery.of(context).size.width;
                              if (_dragOffset.abs() > screenWidth * 0.25) {
                                // Swipe threshold reached
                                if (_dragOffset > 0) {
                                  // Swipe right = Easy
                                  _recordAnswer(5);
                                } else {
                                  // Swipe left = Hard
                                  _recordAnswer(3);
                                }
                              }
                              setState(() {
                                _dragOffset = 0;
                                _isDragging = false;
                              });
                            }
                            : null,
                    child: AnimatedContainer(
                      duration:
                          _isDragging
                              ? Duration.zero
                              : const Duration(milliseconds: 200),
                      transform: Matrix4.translationValues(_dragOffset, 0, 0)
                        ..rotateZ(_dragOffset * 0.001),
                      child: Stack(
                        children: [
                          Card(
                            elevation: 4,
                            child: ConstrainedBox(
                              constraints: BoxConstraints(
                                maxHeight:
                                    MediaQuery.of(context).size.height * 0.55,
                              ),
                              child: SingleChildScrollView(
                                padding: const EdgeInsets.all(32.0),
                                child: Column(
                                  children: [
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Flexible(
                                          child: Text(
                                            word.word,
                                            style: Theme.of(
                                              context,
                                            ).textTheme.displaySmall?.copyWith(
                                              fontWeight: FontWeight.bold,
                                            ),
                                            textAlign: TextAlign.center,
                                          ),
                                        ),
                                        IconButton(
                                          icon: const Icon(Icons.volume_up),
                                          tooltip: 'Pronounce',
                                          onPressed: () => _pronounce(word),
                                        ),
                                      ],
                                    ),
                                    if (_showAnswer) ...[
                                      const SizedBox(height: 32),
                                      const Divider(),
                                      const SizedBox(height: 16),
                                      if (word.translation != null) ...[
                                        Text(
                                          word.translation!,
                                          style:
                                              Theme.of(
                                                context,
                                              ).textTheme.headlineSmall,
                                          textAlign: TextAlign.center,
                                        ),
                                        const SizedBox(height: 16),
                                      ],
                                      if (word.definition != null) ...[
                                        Text(
                                          word.definition!,
                                          style:
                                              Theme.of(
                                                context,
                                              ).textTheme.bodyLarge,
                                          textAlign: TextAlign.center,
                                        ),
                                        const SizedBox(height: 16),
                                      ],
                                      if (word.example != null) ...[
                                        Container(
                                          padding: const EdgeInsets.all(16),
                                          decoration: BoxDecoration(
                                            color:
                                                Theme.of(context)
                                                    .colorScheme
                                                    .surfaceContainerHighest,
                                            borderRadius: BorderRadius.circular(
                                              8,
                                            ),
                                          ),
                                          child: Text(
                                            word.example!,
                                            style: Theme.of(
                                              context,
                                            ).textTheme.bodyMedium?.copyWith(
                                              fontStyle: FontStyle.italic,
                                            ),
                                            textAlign: TextAlign.center,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ],
                                ),
                              ),
                            ),
                          ),
                          // Swipe overlay indicator
                          if (_dragOffset.abs() > 20)
                            Positioned.fill(
                              child: Container(
                                decoration: BoxDecoration(
                                  color:
                                      _dragOffset > 0
                                          ? Colors.green.withValues(
                                            alpha: (_dragOffset.abs() / 200)
                                                .clamp(0, 0.3),
                                          )
                                          : Colors.red.withValues(
                                            alpha: (_dragOffset.abs() / 200)
                                                .clamp(0, 0.3),
                                          ),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Center(
                                  child: Icon(
                                    _dragOffset > 0
                                        ? Icons.check_circle
                                        : Icons.cancel,
                                    size: 64,
                                    color: (_dragOffset > 0
                                            ? Colors.green
                                            : Colors.red)
                                        .withValues(
                                          alpha: (_dragOffset.abs() / 150)
                                              .clamp(0, 0.8),
                                        ),
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                  Column(
                    children: [
                      if (!_showAnswer) ...[
                        SizedBox(
                          width: double.infinity,
                          height: 48,
                          child: OutlinedButton(
                            onPressed: () {
                              setState(() {
                                _showAnswer = true;
                              });
                            },
                            child: const Text('Show Answer'),
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],
                      Text(
                        'How well did you know this word?',
                        style: Theme.of(context).textTheme.titleMedium,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => _recordAnswer(1),
                              style: OutlinedButton.styleFrom(
                                foregroundColor:
                                    Theme.of(context).colorScheme.error,
                              ),
                              child: const Padding(
                                padding: EdgeInsets.symmetric(vertical: 12),
                                child: Column(
                                  children: [
                                    Icon(Icons.close),
                                    SizedBox(height: 4),
                                    Text('Again'),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => _recordAnswer(3),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.orange.shade700,
                              ),
                              child: const Padding(
                                padding: EdgeInsets.symmetric(vertical: 12),
                                child: Column(
                                  children: [
                                    Icon(Icons.help_outline),
                                    SizedBox(height: 4),
                                    Text('Hard'),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton(
                              onPressed: () => _recordAnswer(4),
                              style: ElevatedButton.styleFrom(
                                backgroundColor:
                                    Theme.of(context).colorScheme.primary,
                                foregroundColor:
                                    Theme.of(context).colorScheme.onPrimary,
                              ),
                              child: const Padding(
                                padding: EdgeInsets.symmetric(vertical: 12),
                                child: Column(
                                  children: [
                                    Icon(Icons.check),
                                    SizedBox(height: 4),
                                    Text('Good'),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: () => _recordAnswer(5),
                              style: ElevatedButton.styleFrom(
                                backgroundColor:
                                    Theme.of(context).colorScheme.secondary,
                                foregroundColor:
                                    Theme.of(context).colorScheme.onSecondary,
                              ),
                              child: const Padding(
                                padding: EdgeInsets.symmetric(vertical: 12),
                                child: Column(
                                  children: [
                                    Icon(Icons.stars),
                                    SizedBox(height: 4),
                                    Text('Easy'),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStartScreen() {
    // Derived from _words itself (kept in sync by _refreshEnrichedWords via
    // the enrichmentProvider listener) rather than the provider's own
    // completed/queued counters, which are cumulative across every section
    // ever enriched this session and wouldn't mean "progress for THIS
    // section" on their own.
    final enrichmentDone = _words.where((w) => w.enriched).length;
    final isEnriching = enrichmentDone < _words.length;

    return Scaffold(
      appBar: AppBar(title: Text('Section ${widget.section.sectionNumber}')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Section ${widget.section.sectionNumber}',
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Pages ${widget.section.startPage}-${widget.section.endPage}',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 16),
                    const Divider(),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildInfoItem(
                          context,
                          Icons.abc,
                          'Words',
                          '${_words.length}',
                        ),
                        _buildInfoItem(
                          context,
                          Icons.trending_up,
                          'Goal',
                          '${(_threshold * 100).toStringAsFixed(0)}%',
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            Card(
              color: Theme.of(context).colorScheme.primaryContainer,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.lightbulb_outline,
                          color:
                              Theme.of(context).colorScheme.onPrimaryContainer,
                        ),
                        const SizedBox(width: 12),
                        Text(
                          'Before you start',
                          style: Theme.of(
                            context,
                          ).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color:
                                Theme.of(
                                  context,
                                ).colorScheme.onPrimaryContainer,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      '• Practice vocabulary from this section\n'
                      '• Each word shows its translation and definition\n'
                      '• Rate how well you know each word\n'
                      '• Reach ${(_threshold * 100).toStringAsFixed(0)}% recognition to unlock reading',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onPrimaryContainer,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (isEnriching) ...[
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Loading definitions... $enrichmentDone/${_words.length}',
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      LinearProgressIndicator(
                        value:
                            _words.isNotEmpty
                                ? enrichmentDone / _words.length
                                : 0,
                      ),
                    ],
                  ),
                ),
              ),
            ],
            const Spacer(),
            SizedBox(
              height: 48,
              child: OutlinedButton.icon(
                onPressed: () {
                  // Only show words loaded for this section
                  final wordIds = _words.map((w) => w.wordId).toList();

                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder:
                          (context) => WordListScreen(
                            book: widget.book,
                            wordIds: wordIds,
                          ),
                    ),
                  ).then((_) {
                    _loadWords();
                  });
                },
                icon: const Icon(Icons.list_alt),
                label: const Text('Review Word List'),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 56,
              child: ElevatedButton.icon(
                onPressed: () {
                  setState(() {
                    _hasStarted = true;
                  });
                },
                icon: const Icon(Icons.school),
                label: Text(
                  isEnriching
                      ? 'Start Practice (Loading...)'
                      : 'Start Practice',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCompletionScreen() {
    final recognitionRate = _srsService.calculateRecognitionRate(
      _words,
      _correctCount,
    );
    final passed = recognitionRate >= _threshold;

    return Scaffold(
      appBar: AppBar(title: Text('Section ${widget.section.sectionNumber}')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                passed ? Icons.celebration : Icons.trending_up,
                size: 120,
                color: passed ? Colors.green : Colors.orange,
              ),
              const SizedBox(height: 24),
              Text(
                passed ? 'Section Unlocked!' : 'Keep Practicing',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Recognition Rate: ${(recognitionRate * 100).toStringAsFixed(0)}%',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: passed ? Colors.green : Colors.orange,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '$_correctCount out of ${_words.length} correct',
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 32),
              if (passed) ...[
                Text(
                  'Great job! This section is now unlocked for reading.',
                  style: Theme.of(context).textTheme.bodyLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: _completeAndUnlock,
                    icon: const Icon(Icons.check_circle),
                    label: const Text('Continue to Reading'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ] else ...[
                Text(
                  'You need ${(_threshold * 100).toStringAsFixed(0)}% to unlock reading.\nKeep practicing to improve.',
                  style: Theme.of(context).textTheme.bodyLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      setState(() {
                        _currentIndex = 0;
                        _correctCount = 0;
                        _showAnswer = false;
                        _hasStarted = true;
                      });
                    },
                    icon: const Icon(Icons.refresh),
                    label: const Text('Practice Again'),
                  ),
                ),
              ],
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Back to Sections'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoItem(
    BuildContext context,
    IconData icon,
    String label,
    String value,
  ) {
    return Column(
      children: [
        Icon(icon, size: 32, color: Theme.of(context).colorScheme.primary),
        const SizedBox(height: 8),
        Text(
          value,
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.bold,
            color: Theme.of(context).colorScheme.primary,
          ),
        ),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}
