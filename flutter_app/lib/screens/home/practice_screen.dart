import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/book.dart';
import '../../models/word.dart';
import '../../repositories/book_repository.dart';
import '../../repositories/word_repository.dart';
import '../../services/srs/srs_service.dart';
import '../../providers/auth_provider.dart';
import '../settings/settings_screen.dart';
import '../vocabulary/word_practice_screen.dart';
import 'streak_service.dart';

class PracticeScreen extends ConsumerStatefulWidget {
  const PracticeScreen({super.key});

  @override
  ConsumerState<PracticeScreen> createState() => _PracticeScreenState();
}

class _PracticeScreenState extends ConsumerState<PracticeScreen> {
  Map<String, List<Word>> _wordsByBook = {};
  List<Book> _books = [];
  bool _isLoading = true;
  int _streakDays = 0;
  int _totalLearned = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _isLoading = true);
    try {
      final user = ref.read(currentUserProvider);
      if (user == null) return;

      final books = await BookRepository().getAllBooks(userId: user.uid);
      final allWords = await WordRepository().getWordsByUser(user.uid);

      final srs = SRSService();
      final dueWords = srs.getDueWords(allWords);

      final byBook = <String, List<Word>>{};
      for (final w in dueWords) {
        byBook.putIfAbsent(w.bookId, () => []).add(w);
      }

      final (streak, _) = await StreakService.getStreak();

      if (mounted) {
        setState(() {
          _books = books;
          _wordsByBook = byBook;
          _streakDays = streak;
          _totalLearned = allWords.where((w) => w.status == WordStatus.mastered).length;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final totalDue = _wordsByBook.values.fold(0, (s, l) => s + l.length);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Practice'),
        actions: [
          IconButton(
            icon: const Icon(Icons.account_circle_outlined),
            tooltip: 'Settings',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const SettingsScreen()),
              );
            },
          ),
        ],
      ),
      body: RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Streak card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Theme.of(context).colorScheme.primary,
                  Theme.of(context).colorScheme.secondary,
                ],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                Text('$_streakDays',
                    style: Theme.of(context).textTheme.displaySmall
                        ?.copyWith(color: Colors.white, fontWeight: FontWeight.bold)),
                Text('day streak',
                    style: Theme.of(context).textTheme.bodyMedium
                        ?.copyWith(color: Colors.white70)),
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(3),
                  child: LinearProgressIndicator(
                    value: totalDue > 0 ? 0 : 1.0,
                    minHeight: 6,
                    backgroundColor: Colors.white24,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 6),
                Text(totalDue > 0 ? '$totalDue words due today' : 'All caught up!',
                    style: Theme.of(context).textTheme.bodySmall
                        ?.copyWith(color: Colors.white60)),
              ],
            ),
          ),
          const SizedBox(height: 20),
          // Stats row - use scrollable to prevent overflow on narrow screens
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildStatCard(context, '$_totalLearned', 'Learned'),
                const SizedBox(width: 10),
                _buildStatCard(context, '${_books.length}', 'Books'),
                const SizedBox(width: 10),
                _buildStatCard(context, '$_streakDays', 'Streak'),
              ],
            ),
          ),
          const SizedBox(height: 20),
          // Due words by book
          if (_wordsByBook.isNotEmpty) ...[
            Text('Due for Review',
                style: Theme.of(context).textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            ..._wordsByBook.entries.map((e) {
              final book = _books.cast<Book?>().firstWhere(
                  (b) => b!.bookId == e.key,
                  orElse: () => null);
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                    child: Icon(Icons.menu_book,
                        color: Theme.of(context).colorScheme.onPrimaryContainer),
                  ),
                  title: Text(book?.title ?? 'Unknown',
                      style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text('${e.value.length} words due'),
                  trailing: book != null
                      ? TextButton(
                          onPressed: () {
                            Navigator.push(context,
                                MaterialPageRoute(
                                    builder: (_) => WordPracticeScreen(book: book)));
                          },
                          child: const Text('Practice'),
                        )
                      : null,
                ),
              );
            }),
          ] else
            Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  children: [
                    Icon(Icons.check_circle_outline, size: 64,
                        color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.5)),
                    const SizedBox(height: 12),
                    Text('All caught up!', style: Theme.of(context).textTheme.titleMedium),
                    Text('Add books to start learning.',
                        style: Theme.of(context).textTheme.bodySmall
                            ?.copyWith(color: Colors.grey)),
                  ],
                ),
              ),
            ),
        ],
      ),
    ),
    );
  }

  Widget _buildStatCard(BuildContext context, String value, String label) {
    return SizedBox(
      width: 100,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              Text(value,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.primary)),
              Text(label, style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
      ),
    );
  }
}
