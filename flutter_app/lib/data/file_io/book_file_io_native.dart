import 'dart:io';
import 'dart:typed_data';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import 'book_file_io.dart';

/// Filesystem-backed [BookFileIO] for native platforms (iOS/Android/macOS/
/// Windows/Linux). Wraps today's exact `getApplicationDocumentsDirectory()`
/// + `File(...).copy()`/`readAsBytes()`/`writeAsBytes()` logic that used to
/// live directly in `books_state_provider.dart`, `book_repository.dart` and
/// `cover_extraction_service.dart`.
class NativeBookFileIO implements BookFileIO {
  @override
  Future<String> store(
    String bookId,
    String fileName,
    Uint8List bytes, {
    String? sourcePath,
  }) async {
    final appDir = await getApplicationDocumentsDirectory();
    final booksDir = Directory('${appDir.path}/books');
    if (!await booksDir.exists()) {
      await booksDir.create(recursive: true);
    }

    final localPath = '${booksDir.path}/$fileName';

    if (sourcePath != null) {
      // file_picker gave us a real path on native — copy at the OS level
      // instead of requiring the whole file to be read into memory first.
      await File(sourcePath).copy(localPath);
    } else {
      await File(localPath).writeAsBytes(bytes);
    }

    return localPath;
  }

  @override
  Future<Uint8List> readBytes(String reference) async {
    return File(reference).readAsBytes();
  }

  @override
  Future<void> deleteByReference(String reference) async {
    final file = File(reference);
    if (await file.exists()) {
      await file.delete();
    }
  }

  @override
  Future<String?> storeCover(String bookId, Uint8List bytes) async {
    final appDir = await getApplicationDocumentsDirectory();
    final coversDir = Directory('${appDir.path}/covers');
    if (!await coversDir.exists()) {
      await coversDir.create(recursive: true);
    }

    final coverPath = '${coversDir.path}/$bookId.jpg';
    await File(coverPath).writeAsBytes(bytes);
    return coverPath;
  }

  @override
  Future<String?> resolveStalePath(String storedReference) async {
    if (await File(storedReference).exists()) return null;

    // Extract filename and resolve against current documents dir (e.g.
    // after app redeploy changes the sandbox container).
    final fileName = p.basename(storedReference);
    final appDir = await getApplicationDocumentsDirectory();
    final resolvedPath = '${appDir.path}/books/$fileName';

    if (await File(resolvedPath).exists()) {
      return resolvedPath;
    }

    return null;
  }

  @override
  bool get supportsPersistentCache => true;
}

BookFileIO createBookFileIO() => NativeBookFileIO();

/// See the free-standing-helpers note in `book_file_io.dart`.
Uint8List? readPdfBytesSync(String filePath) {
  final file = File(filePath);
  if (!file.existsSync()) return null;
  return file.readAsBytesSync();
}

/// See the free-standing-helpers note in `book_file_io.dart`.
Future<bool> localFileExists(String path) => File(path).exists();

/// See the free-standing-helpers note in `book_file_io.dart`.
Future<void> writeLocalFile(String path, Uint8List bytes) async {
  final file = File(path);
  await file.create(recursive: true);
  await file.writeAsBytes(bytes);
}

/// See the free-standing-helpers note in `book_file_io.dart`.
Future<Uint8List?> readLocalFile(String path) async {
  final file = File(path);
  if (!await file.exists()) return null;
  return file.readAsBytes();
}

/// See the free-standing-helpers note in `book_file_io.dart`.
Future<String> resolveTtsCachePath(String key) async {
  final appDir = await getApplicationDocumentsDirectory();
  final dir = Directory(p.join(appDir.path, 'tts_cache'));
  if (!await dir.exists()) {
    await dir.create(recursive: true);
  }
  return p.join(dir.path, '$key.mp3');
}
