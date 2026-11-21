import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/book.dart';
import '../../models/reading_section.dart';
import '../../providers/section_provider.dart';
import '../../providers/auth_provider.dart';
import '../../screens/settings/words_settings_screen.dart';
import '../reader/reader_screen.dart';
import 'section_practice_screen.dart';
import 'word_list_screen.dart';

class SectionSelectionScreen extends ConsumerStatefulWidget {
  final Book book;

  const SectionSelectionScreen({
    super.key,
    required this.book,
  });

  @override
  ConsumerState<SectionSelectionScreen> createState() => _SectionSelectionScreenState();
}

class _SectionSelectionScreenState extends ConsumerState<SectionSelectionScreen> {
  SectionType _sectionType = SectionType.wordCount;
  // A single EPUB page (100 words, after stop-word/name filtering)
  // typically contains 35-40 distinct words, up to ~50 on a dense page —
  // measured empirically against a real book, not guessed. 75 sits above
  // that per-page ceiling so most sections span 2+ pages instead of
  // collapsing to exactly one.
  int _sectionSize = 75;
  bool _hasGenerated = false;

  bool get _isEpub => widget.book.format.toLowerCase() == 'epub';

  @override
  void initState() {
    super.initState();
    _loadSettings();
    _checkExistingSections();
  }

  Future<void> _loadSettings() async {
    final sectionSize = ref.read(sectionSizeProvider);
    setState(() {
      _sectionSize = sectionSize;
    });
  }

  Future<void> _checkExistingSections() async {
    final state = ref.read(sectionProvider(widget.book.bookId));
    if (state.sections.isNotEmpty) {
      setState(() {
        _hasGenerated = true;
      });
    }
  }

  // Words and Pages sliders use different ranges (10-80 vs 5-50); switching
  // type must clamp the current value into range before the next build,
  // since Slider asserts value is within [min, max].
  void _selectSectionType(SectionType type) {
    setState(() {
      _sectionType = type;
      if (type == SectionType.wordCount) {
        _sectionSize = _sectionSize.clamp(30, 300);
      } else if (type == SectionType.pages) {
        _sectionSize = _sectionSize.clamp(5, 50);
      }
    });
  }

