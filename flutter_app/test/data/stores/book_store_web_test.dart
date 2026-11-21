import 'package:flutter_test/flutter_test.dart';
import 'package:wordbook/data/stores/book_store_web.dart';
import 'package:wordbook/models/book.dart';

void main() {
  group('WebBookStore', () {
    test('put assigns a fresh id for id==0, overwrites for an existing id',
        () async {
      final store = WebBookStore();
      final a = Book()
        ..bookId = 'a'
        ..title = 'A'
        ..format = 'txt'
        ..localPath = 'a.txt'
        ..status = BookStatus.notStarted;
      await store.put(a);
      expect(a.id, isNot(0));
      final fetchedId = a.id;
      a.title = 'changed';
      await store.put(a);
      final all = await store.getAll();
      expect(all.where((b) => b.id == fetchedId).length, 1);
      expect(all.first.title, 'changed');
    });

    test('getAll sorts by lastReadAt desc, with and without a userId filter',
        () async {
      final store = WebBookStore();

      final oldest = Book()
        ..bookId = 'old'
        ..userId = 'user1'
        ..title = 'Old'
        ..format = 'txt'
        ..localPath = 'old.txt'
        ..status = BookStatus.notStarted
        ..lastReadAt = DateTime(2020, 1, 1);
      final middle = Book()
        ..bookId = 'mid'
        ..userId = 'user2'
        ..title = 'Mid'
        ..format = 'txt'
        ..localPath = 'mid.txt'
        ..status = BookStatus.notStarted
        ..lastReadAt = DateTime(2021, 1, 1);
      final newest = Book()
        ..bookId = 'new'
        ..userId = 'user1'
        ..title = 'New'
        ..format = 'txt'
        ..localPath = 'new.txt'
        ..status = BookStatus.notStarted
        ..lastReadAt = DateTime(2022, 1, 1);

      await store.put(oldest);
      await store.put(middle);
      await store.put(newest);

      final all = await store.getAll();
      expect(all.map((b) => b.bookId).toList(), ['new', 'mid', 'old']);

      final user1Only = await store.getAll(userId: 'user1');
      expect(user1Only.map((b) => b.bookId).toList(), ['new', 'old']);
    });
  });

  group('createBookStore', () {
    test(
        'returns the same in-memory store across calls, so a book put '
        'through one reference is visible through another (regression: '
        'BookRepository constructs ad hoc at every call site — a '
        'non-memoized factory would mean nothing written ever survives to '
        'the next call)', () async {
      final first = createBookStore();
      final second = createBookStore();

      final book = Book()
        ..bookId = 'shared'
        ..title = 'Shared'
        ..format = 'txt'
        ..localPath = 'shared.txt'
        ..status = BookStatus.notStarted;
      await first.put(book);

      final allFromSecond = await second.getAll();
      expect(allFromSecond.map((b) => b.bookId), contains('shared'));
      expect(await second.getById('shared'), isNotNull);
    });
  });
}
