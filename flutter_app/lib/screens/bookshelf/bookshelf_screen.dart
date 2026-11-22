import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_provider.dart';
import '../../providers/books_state_provider.dart';
import '../../providers/subscription_provider.dart';
import '../../services/subscription_service.dart';
import '../../widgets/common/book_card.dart';
import '../../widgets/common/book_list_tile.dart';
import '../home/book_hub_screen.dart';
import '../reader/reader_screen.dart';
import '../settings/settings_screen.dart';
import '../subscription/paywall_screen.dart';
import 'generate_book_screen.dart';

class BookshelfScreen extends ConsumerStatefulWidget {
  const BookshelfScreen({super.key});

  @override
  ConsumerState<BookshelfScreen> createState() => _BookshelfScreenState();
}

class _BookshelfScreenState extends ConsumerState<BookshelfScreen> {
  Future<void> _handleAddBook() async {
    final booksState = ref.read(booksStateProvider);
    final currentBookCount = booksState.books.length;

    if (!SubscriptionService.instance.canAddBook(currentBookCount)) {
      final entitlements = ref.read(subscriptionEntitlementsProvider);
      final result = await Navigator.push<bool>(
        context,
        MaterialPageRoute(
          builder: (context) => PaywallScreen(
            featureName: 'Add more than ${entitlements.maxBooks} books',
          ),
        ),
      );

      if (result != true) return;
    }

    await ref.read(booksStateProvider.notifier).uploadBook();
  }

  void _showAddBookOptions(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.upload_file),
              title: const Text('Upload Book'),
              onTap: () {
                Navigator.pop(context);
                _handleAddBook();
              },
            ),
            ListTile(
              leading: const Icon(Icons.auto_awesome),
              title: const Text('Generate Book'),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const GenerateBookScreen(),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final booksState = ref.watch(booksStateProvider);

    ref.listen<BooksState>(booksStateProvider, (previous, next) {
      if (next.error != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.error!),
            action: SnackBarAction(
              label: 'Dismiss',
              onPressed: () {
                ref.read(booksStateProvider.notifier).clearError();
              },
            ),
          ),
        );
      }
      if (next.generationError != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.generationError!),
            action: SnackBarAction(
              label: 'Dismiss',
              onPressed: () {
                ref.read(booksStateProvider.notifier).clearGenerationError();
              },
            ),
          ),
        );
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Bookshelf'),
        bottom: booksState.isGenerating
            ? const PreferredSize(
                preferredSize: Size.fromHeight(32),
                child: _GeneratingBanner(),
              )
            : null,
        actions: [
          if (booksState.books.isNotEmpty)
            IconButton(
              icon: Icon(
                booksState.viewMode == ViewMode.grid
                    ? Icons.view_list
                    : Icons.grid_view,
              ),
              onPressed: () {
                ref.read(booksStateProvider.notifier).toggleViewMode();
              },
              tooltip: booksState.viewMode == ViewMode.grid
                  ? 'List View'
                  : 'Grid View',
            ),
          IconButton(
            icon: Icon(booksState.isUploading ? Icons.close : Icons.add),
            onPressed: booksState.isUploading
                ? () => ref.read(booksStateProvider.notifier).cancelUpload()
                : () => _showAddBookOptions(context),
            tooltip: booksState.isUploading ? 'Cancel upload' : 'Add Book',
          ),
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
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            onSelected: (value) {
              if (value == 'logout') {
                _showLogoutDialog(context, ref);
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout),
                    SizedBox(width: 12),
                    Text('Sign Out'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: _buildBody(booksState),
      floatingActionButton: booksState.books.isEmpty
          ? null
          : FloatingActionButton.extended(
              onPressed: booksState.isUploading
                  ? () => ref.read(booksStateProvider.notifier).cancelUpload()
                  : () => _showAddBookOptions(context),
              icon: booksState.isUploading
                  ? const Icon(Icons.close)
                  : const Icon(Icons.add),
              label: Text(booksState.isUploading ? 'Cancel' : 'Add Book'),
            ),
    );
  }

  Widget _buildBody(BooksState state) {
    if (state.isLoading && state.books.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (state.books.isEmpty) {
      return _buildEmptyState(state);
    }

    if (state.viewMode == ViewMode.grid) {
      return RefreshIndicator(
        onRefresh: () async {
          await ref.read(booksStateProvider.notifier).loadBooks();
        },
        child: GridView.builder(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 88),
          gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
            maxCrossAxisExtent: 160,
            childAspectRatio: 0.72,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
          ),
          itemCount: state.books.length,
          itemBuilder: (context, index) {
            final book = state.books[index];
            final isExtracting = state.isExtracting && state.extractingBookId == book.bookId;
            return BookCard(
              book: book,
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => BookHubScreen(book: book),
                  ),
                );
              },
              onLongPress: () => _showBookOptions(context, book),
              isExtracting: isExtracting,
              extractionProgress: isExtracting ? state.extractionProgress : 0.0,
            );
          },
        ),
      );
    } else {
      return RefreshIndicator(
        onRefresh: () async {
          await ref.read(booksStateProvider.notifier).loadBooks();
        },
        child: ListView.builder(
          padding: const EdgeInsets.fromLTRB(0, 8, 0, 88),
          itemCount: state.books.length,
          itemBuilder: (context, index) {
            final book = state.books[index];
            final isExtracting = state.isExtracting && state.extractingBookId == book.bookId;
            return BookListTile(
              book: book,
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => BookHubScreen(book: book),
                  ),
                );
              },
              onLongPress: () => _showBookOptions(context, book),
              isExtracting: isExtracting,
              extractionProgress: isExtracting ? state.extractionProgress : 0.0,
            );
          },
        ),
      );
    }
  }

  Widget _buildEmptyState(BooksState booksState) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.menu_book,
              size: 120,
              color: Theme.of(context).colorScheme.primary.withValues(alpha:0.5),
            ),
            const SizedBox(height: 24),
            Text(
              'No books yet',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 12),
            Text(
              'Start your language learning journey by adding your first book',
              style: Theme.of(context).textTheme.bodyLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: booksState.isUploading
                  ? () => ref.read(booksStateProvider.notifier).cancelUpload()
                  : () => _showAddBookOptions(context),
              icon: Icon(booksState.isUploading ? Icons.close : Icons.upload_file),
              label: Text(booksState.isUploading ? 'Cancel' : 'Add Book'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(
                  horizontal: 32,
                  vertical: 16,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Supported formats: TXT, PDF, EPUB, MOBI',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }

  void _showBookOptions(BuildContext context, book) {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.info_outline),
              title: const Text('View Details'),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => BookHubScreen(book: book),
                  ),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.play_arrow),
              title: const Text('Start Reading'),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => ReaderScreen(book: book),
                  ),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.delete_outline, color: Colors.red),
              title: const Text(
                'Delete',
                style: TextStyle(color: Colors.red),
              ),
              onTap: () {
                Navigator.pop(context);
                _showDeleteDialog(context, book);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showDeleteDialog(BuildContext context, book) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Book'),
        content: Text('Are you sure you want to delete "${book.title}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await ref.read(booksStateProvider.notifier).deleteBook(book.bookId);
            },
            child: const Text(
              'Delete',
              style: TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }

  void _showLogoutDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              final authService = ref.read(authServiceProvider);
              await authService.signOut();
            },
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }
}

class _GeneratingBanner extends StatelessWidget {
  const _GeneratingBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 32,
      alignment: Alignment.center,
      color: Theme.of(context).colorScheme.primaryContainer,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(
            width: 14,
            height: 14,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          const SizedBox(width: 8),
          Text(
            'Generating your book…',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}
