import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:wordbook/services/book/book_service.dart';

void main() {
  group('BookService.parseBookBytes', () {
    test('parses a .txt the same way parseBook does for a file with the same content', () async {
      final service = BookService();
      final bytes = Uint8List.fromList(utf8.encode('line one\nline two'));
      final content = await service.parseBookBytes(bytes, '.txt', 'My Book');
      expect(content.pages, ['line one\nline two']);
      expect(content.title, 'My Book');
    });
  });
}