  Future<void> _generateSections() async {
    final user = ref.read(currentUserProvider);
    if (user == null) return;

    await ref.read(sectionProvider(widget.book.bookId).notifier).generateSections(
          book: widget.book,
          type: _sectionType,
          sectionSize: _sectionSize,
          userId: user.uid,
        );

    setState(() {
      _hasGenerated = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final sectionState = ref.watch(sectionProvider(widget.book.bookId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Section Selection'),
      ),
      body: sectionState.isLoading
          ? const Center(child: CircularProgressIndicator())
          : _hasGenerated
              ? _buildSectionList(sectionState)
              : _buildSetupScreen(),
    );
  }

  Widget _buildSetupScreen() {
    return SingleChildScrollView(
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
                      const Icon(Icons.pages, size: 20),
                      const SizedBox(width: 8),
                      Text('Total Pages: ${widget.book.totalPages}'),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Setup Reading Sections',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Section Type',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                  ),
                  const SizedBox(height: 12),
                  RadioListTile<SectionType>(
                    title: const Text('By Words (Recommended)'),
                    subtitle: const Text(
                      'Each section has about the same amount of new vocabulary to practice',
                    ),
                    value: SectionType.wordCount,
                    groupValue: _sectionType,
                    onChanged: (value) {
                      if (value != null) _selectSectionType(value);
                    },
                  ),
                  RadioListTile<SectionType>(
                    title: const Text('By Pages'),
                    subtitle: const Text('A fixed number of pages per section'),
                    value: SectionType.pages,
                    groupValue: _sectionType,
                    onChanged: (value) {
                      if (value != null) _selectSectionType(value);
                    },
                  ),
                  RadioListTile<SectionType>(
                    title: const Text('By Chapters'),
                    subtitle: Text(
                      _isEpub
                          ? "One section per chapter"
                          : 'Only available for EPUB books',
                    ),
                    value: SectionType.chapters,
                    groupValue: _sectionType,
                    onChanged: _isEpub
                        ? (value) {
                            if (value != null) _selectSectionType(value);
                          }
                        : null,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (_sectionType == SectionType.chapters)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Icon(Icons.auto_stories, color: Theme.of(context).colorScheme.primary),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'Each chapter in the book becomes its own section — there\'s nothing to size here.',
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Section Size',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _sectionType == SectionType.wordCount
                          ? 'Target new words per section'
                          : 'Pages per section',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.grey,
                          ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: Slider(
                            value: _sectionSize.toDouble(),
                            min: _sectionType == SectionType.wordCount ? 30 : 5,
                            max: _sectionType == SectionType.wordCount ? 300 : 50,
                            divisions: _sectionType == SectionType.wordCount ? 27 : 9,
                            label: _sectionSize.toString(),
                            onChanged: (value) {
                              setState(() {
                                _sectionSize = value.toInt();
                              });
                            },
                          ),
                        ),
                        SizedBox(
                          width: 60,
                          child: Text(
                            _sectionType == SectionType.wordCount
                                ? '$_sectionSize words'
                                : '$_sectionSize pages',
                            style: Theme.of(context).textTheme.bodyMedium,
                            textAlign: TextAlign.right,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _sectionType == SectionType.wordCount
                          // No cheap accurate section-count estimate exists
                          // here: _totalBookWords is deduped across the
                          // WHOLE book, but each section counts its own
                          // words independently, so words that recur across
                          // many sections (most content words do) get
                          // counted again in each one. The real count can
                          // run several times higher than totalWords/target
                          // — only computing it for real (what Generate
                          // Sections does) would be accurate.
                          ? 'Sections will be sized so each one has about $_sectionSize new words to practice, however many pages that takes'
                          : 'This will create approximately ${(widget.book.totalPages / _sectionSize).ceil()} sections of $_sectionSize pages each',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.grey,
                          ),
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
                        Icons.info_outline,
                        color: Theme.of(context).colorScheme.onPrimaryContainer,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'How it works',
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.onPrimaryContainer,
                              ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    '1. Your book will be divided into sections\n'
                    '2. Before reading each section, practice vocabulary\n'
                    '3. Reach the recognition threshold to unlock reading\n'
                    '4. Progress through sections one by one',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onPrimaryContainer,
                        ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 56,
            child: ElevatedButton.icon(
              onPressed: _generateSections,
              icon: const Icon(Icons.auto_stories),
              label: const Text('Generate Sections'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionList(SectionState state) {
    if (state.sections.isEmpty) {
      return const Center(
        child: Text('No sections available'),
      );
    }

    return Column(
      children: [
        Container(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.book.title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${state.sections.length} sections • ${_getSectionTypeLabel(state.sections.first.sectionType)}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.abc),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => WordListScreen(book: widget.book),
                    ),
                  );
                },
                tooltip: 'Manage words',
              ),
              IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: () {
                  setState(() {
                    _hasGenerated = false;
                  });
                },
                tooltip: 'Regenerate sections',
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: state.sections.length,
            itemBuilder: (context, index) {
              final section = state.sections[index];
              return _SectionCard(
                section: section,
                book: widget.book,
                onTap: () => _handleSectionTap(section),
              );
            },
          ),
        ),
      ],
    );
  }

  String _getSectionTypeLabel(SectionType type) {
    switch (type) {
      case SectionType.wordCount:
        return 'Word-based';
      case SectionType.pages:
        return 'Page-based';
      case SectionType.chapters:
        return 'Chapter-based';
    }
  }

