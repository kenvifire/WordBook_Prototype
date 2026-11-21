import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:purchases_ui_flutter/purchases_ui_flutter.dart';

/// RevenueCat configuration
class RevenueCatConfig {
  // !!! RELEASE BLOCKER !!!
  // These are placeholder/test keys (same value reused for both platforms,
  // which is never correct). Subscriptions WILL NOT WORK in production until
  // these are replaced with the real per-platform public API keys from:
  //   RevenueCat dashboard -> Project settings -> API keys
  //   (one key for the Apple app, a different one for the Google Play app)
  static const String appleApiKey = 'test_urFliOCGnSgAUFaLKIzfHQdktla';
  static const String googleApiKey = 'test_urFliOCGnSgAUFaLKIzfHQdktla';

  // Entitlement ID - Must match what you configure in RevenueCat dashboard
  static const String entitlementId = 'WordBook Pro';

  // Product identifiers (configured in App Store Connect / Google Play Console)
  static const String monthlyProductId = 'monthly';
  static const String yearlyProductId = 'yearly';
}

/// Subscription status
enum SubscriptionStatus {
  unknown,
  notSubscribed,
  subscribed,
  expired,
}

/// Service for managing subscriptions via RevenueCat
class SubscriptionService {
  static SubscriptionService? _instance;
  static SubscriptionService get instance => _instance ??= SubscriptionService._();

  SubscriptionService._();

  bool _isInitialized = false;
  CustomerInfo? _customerInfo;

  // Stream controller for customer info updates
  final _customerInfoController = StreamController<CustomerInfo?>.broadcast();
  Stream<CustomerInfo?> get customerInfoStream => _customerInfoController.stream;

  // Getters for subscription state
  bool get isInitialized => _isInitialized;
  CustomerInfo? get customerInfo => _customerInfo;

  /// Check if user has active WordBook Pro entitlement
  bool get isSubscribed {
    if (_customerInfo == null) return false;
    return _customerInfo!.entitlements.active.containsKey(RevenueCatConfig.entitlementId);
  }

  /// Get the active entitlement info
  EntitlementInfo? get activeEntitlement {
    if (_customerInfo == null) return null;
    return _customerInfo!.entitlements.active[RevenueCatConfig.entitlementId];
  }

  /// Get subscription status
  SubscriptionStatus get subscriptionStatus {
    if (_customerInfo == null) return SubscriptionStatus.unknown;

    final entitlement = _customerInfo!.entitlements.all[RevenueCatConfig.entitlementId];
    if (entitlement == null) return SubscriptionStatus.notSubscribed;
    if (entitlement.isActive) return SubscriptionStatus.subscribed;
    return SubscriptionStatus.expired;
  }

  /// Get expiration date of current subscription
  DateTime? get expirationDate {
    final entitlement = activeEntitlement;
    if (entitlement?.expirationDate == null) return null;
    return DateTime.tryParse(entitlement!.expirationDate!);
  }

  /// Check if subscription will renew
  bool get willRenew {
    return activeEntitlement?.willRenew ?? false;
  }

  /// Check if user can add more books (based on subscription)
  bool canAddBook(int currentBookCount) {
    if (isSubscribed) return true; // Unlimited for subscribers
    return currentBookCount < 3; // Free tier limit
  }

  /// Get word extraction limit
  int getWordExtractionLimit() {
    if (isSubscribed) return -1; // Unlimited for subscribers
    return 50; // Free tier limit
  }

  /// Check if user can extract more words
  bool canExtractWords(int wordCount) {
    if (isSubscribed) return true; // Unlimited for subscribers
    return wordCount <= 50; // Free tier limit
  }

  /// Initialize RevenueCat SDK
  Future<void> initialize({String? userId}) async {
    if (kIsWeb) {
      // RevenueCat/IAP is gated off entirely on web (Task 10); never let
      // the SDK attempt to configure itself there at all, rather than
      // relying on the try/catch below to swallow whatever it throws.
      debugPrint('RevenueCat: Skipping initialization on web');
      return;
    }

    if (_isInitialized) {
      debugPrint('RevenueCat: Already initialized');
      return;
    }

    try {
      // Set log level based on build mode
      await Purchases.setLogLevel(kDebugMode ? LogLevel.debug : LogLevel.info);

      // Get the appropriate API key for the platform
      final apiKey = defaultTargetPlatform == TargetPlatform.iOS ||
              defaultTargetPlatform == TargetPlatform.macOS
          ? RevenueCatConfig.appleApiKey
          : RevenueCatConfig.googleApiKey;

      // Configure RevenueCat
      PurchasesConfiguration configuration = PurchasesConfiguration(apiKey);

      // Set app user ID if provided (for linking with your user system)
      if (userId != null && userId.isNotEmpty) {
        configuration = PurchasesConfiguration(apiKey)..appUserID = userId;
      }

      await Purchases.configure(configuration);
      _isInitialized = true;
      debugPrint('RevenueCat: Initialized successfully');

      // Get initial customer info
      await refreshCustomerInfo();

      // Listen for customer info updates
      Purchases.addCustomerInfoUpdateListener(_onCustomerInfoUpdated);

    } catch (e) {
      debugPrint('RevenueCat: Failed to initialize - $e');
      // Don't crash the app — RevenueCat is non-essential for core functionality
      _isInitialized = false;
    }
  }

