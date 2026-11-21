import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/book.dart';
import '../../providers/language_provider.dart';
import '../../services/subscription_service.dart';
import '../../services/vocabulary/word_extraction_service.dart';
import '../../services/vocabulary/vocabulary_service.dart';
import '../subscription/paywall_screen.dart';

class VocabularyExtractionScreen extends ConsumerStatefulWidget {
  final Book book;

  const VocabularyExtractionScreen({
    super.key,
    required this.book,
  });

  @override
  ConsumerState<VocabularyExtractionScreen> createState() =>
      _VocabularyExtractionScreenState();
}

class _VocabularyExtractionScreenState
    extends ConsumerState<VocabularyExtractionScreen> {
  bool _isExtracting = false;
  double _progress = 0.0;
  String _statusMessage = 'Ready to extract vocabulary';
  int _wordsExtracted = 0;
  int _wordsEnriched = 0;

  int get _wordLimit => SubscriptionService.instance.getWordExtractionLimit();
  bool get _hasUnlimitedWords => _wordLimit == -1;

  Future<void> _startExtraction() async {
    setState(() {
      _isExtracting = true;
      _progress = 0.0;
      _statusMessage = 'Extracting words from book...';
      _wordsExtracted = 0;
      _wordsEnriched = 0;
    });

    try {
      final extractionService = WordExtractionService();
      final vocabularyService = VocabularyService();

      // Extract words
      setState(() {
        _statusMessage = 'Analyzing book content...';
        _progress = 0.2;
      });

      final allWords = await extractionService.extractWordsFromBook(widget.book);

      // Apply subscription limit
      final wordLimit = _hasUnlimitedWords ? allWords.length : _wordLimit;
      final words = allWords.take(wordLimit).toList();

      setState(() {
        _wordsExtracted = words.length;
        _statusMessage = _hasUnlimitedWords
            ? 'Extracted ${words.length} unique words'
            : 'Extracted ${words.length} words (limit: $wordLimit)';
        _progress = 0.4;
      });

      // Enrich words (respect subscription limit)
      final enrichLimit = _hasUnlimitedWords ? 100 : wordLimit.clamp(0, 100);
      final wordsToEnrich = words.take(enrichLimit).toList();

      setState(() {
        _statusMessage = 'Fetching definitions and translations...';
        _progress = 0.5;
      });

      // Use book's translation language, fall back to user's native language
      final String translationLanguage = widget.book.translationLanguage ??
          ref.read(nativeLanguageProvider);
      await vocabularyService.enrichWordsWithProgress(
        wordsToEnrich,
        targetLanguage: translationLanguage,
        onProgress: (current, total) {
          setState(() {
            _wordsEnriched = current;
            _statusMessage = 'Enriching words: $current/$total';
            _progress = 0.5 + (0.5 * current / total);
          });
        },
      );

      setState(() {
        _isExtracting = false;
        _statusMessage = 'Extraction complete!';
        _progress = 1.0;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Extracted $_wordsExtracted words, enriched $_wordsEnriched'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _isExtracting = false;
        _statusMessage = 'Error: ${e.toString()}';
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error extracting vocabulary: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Extract Vocabulary'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.book.title,
                                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                              ),
                              if (widget.book.author != null) ...[
                                const SizedBox(height: 4),
                                Text(
                                  widget.book.author!,
                                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                        color: Colors.grey,
                                      ),
                                ),
                              ],
                              const SizedBox(height: 12),
                              const Divider(),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  const Icon(Icons.library_books, size: 20),
                                  const SizedBox(width: 8),
                                  Text('Format: ${widget.book.format.toUpperCase()}'),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Extraction Progress',
                                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                              ),
                              const SizedBox(height: 16),
                              LinearProgressIndicator(
                                value: _progress,
                                minHeight: 8,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                _statusMessage,
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                              if (_wordsExtracted > 0) ...[
                                const SizedBox(height: 16),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                                  children: [
                                    _StatItem(
                                      icon: Icons.abc,
                                      label: 'Extracted',
                                      value: '$_wordsExtracted',
                                    ),
                                    _StatItem(
                                      icon: Icons.check_circle,
                                      label: 'Enriched',
                                      value: '$_wordsEnriched',
                                    ),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Card(
                        color: Theme.of(context).colorScheme.primaryContainer,
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(
                                    Icons.info_outline,
                                    color: Theme.of(context).colorScheme.onPrimaryContainer,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      'About Extraction',
                                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                            fontWeight: FontWeight.bold,
                                            color:
                                                Theme.of(context).colorScheme.onPrimaryContainer,
                                          ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'This process will:\n'
                                '• Extract unique words from the book\n'
                                '• Filter out common words (a, the, is, etc.)\n'
                                '• Fetch definitions from dictionary API\n'
                                '• Add translations for vocabulary practice',
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: Theme.of(context).colorScheme.onPrimaryContainer,
                                    ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      if (!_hasUnlimitedWords) ...[
                        const SizedBox(height: 16),
                        Card(
                          color: Theme.of(context).colorScheme.secondaryContainer,
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Icon(
                                      Icons.lock_outline,
                                      color: Theme.of(context).colorScheme.onSecondaryContainer,
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Text(
                                        'Free Tier Limit',
                                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                              fontWeight: FontWeight.bold,
                                              color: Theme.of(context)
                                                  .colorScheme
                                                  .onSecondaryContainer,
                                            ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'You can extract up to $_wordLimit words per book. Upgrade to Plus or Pro for more words.',
                                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                        color:
                                            Theme.of(context).colorScheme.onSecondaryContainer,
                                      ),
                                ),
                                const SizedBox(height: 12),
                                SizedBox(
                                  width: double.infinity,
                                  child: ElevatedButton.icon(
                                    onPressed: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (context) => const PaywallScreen(
                                            featureName: 'Unlimited word extraction',
                                          ),
                                        ),
                                      );
                                    },
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Theme.of(context).colorScheme.primary,
                                      foregroundColor: Theme.of(context).colorScheme.onPrimary,
                                    ),
                                    icon: const Icon(Icons.upgrade),
                                    label: const Text('Upgrade Now'),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              if (_isExtracting) ...[
                const SizedBox(height: 12),
                LinearProgressIndicator(
                  value: _progress,
                  minHeight: 6,
                  borderRadius: BorderRadius.circular(3),
                ),
                const SizedBox(height: 8),
                Text(
                  '${(_progress * 100).toStringAsFixed(0)}% — $_statusMessage',
                  style: Theme.of(context).textTheme.bodySmall,
                  textAlign: TextAlign.center,
                ),
              ],
              const SizedBox(height: 16),
              SizedBox(
                height: 56,
                child: ElevatedButton.icon(
                  onPressed: _isExtracting ? null : _startExtraction,
                  icon: _isExtracting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.sync),
                  label: Text(
                    _isExtracting
                        ? '${(_progress * 100).toStringAsFixed(0)}% Extracting...'
                        : 'Start Extraction',
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _StatItem({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(
          icon,
          size: 32,
          color: Theme.of(context).colorScheme.primary,
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.primary,
              ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
}