  void _handleSectionTap(ReadingSection section) {
    debugPrint('_handleSectionTap called: section ${section.sectionNumber}, status: ${section.status}');

    if (section.status == SectionStatus.locked) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Complete the previous section first to unlock this one'),
        ),
      );
      return;
    }

    try {
      if (section.status == SectionStatus.readyToPractice ||
          section.status == SectionStatus.practicing) {
        debugPrint('Navigating to practice screen');
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => SectionPracticeScreen(
              book: widget.book,
              section: section,
            ),
          ),
        ).then((justUnlocked) async {
          // Reload sections when returning from practice
          await ref.read(sectionProvider(widget.book.bookId).notifier).loadSections();

          if (justUnlocked == true && mounted) {
            // Section just crossed the recognition threshold — continue
            // straight into the reader instead of leaving the user back on
            // the list needing to tap "Start Reading" again.
            ref.read(sectionProvider(widget.book.bookId).notifier).startReading(section.sectionId);
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => _SectionReaderScreen(
                  book: widget.book,
                  section: section,
                ),
              ),
            ).then((_) {
              ref.read(sectionProvider(widget.book.bookId).notifier).loadSections();
            });
          }
        });
      } else if (section.status == SectionStatus.readyToRead ||
          section.status == SectionStatus.reading) {
        debugPrint('Navigating to section reader screen');
        // Mark as reading and navigate to reader
        ref.read(sectionProvider(widget.book.bookId).notifier).startReading(section.sectionId);
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => _SectionReaderScreen(
              book: widget.book,
              section: section,
            ),
          ),
        ).then((_) {
          debugPrint('Returned from section reader');
          // Reload sections when returning from reading
          ref.read(sectionProvider(widget.book.bookId).notifier).loadSections();
        });
      } else if (section.status == SectionStatus.completed) {
        debugPrint('Navigating to section reader screen (re-reading)');
        // Allow re-reading completed sections
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => _SectionReaderScreen(
              book: widget.book,
              section: section,
            ),
          ),
        );
      }
    } catch (e, stackTrace) {
      debugPrint('Error navigating to reader: $e');
      debugPrint('Stack trace: $stackTrace');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error opening reader: $e')),
      );
    }
  }
}

class _SectionCard extends StatelessWidget {
  final ReadingSection section;
  final Book book;
  final VoidCallback onTap;

  const _SectionCard({
    required this.section,
    required this.book,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isLocked = section.status == SectionStatus.locked;
    final isCompleted = section.status == SectionStatus.completed;
    final hasReadButton = section.status == SectionStatus.readyToRead ||
        section.status == SectionStatus.reading;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        // Don't use InkWell tap if we have a dedicated button for reading
        onTap: (isLocked || hasReadButton) ? null : onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  _buildStatusIcon(),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Section ${section.sectionNumber}',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: isLocked ? Colors.grey : null,
                              ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Pages ${section.startPage}-${section.endPage}',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: Colors.grey,
                              ),
                        ),
                      ],
                    ),
                  ),
                  if (isLocked)
                    const Icon(Icons.lock_outline, color: Colors.grey)
                  else if (isCompleted)
                    const Icon(Icons.check_circle, color: Colors.green)
                  else if (!hasReadButton)
                    const Icon(Icons.chevron_right),
                ],
              ),
              if (!isLocked && section.totalWords > 0) ...[
                const SizedBox(height: 12),
                const Divider(),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _buildStat(
                        context,
                        'Words',
                        '${section.totalWords}',
                        Icons.abc,
                      ),
                    ),
                    if (section.masteredWords > 0)
                      Expanded(
                        child: _buildStat(
                          context,
                          'Mastered',
                          '${section.masteredWords}',
                          Icons.check,
                        ),
                      ),
                    if (section.recognitionRate > 0)
                      Expanded(
                        child: _buildStat(
                          context,
                          'Recognition',
                          '${(section.recognitionRate * 100).toStringAsFixed(0)}%',
                          Icons.trending_up,
                        ),
                      ),
                  ],
                ),
              ],
              if (hasReadButton) ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      debugPrint('Start Reading button tapped for section ${section.sectionNumber}');
                      onTap();
                    },
                    icon: const Icon(Icons.auto_stories, size: 20),
                    label: Text(
                      section.status == SectionStatus.reading
                          ? 'Continue Reading'
                          : 'Start Reading',
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
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

  Widget _buildStatusIcon() {
    IconData icon;
    Color color;

    switch (section.status) {
      case SectionStatus.locked:
        icon = Icons.lock;
        color = Colors.grey;
        break;
      case SectionStatus.readyToPractice:
        icon = Icons.school_outlined;
        color = Colors.orange;
        break;
      case SectionStatus.practicing:
        icon = Icons.school;
        color = Colors.orange;
        break;
      case SectionStatus.readyToRead:
        icon = Icons.auto_stories;
        color = Colors.green;
        break;
      case SectionStatus.reading:
        icon = Icons.menu_book;
        color = Colors.blue;
        break;
      case SectionStatus.completed:
        icon = Icons.check_circle;
        color = Colors.green;
        break;
    }

    return CircleAvatar(
      backgroundColor: color.withValues(alpha:0.1),
      child: Icon(icon, color: color, size: 20),
    );
  }

  Widget _buildStat(BuildContext context, String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, size: 16, color: Colors.grey),
        const SizedBox(height: 4),
        Text(
          value,
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Colors.grey,
              ),
        ),
      ],
    );
  }
}

