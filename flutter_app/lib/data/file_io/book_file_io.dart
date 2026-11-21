import 'dart:typed_data';

export 'book_file_io_native.dart'
    if (dart.library.html) 'book_file_io_web.dart';

/// Platform-agnostic file-bytes store for book files, cover images, and
/// TTS/audio caching. Production code depends only on this interface and on
/// `createBookFileIO()`; it never names `NativeBookFileIO` or
/// `WebBookFileIO` directly, so it compiles against whichever implementation
/// the conditional export above resolves to.
abstract class BookFileIO {
  /// Stores bytes under [bookId] and returns an opaque reference to pass
  /// back into [readBytes]/[resolveStalePath]/[deleteByReference]. On
  /// native this is a real file path; on web it's an in-memory key.
  ///
  /// [sourcePath] is a native-only optimization: when set (file_picker
  /// gives a real path on native), the native implementation copies
  /// directly from that path at the OS level instead of requiring the
  /// caller to read the whole file into memory first and pass it as
  /// [bytes]. Web callers never have a source path, so they always pass
  /// actual [bytes] and leave [sourcePath] null.
  Future<String> store(
    String bookId,
    String fileName,
    Uint8List bytes, {
    String? sourcePath,
  });

  Future<Uint8List> readBytes(String reference);

  Future<void> deleteByReference(String reference);

  /// Native: copies the cover bytes to a cache file and returns its path.
  /// Web: keeps the bytes in memory and returns the same opaque reference
  /// scheme as [store], or null if no cover was extracted.
  Future<String?> storeCover(String bookId, Uint8List bytes);

  /// Native: if [storedReference] (a file path) no longer exists on disk,
  /// tries to find the file by name under the current documents directory
  /// and returns that path instead; returns null if storedReference is
  /// still valid or no fallback is found. Web: always returns null — an
  /// in-memory reference never goes stale the way a sandboxed file path
  /// can after a redeploy.
  Future<String?> resolveStalePath(String storedReference);

  /// False on web — callers skip TTS/audio caching when false, since web
  /// persistence is in-memory and session-only.
  bool get supportsPersistentCache;
}

// The conditional export above also carries three free-standing helper
// functions that don't fit the bookId-keyed BookFileIO shape, but still
// need a native/web split to stay free of the native-only file library on
// web. Keeping them in the same native/web file pair (rather than a
// separate conditional-export trio) keeps every reference to that library
// in this feature area inside the one file this plan already allowlists.
//
//   Uint8List? readPdfBytesSync(String filePath)
//     Synchronous bytes read for PdfTextPositionService, whose
//     extractWordsFromPage/extractPageTexts are synchronous APIs called
//     straight from pdfx's callbacks and so can't go through the async
//     [readBytes] above. Only reachable from the native-only PDF
//     tap-to-lookup/search feature; always returns null on web.
//
//   Future<bool> localFileExists(String path)
//     Used by word_extraction_service.dart's native branch to check a
//     resolved book file path before reading it (the web branch never
//     calls this — it checks the in-memory/IndexedDB book store directly
//     instead).
//
//   Future<String> resolveTtsCachePath(String key)
//   Future<Uint8List?> readLocalFile(String path)
//   Future<void> writeLocalFile(String path, Uint8List bytes)
//     The TTS/audio cache's storage. CloudTtsService computes a
//     platform-agnostic cache key; [resolveTtsCachePath] turns it into a
//     real file path under the app's documents directory on native, or
//     leaves it as the bare key on web. [readLocalFile]/[writeLocalFile]
//     then read/write through that: a real file on native, an IndexedDB
//     record on web.
