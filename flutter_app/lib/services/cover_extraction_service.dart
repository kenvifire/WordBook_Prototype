import 'package:epub_parser/epub_parser.dart' as epub;
import 'package:path/path.dart' as path;
import 'package:flutter/foundation.dart';

import '../data/file_io/book_file_io.dart';

class CoverExtractionService {
  /// Extract cover from a book file and save it to local storage
  /// Returns a reference to the cover image, or null if no cover was found
  Future<String?> extractCover(String filePath, String bookId) async {
    // Use the posix-style context explicitly rather than the bare top-level
    // `path.extension`, which resolves to `Style.platform` — on web that's
    // URL style, where a lone ':' is parsed as a URI scheme separator. Web's
    // BookFileIO references look like `book:<bookId>:<id>:<fileName>`, and
    // under URL style that whole string is consumed as "root" (no '/' to
    // find a basename after), making `extension()` return '' and the
    // `.substring(1)` below throw a RangeError on every web upload. Posix
    // style has no such special-casing and correctly finds the trailing
    // `.ext` on both native absolute paths and web reference strings.
    final rawExtension = path.posix.extension(filePath).toLowerCase();
    final format = rawExtension.isEmpty ? '' : rawExtension.substring(1);

    try {
      switch (format) {
        case 'epub':
          return await _extractEpubCover(filePath, bookId);
        // PDF cover extraction requires more complex rendering
        // For now, only EPUB covers are supported
        default:
          return null;
      }
    } catch (e) {
      debugPrint('Error extracting cover: $e');
      return null;
    }
  }

  /// Extract cover from EPUB file
  Future<String?> _extractEpubCover(String filePath, String bookId) async {
    final bytes = await createBookFileIO().readBytes(filePath);
    final epubBook = await epub.EpubReader.readBook(bytes);

    Uint8List? coverBytes;

    // Try to get cover from CoverImage
    if (epubBook.CoverImage != null) {
      coverBytes = Uint8List.fromList(epubBook.CoverImage!);
    }

    // If no cover image, try to find it in the content images
    if (coverBytes == null && epubBook.Content?.Images != null) {
      for (final entry in epubBook.Content!.Images!.entries) {
        final imageName = entry.key.toLowerCase();
        if (imageName.contains('cover')) {
          coverBytes = Uint8List.fromList(entry.value.Content!);
          break;
        }
      }

      // If still no cover, try the first image
      if (coverBytes == null && epubBook.Content!.Images!.isNotEmpty) {
        final firstImage = epubBook.Content!.Images!.entries.first;
        coverBytes = Uint8List.fromList(firstImage.value.Content!);
      }
    }

    if (coverBytes == null) {
      return null;
    }

    // Save cover bytes via the platform-specific file store
    return await createBookFileIO().storeCover(bookId, coverBytes);
  }

  /// Delete cover for a book
  Future<void> deleteCover(String? coverPath) async {
    if (coverPath == null) return;

    try {
      await createBookFileIO().deleteByReference(coverPath);
    } catch (e) {
      debugPrint('Error deleting cover: $e');
    }
  }
}
