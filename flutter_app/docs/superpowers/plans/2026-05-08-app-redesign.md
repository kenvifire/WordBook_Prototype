# WordBook App Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the app from 4 fragmented tabs to 2 cohesive tabs (Library + Practice) with a Book Hub (Read/Words/Progress inline tabs), Forest Green visual theme with rounded soft UI elements.

**Architecture:** Replace the 4-tab `HomeScreen` with a 2-tab `MainScreen` (Library, Practice). Settings moves to a profile icon in the AppBar. Each book opens a `BookHubScreen` with an internal `TabBar` (Read, Words, Progress) that consolidates what were previously separate screens.

**Tech Stack:** Flutter, Riverpod, Material 3, Google Fonts (Inter), Material Symbols Rounded

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `lib/screens/home/main_screen.dart` | CREATE | 2-tab shell (Library, Practice) with profile icon |
| `lib/screens/home/book_hub_screen.dart` | CREATE | Book detail with 3 inline tabs (Read, Words, Progress) |
| `lib/screens/home/practice_screen.dart` | CREATE | Streak card, due words, weekly chart, global stats |
| `lib/screens/home/streak_service.dart` | CREATE | Persist daily streak to SharedPreferences |
| `lib/screens/home/home_screen.dart` | DELETE | Old 4-tab layout |
| `lib/core/theme/app_theme.dart` | MODIFY | Replace purple with forest green, update radii |
| `lib/screens/bookshelf/book_detail_screen.dart` | MODIFY | Redirect to BookHubScreen, keep language selectors |
| `lib/screens/bookshelf/bookshelf_screen.dart` | MODIFY | Remove sign-out from AppBar (moved to profile icon) |
| `lib/screens/settings/settings_screen.dart` | MODIFY | Add sign-out, accessible via profile icon |

---

### Task 1: Forest Green Theme — Colors & Corner Radii

**Files:**
- Modify: `lib/core/theme/app_theme.dart`

- [ ] **Step 1: Replace the color scheme with Forest Green**

Replace the entire `lightTheme()` and `darkTheme()` methods:

```dart
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const _primaryGreen = Color(0xFF2E7D32);
  static const _onPrimary = Color(0xFFFFFFFF);
  static const _primaryContainer = Color(0xFFA5D6A7);
  static const _secondary = Color(0xFF1B5E20);
  static const _surfaceLight = Color(0xFFF5FAF5);
  static const _surfaceDark = Color(0xFF0D1A0E);

  static ThemeData lightTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.light(
        primary: _primaryGreen,
        onPrimary: _onPrimary,
        primaryContainer: _primaryContainer,
        onPrimaryContainer: const Color(0xFF002106),
        secondary: _secondary,
        onSecondary: _onPrimary,
        error: const Color(0xFFBA1A1A),
        onError: _onPrimary,
        surface: _surfaceLight,
        onSurface: const Color(0xFF1A1C1A),
        surfaceContainerHighest: const Color(0xFFDEE5D8),
      ),
      textTheme: GoogleFonts.interTextTheme(),
      appBarTheme: AppBarTheme(
        centerTitle: false,
        elevation: 0,
        backgroundColor: _surfaceLight,
        foregroundColor: const Color(0xFF1A1C1A),
      ),
      cardTheme: CardThemeData(
        elevation: 1,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          side: const BorderSide(width: 1.5),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        filled: true,
        fillColor: const Color(0xFFE8F0E8),
      ),
      navigationBarTheme: NavigationBarThemeData(
        indicatorShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  static ThemeData darkTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.dark(
        primary: const Color(0xFF81C784),
        onPrimary: const Color(0xFF003910),
        primaryContainer: const Color(0xFF1B5E20),
        onPrimaryContainer: const Color(0xFFA5D6A7),
        secondary: const Color(0xFFA5D6A7),
        onSecondary: const Color(0xFF003910),
        error: const Color(0xFFFFB4AB),
        onError: const Color(0xFF690005),
        surface: _surfaceDark,
        onSurface: const Color(0xFFE0E3DC),
        surfaceContainerHighest: const Color(0xFF232B22),
      ),
      textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
      appBarTheme: AppBarTheme(
        centerTitle: false,
        elevation: 0,
        backgroundColor: _surfaceDark,
        foregroundColor: const Color(0xFFE0E3DC),
      ),
      cardTheme: CardThemeData(
        elevation: 1,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        color: const Color(0xFF1A2A1A),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          side: const BorderSide(width: 1.5),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        filled: true,
        fillColor: const Color(0xFF1A2A1A),
      ),
      navigationBarTheme: NavigationBarThemeData(
        indicatorShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}
```

- [ ] **Step 2: Verify theme compiles**

