import 'package:shared_preferences/shared_preferences.dart';

class StreakService {
  static const _lastPracticeKey = 'streak_last_practice';
  static const _streakCountKey = 'streak_count';

  static Future<void> recordPractice() async {
    final prefs = await SharedPreferences.getInstance();
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    final lastStr = prefs.getString(_lastPracticeKey);
    if (lastStr != null) {
      final last = DateTime.parse(lastStr);
      final lastDay = DateTime(last.year, last.month, last.day);
      final diff = today.difference(lastDay).inDays;

      if (diff == 0) return;
      if (diff == 1) {
        final count = prefs.getInt(_streakCountKey) ?? 0;
        await prefs.setInt(_streakCountKey, count + 1);
      } else {
        await prefs.setInt(_streakCountKey, 1);
      }
    } else {
      await prefs.setInt(_streakCountKey, 1);
    }
    await prefs.setString(_lastPracticeKey, today.toIso8601String());
  }

  static Future<(int, bool)> getStreak() async {
    final prefs = await SharedPreferences.getInstance();
    final count = prefs.getInt(_streakCountKey) ?? 0;
    final lastStr = prefs.getString(_lastPracticeKey);
    if (lastStr == null) return (0, false);

    final last = DateTime.parse(lastStr);
    final lastDay = DateTime(last.year, last.month, last.day);
    final today = DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);
    final practicedToday = lastDay == today;
    final diff = today.difference(lastDay).inDays;

    if (diff > 1) return (0, false);
    return (count, practicedToday);
  }
}
