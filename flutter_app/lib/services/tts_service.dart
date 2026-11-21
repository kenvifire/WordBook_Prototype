import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter_tts/flutter_tts.dart';

/// Speaks a word aloud in its own language, for the pronunciation button on
/// the practice screens. One shared FlutterTts instance per app (creating a
/// new one per press would leak native engine resources on some platforms).
class TtsService {
  TtsService._() {
    _tts.setSpeechRate(0.45); // slower than default — this is for learners
  }

  static final TtsService instance = TtsService._();

  final FlutterTts _tts = FlutterTts();
  final AudioPlayer _player = AudioPlayer();

  static const Map<String, String> _localeByLanguageCode = {
    'en': 'en-US',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'it': 'it-IT',
    'pt': 'pt-PT',
    'nl': 'nl-NL',
    'ru': 'ru-RU',
    'ja': 'ja-JP',
    'ko': 'ko-KR',
    'zh': 'zh-CN',
  };

  /// True if [languageCode]'s voice is actually installed and usable on this
  /// device right now (common failure: a device with no working Play Store
  /// can accept a speak request for a non-bundled language but never
  /// produce audio). Unrecognized/missing codes are treated as the device
  /// default voice, which is always available.
  Future<bool> isVoiceInstalled(String? languageCode) async {
    final locale = _localeByLanguageCode[languageCode];
    if (locale == null) return true;
    try {
      return await _tts.isLanguageInstalled(locale) == true;
    } catch (_) {
      return false;
    }
  }

  /// Speaks [text] via the on-device engine. Returns false (without
  /// speaking) if [languageCode]'s voice isn't installed — callers should
  /// check [isVoiceInstalled] first and fall back to a cached/cloud clip via
  /// [playBytes] instead of calling this blindly.
  Future<bool> speak(String text, {String? languageCode}) async {
    if (text.trim().isEmpty) return false;
    try {
      await _player.stop();
      await _tts.stop();
      final locale = _localeByLanguageCode[languageCode];
      if (locale != null) {
        if (await _tts.isLanguageInstalled(locale) != true) return false;
        await _tts.setLanguage(locale);
      }
      final result = await _tts.speak(text);
      return result == 1;
    } catch (_) {
      return false;
    }
  }

  /// Plays an audio clip fetched via CloudTtsService, straight from bytes —
  /// works the same on native and web (the latter has no real file path to
  /// hand to a file-based source).
  Future<bool> playBytes(Uint8List bytes) async {
    try {
      await _tts.stop();
      await _player.stop();
      await _player.play(BytesSource(bytes));
      return true;
    } catch (_) {
      return false;
    }
  }
}
