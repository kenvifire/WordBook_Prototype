import 'package:flutter_test/flutter_test.dart';
import 'package:wordbook/data/stores/word_store_web.dart';
import 'package:wordbook/models/word.dart';

void main() {
  group('WebWordStore', () {
    test('put assigns a fresh id for id==0, overwrites for an existing id',
        () async {
      final store = WebWordStore();
      final a = Word()
        ..wordId = 'a'
        ..word = 'apple'
        ..bookId = 'b'
        ..status = WordStatus.newWord
        ..extractionMethod = ExtractionMethod.manual;
      await store.put(a);
      expect(a.id, isNot(0));
      final fetchedId = a.id;
      a.definition = 'changed';
      await store.put(a);
      final all = await store.getByBook('b');
      expect(all.where((w) => w.id == fetchedId).length, 1);
      expect(all.first.definition, 'changed');
    });

    test(
        'getByUser(null) matches words whose own userId is null, not words '
        "with userId=='' (regression: a null userId must not be coerced to "
        'an empty-string sentinel, since no real Word ever has userId=="")',
        () async {
      final store = WebWordStore();
      final noUser = Word()
        ..wordId = 'no-user'
        ..word = 'orphan'
        ..bookId = 'b'
        ..status = WordStatus.newWord
        ..extractionMethod = ExtractionMethod.manual
        ..userId = null;
      final withUser = Word()
        ..wordId = 'has-user'
        ..word = 'owned'
        ..bookId = 'b'
        ..status = WordStatus.newWord
        ..extractionMethod = ExtractionMethod.manual
        ..userId = 'user1';
      await store.putAll([noUser, withUser]);

      final matchedNull = await store.getByUser(null);
      expect(matchedNull.map((w) => w.wordId).toList(), ['no-user']);

      final matchedUser1 = await store.getByUser('user1');
      expect(matchedUser1.map((w) => w.wordId).toList(), ['has-user']);
    });

    test('getDue matches null nextReviewDate OR a past one, not just past',
        () async {
      final store = WebWordStore();
      final neverReviewed = Word()
        ..wordId = 'never'
        ..word = 'never'
        ..bookId = 'b'
        ..status = WordStatus.newWord
        ..extractionMethod = ExtractionMethod.manual
        ..nextReviewDate = null;
      final overdue = Word()
        ..wordId = 'overdue'
        ..word = 'overdue'
        ..bookId = 'b'
        ..status = WordStatus.newWord
        ..extractionMethod = ExtractionMethod.manual
        ..nextReviewDate = DateTime.now().subtract(const Duration(days: 1));
      final future = Word()
        ..wordId = 'future'
        ..word = 'future'
        ..bookId = 'b'
        ..status = WordStatus.newWord
        ..extractionMethod = ExtractionMethod.manual
        ..nextReviewDate = DateTime.now().add(const Duration(days: 1));
      await store.putAll([neverReviewed, overdue, future]);
      final due = await store.getDue('b', DateTime.now());
      expect(due.length, 2);
    });
  });

  group('createWordStore', () {
    test(
        'returns the same in-memory store across calls, so a word put '
        'through one reference is visible through another (regression: '
        'WordRepository constructs ad hoc at every call site — a '
        'non-memoized factory would mean nothing written ever survives to '
        'the next call)', () async {
      final first = createWordStore();
      final second = createWordStore();

      final word = Word()
        ..wordId = 'shared'
        ..word = 'shared'
        ..bookId = 'b'
        ..status = WordStatus.newWord
        ..extractionMethod = ExtractionMethod.manual;
      await first.put(word);

      final allFromSecond = await second.getByBook('b');
      expect(allFromSecond.map((w) => w.wordId), contains('shared'));
      expect(await second.getById(word.wordId), isNotNull);
    });
  });
}
