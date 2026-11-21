import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_provider.dart';
import '../../models/book.dart';
import '../../models/word.dart';
import '../../repositories/book_repository.dart';
import '../../repositories/word_repository.dart';
import 'book_statistics_screen.dart';

class StatisticsScreen extends ConsumerStatefulWidget {
  const StatisticsScreen({super.key});

  @override
  ConsumerState<StatisticsScreen> createState() => _StatisticsScreenState();
}

class _StatisticsScreenState extends ConsumerState<StatisticsScreen> {
  int _totalBooks = 0;
  int _booksReading = 0;
  int _booksCompleted = 0;
  int _totalWords = 0;
  int _wordsMastered = 0;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadStatistics();
  }

  Future<void> _loadStatistics() async {
    setState(() => _isLoading = true);

    try {
      final user = ref.read(currentUserProvider);
      if (user == null) return;

      final books = await BookRepository().getAllBooks(userId: user.uid);

      final words = await WordRepository().getWordsByUser(user.uid);

      if (mounted) {
        setState(() {
          _totalBooks = books.length;
          _booksReading = books.where((b) => b.status == BookStatus.reading).length;
          _booksCompleted = books.where((b) => b.status == BookStatus.completed).length;
          _totalWords = words.length;
          _wordsMastered = words.where((w) => w.status == WordStatus.mastered).length;
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
    return Scaffold(
      appBar: AppBar(
        title: const Text('Statistics'),
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
                    Text(
                      'Overview',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: _StatCard(
                            icon: Icons.book,
                            title: 'Total Books',
                            value: '$_totalBooks',
                            color: Colors.blue,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _StatCard(
                            icon: Icons.menu_book,
                            title: 'Reading',
                            value: '$_booksReading',
                            color: Colors.orange,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _StatCard(
                            icon: Icons.check_circle,
                            title: 'Completed',
                            value: '$_booksCompleted',
                            color: Colors.green,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _StatCard(
                            icon: Icons.abc,
                            title: 'Total Words',
                            value: '$_totalWords',
                            color: Colors.purple,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _StatCard(
                      icon: Icons.star,
                      title: 'Words Mastered',
                      value: '$_wordsMastered',
                      subtitle: _totalWords > 0
                          ? '${((_wordsMastered / _totalWords) * 100).toStringAsFixed(1)}% mastery'
                          : null,
                      color: Colors.amber,
                    ),
                    const SizedBox(height: 32),
                    Text(
                      'Books',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 16),
                    _BookStatisticsList(),
                  ],
                ),
              ),
            ),
    );
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
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 24),
                const Spacer(),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 4),
              Text(
                subtitle!,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey,
                    ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _BookStatisticsList extends ConsumerStatefulWidget {
  @override
  ConsumerState<_BookStatisticsList> createState() => _BookStatisticsListState();
}

class _BookStatisticsListState extends ConsumerState<_BookStatisticsList> {
  List<Book> _books = [];

  @override
  void initState() {
    super.initState();
    _loadBooks();
  }

  Future<void> _loadBooks() async {
    final user = ref.read(currentUserProvider);
    if (user == null) return;

    final books = await BookRepository().getAllBooks(userId: user.uid);

    if (mounted) {
      setState(() {
        _books = books;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_books.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32.0),
          child: Text('No books yet'),
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _books.length,
      itemBuilder: (context, index) {
        final book = _books[index];
        final progress = book.totalPages > 0
            ? (book.currentPage / book.totalPages * 100).toStringAsFixed(0)
            : '0';

        return Card(
          margin: const EdgeInsets.only(bottom: 8),
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
              '${book.currentPage}/${book.totalPages} pages • $progress%',
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => BookStatisticsScreen(book: book),
                ),
              );
            },
          ),
        );
      },
    );
  }
}
