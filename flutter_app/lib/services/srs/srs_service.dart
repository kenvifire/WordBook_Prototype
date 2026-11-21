import '../../models/word.dart';

class SRSService {
  SRSResult calculateNextReview({
    required Word word,
    required int quality,
  }) {
    if (quality < 0 || quality > 5) {
      throw ArgumentError('Quality must be between 0 and 5');
    }

    int repetitions = word.repetitions;
    double easeFactor = word.easeFactor;
    int interval = word.interval;

    if (quality >= 3) {
      if (repetitions == 0) {
        interval = 1;
      } else if (repetitions == 1) {
        interval = 6;
      } else {
        interval = (interval * easeFactor).round();
      }
      repetitions++;
    } else {
      repetitions = 0;
      interval = 1;
    }

    easeFactor = easeFactor +
        (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    if (easeFactor < 1.3) {
      easeFactor = 1.3;
    }

    final nextReviewDate = DateTime.now().add(Duration(days: interval));

    final status = _determineWordStatus(repetitions, quality);

    return SRSResult(
      repetitions: repetitions,
      easeFactor: easeFactor,
      interval: interval,
      nextReviewDate: nextReviewDate,
      status: status,
    );
  }

  WordStatus _determineWordStatus(int repetitions, int quality) {
    if (repetitions == 0) {
      return WordStatus.newWord;
    } else if (repetitions < 3) {
      return WordStatus.learning;
    } else if (repetitions < 8) {
      return WordStatus.reviewing;
    } else {
      return WordStatus.mastered;
    }
  }

  List<Word> getDueWords(List<Word> words) {
    final now = DateTime.now();
    return words.where((word) {
      if (word.nextReviewDate == null) return true;
      return word.nextReviewDate!.isBefore(now);
    }).toList();
  }

  double calculateRecognitionRate(List<Word> words, int correctCount) {
    if (words.isEmpty) return 0.0;
    return correctCount / words.length;
  }
}

class SRSResult {
  final int repetitions;
  final double easeFactor;
  final int interval;
  final DateTime nextReviewDate;
  final WordStatus status;

  SRSResult({
    required this.repetitions,
    required this.easeFactor,
    required this.interval,
    required this.nextReviewDate,
    required this.status,
  });
}