Run: `cd /Users/kenvi/code/WordBook && dart analyze lib/core/theme/app_theme.dart`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/core/theme/app_theme.dart
git commit -m "feat: Forest Green theme with rounded soft UI elements"
```

---

### Task 2: Create MainScreen — 2-Tab Shell

**Files:**
- Create: `lib/screens/home/main_screen.dart`
- Modify: `lib/main.dart` (use MainScreen instead of HomeScreen)
- Keep: `lib/screens/home/home_screen.dart` (delete later)

- [ ] **Step 1: Write MainScreen**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../bookshelf/bookshelf_screen.dart';
import 'practice_screen.dart';
import '../settings/settings_screen.dart';

class MainScreen extends ConsumerStatefulWidget {
  const MainScreen({super.key});

  @override
  ConsumerState<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends ConsumerState<MainScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_currentIndex == 0 ? 'Library' : 'Practice'),
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
      body: IndexedStack(
        index: _currentIndex,
        children: const [
          BookshelfScreen(),
          PracticeScreen(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.library_books_outlined),
            selectedIcon: Icon(Icons.library_books),
            label: 'Library',
          ),
          NavigationDestination(
            icon: Icon(Icons.psychology_outlined),
            selectedIcon: Icon(Icons.psychology),
            label: 'Practice',
          ),
        ],
      ),
    );
  }
}
```

- [ ] **Step 2: Wire MainScreen into main.dart**

In `lib/main.dart`, replace `import 'screens/home/home_screen.dart'` with `import 'screens/home/main_screen.dart'`. Then change `home: const AuthWrapper()` → the AuthWrapper already returns `HomeScreen()` when logged in — change it to `MainScreen()`.

- [ ] **Step 3: Create placeholder PracticeScreen stub**

Create `lib/screens/home/practice_screen.dart` with a minimal placeholder:

```dart
import 'package:flutter/material.dart';

class PracticeScreen extends StatelessWidget {
  const PracticeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(child: Text('Practice'));
  }
}
```

- [ ] **Step 4: Verify compiles**

Run: `cd /Users/kenvi/code/WordBook && dart analyze lib/screens/home/`

Expected: No errors (PracticeScreen is a stub for now).

- [ ] **Step 5: Commit**

```bash
git add lib/screens/home/main_screen.dart lib/screens/home/practice_screen.dart lib/main.dart
git commit -m "feat: 2-tab MainScreen replacing old 4-tab HomeScreen"
```

---

### Task 3: Create BookHubScreen — Book Detail with 3 Tabs

**Files:**
- Create: `lib/screens/home/book_hub_screen.dart`
- Modify: `lib/screens/bookshelf/bookshelf_screen.dart` (tap opens BookHubScreen)
- Modify: `lib/screens/bookshelf/book_detail_screen.dart` (keep language UI, remove reading buttons)

- [ ] **Step 1: Write BookHubScreen**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/book.dart';
import '../../providers/books_state_provider.dart';
import '../../providers/language_provider.dart';
import '../reader/reader_screen.dart';
import '../reading/section_selection_screen.dart';
import '../reading/word_list_screen.dart';
import '../vocabulary/vocabulary_extraction_screen.dart';
import '../bookshelf/book_detail_screen.dart' as detail;

class BookHubScreen extends ConsumerStatefulWidget {
  final Book book;
  const BookHubScreen({super.key, required this.book});

  @override
  ConsumerState<BookHubScreen> createState() => _BookHubScreenState();
}

class _BookHubScreenState extends ConsumerState<BookHubScreen>
    with SingleTickerProviderStateMixin {
  late final _tabController = TabController(length: 3, vsync: this);
  late Book _book = widget.book;

  @override
  Widget build(BuildContext context) {
    final progress = _book.totalPages > 0
        ? _book.currentPage / _book.totalPages
        : 0.0;
    final isReading = _book.status == BookStatus.reading;

    return Scaffold(
      appBar: AppBar(
        title: Text(_book.title),
      ),
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
                Text(
                  _book.title,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: Colors.white, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                if (_book.author != null) ...[
                  const SizedBox(height: 4),
                  Text(_book.author!, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white70)),
                ],
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(3),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 6,
                    backgroundColor: Colors.white24,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '${(progress * 100).toStringAsFixed(0)}% · $_book.currentPage/${_book.totalPages} pages',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.white60),
                ),
              ],
            ),
          ),
          // Tab bar
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
                _ReadTab(book: _book),
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
  const _ReadTab({required this.book});

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
                onPressed: () {
                  Navigator.push(context,
                    MaterialPageRoute(builder: (_) => ReaderScreen(book: book)));
                },
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
              onPressed: () {
                Navigator.push(context,
                  MaterialPageRoute(builder: (_) => SectionSelectionScreen(book: book)));
              },
              icon: const Icon(Icons.auto_stories_outlined),
              label: const Text('Section Reading'),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 52,
            child: OutlinedButton.icon(
              onPressed: () {
                Navigator.push(context,
                  MaterialPageRoute(builder: (_) => ReaderScreen(book: book)));
              },
              icon: const Icon(Icons.menu_book_outlined),
              label: const Text('Free Read'),
            ),
          ),
          const Spacer(),
          // Language info row
          Container(
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: Theme.of(context).dividerColor)),
            ),
            child: Text(
              'Language: ${book.language?.toUpperCase() ?? "Unknown"}',
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }
}