/// Section reader screen that wraps the book reader with section-specific functionality
class _SectionReaderScreen extends ConsumerStatefulWidget {
  final Book book;
  final ReadingSection section;

  const _SectionReaderScreen({
    required this.book,
    required this.section,
  });

  @override
  ConsumerState<_SectionReaderScreen> createState() => _SectionReaderScreenState();
}

class _SectionReaderScreenState extends ConsumerState<_SectionReaderScreen> {
  @override
  void initState() {
    super.initState();
    debugPrint('_SectionReaderScreen initState: section ${widget.section.sectionNumber}');
  }

  @override
  Widget build(BuildContext context) {
    debugPrint('_SectionReaderScreen build: section ${widget.section.sectionNumber}');
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.book.title,
              style: const TextStyle(fontSize: 16),
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              'Section ${widget.section.sectionNumber}',
              style: TextStyle(
                fontSize: 12,
                color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: _showSectionInfo,
          ),
        ],
      ),
      body: Column(
        children: [
          // Section progress indicator
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            child: Row(
              children: [
                Icon(
                  Icons.auto_stories,
                  size: 16,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'Pages ${widget.section.startPage} - ${widget.section.endPage}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const Spacer(),
                Text(
                  'Read to the last page to complete',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey,
                  ),
                ),
              ],
            ),
          ),
          // Reader content
          Expanded(
            child: ReaderScreen(
              book: widget.book,
              initialPage: widget.section.startPage,
              embedded: true,
              minPage: widget.section.startPage,
              maxPage: widget.section.endPage,
              onSectionComplete: _completeSection,
            ),
          ),
        ],
      ),
    );
  }

  void _showSectionInfo() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.book.title,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              'Section ${widget.section.sectionNumber}',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Theme.of(context).colorScheme.primary,
                  ),
            ),
            const SizedBox(height: 16),
            _buildInfoItem('Pages', '${widget.section.startPage} - ${widget.section.endPage}'),
            _buildInfoItem('Total Words', '${widget.section.totalWords}'),
            _buildInfoItem('Mastered Words', '${widget.section.masteredWords}'),
            _buildInfoItem(
              'Recognition Rate',
              '${(widget.section.recognitionRate * 100).toStringAsFixed(0)}%',
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Close'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
          Text(
            value,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
        ],
      ),
    );
  }

  Future<void> _completeSection() async {
    // Complete the current section
    await ref
        .read(sectionProvider(widget.book.bookId).notifier)
        .completeReading(widget.section.sectionId);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Section completed! Next section unlocked.'),
          backgroundColor: Colors.green,
        ),
      );
      Navigator.pop(context);
    }
  }
}
