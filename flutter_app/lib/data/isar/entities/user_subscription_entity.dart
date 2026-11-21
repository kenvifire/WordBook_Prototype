import 'package:isar/isar.dart';
import '../../../models/subscription.dart';

part 'user_subscription_entity.g.dart';

/// Native-only Isar persistence model for a cached user subscription status.
///
/// This class is dead code in practice — nothing outside this file and the
/// native `Isar.open([...])` schema list in `database_service_native.dart`
/// references `UserSubscription` — but it must still never be importable
/// from a web build: Isar's generated `*.g.dart` part contains 64-bit
/// literals that dart2js cannot compile, so merely importing an
/// `@collection`-annotated model drags that into a web build. It used to
/// live in `lib/models/subscription.dart` alongside the live, plain
/// `SubscriptionTier`/`SubscriptionEntitlements`/`SubscriptionProduct`
/// classes that `subscription_provider.dart` actually uses; importing that
/// file for those live classes dragged this dead Isar collection (and its
/// unsafe int64 literals) into the web graph too, so it was split out here.
@collection
class UserSubscription {
  Id id = Isar.autoIncrement;

  @Index()
  late String userId;

  @enumerated
  SubscriptionTier tier = SubscriptionTier.free;

  String? productId;

  DateTime? purchaseDate;

  DateTime? expirationDate;

  bool isActive = false;

  String? transactionId;

  DateTime updatedAt = DateTime.now();

  @ignore
  bool get isExpired {
    if (expirationDate == null) return tier == SubscriptionTier.free;
    return DateTime.now().isAfter(expirationDate!);
  }

  @ignore
  SubscriptionEntitlements get entitlements {
    if (isExpired && tier != SubscriptionTier.free) {
      return SubscriptionEntitlements.free;
    }
    return SubscriptionEntitlements.forTier(tier);
  }
}
