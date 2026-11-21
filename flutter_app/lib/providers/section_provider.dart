import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/book.dart';
import '../models/reading_section.dart';
import '../models/word.dart';
import '../repositories/reading_section_repository.dart';
import '../repositories/word_repository.dart';
import '../services/vocabulary/word_extraction_service.dart';
import 'package:uuid/uuid.dart';

final sectionProvider = StateNotifierProvider.family<SectionNotifier, SectionState, String>(
  (ref, bookId) => SectionNotifier(bookId),
);

class SectionNotifier extends StateNotifier<SectionState> {
  final String bookId;
  final Uuid _uuid = const Uuid();
  final ReadingSectionRepository _sectionRepository = ReadingSectionRepository();

  SectionNotifier(this.bookId) : super(SectionState.initial()) {
    loadSections();
  }

  Future<void> loadSections() async {
    state = state.copyWith(isLoading: true);

    try {
      final sections = await _sectionRepository.getSectionsByBook(bookId);

      state = state.copyWith(
        sections: sections,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// [sectionSize]'s meaning depends on [type]:
  ///  - [SectionType.wordCount]: target distinct new words per section.
  ///  - [SectionType.pages]: fixed pages per section.
  ///  - [SectionType.chapters]: ignored — one section per real chapter.
  /// Each branch reduces to a list of 1-indexed page numbers where a section
  /// ends ("cut points"); the loop below turns those into contiguous,
  /// non-overlapping [ReadingSection]s the same way regardless of type.
  Future<void> generateSections({
    required Book book,
    required SectionType type,
    required int sectionSize,
    required String userId,
  }) async {
    state = state.copyWith(isLoading: true);

    try {
      final extractionService = WordExtractionService();
      List<int> cutPages;

      switch (type) {
        case SectionType.wordCount:
          cutPages = await _wordCountCutPages(
            extractionService,
            book,
            sectionSize,
          );
          break;
        case SectionType.chapters:
          cutPages = await _chapterCutPages(extractionService, book);
          break;
        case SectionType.pages:
          cutPages = _fixedPageCutPages(book.totalPages, sectionSize);
          break;
      }

      final sections = <ReadingSection>[];
      var sectionNumber = 1;
      var sectionStartPage = 1;

      for (final endPage in cutPages) {
        if (endPage < sectionStartPage) continue; // defensive: skip degenerate ranges

        sections.add(
          ReadingSection()
            ..sectionId = _uuid.v4()
            ..bookId = bookId
            ..userId = userId
            ..sectionNumber = sectionNumber
            ..startPage = sectionStartPage
            ..endPage = endPage
            ..sectionType = type
            ..status = sectionNumber == 1
                ? SectionStatus.readyToPractice
                : SectionStatus.locked
            ..createdAt = DateTime.now()
            ..updatedAt = DateTime.now(),
        );

        sectionNumber++;
        sectionStartPage = endPage + 1;
      }

      // Delete existing sections for this book, then save the new list.
      await _sectionRepository.replaceSections(bookId, sections);

      await loadSections();
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Walks the book page-by-page, accumulating each page's distinct words,
  /// and cuts a section as soon as that running count reaches
  /// [targetWordsPerSection]. Fixed page counts put far more vocabulary into
  /// early sections than later ones, since the start of a book is where
  /// almost every word is unseen — later pages mostly recycle vocabulary
  /// already introduced; this keeps every section's practice load even
  /// instead.
  Future<List<int>> _wordCountCutPages(
    WordExtractionService extractionService,
    Book book,
    int targetWordsPerSection,
  ) async {
    final wordsByPage = await extractionService.extractDistinctWordsByPage(book);
    final totalPages = wordsByPage.isNotEmpty ? wordsByPage.length : book.totalPages;

    final cutPages = <int>[];
    final wordsInCurrentSection = <String>{};

    for (var pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      final page = pageIndex + 1;
      if (pageIndex < wordsByPage.length) {
        wordsInCurrentSection.addAll(wordsByPage[pageIndex]);
      }

      final isLastPage = page == totalPages;
      if (wordsInCurrentSection.length >= targetWordsPerSection || isLastPage) {
        cutPages.add(page);
        wordsInCurrentSection.clear();
      }
    }

    return cutPages;
  }

  /// One section per real chapter. Only meaningful for EPUBs — the UI only
  /// offers this for format 'epub', but a non-EPUB book falls back to a
  /// single section covering the whole book rather than throwing.
  Future<List<int>> _chapterCutPages(
    WordExtractionService extractionService,
    Book book,
  ) async {
    if (book.format.toLowerCase() != 'epub') {
      return [book.totalPages];
    }

    final endPages = await extractionService.extractChapterEndPages(book);
    if (endPages.isEmpty) return [book.totalPages];

    // The last detected chapter doesn't always reach the book's last page
    // (e.g. trailing non-dominant-language back matter that flattenToWords
    // excludes but totalPages still counts) — make sure the final section
    // still reaches the end of the book.
    if (endPages.last < book.totalPages) {
      return [...endPages, book.totalPages];
    }
    return endPages;
  }

  List<int> _fixedPageCutPages(int totalPages, int pagesPerSection) {
    final cutPages = <int>[];
    for (var page = pagesPerSection; page < totalPages; page += pagesPerSection) {
      cutPages.add(page);
    }
    if (totalPages > 0) cutPages.add(totalPages);
    return cutPages;
  }

  Future<List<Word>> startPractice(ReadingSection section, Book book) async {
    try {
      state = state.copyWith(isExtracting: true, extractionProgress: 0.0);

      // Extract words from section
      final extractionService = WordExtractionService();
      final words = await extractionService.extractWordsFromSection(
        book: book,
        startPage: section.startPage,
        endPage: section.endPage,
      );

      // Update section
      final dbSection = await _sectionRepository.getSectionById(section.sectionId);

      if (dbSection != null) {
        dbSection.status = SectionStatus.practicing;
        dbSection.totalWords = words.length;
        dbSection.practiceStartedAt = DateTime.now();

        await _sectionRepository.updateSection(dbSection);
      }

      state = state.copyWith(
        isExtracting: false,
        extractionProgress: 1.0,
      );

      await loadSections();
      return words;
    } catch (e) {
      state = state.copyWith(
        isExtracting: false,
        error: e.toString(),
      );
      return <Word>[];
    }
  }

  Future<void> updatePracticeProgress({
    required String sectionId,
    required int masteredWords,
    required double recognitionRate,
    required double threshold,
  }) async {
    try {
      final section = await _sectionRepository.getSectionById(sectionId);

      if (section != null) {
        section.masteredWords = masteredWords;
        section.recognitionRate = recognitionRate;

        if (recognitionRate >= threshold) {
          section.status = SectionStatus.readyToRead;
          section.isUnlocked = true;
          section.practiceCompletedAt = DateTime.now();
        }

        await _sectionRepository.updateSection(section);

        await loadSections();
      }
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> startReading(String sectionId) async {
    try {
      final section = await _sectionRepository.getSectionById(sectionId);

      if (section != null) {
        section.status = SectionStatus.reading;
        section.readingStartedAt = DateTime.now();

        await _sectionRepository.updateSection(section);

        await loadSections();
      }
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> completeReading(String sectionId) async {
    try {
      final section = await _sectionRepository.getSectionById(sectionId);

      if (section != null) {
        section.status = SectionStatus.completed;
        section.readingCompletedAt = DateTime.now();

        await _sectionRepository.updateSection(section);

        // Unlock next section
        final nextSection = await _sectionRepository.getSectionByNumber(
          bookId,
          section.sectionNumber + 1,
        );

        if (nextSection != null && nextSection.status == SectionStatus.locked) {
          nextSection.status = SectionStatus.readyToPractice;

          await _sectionRepository.updateSection(nextSection);
        }

        await loadSections();
      }
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<List<Word>> getSectionWords(ReadingSection section) async {
    return await WordRepository().getWordsByBook(section.bookId);
  }
}

class SectionState {
  final List<ReadingSection> sections;
  final bool isLoading;
  final bool isExtracting;
  final double extractionProgress;
  final String? error;

  SectionState({
    required this.sections,
    required this.isLoading,
    required this.isExtracting,
    required this.extractionProgress,
    this.error,
  });

  factory SectionState.initial() {
    return SectionState(
      sections: [],
      isLoading: false,
      isExtracting: false,
      extractionProgress: 0.0,
    );
  }

  SectionState copyWith({
    List<ReadingSection>? sections,
    bool? isLoading,
    bool? isExtracting,
    double? extractionProgress,
    String? error,
  }) {
    return SectionState(
      sections: sections ?? this.sections,
      isLoading: isLoading ?? this.isLoading,
      isExtracting: isExtracting ?? this.isExtracting,
      extractionProgress: extractionProgress ?? this.extractionProgress,
      error: error,
    );
  }
}
