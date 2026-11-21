import 'package:epub_parser/epub_parser.dart' as epub;
import 'vocabulary/language_detection_service.dart';

/// Flattens an EPUB's chapters (pre-order, including nested sub-chapters)
/// into one ordered word list, independent of chapter boundaries.
///
/// A "page" for an EPUB is defined here as a fixed-size chunk of
/// [wordsPerPage] words. This must be used both when a book is first
/// uploaded (to compute `totalPages`, which section generation divides up)
/// and when extracting a specific page range for section practice —
/// otherwise a "page" means something different in each place and section
/// boundaries stop lining up with what was actually counted.
///
/// Chapters whose own language doesn't match the book's dominant language
/// are skipped entirely. Many EPUBs (especially multi-book "bundles") mix
/// the actual story content with front/back matter in a different language
/// — a title page, "about the author", ads for other books, etc. — and
/// without this, that boilerplate gets extracted as vocabulary right
/// alongside the real content.
class EpubPagination {
  // 100 (not the more "book-like" 250) so a single page's vocabulary count
  // stays small enough for By Words section targets to actually bite —
  // measured empirically: at 250 words/page, a typical page already holds
  // 80-100 distinct words after filtering, which made any section target
  // below ~100 collapse to exactly one page every time.
  static const int wordsPerPage = 100;
  static final LanguageDetectionService _languageDetector = LanguageDetectionService();

  // Standalone token inserted where a block-level tag (paragraph, heading,
  // list item, line break, ...) closed in the source HTML. Surrounded by
  // spaces so it always survives the `\s+` word split as its own token,
  // then stripped back out by whichever caller doesn't care about it.
  static const String _paragraphMarker = '\u0001PARA\u0001';

  static List<String> flattenToWords(List<epub.EpubChapter>? chapters) {
    return _chaptersInDominantLanguage(chapters).expand((words) => words).toList();
  }

  /// Same word stream as [flattenToWords], paired with whether each word is
  /// the first word of a new paragraph/heading/chapter in the original
  /// markup. [flattenToWords] alone throws that structure away (it's just a
  /// flat word list, chunked by [wordsPerPage] for pagination) — the reader
  /// needs this to put chapter titles and paragraphs back on their own
  /// lines instead of running everything together.
  static ({List<String> words, List<bool> isParagraphStart}) flattenToWordsWithParagraphBreaks(
      List<epub.EpubChapter>? chapters) {
    final words = <String>[];
    final isParagraphStart = <bool>[];

    for (final chapterTokens in _chaptersInDominantLanguage(chapters, keepParagraphMarkers: true)) {
      var atParagraphStart = true;
      for (final token in chapterTokens) {
        if (token == _paragraphMarker) {
          atParagraphStart = true;
          continue;
        }
        words.add(token);
        isParagraphStart.add(atParagraphStart);
        atParagraphStart = false;
      }
    }

    return (words: words, isParagraphStart: isParagraphStart);
  }

  /// 1-indexed page numbers where each real chapter ends, in reading order —
  /// e.g. `[12, 30, 41]` means chapter 1 spans pages 1-12, chapter 2 spans
  /// 13-30, chapter 3 spans 31-41. Chapters filtered out of [flattenToWords]
  /// (empty, or not in the book's dominant language) produce no boundary.
  /// Consecutive duplicate page numbers are collapsed, since a very short
  /// chapter can end on the same page it started.
  static List<int> chapterEndPages(List<epub.EpubChapter>? chapters) {
    final endPages = <int>[];
    var wordOffset = 0;

    for (final words in _chaptersInDominantLanguage(chapters)) {
      if (words.isEmpty) continue;
      wordOffset += words.length;
      final endPage = ((wordOffset - 1) ~/ wordsPerPage) + 1;
      if (endPages.isEmpty || endPages.last != endPage) {
        endPages.add(endPage);
      }
    }

    return endPages;
  }

  /// This book's chapters, in reading order, filtered to the book's
  /// dominant language and already split into words — the shared filtering
  /// both [flattenToWords] and [chapterEndPages] build on, so a "page" and
  /// a "chapter boundary" are always computed from the exact same text.
  static List<List<String>> _chaptersInDominantLanguage(
    List<epub.EpubChapter>? chapters, {
    bool keepParagraphMarkers = false,
  }) {
    if (chapters == null) return [];

    final flatChapters = <epub.EpubChapter>[];
    _flatten(chapters, flatChapters);

    final chapterTexts = <String>[];
    final chapterLanguages = <String>[];
    final wordCountByLanguage = <String, int>{};

    for (final chapter in flatChapters) {
      final text = chapter.HtmlContent != null
          ? _stripHtml(chapter.HtmlContent!, keepParagraphMarkers: keepParagraphMarkers)
          : '';
      chapterTexts.add(text);

      if (text.trim().isEmpty) {
        chapterLanguages.add('');
        continue;
      }

      // Language detection/word-count only care about real words, never
      // the paragraph-marker tokens.
      final languageSampleText = keepParagraphMarkers
          ? text.replaceAll(_paragraphMarker, ' ')
          : text;
      final language = _languageDetector.detectLanguage(languageSampleText);
      chapterLanguages.add(language);
      final wordCount =
          languageSampleText.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).length;
      wordCountByLanguage[language] = (wordCountByLanguage[language] ?? 0) + wordCount;
    }

    if (wordCountByLanguage.isEmpty) return [];

    final dominantLanguage =
        wordCountByLanguage.entries.reduce((a, b) => a.value >= b.value ? a : b).key;

    final result = <List<String>>[];
    for (var i = 0; i < flatChapters.length; i++) {
      if (chapterLanguages[i] != dominantLanguage) continue;
      result.add(chapterTexts[i].split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList());
    }

    return result;
  }

  static void _flatten(List<epub.EpubChapter> chapters, List<epub.EpubChapter> out) {
    for (final chapter in chapters) {
      out.add(chapter);
      if (chapter.SubChapters != null && chapter.SubChapters!.isNotEmpty) {
        _flatten(chapter.SubChapters!, out);
      }
    }
  }

  static String _stripHtml(String html, {bool keepParagraphMarkers = false}) {
    var text = html;
    if (keepParagraphMarkers) {
      // Mark where a block-level element closed, before those tags (and
      // every other tag) get thrown away below — otherwise a heading and
      // the paragraph right after it collapse onto the same line once
      // the content is rejoined word-by-word for display.
      text = text.replaceAll(
        RegExp(r'</(p|div|h[1-6]|li|blockquote|tr)\s*>|<br\s*/?>', caseSensitive: false),
        ' $_paragraphMarker ',
      );
    }
    return text
        .replaceAll(RegExp(r'<[^>]*>'), '')
        .replaceAll('&nbsp;', ' ')
        .trim();
  }
}
