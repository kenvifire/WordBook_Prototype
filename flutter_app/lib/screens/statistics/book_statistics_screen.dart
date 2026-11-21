import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/book.dart';
import '../../models/word.dart';
import '../../repositories/word_repository.dart';

class BookStatisticsScreen extends ConsumerStatefulWidget {
  final Book book;

  const BookStatisticsScreen({
    super.key,
    required this.book,
  });

  @override
  ConsumerState<BookStatisticsScreen> createState() => _BookStatisticsScreenState();
}

class _BookStatisticsScreenState extends ConsumerState<BookStatisticsScreen> {
  int _totalWords = 0;
  int _newWords = 0;
  int _learningWords = 0;
  int _reviewingWords = 0;
  int _masteredWords = 0;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadStatistics();
  }

  Future<void> _loadStatistics() async {
    setState(() => _isLoading = true);

    try {
      final words = await WordRepository().getWordsByBook(widget.book.bookId);

      if (mounted) {
        setState(() {
          _totalWords = words.length;
          _newWords = words.where((w) => w.status == WordStatus.newWord).length;
          _learningWords = words.where((w) => w.status == WordStatus.learning).length;
          _reviewingWords = words.where((w) => w.status == WordStatus.reviewing).length;
          _masteredWords = words.where((w) => w.status == WordStatus.mastered).length;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading statistics: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final progress = widget.book.totalPages > 0
        ? widget.book.currentPage / widget.book.totalPages
        : 0.0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Book Statistics'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadStatistics,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.book.title,
                              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                            ),
                            if (widget.book.author != null) ...[
                              const SizedBox(height: 4),
                              Text(
                                widget.book.author!,
                                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                      color: Colors.grey,
                                    ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'Reading Progress',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 16),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Progress',
                                  style: Theme.of(context).textTheme.bodyLarge,
                                ),
                                Text(
                                  '${(progress * 100).toStringAsFixed(1)}%',
                                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                        fontWeight: FontWeight.bold,
                                        color: Theme.of(context).colorScheme.primary,
                                      ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            LinearProgressIndicator(
                              value: progress,
                              minHeight: 8,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Page ${widget.book.currentPage} of ${widget.book.totalPages}',
                                  style: Theme.of(context).textTheme.bodyMedium,
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'Vocabulary Progress',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 16),
                    _StatCard(
                      icon: Icons.abc,
                      title: 'Total Words',
                      value: '$_totalWords',
                      color: Colors.blue,
                    ),
                    const SizedBox(height: 12),
                    _StatCard(
                      icon: Icons.fiber_new,
                      title: 'New Words',
                      value: '$_newWords',
                      subtitle: _totalWords > 0
                          ? '${((_newWords / _totalWords) * 100).toStringAsFixed(0)}%'
                          : null,
                      color: Colors.grey,
                    ),
                    const SizedBox(height: 12),
                    _StatCard(
                      icon: Icons.school,
                      title: 'Learning',
                      value: '$_learningWords',
                      subtitle: _totalWords > 0
                          ? '${((_learningWords / _totalWords) * 100).toStringAsFixed(0)}%'
                          : null,
                      color: Colors.orange,
                    ),
                    const SizedBox(height: 12),
                    _StatCard(
                      icon: Icons.refresh,
                      title: 'Reviewing',
                      value: '$_reviewingWords',
                      subtitle: _totalWords > 0
                          ? '${((_reviewingWords / _totalWords) * 100).toStringAsFixed(0)}%'
                          : null,
                      color: Colors.purple,
                    ),
                    const SizedBox(height: 12),
                    _StatCard(
                      icon: Icons.star,
                      title: 'Mastered',
                      value: '$_masteredWords',
                      subtitle: _totalWords > 0
                          ? '${((_masteredWords / _totalWords) * 100).toStringAsFixed(0)}%'
                          : null,
                      color: Colors.amber,
                    ),
                    const SizedBox(height: 24),
                    if (widget.book.lastReadAt != null) ...[
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Row(
                            children: [
                              Icon(
                                Icons.access_time,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                              const SizedBox(width: 12),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Last Read',
                                    style: Theme.of(context).textTheme.bodySmall,
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    _formatDate(widget.book.lastReadAt!),
                                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                          fontWeight: FontWeight.w500,
                                        ),
                                  ),
                                ],
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
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) {
      return 'Today';
    } else if (difference.inDays == 1) {
      return 'Yesterday';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} days ago';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final String? subtitle;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.title,
    required this.value,
    this.subtitle,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withValues(alpha:0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        value,
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: color,
                            ),
                      ),
                      if (subtitle != null) ...[
                        const SizedBox(width: 8),
                        Text(
                          subtitle!,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: Colors.grey,
                              ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
