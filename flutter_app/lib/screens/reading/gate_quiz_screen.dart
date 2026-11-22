import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/book.dart';
import '../../models/reading_section.dart';
import '../../models/word.dart';
import '../../providers/section_provider.dart';
import '../../screens/settings/words_settings_screen.dart';
import '../../services/gate/gate_service.dart';

/// Multiple-choice gate quiz: "What does X mean?" with three distractors.
/// Passing (>= threshold) unlocks the section; after three failed attempts
/// the learner may bypass the gate ("Read anyway").
class GateQuizScreen extends ConsumerStatefulWidget {
  final Book book;
  final ReadingSection section;
  final List<Word> words;

  const GateQuizScreen({
    super.key,
    required this.book,
    required this.section,
    required this.words,
  });

  @override
  ConsumerState<GateQuizScreen> createState() => _GateQuizScreenState();
}

class _GateQuizScreenState extends ConsumerState<GateQuizScreen> {
  late List<GateQuestion> _questions;
  late double _threshold;
  int _index = 0;
  int _correct = 0;
  int _wrong = 0;
  int _failedAttempts = 0;
  String? _picked;
  bool _finished = false;
  bool? _passed;

  @override
  void initState() {
    super.initState();
    _threshold = ref.read(recognitionThresholdProvider);
    _questions = buildQuiz(widget.words);
  }

  GateQuestion? get _current =>
      _index < _questions.length ? _questions[_index] : null;

  void _pick(String option) {
    if (_picked != null || _finished) return;
    setState(() {
      _picked = option;
      if (option == _current!.answer) {
        _correct++;
      } else {
        _wrong++;
      }
    });
  }

  void _next() {
    if (_index + 1 >= _questions.length) {
      _finish();
    } else {
      setState(() {
        _index++;
        _picked = null;
      });
    }
  }

  void _finish() {
    final rate = resultRate(_correct, _correct + _wrong);
    final passed = hasPassed(rate, _threshold);
    setState(() {
      _finished = true;
      _passed = passed;
      if (!passed) _failedAttempts++;
    });
  }

  Future<void> _unlock(double rate) async {
    await ref
        .read(sectionProvider(widget.book.bookId).notifier)
        .updatePracticeProgress(
          sectionId: widget.section.sectionId,
          masteredWords: _correct,
          recognitionRate: rate,
          threshold: _threshold,
        );
    if (mounted) Navigator.pop(context, true);
  }

  void _override() => _unlock(1.0);

  void _retry() {
    setState(() {
      _questions = buildQuiz(widget.words);
      _index = 0;
      _correct = 0;
      _wrong = 0;
      _picked = null;
      _finished = false;
      _passed = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_questions.isEmpty) return _buildEmpty();
    if (_finished) return _buildResult();
    return _buildQuiz();
  }

  Widget _buildQuiz() {
    final q = _current!;
    final isCorrect = _picked == q.answer;
    return Scaffold(
      appBar: AppBar(title: Text('Word Quiz — Section ${widget.section.sectionNumber}')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            LinearProgressIndicator(value: _index / _questions.length),
            const SizedBox(height: 8),
            Text(
              '${_index + 1} of ${_questions.length}',
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const Spacer(),
            Text(
              'What does "${q.word.word}" mean?',
              style: Theme.of(context).textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ...q.options.map((option) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _optionButton(q, option),
                )),
            const Spacer(),
            if (_picked != null) ...[
              Text(
                isCorrect ? 'Correct!' : 'Not correct.',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: isCorrect ? Colors.green : Colors.red,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: _next,
                child: Text(
                  _index + 1 >= _questions.length ? 'See my result' : 'Next',
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _optionButton(GateQuestion q, String option) {
    final isCorrect = option == q.answer;
    final isPicked = option == _picked;
    Color? bg;
    if (_picked != null) {
      if (isCorrect) {
        bg = Colors.green.shade100;
      } else if (isPicked) {
        bg = Colors.red.shade100;
      }
    }
    return OutlinedButton(
      onPressed: _picked != null ? null : () => _pick(option),
      style: OutlinedButton.styleFrom(
        backgroundColor: bg,
        foregroundColor: Colors.black,
        padding: const EdgeInsets.symmetric(vertical: 16),
        textStyle: const TextStyle(fontSize: 16),
      ),
      child: Text(option),
    );
  }

  Widget _buildResult() {
    final rate = resultRate(_correct, _correct + _wrong);
    final passed = _passed ?? false;
    return Scaffold(
      appBar: AppBar(title: Text('Word Quiz — Section ${widget.section.sectionNumber}')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                passed ? Icons.celebration : Icons.trending_up,
                size: 96,
                color: passed ? Colors.green : Colors.orange,
              ),
              const SizedBox(height: 24),
              Text(
                passed ? 'Section unlocked!' : 'Almost there',
                style: Theme.of(context).textTheme.headlineSmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                'You got ${(rate * 100).toStringAsFixed(0)}% ($_correct of ${_correct + _wrong} correct).',
                style: Theme.of(context).textTheme.bodyLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Pass: ${(_threshold * 100).toStringAsFixed(0)}%',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 32),
              if (passed)
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: () => _unlock(rate),
                    child: const Text('Start reading'),
                  ),
                )
              else ...[
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _retry,
                    child: const Text('Practice these words'),
                  ),
                ),
                if (canOverride(_failedAttempts)) ...[
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: OutlinedButton(
                      onPressed: _override,
                      child: const Text('Read anyway'),
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Back to sections'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmpty() {
    return Scaffold(
      appBar: AppBar(title: Text('Word Quiz — Section ${widget.section.sectionNumber}')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('No words for this part yet.'),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => _unlock(1.0),
                child: const Text('Continue'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
