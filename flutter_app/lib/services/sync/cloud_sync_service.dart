import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import '../../models/book.dart';
import '../../models/word.dart';
import '../../models/reading_section.dart';
import '../../models/statistics.dart';
import '../../models/user.dart' hide SectionType;
import '../../repositories/book_repository.dart';
import '../../repositories/reading_section_repository.dart';
import '../../repositories/statistics_repository.dart';
import '../../repositories/user_repository.dart';
import '../../repositories/word_repository.dart';

/// Service for syncing data between local Isar database and Cloud Firestore
/// Only available for Pro users with cloudSync entitlement
class CloudSyncService {
  static CloudSyncService? _instance;
  static CloudSyncService get instance => _instance ??= CloudSyncService._();

  CloudSyncService._();

  /// Initialize and ensure network connectivity
  Future<void> _ensureOnline() async {
    try {
      debugPrint('CloudSync: Enabling network...');
      await _firestore.enableNetwork();
      debugPrint('CloudSync: Network enabled');
    } catch (e) {
      debugPrint('CloudSync: Error ensuring online: $e');
    }
  }

  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  bool _isSyncing = false;
  bool get isSyncing => _isSyncing;

  DateTime? _lastSyncTime;
  DateTime? get lastSyncTime => _lastSyncTime;

