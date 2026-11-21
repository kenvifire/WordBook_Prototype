import 'package:isar/isar.dart';
import 'package:path_provider/path_provider.dart';
import '../data/isar/entities/book_entity.dart';
import '../data/isar/entities/reading_section_entity.dart';
import '../data/isar/entities/statistics_entity.dart';
import '../data/isar/entities/user_entity.dart';
import '../data/isar/entities/user_subscription_entity.dart';
import '../data/isar/entities/word_entity.dart';
import '../models/reading_progress.dart';

/// Native (iOS/Android/macOS/Windows/Linux) [DatabaseService] implementation.
///
/// Opens the real on-disk Isar database. Native store files
/// (`book_store_native.dart`, `word_store_native.dart`, etc.) reach the
/// shared [Isar] instance via the [isar] getter, unchanged from before this
/// file was split out of `database_service.dart`.
class DatabaseService {
  static Isar? _isar;

  static Future<Isar> get isar async {
    if (_isar != null) return _isar!;

    final dir = await getApplicationDocumentsDirectory();
    _isar = await Isar.open(
      [
        BookEntitySchema,
        WordEntitySchema,
        ReadingProgressSchema,
        ReadingSectionEntitySchema,
        UserEntitySchema,
        StatisticsEntitySchema,
        UserSubscriptionSchema,
      ],
      directory: dir.path,
      inspector: false, // Disable inspector to avoid VM Service port conflict
    );

    return _isar!;
  }

  /// Warms up the database connection. Safe to call on every platform.
  static Future<void> init() async {
    await isar;
  }

  Future<void> close() async {
    await _isar?.close();
    _isar = null;
  }
}
