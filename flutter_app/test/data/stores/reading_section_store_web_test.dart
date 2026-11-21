import 'package:flutter_test/flutter_test.dart';
import 'package:wordbook/data/stores/reading_section_store_web.dart';
import 'package:wordbook/models/reading_section.dart';
import 'package:wordbook/repositories/reading_section_repository.dart';

ReadingSection _section({
  required String sectionId,
  required String bookId,
  required String userId,
  required int sectionNumber,
}) {
  return ReadingSection()
    ..sectionId = sectionId
    ..bookId = bookId
    ..userId = userId
    ..sectionNumber = sectionNumber
    ..startPage = 1
    ..endPage = 10
    ..sectionType = SectionType.pages
    ..status = SectionStatus.locked;
}

void main() {
  group('WebReadingSectionStore', () {
    test('put assigns a fresh id for id==0, overwrites for an existing id',
        () async {
      final store = WebReadingSectionStore();
      final a = _section(
        sectionId: 's1',
        bookId: 'b1',
        userId: 'u1',
        sectionNumber: 1,
      );
      await store.put(a);
      expect(a.id, isNot(0));
      final fetchedId = a.id;

      a.status = SectionStatus.practicing;
      await store.put(a);

      final fetched = await store.getBySectionId('s1');
      expect(fetched, isNotNull);
      expect(fetched!.id, fetchedId);
      expect(fetched.status, SectionStatus.practicing);
    });

    test('getByBook returns sections sorted by sectionNumber', () async {
      final store = WebReadingSectionStore();
      await store.put(_section(
        sectionId: 's3',
        bookId: 'b1',
        userId: 'u1',
        sectionNumber: 3,
      ));
      await store.put(_section(
        sectionId: 's1',
        bookId: 'b1',
        userId: 'u1',
        sectionNumber: 1,
      ));
      await store.put(_section(
        sectionId: 's2',
        bookId: 'b1',
        userId: 'u1',
        sectionNumber: 2,
      ));
      // Section from a different book must not leak in.
      await store.put(_section(
        sectionId: 's-other',
        bookId: 'b2',
        userId: 'u1',
        sectionNumber: 1,
      ));

      final sections = await store.getByBook('b1');

      expect(sections.map((s) => s.sectionNumber).toList(), [1, 2, 3]);
    });

    test('getByUser returns only sections for that user', () async {
      final store = WebReadingSectionStore();
      await store.put(_section(
        sectionId: 's1',
        bookId: 'b1',
        userId: 'u1',
        sectionNumber: 1,
      ));
      await store.put(_section(
        sectionId: 's2',
        bookId: 'b1',
        userId: 'u2',
        sectionNumber: 1,
      ));

      final sections = await store.getByUser('u1');

      expect(sections.length, 1);
      expect(sections.first.sectionId, 's1');
    });

    test('getByBookAndNumber returns the matching section or null', () async {
      final store = WebReadingSectionStore();
      await store.put(_section(
        sectionId: 's1',
        bookId: 'b1',
        userId: 'u1',
        sectionNumber: 1,
      ));

      expect(await store.getByBookAndNumber('b1', 1), isNotNull);
      expect(await store.getByBookAndNumber('b1', 2), isNull);
      expect(await store.getByBookAndNumber('b2', 1), isNull);
    });

    test('deleteByBook removes only sections for that book', () async {
      final store = WebReadingSectionStore();
      await store.put(_section(
        sectionId: 's1',
        bookId: 'b1',
        userId: 'u1',
        sectionNumber: 1,
      ));
      await store.put(_section(
        sectionId: 's2',
        bookId: 'b2',
        userId: 'u1',
        sectionNumber: 1,
      ));

      await store.deleteByBook('b1');

      expect(await store.getBySectionId('s1'), isNull);
      expect(await store.getBySectionId('s2'), isNotNull);
    });
  });

  group('createReadingSectionStore', () {
    test(
        'returns the same in-memory store across calls, so a section put '
        'through one reference is visible through another (regression: '
        'ReadingSectionRepository constructs ad hoc at every call site — a '
        'non-memoized factory would mean nothing written ever survives to '
        'the next call)', () async {
      final first = createReadingSectionStore();
      final second = createReadingSectionStore();

      final section = _section(
        sectionId: 'shared',
        bookId: 'b1',
        userId: 'u1',
        sectionNumber: 1,
      );
      await first.put(section);

      expect(await second.getBySectionId('shared'), isNotNull);
    });
  });

  group('ReadingSectionRepository addSection vs updateSection', () {
    test(
        'addSection does a raw put and does NOT bump updatedAt — the '
        'cloud-sync "brand-new section from cloud" case relies on the '
        "cloud's own updatedAt surviving, not being stomped with now()",
        () async {
      final repo = ReadingSectionRepository(WebReadingSectionStore());
      final originalUpdatedAt = DateTime(2020, 1, 1);
      final section = _section(
        sectionId: 'add-1',
        bookId: 'b1',
        userId: 'u1',
        sectionNumber: 1,
      )..updatedAt = originalUpdatedAt;

      await repo.addSection(section);

      final fetched = await repo.getSectionById('add-1');
      expect(fetched, isNotNull);
      expect(fetched!.updatedAt, originalUpdatedAt);
    });

    test(
        'updateSection bumps updatedAt to now before putting — for '
        'mutating a section that already exists locally', () async {
      final repo = ReadingSectionRepository(WebReadingSectionStore());
      final staleUpdatedAt = DateTime(2020, 1, 1);
      final section = _section(
        sectionId: 'update-1',
        bookId: 'b1',
        userId: 'u1',
        sectionNumber: 1,
      )..updatedAt = staleUpdatedAt;

      // Seed it first via addSection (as if it already existed locally).
      await repo.addSection(section);

      final before = DateTime.now();
      await repo.updateSection(section);
      final after = DateTime.now();

      expect(section.updatedAt, isNot(staleUpdatedAt));
      expect(
        section.updatedAt.isAfter(before.subtract(const Duration(seconds: 1))),
        isTrue,
      );
      expect(
        section.updatedAt.isBefore(after.add(const Duration(seconds: 1))),
        isTrue,
      );

      final fetched = await repo.getSectionById('update-1');
      expect(fetched!.updatedAt, section.updatedAt);
    });
  });
}
