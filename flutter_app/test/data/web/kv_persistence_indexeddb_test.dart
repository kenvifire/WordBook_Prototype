@TestOn('chrome')
library;

import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:wordbook/data/web/kv_persistence_indexeddb.dart';

// The real database only creates object stores named in
// kv_persistence_indexeddb.dart's `_objectStoreNames` (there's no public
// API to create an arbitrary one from a test), so these tests target real
// store names and isolate between cases with unique keys instead of
// unique store names.
String _uniqueKey(String prefix) =>
    '${prefix}_${DateTime.now().microsecondsSinceEpoch}';

void main() {
  group('IndexedDbJsonPersistence', () {
    test('save then loadAll/get round-trips the same string', () async {
      final store = IndexedDbJsonPersistence('statistics');
      final k1 = _uniqueKey('k1');
      final k2 = _uniqueKey('k2');
      await store.save(k1, '{"hello":"world"}');
      await store.save(k2, '{"n":2}');

      expect(await store.get(k1), '{"hello":"world"}');
      final all = await store.loadAll();
      expect(all, containsAll(['{"hello":"world"}', '{"n":2}']));
    });

    test('save overwrites an existing key', () async {
      final store = IndexedDbJsonPersistence('statistics');
      final k = _uniqueKey('overwrite');
      await store.save(k, 'first');
      await store.save(k, 'second');

      expect(await store.get(k), 'second');
    });

    test('delete removes the record', () async {
      final store = IndexedDbJsonPersistence('statistics');
      final k = _uniqueKey('delete');
      await store.save(k, 'v');
      await store.delete(k);

      expect(await store.get(k), isNull);
    });

    test('get returns null for an unknown key', () async {
      final store = IndexedDbJsonPersistence('statistics');
      expect(await store.get(_uniqueKey('missing')), isNull);
    });
  });

  group('IndexedDbBytesPersistence', () {
    test('save then loadAll/get round-trips the same bytes', () async {
      final store = IndexedDbBytesPersistence('files');
      final key = _uniqueKey('b1');
      final bytes = Uint8List.fromList([1, 2, 3, 4, 250, 255]);
      await store.save(key, bytes);

      expect(await store.get(key), bytes);
    });

    test('delete removes the bytes', () async {
      final store = IndexedDbBytesPersistence('files');
      final key = _uniqueKey('bdel');
      final bytes = Uint8List.fromList([9, 9, 9]);
      await store.save(key, bytes);
      await store.delete(key);

      expect(await store.get(key), isNull);
    });
  });
}