  /// Callback for customer info updates
  void _onCustomerInfoUpdated(CustomerInfo customerInfo) {
    debugPrint('RevenueCat: Customer info updated');
    _customerInfo = customerInfo;
    _customerInfoController.add(customerInfo);
  }

  /// Refresh customer info from RevenueCat
  Future<CustomerInfo?> refreshCustomerInfo() async {
    try {
      _customerInfo = await Purchases.getCustomerInfo();
      _customerInfoController.add(_customerInfo);
      debugPrint('RevenueCat: Customer info refreshed - Subscribed: $isSubscribed');
      return _customerInfo;
    } catch (e) {
      debugPrint('RevenueCat: Failed to get customer info - $e');
      return null;
    }
  }

  /// Get current offerings (products available for purchase)
  Future<Offerings?> getOfferings() async {
    try {
      final offerings = await Purchases.getOfferings();
      debugPrint('RevenueCat: Got offerings - Current: ${offerings.current?.identifier}');
      return offerings;
    } catch (e) {
      debugPrint('RevenueCat: Failed to get offerings - $e');
      return null;
    }
  }

  /// Get available packages from current offering
  Future<List<Package>> getPackages() async {
    try {
      final offerings = await getOfferings();
      return offerings?.current?.availablePackages ?? [];
    } catch (e) {
      debugPrint('RevenueCat: Failed to get packages - $e');
      return [];
    }
  }

  /// Purchase a package using modern SDK method
  Future<bool> purchasePackage(Package package) async {
    try {
      debugPrint('RevenueCat: Purchasing package ${package.identifier}');

      final result = await Purchases.purchasePackage(package);
      // Modern SDK returns PurchaseResult with customerInfo property
      _customerInfo = result.customerInfo;
      _customerInfoController.add(_customerInfo);

      final success = _customerInfo!.entitlements.active.containsKey(RevenueCatConfig.entitlementId);
      debugPrint('RevenueCat: Purchase ${success ? 'successful' : 'failed'}');
      return success;
    } on PurchasesErrorCode catch (e) {
      if (e == PurchasesErrorCode.purchaseCancelledError) {
        debugPrint('RevenueCat: Purchase cancelled by user');
      } else {
        debugPrint('RevenueCat: Purchase error - $e');
      }
      return false;
    } catch (e) {
      debugPrint('RevenueCat: Purchase error - $e');
      return false;
    }
  }

  /// Restore purchases
  Future<bool> restorePurchases() async {
    try {
      debugPrint('RevenueCat: Restoring purchases');
      final customerInfo = await Purchases.restorePurchases();
      _customerInfo = customerInfo;
      _customerInfoController.add(customerInfo);

      final hasEntitlement = customerInfo.entitlements.active.containsKey(RevenueCatConfig.entitlementId);
      debugPrint('RevenueCat: Restore ${hasEntitlement ? 'found entitlements' : 'no entitlements found'}');
      return hasEntitlement;
    } catch (e) {
      debugPrint('RevenueCat: Restore failed - $e');
      return false;
    }
  }

  /// Show RevenueCat native paywall
  /// Returns true if user subscribed, false otherwise
  Future<bool> showPaywall() async {
    try {
      debugPrint('RevenueCat: Showing paywall');

      final paywallResult = await RevenueCatUI.presentPaywallIfNeeded(
        RevenueCatConfig.entitlementId,
      );

      debugPrint('RevenueCat: Paywall result - $paywallResult');

      // Refresh customer info after paywall closes
      await refreshCustomerInfo();

      return paywallResult == PaywallResult.purchased ||
             paywallResult == PaywallResult.restored;
    } catch (e) {
      debugPrint('RevenueCat: Paywall error - $e');
      return false;
    }
  }

  /// Present Customer Center for subscription management
  Future<void> showCustomerCenter() async {
    try {
      debugPrint('RevenueCat: Showing Customer Center');
      await RevenueCatUI.presentCustomerCenter();
    } catch (e) {
      debugPrint('RevenueCat: Customer Center error - $e');
      rethrow;
    }
  }

  /// Login user to RevenueCat (links purchases to user ID)
  Future<void> login(String userId) async {
    try {
      debugPrint('RevenueCat: Logging in user $userId');
      final loginResult = await Purchases.logIn(userId);
      _customerInfo = loginResult.customerInfo;
      _customerInfoController.add(_customerInfo);
      debugPrint('RevenueCat: Login successful - Created: ${loginResult.created}');
    } catch (e) {
      debugPrint('RevenueCat: Login failed - $e');
      rethrow;
    }
  }

  /// Logout user from RevenueCat (generates anonymous user)
  Future<void> logout() async {
    try {
      debugPrint('RevenueCat: Logging out');
      final customerInfo = await Purchases.logOut();
      _customerInfo = customerInfo;
      _customerInfoController.add(_customerInfo);
    } catch (e) {
      debugPrint('RevenueCat: Logout failed - $e');
      rethrow;
    }
  }

  /// Check if a specific feature is available based on subscription
  bool hasAccess(String featureId) {
    return isSubscribed;
  }

  /// Get subscription management URL (for web-based management)
  Future<String?> getManagementUrl() async {
    try {
      final customerInfo = await refreshCustomerInfo();
      return customerInfo?.managementURL;
    } catch (e) {
      debugPrint('RevenueCat: Failed to get management URL - $e');
      return null;
    }
  }

  /// Dispose resources
  void dispose() {
    _customerInfoController.close();
  }
}