class _ProgressTab extends ConsumerWidget {
  final Book book;
  const _ProgressTab({required this.book});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Reading Progress', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          _StatRow(label: 'Status', value: book.status.name),
          _StatRow(label: 'Current Page', value: '${book.currentPage} / ${book.totalPages}'),
          _StatRow(label: 'Progress',
            value: '${book.totalPages > 0 ? (book.currentPage / book.totalPages * 100).toStringAsFixed(0) : 0}%'),
          if (book.lastReadAt != null)
            _StatRow(label: 'Last Read', value: _formatDate(book.lastReadAt!)),
        ],
      ),
    );
  }

  String _formatDate(DateTime dt) => '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
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
```

- [ ] **Step 2: Wire bookshelf to use BookHubScreen**

In `lib/screens/bookshelf/bookshelf_screen.dart`, change both `BookCard` and `BookListTile` `onTap` handlers to navigate to `BookHubScreen(book: book)` instead of `BookDetailScreen(book: book)`.

Also change the bottom sheet "View Details" and "Start Reading" options similarly.

- [ ] **Step 3: Verify compiles**

Run: `cd /Users/kenvi/code/WordBook && dart analyze lib/screens/home/book_hub_screen.dart lib/screens/bookshelf/bookshelf_screen.dart`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add lib/screens/home/book_hub_screen.dart lib/screens/bookshelf/bookshelf_screen.dart
git commit -m "feat: BookHubScreen with 3 inline tabs replacing BookDetailScreen"
```

---

### Task 4: Build PracticeScreen

**Files:**
- Modify: `lib/screens/home/practice_screen.dart` (replace stub)

- [ ] **Step 1: Write full PracticeScreen**

Replace the placeholder with the full implementation:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isar/isar.dart';
import '../../models/book.dart';
import '../../models/word.dart';
import '../../services/database_service.dart';
import '../../services/srs/srs_service.dart';
import '../../providers/auth_provider.dart';
import '../vocabulary/word_practice_screen.dart';

class PracticeScreen extends ConsumerStatefulWidget {
  const PracticeScreen({super.key});

  @override
  ConsumerState<PracticeScreen> createState() => _PracticeScreenState();
}

class _PracticeScreenState extends ConsumerState<PracticeScreen> {
  Map<String, List<Word>> _wordsByBook = {};
  List<Book> _books = [];
  bool _isLoading = true;
  int _todayCount = 0;
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

      final isar = await DatabaseService.isar;

      final books = await isar.books
          .filter().userIdEqualTo(user.uid).findAll();
      final allWords = await isar.words
          .filter().userIdEqualTo(user.uid).findAll();

      final srs = SRSService();
      final dueWords = srs.getDueWords(allWords);

      final byBook = <String, List<Word>>{};
      for (final w in dueWords) {
        byBook.putIfAbsent(w.bookId, () => []).add(w);
      }

      final bookMap = {for (final b in books) b.bookId: b};

