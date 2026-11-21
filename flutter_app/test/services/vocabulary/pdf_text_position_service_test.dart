import 'dart:typed_data';
import 'dart:ui';

import 'package:flutter_test/flutter_test.dart';
import 'package:syncfusion_flutter_pdf/pdf.dart';
import 'package:wordbook/services/vocabulary/pdf_text_position_service.dart';

/// Builds a real one-page PDF with known text, in-process, rather than
/// hand-crafting PDF bytes (error-prone — see the EPUB fixture lesson).
Uint8List _buildTestPdf(String text) {
  final document = PdfDocument();
  document.pages.add().graphics.drawString(
        text,
        PdfStandardFont(PdfFontFamily.helvetica, 20),
        bounds: const Rect.fromLTWH(20, 20, 400, 40),
      );
  final bytes = document.saveSync();
  document.dispose();
  return Uint8List.fromList(bytes);
}

void main() {
  group('PdfTextPositionService', () {
    test('extractWordsFromPage finds the words on a real page', () {
      final bytes = _buildTestPdf('Hello world test');
      final service = PdfTextPositionService();

      final result = service.extractWordsFromPage(bytes, 0);

      expect(result.map((w) => w.text), containsAll(['Hello', 'world', 'test']));
      for (final word in result) {
        expect(word.pageIndex, 0);
        expect(word.width, greaterThan(0));
        expect(word.height, greaterThan(0));
      }
    });

    test('extractWordsFromPage returns empty list for garbage bytes', () {
      final service = PdfTextPositionService();
      final result = service.extractWordsFromPage(
        Uint8List.fromList([1, 2, 3, 4]),
        0,
      );
      expect(result, isEmpty);
    });

    test('extractPageTexts finds the page text by 1-indexed page number', () {
      final bytes = _buildTestPdf('Searchable content here');
      final service = PdfTextPositionService();

      final result = service.extractPageTexts(bytes, startPage: 0, endPage: 0);

      expect(result[1], contains('Searchable'));
    });

    test('extractPageTexts returns empty map for garbage bytes', () {
      final service = PdfTextPositionService();
      final result = service.extractPageTexts(Uint8List.fromList([9, 9, 9]));
      expect(result, isEmpty);
    });
  });

  group('PdfWordPosition', () {
    test('holds correct values', () {
      final pos = PdfWordPosition(
        text: 'hello',
        x: 10.0,
        y: 20.0,
        width: 30.0,
        height: 12.0,
        pageIndex: 0,
      );

      expect(pos.text, 'hello');
      expect(pos.x, 10.0);
      expect(pos.y, 20.0);
      expect(pos.width, 30.0);
      expect(pos.height, 12.0);
      expect(pos.pageIndex, 0);
    });
  });
}
