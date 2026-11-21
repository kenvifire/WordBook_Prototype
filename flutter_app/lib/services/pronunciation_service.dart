import '../models/word.dart';
import 'cloud_tts_service.dart';
import 'tts_service.dart';

/// Pronounces a [Word] on the practice screens, picking the cheapest source
/// that will actually work:
///  1. On-device TTS, if that language's voice is installed (free, offline).
///  2. The `synthesizeSpeech` Cloud Function, cached locally afterward (a
///     real file on native, IndexedDB on web) so the same word is never
///     fetched twice.
/// Returns false only when none of these could produce audio (e.g. no
/// network and no device voice), so callers can show a message.
class PronunciationService {
  PronunciationService._();

  static final PronunciationService instance = PronunciationService._();

  Future<bool> pronounce(Word word) async {
    final languageCode = word.language;

    if (await TtsService.instance.isVoiceInstalled(languageCode)) {
      return TtsService.instance.speak(word.word, languageCode: languageCode);
    }

    if (languageCode == null) return false;
    final bytes = await CloudTtsService.instance.fetchAndCache(
      word.word,
      languageCode,
    );
    if (bytes == null) return false;

    return TtsService.instance.playBytes(bytes);
  }
}
