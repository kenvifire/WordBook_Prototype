import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/book.dart';
import '../../models/word.dart';
import '../../repositories/word_repository.dart';
import '../../services/srs/srs_service.dart';
import '../../services/pronunciation_service.dart';
import '../reader/reader_screen.dart';

class WordPracticeScreen extends ConsumerStatefulWidget {
  final Book book;

  const WordPracticeScreen({super.key, required this.book});

  @override
  ConsumerState<WordPracticeScreen> createState() => _WordPracticeScreenState();
}

class _WordPracticeScreenState extends ConsumerState<WordPracticeScreen> {
  List<Word> _words = [];
  int _currentIndex = 0;
  bool _isLoading = true;
  bool _showAnswer = false;
  int _correctCount = 0;
  final SRSService _srsService = SRSService();

  @override
  void initState() {
    super.initState();
    _loadWords();
  }

  Future<void> _loadWords() async {
    setState(() => _isLoading = true);

    try {
      final allWords =
          await WordRepository().getWordsByBook(widget.book.bookId);

      final dueWords = _srsService.getDueWords(allWords);

      if (mounted) {
        setState(() {
          _words = dueWords.isEmpty ? allWords.take(10).toList() : dueWords;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error loading words: $e')));
      }
    }
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

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.book.title)),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_words.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.book.title)),
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
                  'All caught up! Start reading to discover new words.',
                  style: Theme.of(context).textTheme.bodyLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Back to Books'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (_currentIndex >= _words.length) {
      final recognitionRate = _srsService.calculateRecognitionRate(
        _words,
        _correctCount,
      );

      return Scaffold(
        appBar: AppBar(title: Text(widget.book.title)),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  recognitionRate >= 0.8
                      ? Icons.celebration
                      : Icons.emoji_events_outlined,
                  size: 120,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(height: 24),
                Text(
                  'Practice Complete!',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Recognition Rate: ${(recognitionRate * 100).toStringAsFixed(0)}%',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color:
                        recognitionRate >= 0.8 ? Colors.green : Colors.orange,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '$_correctCount out of ${_words.length} correct',
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
                const SizedBox(height: 32),
                if (recognitionRate >= 0.8) ...[
                  Text(
                    'Great job! You can now start reading.',
                    style: Theme.of(context).textTheme.bodyLarge,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => ReaderScreen(book: widget.book),
                          ),
                        );
                      },
                      icon: const Icon(Icons.auto_stories),
                      label: const Text('Start Reading'),
                    ),
                  ),
                ] else ...[
                  Text(
                    'Keep practicing to improve your recognition rate.',
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
                    child: const Text('Back to Books'),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final word = _words[_currentIndex];

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.book.title),
        actions: [
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
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Card(
                    elevation: 4,
                    child: Padding(
                      padding: const EdgeInsets.all(32.0),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Flexible(
                                child: Text(
                                  word.word,
                                  style: Theme.of(context)
                                      .textTheme
                                      .displaySmall
                                      ?.copyWith(fontWeight: FontWeight.bold),
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
                                    Theme.of(context).textTheme.headlineSmall,
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 16),
                            ],
                            if (word.definition != null) ...[
                              Text(
                                word.definition!,
                                style: Theme.of(context).textTheme.bodyLarge,
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 16),
                            ],
                            if (word.example != null) ...[
                              Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color:
                                      Theme.of(
                                        context,
                                      ).colorScheme.surfaceContainerHighest,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  word.example!,
                                  style: Theme.of(context).textTheme.bodyMedium
                                      ?.copyWith(fontStyle: FontStyle.italic),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            ],
                          ],
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
}
