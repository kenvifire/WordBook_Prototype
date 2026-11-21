import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:purchases_ui_flutter/purchases_ui_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_constants.dart';
import '../../providers/subscription_provider.dart';
import '../../services/subscription_service.dart';

/// Shows the RevenueCat native paywall
/// Returns true if user subscribed, false otherwise
///
/// On web, RevenueCat has no billing integration (Phase 2), so this shows
/// an explanatory message instead of invoking purchases_flutter.
Future<bool> showRevenueCatPaywall(BuildContext context) async {
  if (kIsWeb) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Pro features are available on mobile for now.'),
        ),
      );
    }
    return false;
  }
  return await SubscriptionService.instance.showPaywall();
}

/// Shows paywall only if user doesn't have the entitlement
/// Returns true if user has access (either already had it or just subscribed)
Future<bool> showPaywallIfNeeded(BuildContext context) async {
  final service = SubscriptionService.instance;
  if (service.isSubscribed) return true;
  if (kIsWeb) return false;

  final result = await service.showPaywall();
  return result || service.isSubscribed;
}

/// A custom paywall screen as fallback when native paywall isn't available
/// or for more customization control
class PaywallScreen extends ConsumerStatefulWidget {
  final String? featureName;
  final bool useNativePaywall;

  const PaywallScreen({
    super.key,
    this.featureName,
    this.useNativePaywall = true,
  });

  /// Show paywall as a modal bottom sheet
  static Future<bool?> showAsBottomSheet(
    BuildContext context, {
    String? featureName,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => PaywallScreen(featureName: featureName),
    );
  }

  /// Show paywall as a full screen page
  static Future<bool?> showAsPage(
    BuildContext context, {
    String? featureName,
  }) {
    return Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => PaywallScreen(featureName: featureName),
      ),
    );
  }

  @override
  ConsumerState<PaywallScreen> createState() => _PaywallScreenState();
}

