import 'dart:convert';
import 'dart:typed_data';

import 'package:cloud_functions/cloud_functions.dart';
import 'package:crypto/crypto.dart';

import '../data/file_io/book_file_io.dart';

/// Fallback pronunciation source for devices/platforms whose on-device TTS
/// voice for a language can't be used (e.g. no working Play Store, or the
/// web platform, which has no on-device voices at all — see TtsService).
/// Calls the `synthesizeSpeech` Cloud Function, which holds the Cloud
/// Text-to-Speech API key server-side, and caches the returned audio so the
/// same word is only ever fetched once — a real file on native, an
/// IndexedDB record on web.
class CloudTtsService {
  CloudTtsService._();

  static final CloudTtsService instance = CloudTtsService._();

  final FirebaseFunctions _functions = FirebaseFunctions.instance;

  /// Returns the audio bytes for [text] spoken in [languageCode], fetching
  /// and caching them from the cloud on first use. Returns null if the call
  /// fails (no network, not signed in, daily cap hit, etc.) so callers can
  /// show a message instead of silently doing nothing.
  Future<Uint8List?> fetchAndCache(String text, String languageCode) async {
    final storagePath = await resolveTtsCachePath(
      _cacheKeyFor(text, languageCode),
    );

    final cached = await readLocalFile(storagePath);
    if (cached != null) return cached;

    try {
      final result = await _functions.httpsCallable('synthesizeSpeech').call({
        'text': text,
        'languageCode': languageCode,
      });
      final base64Audio = result.data['audioContentBase64'] as String?;
      if (base64Audio == null || base64Audio.isEmpty) return null;

      final bytes = base64Decode(base64Audio);
      await writeLocalFile(storagePath, bytes);
      return bytes;
    } catch (_) {
      return null;
    }
  }

  String _cacheKeyFor(String text, String languageCode) {
    final hash = md5.convert(utf8.encode(text.toLowerCase())).toString();
    return '${languageCode}_$hash';
  }
}
