import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:wordbook/data/file_io/book_file_io_web.dart';

void main() {
  group('WebBookFileIO', () {
    test('store then readBytes round-trips the same bytes', () async {
      final io = WebBookFileIO();
      final bytes = Uint8List.fromList([1, 2, 3]);
      final ref = await io.store('book-1', 'a.txt', bytes);
      expect(await io.readBytes(ref), bytes);
    });

    test('storeCover then readBytes round-trips the same bytes', () async {
      final io = WebBookFileIO();
      final bytes = Uint8List.fromList([4, 5, 6]);
      final ref = await io.storeCover('book-1', bytes);
      expect(ref, isNotNull);
      expect(await io.readBytes(ref!), bytes);
    });

    test('readBytes throws for an unknown reference', () async {
      final io = WebBookFileIO();
      expect(() => io.readBytes('does-not-exist'), throwsException);
    });

    test('deleteByReference removes the bytes', () async {
      final io = WebBookFileIO();
      final bytes = Uint8List.fromList([7, 8, 9]);
      final ref = await io.store('book-2', 'b.txt', bytes);
      await io.deleteByReference(ref);
      expect(() => io.readBytes(ref), throwsException);
    });

    test('resolveStalePath always returns null', () async {
      final io = WebBookFileIO();
      expect(await io.resolveStalePath('anything'), isNull);
    });

    test('supportsPersistentCache is false', () {
      expect(WebBookFileIO().supportsPersistentCache, isFalse);
    });

    test('two store calls on the same instance produce distinct references',
        () async {
      final io = WebBookFileIO();
      final bytes = Uint8List.fromList([1]);
      final refA = await io.store('book-a', 'a.txt', bytes);
      final refB = await io.store('book-b', 'b.txt', bytes);
      expect(refA, isNot(refB));
    });
  });

  group('TTS cache (resolveTtsCachePath/writeLocalFile/readLocalFile)', () {
    test('resolveTtsCachePath returns the key unchanged (no real file path '
        'on web)', () async {
      expect(await resolveTtsCachePath('en_abc123'), 'en_abc123');
    });

    test('writeLocalFile then readLocalFile round-trips the same bytes',
        () async {
      final bytes = Uint8List.fromList([10, 20, 30]);
      await writeLocalFile('tts-key-1', bytes);
      expect(await readLocalFile('tts-key-1'), bytes);
    });

    test('readLocalFile returns null for a key never written', () async {
      expect(await readLocalFile('tts-key-never-written'), isNull);
    });

    test('localFileExists is always false on web (unreachable — the TTS '
        'cache uses readLocalFile instead)', () async {
      expect(await localFileExists('anything'), isFalse);
    });
  });

  group('createBookFileIO', () {
    test(
        'returns the same in-memory instance across calls, so bytes stored '
        'through one reference are visible through another (regression: '
        'production code calls createBookFileIO() ad hoc at many call '
        'sites — a non-memoized factory would mean uploaded bytes vanish '
        'between calls)', () async {
      final first = createBookFileIO();
      final second = createBookFileIO();

      final bytes = Uint8List.fromList([42]);
      final ref = await first.store('shared-book', 'shared.txt', bytes);

      expect(await second.readBytes(ref), bytes);
    });
  });
}
