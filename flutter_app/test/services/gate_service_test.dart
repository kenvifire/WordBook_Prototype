import 'package:flutter_test/flutter_test.dart';
import 'package:wordbook/models/word.dart';
import 'package:wordbook/services/gate/gate_service.dart';

Word _word(String id, String text, String definition) => Word()
  ..wordId = id
  ..word = text
  ..definition = definition
  ..bookId = 'book'
  ..status = WordStatus.newWord
  ..extractionMethod = ExtractionMethod.automatic;

void main() {
  group('buildQuiz', () {
    final cards = [
      _word('1', 'rabbit', 'a small animal with long ears'),
      _word('2', 'bored', 'not interested'),
      _word('3', 'watch', 'a small clock'),
      _word('4', 'deep', 'going far down'),
      _word('5', 'curious', 'wanting to know more'),
    ];

    test('makes one question per card, each with the answer and 3 distractors', () {
      final quiz = buildQuiz(cards);
      expect(quiz.length, 5);
      for (final q in quiz) {
        expect(q.options, contains(q.answer));
        expect(q.options.toSet().length, 4, reason: 'options must be distinct');
      }
    });

    test('never uses the prompt word as its own distractor', () {
      final quiz = buildQuiz(cards);
      for (final q in quiz) {
        expect(q.options, isNot(contains(q.word.word)));
      }
    });

    test('uses extra meanings when the section has few cards', () {
      final few = [_word('1', 'rabbit', 'a small animal with long ears')];
      final extra = [
        _word('2', 'bored', 'not interested'),
        _word('3', 'watch', 'a small clock'),
        _word('4', 'deep', 'going far down'),
      ];
      final quiz = buildQuiz(few, extra: extra);
      expect(quiz.length, 1);
      expect(quiz.single.options.toSet().length, 4);
    });
  });

  group('canOfferEarlyRead', () {
    test('true only for a perfect first batch when more remains', () {
      expect(canOfferEarlyRead(5, 0, 10), isTrue);
      expect(canOfferEarlyRead(5, 1, 10), isFalse);
      expect(canOfferEarlyRead(4, 0, 10), isFalse);
      expect(canOfferEarlyRead(5, 0, 5), isFalse);
    });
  });

  group('canRunQuiz', () {
    test('needs at least one word and four distinct meanings', () {
      expect(
        canRunQuiz([
          _word('1', 'rabbit', 'a small animal with long ears'),
          _word('2', 'bored', 'not interested'),
          _word('3', 'watch', 'a small clock'),
          _word('4', 'deep', 'going far down'),
        ]),
        isTrue,
      );
      expect(
        canRunQuiz([
          _word('1', 'rabbit', 'a small animal with long ears'),
          _word('2', 'bored', 'not interested'),
        ]),
        isFalse,
      );
      expect(canRunQuiz([]), isFalse);
    });
  });

  group('scoring', () {
    test('resultRate and hasPassed', () {
      expect(resultRate(4, 5), closeTo(0.8, 0.0001));
      expect(hasPassed(resultRate(4, 5), 0.8), isTrue);
      expect(hasPassed(resultRate(3, 5), 0.8), isFalse);
      expect(resultRate(0, 0), 0);
    });

    test('canOverride after the configured attempts', () {
      expect(canOverride(2), isFalse);
      expect(canOverride(3), isTrue);
      expect(canOverride(4), isTrue);
    });
  });

  group('shuffle', () {
    test('preserves all elements', () {
      final a = [1, 2, 3, 4, 5];
      final b = shuffle(a);
      expect(b.toSet(), a.toSet());
      expect(b.length, a.length);
    });
  });
}
