import 'dart:convert';

import '../../models/reading_section.dart';
import '../web/kv_persistence.dart';
import '../web/kv_persistence_factory.dart';
import 'reading_section_store.dart';

Map<String, dynamic> _sectionToMap(ReadingSection section) => {
      'id': section.id,
      'sectionId': section.sectionId,
      'bookId': section.bookId,
      'userId': section.userId,
      'sectionNumber': section.sectionNumber,
      'startPage': section.startPage,
      'endPage': section.endPage,
      'sectionType': section.sectionType.name,
      'status': section.status.name,
      'totalWords': section.totalWords,
      'masteredWords': section.masteredWords,
      'recognitionRate': section.recognitionRate,
      'isUnlocked': section.isUnlocked,
      'practiceStartedAt': section.practiceStartedAt?.millisecondsSinceEpoch,
      'practiceCompletedAt':
          section.practiceCompletedAt?.millisecondsSinceEpoch,
      'readingStartedAt': section.readingStartedAt?.millisecondsSinceEpoch,
      'readingCompletedAt':
          section.readingCompletedAt?.millisecondsSinceEpoch,
      'createdAt': section.createdAt.millisecondsSinceEpoch,
      'updatedAt': section.updatedAt.millisecondsSinceEpoch,
    };

DateTime? _dt(dynamic ms) =>
    ms == null ? null : DateTime.fromMillisecondsSinceEpoch(ms as int);

ReadingSection _sectionFromMap(Map<String, dynamic> map) => ReadingSection()
  ..id = map['id'] as int
  ..sectionId = map['sectionId'] as String
  ..bookId = map['bookId'] as String
  ..userId = map['userId'] as String
  ..sectionNumber = map['sectionNumber'] as int
  ..startPage = map['startPage'] as int
  ..endPage = map['endPage'] as int
  ..sectionType = SectionType.values.byName(map['sectionType'] as String)
  ..status = SectionStatus.values.byName(map['status'] as String)
  ..totalWords = map['totalWords'] as int
  ..masteredWords = map['masteredWords'] as int
  ..recognitionRate = (map['recognitionRate'] as num).toDouble()
  ..isUnlocked = map['isUnlocked'] as bool
  ..practiceStartedAt = _dt(map['practiceStartedAt'])
  ..practiceCompletedAt = _dt(map['practiceCompletedAt'])
  ..readingStartedAt = _dt(map['readingStartedAt'])
  ..readingCompletedAt = _dt(map['readingCompletedAt'])
  ..createdAt = DateTime.fromMillisecondsSinceEpoch(map['createdAt'] as int)
  ..updatedAt = DateTime.fromMillisecondsSinceEpoch(map['updatedAt'] as int);

/// [ReadingSectionStore] for web, persisted to IndexedDB (via
/// [KvPersistence] — a no-op stub under `flutter test`'s VM runner, which
/// has no JS runtime for IndexedDB to begin with). Keeps an in-memory list
/// as the working copy for synchronous-feeling filtering/sorting, hydrated
/// from IndexedDB once per store instance and kept in sync on every write.
class WebReadingSectionStore implements ReadingSectionStore {
  WebReadingSectionStore({KvPersistence<String>? persistence})
      : _persistence = persistence ?? createJsonPersistence('reading_sections');

  final KvPersistence<String> _persistence;
  final List<ReadingSection> _sections = [];
  int _nextId = 1;
  Future<void>? _hydration;

  Future<void> _ensureHydrated() => _hydration ??= _hydrate();

  Future<void> _hydrate() async {
    final stored = await _persistence.loadAll();
    var maxId = 0;
    for (final json in stored) {
      final section =
          _sectionFromMap(jsonDecode(json) as Map<String, dynamic>);
      _sections.add(section);
      if (section.id > maxId) maxId = section.id;
    }
    _nextId = maxId + 1;
  }

  @override
  Future<List<ReadingSection>> getByBook(String bookId) async {
    await _ensureHydrated();
    final filtered =
        _sections.where((s) => s.bookId == bookId).toList();
    filtered.sort((a, b) => a.sectionNumber.compareTo(b.sectionNumber));
    return filtered;
  }

  @override
  Future<List<ReadingSection>> getByUser(String userId) async {
    await _ensureHydrated();
    return _sections.where((s) => s.userId == userId).toList();
  }

  @override
  Future<ReadingSection?> getBySectionId(String sectionId) async {
    await _ensureHydrated();
    for (final section in _sections) {
      if (section.sectionId == sectionId) return section;
    }
    return null;
  }

  @override
  Future<ReadingSection?> getByBookAndNumber(
      String bookId, int sectionNumber) async {
    await _ensureHydrated();
    for (final section in _sections) {
      if (section.bookId == bookId && section.sectionNumber == sectionNumber) {
        return section;
      }
    }
    return null;
  }

  @override
  Future<void> put(ReadingSection section) async {
    await _ensureHydrated();
    if (section.id == 0) {
      section.id = _nextId++;
      _sections.add(section);
    } else {
      final index = _sections.indexWhere((s) => s.id == section.id);
      if (index == -1) {
        _sections.add(section);
      } else {
        _sections[index] = section;
      }
    }
    await _persistence.save(
        section.sectionId, jsonEncode(_sectionToMap(section)));
  }

  @override
  Future<void> putAll(List<ReadingSection> sections) async {
    for (final section in sections) {
      await put(section);
    }
  }

  @override
  Future<void> deleteByBook(String bookId) async {
    await _ensureHydrated();
    final toDelete = _sections.where((s) => s.bookId == bookId).toList();
    _sections.removeWhere((s) => s.bookId == bookId);
    for (final section in toDelete) {
      await _persistence.delete(section.sectionId);
    }
  }
}

WebReadingSectionStore? _instance;

/// Memoized: production code constructs `ReadingSectionRepository()` ad hoc
/// at many call sites, each holding its own `ReadingSectionStore` field. On
/// native that's harmless (`NativeReadingSectionStore` is stateless,
/// delegating to the one real `DatabaseService.isar` singleton), but
/// `WebReadingSectionStore` *is* the data — a fresh instance per call would
/// mean nothing written ever survives to the next
/// `ReadingSectionRepository()` call, defeating in-memory web persistence
/// entirely. Returning the same instance across calls keeps one in-memory
/// store for the whole session.
ReadingSectionStore createReadingSectionStore() =>
    _instance ??= WebReadingSectionStore();
