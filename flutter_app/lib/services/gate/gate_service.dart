import 'dart:math';

import '../../models/word.dart';

/// A multiple-choice gate question: the prompt word plus its options.
/// The correct answer is [answer].
class GateQuestion {
  final Word word;
  final List<String> options;
  const GateQuestion({required this.word, required this.options});

  String get answer => (word.definition ?? '').trim();
}

/// Quiz batch size used for the early-read shortcut.
const int gateBatchSize = 5;

/// After this many failed attempts the learner may bypass the gate.
const int maxFailedAttemptsBeforeOverride = 3;

/// Below this many cards, distractor meanings are drawn from [extra] too.
const int extraPoolBelow = 8;

List<T> shuffle<T>(List<T> items, [Random? rng]) {
  final r = rng ?? Random();
  final a = [...items];
  for (var i = a.length - 1; i > 0; i--) {
    final j = r.nextInt(i + 1);
    final tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

/// One question per card that has a definition: the correct meaning plus up
/// to [distractors] meanings from other cards in the same section (or
/// [extra] when the section is small), so the same four answers do not show
/// up on every question.
List<GateQuestion> buildQuiz(
  List<Word> cards, {
  Random? rng,
  int distractors = 3,
  List<Word> extra = const [],
}) {
  final quizCards =
      cards.where((c) => (c.definition ?? '').trim().isNotEmpty).toList();
  final all =
      quizCards.length < extraPoolBelow ? [...quizCards, ...extra] : quizCards;

  return shuffle(quizCards, rng).map((card) {
    final correct = card.definition!.trim();
    final meanings = <String>{};
    for (final c in all) {
      final d = (c.definition ?? '').trim();
      if (d.isEmpty || d == correct) continue;
      if (c.word.toLowerCase() == card.word.toLowerCase()) continue;
      meanings.add(d);
    }
    final pool = shuffle(meanings.toList(), rng).take(distractors).toList();
    final options = shuffle([correct, ...pool], rng);
    return GateQuestion(word: card, options: options);
  }).toList();
}

/// A perfect first batch can unlock early. Later batches always continue to
/// the full quiz.
bool canOfferEarlyRead(
  int answered,
  int wrong,
  int total, {
  int batchSize = gateBatchSize,
}) =>
    total > batchSize && answered == batchSize && wrong == 0;

/// The quiz needs at least one word and four different meanings to choose
/// from.
bool canRunQuiz(List<Word> cards, [List<Word> extra = const []]) {
  final withDefs =
      cards.where((c) => (c.definition ?? '').trim().isNotEmpty).toList();
  final meanings = withDefs.map((c) => c.definition!.trim()).toSet();
  if (withDefs.length < extraPoolBelow) {
    meanings.addAll(
      extra
          .where((c) => (c.definition ?? '').trim().isNotEmpty)
          .map((c) => c.definition!.trim()),
    );
  }
  return withDefs.isNotEmpty && meanings.length >= 4;
}

double resultRate(int correct, int total) => total == 0 ? 0 : correct / total;

bool hasPassed(double rate, double threshold) => rate >= threshold;

bool canOverride(
  int failedAttempts, {
  int max = maxFailedAttemptsBeforeOverride,
}) =>
    failedAttempts >= max;
