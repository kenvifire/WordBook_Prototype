import 'package:flutter/foundation.dart';
import 'package:syncfusion_flutter_pdf/pdf.dart';

class PdfWordPosition {
  final String text;
  final double x;
  final double y;
  final double width;
  final double height;
  final int pageIndex;

  const PdfWordPosition({
    required this.text,
    required this.x,
    required this.y,
    required this.width,
    required this.height,
    required this.pageIndex,
  });
}

/// Pure-Dart PDF text/position extraction (syncfusion_flutter_pdf has no
/// platform-channel or dart:io dependency, so this works identically on
/// native and web once given bytes directly) — callers read the PDF's
/// bytes once via the cross-platform `BookFileIO.readBytes()` and pass
/// them in here, rather than this service re-reading the whole file on
/// every call itself.
class PdfTextPositionService {
  /// Extract word positions from a single page of a PDF.
  /// Returns empty list if extraction fails (scanned PDF, etc).
  List<PdfWordPosition> extractWordsFromPage(Uint8List bytes, int pageIndex) {
    try {
      final document = PdfDocument(inputBytes: bytes);
      try {
        final textLines = PdfTextExtractor(document).extractTextLines(
          startPageIndex: pageIndex,
          endPageIndex: pageIndex,
        );

        final words = <PdfWordPosition>[];

        for (final line in textLines) {
          for (final word in line.wordCollection) {
            if (word.text.trim().isEmpty) continue;

            words.add(PdfWordPosition(
              text: word.text.trim(),
              x: word.bounds.left,
              y: word.bounds.top,
              width: word.bounds.width,
              height: word.bounds.height,
              pageIndex: pageIndex,
            ));
          }
        }

        return words;
      } finally {
        document.dispose();
      }
    } catch (e) {
      debugPrint('Text position extraction error: $e');
      return [];
    }
  }

  /// Extract text from a page range for search functionality.
  Map<int, String> extractPageTexts(Uint8List bytes, {int? startPage, int? endPage}) {
    try {
      final document = PdfDocument(inputBytes: bytes);
      try {
        final textLines = PdfTextExtractor(document).extractTextLines(
          startPageIndex: startPage,
          endPageIndex: endPage,
        );

        final pageTexts = <int, StringBuffer>{};
        for (final line in textLines) {
          final text = line.wordCollection.map((w) => w.text).join(' ');
          pageTexts.putIfAbsent(line.pageIndex, () => StringBuffer())
            ..write(text)
            ..write(' ');
        }

        return pageTexts.map((k, v) => MapEntry(k + 1, v.toString())); // 1-indexed pages
      } finally {
        document.dispose();
      }
    } catch (e) {
      debugPrint('Text extraction error: $e');
      return {};
    }
  }
}