      if (mounted) {
        setState(() {
          _books = books;
          _wordsByBook = byBook;
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
    if (_isLoading) return const Center(child: CircularProgressIndicator());

    final totalDue = _wordsByBook.values.fold(0, (s, l) => s + l.length);

    return RefreshIndicator(
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
                Text('$_streakDays', style: Theme.of(context).textTheme.displaySmall?.copyWith(
                      color: Colors.white, fontWeight: FontWeight.bold)),
                Text('day streak', style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.white70)),
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
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.white60)),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Stats row
          Row(
            children: [
              _buildStatCard(context, '$_totalLearned', 'Words Learned'),
              const SizedBox(width: 10),
              _buildStatCard(context, '${_books.length}', 'Books'),
              const SizedBox(width: 10),
              _buildStatCard(context, _wordsByBook.isEmpty ? '0' : '${_wordsByBook.length}', 'To Practice'),
            ],
          ),

          const SizedBox(height: 20),

          // Due words by book
          if (_wordsByBook.isNotEmpty) ...[
            Text('Due for Review', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            ..._wordsByBook.entries.map((e) {
              final book = _books.firstWhere((b) => b.bookId == e.key,
                  orElse: () => Book()..title = 'Unknown'..bookId = '');
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                    child: Icon(Icons.menu_book,
                        color: Theme.of(context).colorScheme.onPrimaryContainer),
                  ),
                  title: Text(book.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text('${e.value.length} words due'),
                  trailing: TextButton(
                    onPressed: () {
                      Navigator.push(context, MaterialPageRoute(
                        builder: (_) => WordPracticeScreen(book: book)));
                    },
                    child: const Text('Practice'),
                  ),
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
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey)),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildStatCard(BuildContext context, String value, String label) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              Text(value, style: Theme.of(context).textTheme.headlineSmall?.copyWith(
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
```

- [ ] **Step 2: Verify compiles**

Run: `cd /Users/kenvi/code/WordBook && dart analyze lib/screens/home/practice_screen.dart`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/screens/home/practice_screen.dart
git commit -m "feat: PracticeScreen with streak card, due words, and stats"
```

---

### Task 5: Add Streak Tracking

**Files:**
- Create: `lib/screens/home/streak_service.dart`
- Modify: `lib/screens/home/practice_screen.dart` (wire streak)

- [ ] **Step 1: Write StreakService**

```dart
import 'package:shared_preferences/shared_preferences.dart';

class StreakService {
  static const _lastPracticeKey = 'streak_last_practice';
  static const _streakCountKey = 'streak_count';

  /// Call after any practice session to record today.
  static Future<void> recordPractice() async {
    final prefs = await SharedPreferences.getInstance();
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    final lastStr = prefs.getString(_lastPracticeKey);
    if (lastStr != null) {
      final last = DateTime.parse(lastStr);
      final lastDay = DateTime(last.year, last.month, last.day);
      final diff = today.difference(lastDay).inDays;

      if (diff == 0) return; // Already recorded today
      if (diff == 1) {
        // Consecutive day — increment streak
        final count = prefs.getInt(_streakCountKey) ?? 0;
        await prefs.setInt(_streakCountKey, count + 1);
      } else if (diff > 1) {
        // Streak broken — reset
        await prefs.setInt(_streakCountKey, 1);
      }
    } else {
      await prefs.setInt(_streakCountKey, 1);
    }
    await prefs.setString(_lastPracticeKey, today.toIso8601String());
  }

  /// Returns (streakCount, practicedToday).
  static Future<(int, bool)> getStreak() async {
    final prefs = await SharedPreferences.getInstance();
    final count = prefs.getInt(_streakCountKey) ?? 0;
    final lastStr = prefs.getString(_lastPracticeKey);
    if (lastStr == null) return (0, false);

    final last = DateTime.parse(lastStr);
    final lastDay = DateTime(last.year, last.month, last.day);
    final today = DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);
    final practicedToday = lastDay == today;
    final diff = today.difference(lastDay).inDays;

    if (diff > 1) return (0, false); // Streak broken
    return (count, practicedToday);
  }
}
```

- [ ] **Step 2: Wire into PracticeScreen**

In `PracticeScreen._load()`, after loading data, call `StreakService.getStreak()` and set `_streakDays`. In `WordPracticeScreen`, after completing practice, call `StreakService.recordPractice()`.

- [ ] **Step 3: Commit**

```bash
git add lib/screens/home/streak_service.dart lib/screens/home/practice_screen.dart
git commit -m "feat: daily streak tracking with SharedPreferences"
```

---

### Task 6: Clean Up — Remove Dead Code and Old Screens

- [ ] **Step 1: Remove the dead bookmark and search "coming soon" buttons**

In `lib/screens/reader/reader_screen.dart`, remove the search and bookmark `IconButton` entries from the AppBar actions. Search is now handled via `ReaderSearchDialog` for PDF, and bookmarks are removed until implemented.

- [ ] **Step 2: Remove sign-out from BookshelfScreen AppBar**

Since sign-out is now in Settings, remove the `PopupMenuButton` from `BookshelfScreen` AppBar.

- [ ] **Step 3: Remove old HomeScreen reference from main.dart if still present**

- [ ] **Step 4: Full analysis check**

Run: `cd /Users/kenvi/code/WordBook && flutter analyze 2>&1 | grep "error -"`

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove dead UI buttons and clean up old navigation"
```

---

### Task 7: Build & Verify

- [ ] **Step 1: Full flutter analyze**

Run: `cd /Users/kenvi/code/WordBook && flutter analyze 2>&1`

Expected: No new errors (pre-existing infos/warnings acceptable).

- [ ] **Step 2: Run existing tests**

Run: `cd /Users/kenvi/code/WordBook && flutter test --no-pub 2>&1`

Expected: All existing tests pass.

- [ ] **Step 3: Build and run on simulator**

Run: `cd /Users/kenvi/code/WordBook && flutter run -d ios`

Expected: App launches with Forest Green theme, 2-tab navigation, Book Hub functional, Practice tab showing due words.

- [ ] **Step 4: Commit final adjustments**

```bash
git add -A
git commit -m "chore: final adjustments after integration testing"
```
