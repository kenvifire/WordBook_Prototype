import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import '../models/subscription.dart';
import '../services/subscription_service.dart';

/// Provider for the subscription service instance
final subscriptionServiceProvider = Provider<SubscriptionService>((ref) {
  return SubscriptionService.instance;
});

/// Stream provider for reactive customer info updates
final customerInfoStreamProvider = StreamProvider<CustomerInfo?>((ref) {
  final service = ref.watch(subscriptionServiceProvider);
  return service.customerInfoStream;
});

/// Provider for current customer info (non-stream, for sync access)
final customerInfoProvider = Provider<CustomerInfo?>((ref) {
  final streamAsync = ref.watch(customerInfoStreamProvider);
  return streamAsync.valueOrNull;
});

/// Provider for checking if user has WordBook Pro subscription
final isSubscribedProvider = Provider<bool>((ref) {
  final customerInfo = ref.watch(customerInfoProvider);
  if (customerInfo == null) {
    // Fall back to service state if stream hasn't emitted yet
    return ref.watch(subscriptionServiceProvider).isSubscribed;
  }
  return customerInfo.entitlements.active.containsKey(RevenueCatConfig.entitlementId);
});

/// Provider for subscription entitlements (based on subscription status)
final subscriptionEntitlementsProvider = Provider<SubscriptionEntitlements>((ref) {
  final isSubscribed = ref.watch(isSubscribedProvider);
  return SubscriptionEntitlements.forSubscriptionStatus(isSubscribed);
});

/// Provider for subscription status
final subscriptionStatusProvider = Provider<SubscriptionStatus>((ref) {
  final customerInfo = ref.watch(customerInfoProvider);
  if (customerInfo == null) return SubscriptionStatus.unknown;

  final entitlement = customerInfo.entitlements.all[RevenueCatConfig.entitlementId];
  if (entitlement == null) return SubscriptionStatus.notSubscribed;
  if (entitlement.isActive) return SubscriptionStatus.subscribed;
  return SubscriptionStatus.expired;
});

/// Provider for active entitlement info
final activeEntitlementProvider = Provider<EntitlementInfo?>((ref) {
  final customerInfo = ref.watch(customerInfoProvider);
  return customerInfo?.entitlements.active[RevenueCatConfig.entitlementId];
});

/// Provider for subscription expiration date
final expirationDateProvider = Provider<DateTime?>((ref) {
  final entitlement = ref.watch(activeEntitlementProvider);
  if (entitlement?.expirationDate == null) return null;
  return DateTime.tryParse(entitlement!.expirationDate!);
});

/// Provider for checking if subscription will renew
final willRenewProvider = Provider<bool>((ref) {
  final entitlement = ref.watch(activeEntitlementProvider);
  return entitlement?.willRenew ?? false;
});

/// Async provider for loading offerings
final offeringsProvider = FutureProvider<Offerings?>((ref) async {
  final service = ref.watch(subscriptionServiceProvider);
  return service.getOfferings();
});

/// Async provider for available packages
final packagesProvider = FutureProvider<List<Package>>((ref) async {
  final service = ref.watch(subscriptionServiceProvider);
  return service.getPackages();
});

/// Notifier for subscription actions (purchase, restore, etc.)
class SubscriptionNotifier extends StateNotifier<AsyncValue<void>> {
  final SubscriptionService _service;

  SubscriptionNotifier(this._service) : super(const AsyncValue.data(null));

  /// Initialize RevenueCat
  Future<void> initialize({String? userId}) async {
    state = const AsyncValue.loading();
    try {
      await _service.initialize(userId: userId);
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  /// Show the RevenueCat native paywall
  Future<bool> showPaywall() async {
    state = const AsyncValue.loading();
    try {
      final result = await _service.showPaywall();
      state = const AsyncValue.data(null);
      return result;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  /// Show Customer Center
  Future<void> showCustomerCenter() async {
    state = const AsyncValue.loading();
    try {
      await _service.showCustomerCenter();
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  /// Purchase a specific package
  Future<bool> purchasePackage(Package package) async {
    state = const AsyncValue.loading();
    try {
      final success = await _service.purchasePackage(package);
      state = const AsyncValue.data(null);
      return success;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  /// Restore purchases
  Future<bool> restorePurchases() async {
    state = const AsyncValue.loading();
    try {
      final success = await _service.restorePurchases();
      state = const AsyncValue.data(null);
      return success;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  /// Login user to RevenueCat
  Future<void> login(String userId) async {
    state = const AsyncValue.loading();
    try {
      await _service.login(userId);
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  /// Logout user
  Future<void> logout() async {
    state = const AsyncValue.loading();
    try {
      await _service.logout();
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  /// Refresh customer info
  Future<void> refresh() async {
    await _service.refreshCustomerInfo();
  }
}

final subscriptionNotifierProvider =
    StateNotifierProvider<SubscriptionNotifier, AsyncValue<void>>((ref) {
  final service = ref.watch(subscriptionServiceProvider);
  return SubscriptionNotifier(service);
});

// ============================================================================
// Helper extension for easy access in widgets
// ============================================================================

extension SubscriptionProviderExtensions on WidgetRef {
  /// Quick check if user is subscribed
  bool get isSubscribed => watch(isSubscribedProvider);

  /// Show paywall and return result
  Future<bool> showPaywall() {
    return read(subscriptionNotifierProvider.notifier).showPaywall();
  }

  /// Show Customer Center
  Future<void> showCustomerCenter() {
    return read(subscriptionNotifierProvider.notifier).showCustomerCenter();
  }

  /// Restore purchases
  Future<bool> restorePurchases() {
    return read(subscriptionNotifierProvider.notifier).restorePurchases();
  }
}