class _PaywallScreenState extends ConsumerState<PaywallScreen> {
  @override
  void initState() {
    super.initState();
    // Try to show native paywall immediately if preferred.
    // Not available on web: RevenueCat has no web billing integration.
    if (!kIsWeb && widget.useNativePaywall) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _tryShowNativePaywall();
      });
    }
  }

  Future<void> _tryShowNativePaywall() async {
    try {
      final result = await RevenueCatUI.presentPaywallIfNeeded(
        RevenueCatConfig.entitlementId,
      );

      if (mounted) {
        final subscribed = result == PaywallResult.purchased ||
            result == PaywallResult.restored;
        Navigator.of(context).pop(subscribed);
      }
    } catch (e) {
      // Native paywall failed, show custom UI instead
      debugPrint('Native paywall failed: $e');
    }
  }

  Future<void> _purchasePackage(Package package) async {
    final notifier = ref.read(subscriptionNotifierProvider.notifier);
    final success = await notifier.purchasePackage(package);

    if (success && mounted) {
      Navigator.of(context).pop(true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Welcome to WordBook Pro!'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  Future<void> _restorePurchases() async {
    final notifier = ref.read(subscriptionNotifierProvider.notifier);
    final success = await notifier.restorePurchases();

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(success
              ? 'Purchases restored successfully!'
              : 'No purchases to restore'),
          backgroundColor: success ? Colors.green : Colors.orange,
        ),
      );
      if (success) {
        Navigator.of(context).pop(true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Pro purchases are not available on web yet (Phase 2): RevenueCat has
    // no web billing integration in this app, so avoid invoking it and show
    // an explanatory message instead of the purchase UI.
    if (kIsWeb) {
      return Scaffold(
        appBar: AppBar(title: const Text('WordBook Pro')),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'Pro features are available on mobile for now.',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
    }

    final packagesAsync = ref.watch(packagesProvider);
    final subscriptionState = ref.watch(subscriptionNotifierProvider);
    final isLoading = subscriptionState.isLoading;

    return Scaffold(
      appBar: AppBar(
        title: const Text('WordBook Pro'),
        actions: [
          TextButton(
            onPressed: isLoading ? null : _restorePurchases,
            child: const Text('Restore'),
          ),
        ],
      ),
      body: packagesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _buildErrorState(e.toString()),
        data: (packages) => _buildContent(packages, isLoading),
      ),
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              'Unable to load subscription options',
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              error,
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => ref.refresh(packagesProvider),
              child: const Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(List<Package> packages, bool isLoading) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (widget.featureName != null) ...[
            _buildFeaturePrompt(),
            const SizedBox(height: 24),
          ],
          _buildHeader(),
          const SizedBox(height: 32),
          if (packages.isNotEmpty)
            _buildPackagesList(packages, isLoading)
          else
            _buildNoPackagesMessage(),
          const SizedBox(height: 24),
          _buildFeaturesList(),
          const SizedBox(height: 32),
          _buildTermsText(),
        ],
      ),
    );
  }

  Widget _buildFeaturePrompt() {
    return Card(
      color: Theme.of(context).colorScheme.primaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(
              Icons.lock_outline,
              color: Theme.of(context).colorScheme.onPrimaryContainer,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Unlock "${widget.featureName}" with WordBook Pro',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onPrimaryContainer,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Theme.of(context).colorScheme.primary,
                Theme.of(context).colorScheme.secondary,
              ],
            ),
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Icon(
            Icons.auto_awesome,
            size: 40,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'WordBook Pro',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          'Unlock unlimited vocabulary learning',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildPackagesList(List<Package> packages, bool isLoading) {
    return Column(
      children: packages.map((package) {
        return _buildPackageCard(package, isLoading);
      }).toList(),
    );
  }

  Widget _buildPackageCard(Package package, bool isLoading) {
    final product = package.storeProduct;
    final isYearly = package.packageType == PackageType.annual;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: isLoading ? null : () => _purchasePackage(package),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          product.title,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        if (isYearly) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.green,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              'BEST VALUE',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      product.description,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    product.priceString,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                  Text(
                    _getPeriodText(package.packageType),
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _getPeriodText(PackageType type) {
    switch (type) {
      case PackageType.monthly:
        return 'per month';
      case PackageType.annual:
        return 'per year';
      case PackageType.weekly:
        return 'per week';
      case PackageType.lifetime:
        return 'one time';
      default:
        return '';
    }
  }

  Widget _buildNoPackagesMessage() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Icon(Icons.info_outline, size: 48, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              'Subscription options are being set up',
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Please check back later or restore existing purchases.',
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeaturesList() {
    final features = [
      (Icons.menu_book, 'Unlimited books'),
      (Icons.abc, 'Unlimited word extraction'),
      (Icons.psychology, 'Advanced vocabulary practice'),
      (Icons.bar_chart, 'Detailed learning statistics'),
      (Icons.cloud_sync, 'Cloud sync across devices'),
      (Icons.support_agent, 'Priority support'),
    ];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Everything included:',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 12),
            ...features.map((f) => _buildFeatureRow(f.$1, f.$2)),
          ],
        ),
      ),
    );
  }

  Widget _buildFeatureRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(
            Icons.check_circle,
            size: 20,
            color: Colors.green,
          ),
          const SizedBox(width: 12),
          Icon(icon, size: 20, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 8),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }

  Widget _buildTermsText() {
    final linkStyle = TextStyle(
      color: Theme.of(context).colorScheme.primary,
      fontSize: 11,
      fontWeight: FontWeight.w600,
    );
    return Column(
      children: [
        Text(
          'Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage and cancel your subscriptions by going to your account settings on the App Store.',
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.7),
            fontSize: 11,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Wrap(
          alignment: WrapAlignment.center,
          children: [
            GestureDetector(
              onTap: () => launchUrl(
                Uri.parse(AppConstants.privacyPolicyUrl),
                mode: LaunchMode.externalApplication,
              ),
              child: Text('Privacy Policy', style: linkStyle),
            ),
            const SizedBox(width: 12, height: 0),
            GestureDetector(
              onTap: () => launchUrl(
                Uri.parse(AppConstants.termsOfServiceUrl),
                mode: LaunchMode.externalApplication,
              ),
              child: Text('Terms of Service', style: linkStyle),
            ),
          ],
        ),
      ],
    );
  }
}

/// A widget that shows upgrade prompt for locked features
class UpgradePromptWidget extends ConsumerWidget {
  final String featureName;
  final Widget? child;

  const UpgradePromptWidget({
    super.key,
    required this.featureName,
    this.child,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isSubscribed = ref.watch(isSubscribedProvider);

    if (isSubscribed) {
      return child ?? const SizedBox.shrink();
    }

    return Card(
      color: Theme.of(context).colorScheme.primaryContainer,
      child: InkWell(
        onTap: () => showRevenueCatPaywall(context),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  Icons.lock,
                  color: Theme.of(context).colorScheme.onPrimary,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      featureName,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onPrimaryContainer,
                      ),
                    ),
                    Text(
                      'Upgrade to WordBook Pro to unlock',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onPrimaryContainer.withValues(alpha: 0.7),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.arrow_forward_ios,
                size: 16,
                color: Theme.of(context).colorScheme.onPrimaryContainer.withValues(alpha: 0.5),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
