import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/word.dart';
import '../services/vocabulary/vocabulary_service.dart';

/// Enriches words (definition + translation) in the background.
///
/// Lives on a plain (non-autoDispose) provider so the queue keeps draining
/// even after the screen that enqueued the words is gone — previously this
/// loop was tied to a StatefulWidget's lifecycle and simply stopped the
/// moment the user navigated away, which looked like "no progress is ever
/// saved" even though the per-word results were in fact being persisted.
final enrichmentProvider = StateNotifierProvider<EnrichmentNotifier, EnrichmentState>((ref) {
  return EnrichmentNotifier();
});

class EnrichmentState {
  final int completed;
  final int queued;

  const EnrichmentState({this.completed = 0, this.queued = 0});

  EnrichmentState copyWith({int? completed, int? queued}) {
    return EnrichmentState(
      completed: completed ?? this.completed,
      queued: queued ?? this.queued,
    );
  }
}

class EnrichmentNotifier extends StateNotifier<EnrichmentState> {
  EnrichmentNotifier() : super(const EnrichmentState());

  final VocabularyService _vocabularyService = VocabularyService();
  static const int _concurrency = 12;

  // Each queued word carries the target language it was enqueued with, so a
  // later enqueue() call for a different book/language can't change the
  // language already-queued-but-not-yet-processed words get enriched into.
  final List<({Word word, String targetLanguage})> _queue = [];
  final Set<String> _queuedIds = {};
  bool _processing = false;

  /// Adds words to the enrichment queue (already-enriched or already-queued
  /// words are skipped) and makes sure the queue is draining.
  void enqueue(List<Word> words, {required String targetLanguage}) {
    for (final word in words) {
      if (word.enriched) continue;
      if (_queuedIds.contains(word.wordId)) continue;
      _queue.add((word: word, targetLanguage: targetLanguage));
      _queuedIds.add(word.wordId);
    }

    state = state.copyWith(queued: _queue.length);
    _drainQueue();
  }

  Future<void> _drainQueue() async {
    if (_processing) return;
    _processing = true;

    while (_queue.isNotEmpty) {
      final batchSize = _queue.length.clamp(0, _concurrency);
      final batch = _queue.sublist(0, batchSize);
      _queue.removeRange(0, batchSize);

      await Future.wait(batch.map((entry) async {
        try {
          await _vocabularyService.enrichWord(
            entry.word,
            targetLanguage: entry.targetLanguage,
          );
        } catch (_) {
          // Leave unenriched; it'll just be retried on a future section visit.
        } finally {
          _queuedIds.remove(entry.word.wordId);
        }
      }));

      state = state.copyWith(
        completed: state.completed + batch.length,
        queued: _queue.length,
      );
    }

    _processing = false;
  }
}