  /// Sync all data for a user
  Future<SyncResult> syncAll(String userId) async {
    if (_isSyncing) {
      return SyncResult(success: false, message: 'Sync already in progress');
    }

    _isSyncing = true;
    int uploaded = 0;
    int downloaded = 0;
    int conflicts = 0;

    try {
      debugPrint('CloudSync: Starting full sync for user $userId');

      // Ensure Firestore is online
      await _ensureOnline();

      // Test write to verify Firestore connectivity
      debugPrint('CloudSync: Testing Firestore write...');
      debugPrint('CloudSync: Checking network status...');
      try {
        // Try using a simpler write approach
        final docRef = _firestore.collection('users').doc(userId);
        debugPrint('CloudSync: Writing to ${docRef.path}...');

        await docRef.set({
          'lastSyncAttempt': DateTime.now().toIso8601String(),
          'testWrite': true,
        }, SetOptions(merge: true)).timeout(const Duration(seconds: 15));
        debugPrint('CloudSync: Test write SUCCESS');
      } on FirebaseException catch (e) {
        debugPrint('CloudSync: Firebase error: ${e.code} - ${e.message}');
        return SyncResult(success: false, message: 'Firebase error: ${e.message}');
      } catch (e) {
        debugPrint('CloudSync: Test write FAILED: $e');
        // Continue anyway to try the actual sync
        debugPrint('CloudSync: Continuing with sync despite test failure...');
      }

      // Sync user profile
      await _syncUserProfile(userId);

      // Sync books
      final bookResult = await _syncBooks(userId);
      uploaded += bookResult.uploaded;
      downloaded += bookResult.downloaded;
      conflicts += bookResult.conflicts;

      // Sync words
      final wordResult = await _syncWords(userId);
      uploaded += wordResult.uploaded;
      downloaded += wordResult.downloaded;
      conflicts += wordResult.conflicts;

      // Sync reading sections
      final sectionResult = await _syncReadingSections(userId);
      uploaded += sectionResult.uploaded;
      downloaded += sectionResult.downloaded;
      conflicts += sectionResult.conflicts;

      // Sync statistics
      final statsResult = await _syncStatistics(userId);
      uploaded += statsResult.uploaded;
      downloaded += statsResult.downloaded;
      conflicts += statsResult.conflicts;

      _lastSyncTime = DateTime.now();

      // Update last sync time in Firestore
      await _firestore.collection('users').doc(userId).set({
        'lastSyncTime': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      debugPrint('CloudSync: Sync complete. Uploaded: $uploaded, Downloaded: $downloaded, Conflicts: $conflicts');

      return SyncResult(
        success: true,
        message: 'Sync completed successfully',
        uploaded: uploaded,
        downloaded: downloaded,
        conflicts: conflicts,
      );
    } catch (e, stackTrace) {
      debugPrint('CloudSync: Sync failed: $e');
      debugPrint('Stack trace: $stackTrace');
      return SyncResult(success: false, message: 'Sync failed: $e');
    } finally {
      _isSyncing = false;
    }
  }

  /// Sync user profile
  Future<void> _syncUserProfile(String userId) async {
    debugPrint('CloudSync: Syncing user profile...');
    final localUser = await UserRepository().getUserById(userId);

    if (localUser == null) {
      debugPrint('CloudSync: No local user found for userId=$userId');
      return;
    }
    debugPrint('CloudSync: Found local user: ${localUser.email}');

    final cloudDoc = await _firestore.collection('users').doc(userId).get();

    if (!cloudDoc.exists) {
      // Upload local user to cloud
      await _firestore.collection('users').doc(userId).set(_userToMap(localUser));
      debugPrint('CloudSync: Uploaded user profile');
    } else {
      // Merge based on updatedAt
      final cloudData = cloudDoc.data()!;
      final cloudUpdatedAt = (cloudData['updatedAt'] as Timestamp?)?.toDate();

      if (cloudUpdatedAt != null && cloudUpdatedAt.isAfter(localUser.updatedAt)) {
        // Cloud is newer, update local
        _updateUserFromMap(localUser, cloudData);
        await UserRepository().saveUser(localUser);
        debugPrint('CloudSync: Downloaded user profile');
      } else if (localUser.updatedAt.isAfter(cloudUpdatedAt ?? DateTime(1970))) {
        // Local is newer, upload
        await _firestore.collection('users').doc(userId).set(_userToMap(localUser));
        debugPrint('CloudSync: Uploaded user profile');
      }
    }
  }

  /// Sync books
  Future<_SyncStats> _syncBooks(String userId) async {
    debugPrint('CloudSync: Syncing books...');
    int uploaded = 0;
    int downloaded = 0;
    int conflicts = 0;

    final bookRepository = BookRepository();
    final localBooks = await bookRepository.getAllBooks(userId: userId);
    debugPrint('CloudSync: Found ${localBooks.length} local books');

    // Get cloud books
    debugPrint('CloudSync: Fetching cloud books from Firestore...');
    final cloudSnapshot = await _firestore
        .collection('users')
        .doc(userId)
        .collection('books')
        .get()
        .timeout(const Duration(seconds: 30), onTimeout: () {
      throw Exception('Firestore query timed out after 30 seconds');
    });
    debugPrint('CloudSync: Got ${cloudSnapshot.docs.length} cloud books');

    final cloudBooks = {for (var doc in cloudSnapshot.docs) doc.id: doc.data()};
    final processedIds = <String>{};

    // Process local books
    for (final localBook in localBooks) {
      processedIds.add(localBook.bookId);
      final cloudData = cloudBooks[localBook.bookId];

      if (cloudData == null) {
        // Upload new book to cloud
        debugPrint('CloudSync: Uploading book ${localBook.title}...');
        await _uploadBook(userId, localBook);
        uploaded++;
      } else {
        // Compare and sync
        final cloudUpdatedAt = (cloudData['updatedAt'] as Timestamp?)?.toDate();

        if (cloudUpdatedAt != null && cloudUpdatedAt.isAfter(localBook.updatedAt)) {
          // Cloud is newer
          _updateBookFromMap(localBook, cloudData);
          await bookRepository.updateBook(localBook);
          downloaded++;
        } else if (localBook.updatedAt.isAfter(cloudUpdatedAt ?? DateTime(1970))) {
          // Local is newer
          await _uploadBook(userId, localBook);
          uploaded++;
        } else {
          conflicts++;
        }
      }
    }

    // Download books that exist only in cloud
    for (final entry in cloudBooks.entries) {
      if (!processedIds.contains(entry.key)) {
        final newBook = _bookFromMap(entry.value, entry.key);
        await bookRepository.addBook(newBook);
        downloaded++;
      }
    }

    debugPrint('CloudSync: Books sync complete - uploaded=$uploaded, downloaded=$downloaded');
    return _SyncStats(uploaded: uploaded, downloaded: downloaded, conflicts: conflicts);
  }

  /// Sync words
  Future<_SyncStats> _syncWords(String userId) async {
    debugPrint('CloudSync: Syncing words...');
    int uploaded = 0;
    int downloaded = 0;
    int conflicts = 0;

    final wordRepository = WordRepository();

    // Get all books for this user to find their words
    final userBooks = await BookRepository().getAllBooks(userId: userId);
    final bookIds = userBooks.map((b) => b.bookId).toSet();
    debugPrint('CloudSync: Found ${bookIds.length} books to sync words for');

    for (final bookId in bookIds) {
      final localWords = await wordRepository.getWordsByBook(bookId);

      // Get cloud words for this book
      final cloudSnapshot = await _firestore
          .collection('users')
          .doc(userId)
          .collection('words')
          .where('bookId', isEqualTo: bookId)
          .get();

      final cloudWords = {for (var doc in cloudSnapshot.docs) doc.id: doc.data()};
      final processedIds = <String>{};

      // Process local words
      for (final localWord in localWords) {
        processedIds.add(localWord.wordId);
        final cloudData = cloudWords[localWord.wordId];

        if (cloudData == null) {
          // Upload new word
          await _uploadWord(userId, localWord);
          uploaded++;
        } else {
          final cloudUpdatedAt = (cloudData['updatedAt'] as Timestamp?)?.toDate();

          if (cloudUpdatedAt != null && cloudUpdatedAt.isAfter(localWord.updatedAt)) {
            _updateWordFromMap(localWord, cloudData);
            await wordRepository.updateWord(localWord);
            downloaded++;
          } else if (localWord.updatedAt.isAfter(cloudUpdatedAt ?? DateTime(1970))) {
            await _uploadWord(userId, localWord);
            uploaded++;
          } else {
            conflicts++;
          }
        }
      }

      // Download words that exist only in cloud
      for (final entry in cloudWords.entries) {
        if (!processedIds.contains(entry.key)) {
          final newWord = _wordFromMap(entry.value, entry.key);
          await wordRepository.addWord(newWord);
          downloaded++;
        }
      }
    }

    return _SyncStats(uploaded: uploaded, downloaded: downloaded, conflicts: conflicts);
  }

  /// Sync reading sections
  Future<_SyncStats> _syncReadingSections(String userId) async {
    debugPrint('CloudSync: Syncing reading sections...');
    int uploaded = 0;
    int downloaded = 0;
    int conflicts = 0;

    final sectionRepository = ReadingSectionRepository();
    final localSections = await sectionRepository.getSectionsByUser(userId);
    debugPrint('CloudSync: Found ${localSections.length} local sections');

    final cloudSnapshot = await _firestore
        .collection('users')
        .doc(userId)
        .collection('sections')
        .get();

    final cloudSections = {for (var doc in cloudSnapshot.docs) doc.id: doc.data()};
    final processedIds = <String>{};

    for (final localSection in localSections) {
      processedIds.add(localSection.sectionId);
      final cloudData = cloudSections[localSection.sectionId];

      if (cloudData == null) {
        await _uploadSection(userId, localSection);
        uploaded++;
      } else {
        final cloudUpdatedAt = (cloudData['updatedAt'] as Timestamp?)?.toDate();

        if (cloudUpdatedAt != null && cloudUpdatedAt.isAfter(localSection.updatedAt)) {
          _updateSectionFromMap(localSection, cloudData);
          await sectionRepository.updateSection(localSection);
          downloaded++;
        } else if (localSection.updatedAt.isAfter(cloudUpdatedAt ?? DateTime(1970))) {
          await _uploadSection(userId, localSection);
          uploaded++;
        } else {
          conflicts++;
        }
      }
    }

    for (final entry in cloudSections.entries) {
      if (!processedIds.contains(entry.key)) {
        final newSection = _sectionFromMap(entry.value, entry.key);
        await sectionRepository.addSection(newSection);
        downloaded++;
      }
    }

    return _SyncStats(uploaded: uploaded, downloaded: downloaded, conflicts: conflicts);
  }

  /// Sync statistics
  Future<_SyncStats> _syncStatistics(String userId) async {
    debugPrint('CloudSync: Syncing statistics...');
    int uploaded = 0;
    int downloaded = 0;
    int conflicts = 0;

    final statisticsRepository = StatisticsRepository();
    final localStats = await statisticsRepository.getStatisticsByUser(userId);
    debugPrint('CloudSync: Found ${localStats.length} local statistics');

    final cloudSnapshot = await _firestore
        .collection('users')
        .doc(userId)
        .collection('statistics')
        .get();

    final cloudStats = {for (var doc in cloudSnapshot.docs) doc.id: doc.data()};
    final processedIds = <String>{};

    for (final localStat in localStats) {
      processedIds.add(localStat.statisticsId);
      final cloudData = cloudStats[localStat.statisticsId];

      if (cloudData == null) {
        await _uploadStatistics(userId, localStat);
        uploaded++;
      } else {
        final cloudUpdatedAt = (cloudData['updatedAt'] as Timestamp?)?.toDate();

        if (cloudUpdatedAt != null && cloudUpdatedAt.isAfter(localStat.updatedAt)) {
          _updateStatisticsFromMap(localStat, cloudData);
          await statisticsRepository.updateStatistics(localStat);
          downloaded++;
        } else if (localStat.updatedAt.isAfter(cloudUpdatedAt ?? DateTime(1970))) {
          await _uploadStatistics(userId, localStat);
          uploaded++;
        } else {
          conflicts++;
        }
      }
    }

    for (final entry in cloudStats.entries) {
      if (!processedIds.contains(entry.key)) {
        final newStat = _statisticsFromMap(entry.value, entry.key);
        await statisticsRepository.addStatistics(newStat);
        downloaded++;
      }
    }

    return _SyncStats(uploaded: uploaded, downloaded: downloaded, conflicts: conflicts);
  }

  // ============================================================================
  // Upload helpers
  // ============================================================================

  Future<void> _uploadBook(String userId, Book book) async {
    debugPrint('CloudSync: _uploadBook - bookId=${book.bookId}, title=${book.title}');
    final data = _bookToMap(book);
    debugPrint('CloudSync: _uploadBook - data=$data');
    try {
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('books')
          .doc(book.bookId)
          .set(data)
          .timeout(const Duration(seconds: 10), onTimeout: () {
        throw Exception('Upload timed out - check Firestore rules');
      });
      debugPrint('CloudSync: _uploadBook - success');
    } catch (e) {
      debugPrint('CloudSync: _uploadBook - ERROR: $e');
      rethrow;
    }
  }

  Future<void> _uploadWord(String userId, Word word) async {
    await _firestore
        .collection('users')
        .doc(userId)
        .collection('words')
        .doc(word.wordId)
        .set(_wordToMap(word));
  }

  Future<void> _uploadSection(String userId, ReadingSection section) async {
    await _firestore
        .collection('users')
        .doc(userId)
        .collection('sections')
        .doc(section.sectionId)
        .set(_sectionToMap(section));
  }

  Future<void> _uploadStatistics(String userId, Statistics stats) async {
    await _firestore
        .collection('users')
        .doc(userId)
        .collection('statistics')
        .doc(stats.statisticsId)
        .set(_statisticsToMap(stats));
  }

  // ============================================================================
  // Conversion helpers: Model -> Map
  // ============================================================================

  Map<String, dynamic> _userToMap(User user) {
    return {
      'userId': user.userId,
      'email': user.email,
      'displayName': user.displayName,
      'photoUrl': user.photoUrl,
      'nativeLanguage': user.nativeLanguage,
      'learningLanguage': user.learningLanguage,
      'createdAt': Timestamp.fromDate(user.createdAt),
      'updatedAt': Timestamp.fromDate(user.updatedAt),
    };
  }

  Map<String, dynamic> _bookToMap(Book book) {
    return {
      'bookId': book.bookId,
      'title': book.title,
      'author': book.author,
      'coverUrl': book.coverUrl,
      'format': book.format,
      'totalPages': book.totalPages,
      'currentPage': book.currentPage,
      'status': book.status.index,
      'language': book.language,
      'userId': book.userId,
      'createdAt': Timestamp.fromDate(book.createdAt),
      'updatedAt': Timestamp.fromDate(book.updatedAt),
      'lastReadAt': book.lastReadAt != null ? Timestamp.fromDate(book.lastReadAt!) : null,
    };
  }

  Map<String, dynamic> _wordToMap(Word word) {
    return {
      'wordId': word.wordId,
      'word': word.word,
      'definition': word.definition,
      'translation': word.translation,
      'example': word.example,
      'bookId': word.bookId,
      'userId': word.userId,
      'status': word.status.index,
      'extractionMethod': word.extractionMethod.index,
      'language': word.language,
      'repetitions': word.repetitions,
      'easeFactor': word.easeFactor,
      'interval': word.interval,
      'nextReviewDate': word.nextReviewDate != null ? Timestamp.fromDate(word.nextReviewDate!) : null,
      'createdAt': Timestamp.fromDate(word.createdAt),
      'updatedAt': Timestamp.fromDate(word.updatedAt),
    };
  }

  Map<String, dynamic> _sectionToMap(ReadingSection section) {
    return {
      'sectionId': section.sectionId,
      'bookId': section.bookId,
      'userId': section.userId,
      'sectionNumber': section.sectionNumber,
      'startPage': section.startPage,
      'endPage': section.endPage,
      'sectionType': section.sectionType.index,
      'status': section.status.index,
      'isUnlocked': section.isUnlocked,
      'totalWords': section.totalWords,
      'masteredWords': section.masteredWords,
      'recognitionRate': section.recognitionRate,
      'createdAt': Timestamp.fromDate(section.createdAt),
      'updatedAt': Timestamp.fromDate(section.updatedAt),
    };
  }

  Map<String, dynamic> _statisticsToMap(Statistics stats) {
    return {
      'statisticsId': stats.statisticsId,
      'bookId': stats.bookId,
      'userId': stats.userId,
      'pagesRead': stats.pagesRead,
      'totalPages': stats.totalPages,
      'totalWords': stats.totalWords,
      'wordsLearned': stats.wordsLearned,
      'wordsMastered': stats.wordsMastered,
      'totalPracticeTime': stats.totalPracticeTime,
      'totalReadingTime': stats.totalReadingTime,
      'startedAt': stats.startedAt != null ? Timestamp.fromDate(stats.startedAt!) : null,
      'completedAt': stats.completedAt != null ? Timestamp.fromDate(stats.completedAt!) : null,
      'createdAt': Timestamp.fromDate(stats.createdAt),
      'updatedAt': Timestamp.fromDate(stats.updatedAt),
    };
  }

  // ============================================================================
  // Conversion helpers: Map -> Model
  // ============================================================================

  void _updateUserFromMap(User user, Map<String, dynamic> data) {
    user.email = data['email'] ?? user.email;
    user.displayName = data['displayName'];
    user.photoUrl = data['photoUrl'];
    user.nativeLanguage = data['nativeLanguage'] ?? user.nativeLanguage;
    user.learningLanguage = data['learningLanguage'];
    user.updatedAt = (data['updatedAt'] as Timestamp?)?.toDate() ?? user.updatedAt;
  }

  Book _bookFromMap(Map<String, dynamic> data, String bookId) {
    return Book()
      ..bookId = bookId
      ..title = data['title'] ?? ''
      ..author = data['author']
      ..coverUrl = data['coverUrl']
      ..format = data['format'] ?? 'txt'
      ..localPath = '' // Local path needs to be set separately
      ..totalPages = data['totalPages'] ?? 0
      ..currentPage = data['currentPage'] ?? 0
      ..status = BookStatus.values[data['status'] ?? 0]
      ..language = data['language']
      ..userId = data['userId']
      ..createdAt = (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now()
      ..updatedAt = (data['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now()
      ..lastReadAt = (data['lastReadAt'] as Timestamp?)?.toDate();
  }

  void _updateBookFromMap(Book book, Map<String, dynamic> data) {
    book.title = data['title'] ?? book.title;
    book.author = data['author'];
    book.coverUrl = data['coverUrl'];
    book.totalPages = data['totalPages'] ?? book.totalPages;
    book.currentPage = data['currentPage'] ?? book.currentPage;
    book.status = BookStatus.values[data['status'] ?? book.status.index];
    book.language = data['language'];
    book.updatedAt = (data['updatedAt'] as Timestamp?)?.toDate() ?? book.updatedAt;
    book.lastReadAt = (data['lastReadAt'] as Timestamp?)?.toDate();
  }

  Word _wordFromMap(Map<String, dynamic> data, String wordId) {
    return Word()
      ..wordId = wordId
      ..word = data['word'] ?? ''
      ..definition = data['definition']
      ..translation = data['translation']
      ..example = data['example']
      ..bookId = data['bookId'] ?? ''
      ..userId = data['userId']
      ..status = WordStatus.values[data['status'] ?? 0]
      ..extractionMethod = ExtractionMethod.values[data['extractionMethod'] ?? 0]
      ..language = data['language']
      ..repetitions = data['repetitions'] ?? 0
      ..easeFactor = (data['easeFactor'] ?? 2.5).toDouble()
      ..interval = data['interval'] ?? 0
      ..nextReviewDate = (data['nextReviewDate'] as Timestamp?)?.toDate()
      ..createdAt = (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now()
      ..updatedAt = (data['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now();
  }

  void _updateWordFromMap(Word word, Map<String, dynamic> data) {
    word.definition = data['definition'];
    word.translation = data['translation'];
    word.example = data['example'];
    word.status = WordStatus.values[data['status'] ?? word.status.index];
    word.extractionMethod = ExtractionMethod.values[data['extractionMethod'] ?? word.extractionMethod.index];
    word.repetitions = data['repetitions'] ?? word.repetitions;
    word.easeFactor = (data['easeFactor'] ?? word.easeFactor).toDouble();
    word.interval = data['interval'] ?? word.interval;
    word.nextReviewDate = (data['nextReviewDate'] as Timestamp?)?.toDate();
    word.updatedAt = (data['updatedAt'] as Timestamp?)?.toDate() ?? word.updatedAt;
  }

  ReadingSection _sectionFromMap(Map<String, dynamic> data, String sectionId) {
    return ReadingSection()
      ..sectionId = sectionId
      ..bookId = data['bookId'] ?? ''
      ..userId = data['userId'] ?? ''
      ..sectionNumber = data['sectionNumber'] ?? 0
      ..startPage = data['startPage'] ?? 0
      ..endPage = data['endPage'] ?? 0
      ..sectionType = SectionType.values[data['sectionType'] ?? 0]
      ..status = SectionStatus.values[data['status'] ?? 0]
      ..isUnlocked = data['isUnlocked'] ?? false
      ..totalWords = data['totalWords'] ?? 0
      ..masteredWords = data['masteredWords'] ?? 0
      ..recognitionRate = (data['recognitionRate'] ?? 0.0).toDouble()
      ..createdAt = (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now()
      ..updatedAt = (data['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now();
  }

  void _updateSectionFromMap(ReadingSection section, Map<String, dynamic> data) {
    section.status = SectionStatus.values[data['status'] ?? section.status.index];
    section.isUnlocked = data['isUnlocked'] ?? section.isUnlocked;
    section.totalWords = data['totalWords'] ?? section.totalWords;
    section.masteredWords = data['masteredWords'] ?? section.masteredWords;
    section.recognitionRate = (data['recognitionRate'] ?? section.recognitionRate).toDouble();
    section.updatedAt = (data['updatedAt'] as Timestamp?)?.toDate() ?? section.updatedAt;
  }

  Statistics _statisticsFromMap(Map<String, dynamic> data, String statisticsId) {
    return Statistics()
      ..statisticsId = statisticsId
      ..bookId = data['bookId'] ?? ''
      ..userId = data['userId']
      ..pagesRead = data['pagesRead'] ?? 0
      ..totalPages = data['totalPages'] ?? 0
      ..totalWords = data['totalWords'] ?? 0
      ..wordsLearned = data['wordsLearned'] ?? 0
      ..wordsMastered = data['wordsMastered'] ?? 0
      ..totalPracticeTime = data['totalPracticeTime'] ?? 0
      ..totalReadingTime = data['totalReadingTime'] ?? 0
      ..startedAt = (data['startedAt'] as Timestamp?)?.toDate()
      ..completedAt = (data['completedAt'] as Timestamp?)?.toDate()
      ..createdAt = (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now()
      ..updatedAt = (data['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now();
  }

  void _updateStatisticsFromMap(Statistics stats, Map<String, dynamic> data) {
    stats.pagesRead = data['pagesRead'] ?? stats.pagesRead;
    stats.totalPages = data['totalPages'] ?? stats.totalPages;
    stats.totalWords = data['totalWords'] ?? stats.totalWords;
    stats.wordsLearned = data['wordsLearned'] ?? stats.wordsLearned;
    stats.wordsMastered = data['wordsMastered'] ?? stats.wordsMastered;
    stats.totalPracticeTime = data['totalPracticeTime'] ?? stats.totalPracticeTime;
    stats.totalReadingTime = data['totalReadingTime'] ?? stats.totalReadingTime;
    stats.startedAt = (data['startedAt'] as Timestamp?)?.toDate() ?? stats.startedAt;
    stats.completedAt = (data['completedAt'] as Timestamp?)?.toDate() ?? stats.completedAt;
    stats.updatedAt = (data['updatedAt'] as Timestamp?)?.toDate() ?? stats.updatedAt;
  }

  /// Delete all cloud data for a user (for account deletion)
  Future<void> deleteAllCloudData(String userId) async {
    final batch = _firestore.batch();

    // Delete books
    final books = await _firestore.collection('users').doc(userId).collection('books').get();
    for (final doc in books.docs) {
      batch.delete(doc.reference);
    }

    // Delete words
    final words = await _firestore.collection('users').doc(userId).collection('words').get();
    for (final doc in words.docs) {
      batch.delete(doc.reference);
    }

    // Delete sections
    final sections = await _firestore.collection('users').doc(userId).collection('sections').get();
    for (final doc in sections.docs) {
      batch.delete(doc.reference);
    }

    // Delete statistics
    final stats = await _firestore.collection('users').doc(userId).collection('statistics').get();
    for (final doc in stats.docs) {
      batch.delete(doc.reference);
    }

    // Delete user document
    batch.delete(_firestore.collection('users').doc(userId));

    await batch.commit();
    debugPrint('CloudSync: Deleted all cloud data for user $userId');
  }
}

/// Result of a sync operation
class SyncResult {
  final bool success;
  final String message;
  final int uploaded;
  final int downloaded;
  final int conflicts;

  SyncResult({
    required this.success,
    required this.message,
    this.uploaded = 0,
    this.downloaded = 0,
    this.conflicts = 0,
  });
}

/// Internal class for tracking sync stats per collection
class _SyncStats {
  final int uploaded;
  final int downloaded;
  final int conflicts;

  _SyncStats({
    required this.uploaded,
    required this.downloaded,
    required this.conflicts,
  });
}
