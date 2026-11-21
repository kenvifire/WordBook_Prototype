import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_constants.dart';
import '../../providers/auth_provider.dart';
import '../../providers/subscription_provider.dart';
import '../../providers/sync_provider.dart';
import '../../providers/theme_provider.dart';
import '../../services/subscription_service.dart';
import '../subscription/paywall_screen.dart';
import 'profile_settings_screen.dart';
import 'preferences_screen.dart';
import 'words_settings_screen.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final themeMode = ref.watch(themeModeProvider);
    final isSubscribed = ref.watch(isSubscribedProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: ListView(
        children: [
          if (user != null)
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 40,
                    backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                    child: Text(
                      user.displayName?.substring(0, 1).toUpperCase() ??
                          user.email?.substring(0, 1).toUpperCase() ??
                          'U',
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            color: Theme.of(context).colorScheme.onPrimaryContainer,
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    user.displayName ?? 'User',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user.email ?? '',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey,
                        ),
                  ),
                ],
              ),
            ),
          _buildSubscriptionTile(context, ref, isSubscribed),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.person_outline),
            title: const Text('Profile'),
            subtitle: const Text('Manage your account information'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const ProfileSettingsScreen(),
                ),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.palette_outlined),
            title: const Text('Preferences'),
            subtitle: const Text('Font size, themes, and display'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const PreferencesScreen(),
                ),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.school_outlined),
            title: const Text('Words Settings'),
            subtitle: const Text('Practice settings and section size'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const WordsSettingsScreen(),
                ),
              );
            },
          ),
          const Divider(),
          SwitchListTile(
            secondary: const Icon(Icons.dark_mode_outlined),
            title: const Text('Dark Mode'),
            subtitle: const Text('Toggle between light and dark theme'),
            value: themeMode == ThemeMode.dark,
            onChanged: (value) {
              ref.read(themeModeProvider.notifier).setThemeMode(
                  value ? ThemeMode.dark : ThemeMode.light);
            },
          ),
          const Divider(),
          // Cloud Sync section
          _buildCloudSyncTile(context, ref, isSubscribed),
          const Divider(),
          // Manage Subscription - only show for subscribed users
          if (isSubscribed)
            ListTile(
              leading: const Icon(Icons.credit_card_outlined),
              title: const Text('Manage Subscription'),
              subtitle: const Text('View and manage your subscription'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => _showCustomerCenter(context, ref),
            ),
          ListTile(
            leading: const Icon(Icons.restore),
            title: const Text('Restore Purchases'),
            subtitle: const Text('Restore your previous purchases'),
            onTap: () => _restorePurchases(context, ref),
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.info_outline),
            title: const Text('About'),
            subtitle: const Text('Version 1.0.0'),
            onTap: () {
              showAboutDialog(
                context: context,
                applicationName: 'WordBook',
                applicationVersion: '1.0.0',
                applicationLegalese: '© 2024 WordBook\nLearn languages through reading',
                children: [
                  const SizedBox(height: 16),
                  const Text(
                    'WordBook helps you acquire your secondary language by reading books you choose, '
                    'with an integrated vocabulary practice system.',
                  ),
                ],
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.privacy_tip_outlined),
            title: const Text('Privacy Policy'),
            trailing: const Icon(Icons.open_in_new, size: 18),
            onTap: () => _openLegalUrl(context, AppConstants.privacyPolicyUrl),
          ),
          ListTile(
            leading: const Icon(Icons.description_outlined),
            title: const Text('Terms of Service'),
            trailing: const Icon(Icons.open_in_new, size: 18),
            onTap: () => _openLegalUrl(context, AppConstants.termsOfServiceUrl),
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text(
              'Sign Out',
              style: TextStyle(color: Colors.red),
            ),
            onTap: () => _showLogoutDialog(context, ref),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildCloudSyncTile(BuildContext context, WidgetRef ref, bool isSubscribed) {
    final syncState = ref.watch(syncStateProvider);
    final isCloudSyncAvailable = ref.watch(isCloudSyncAvailableProvider);

    String subtitle;
    if (!isCloudSyncAvailable) {
      subtitle = 'Pro feature - Upgrade to enable';
    } else if (syncState.isSyncing) {
      subtitle = 'Syncing...';
    } else if (syncState.lastSyncTime != null) {
      subtitle = 'Last synced: ${DateFormat.yMd().add_jm().format(syncState.lastSyncTime!)}';
    } else {
      subtitle = 'Tap to sync your data across devices';
    }

    return ListTile(
      leading: Icon(
        Icons.cloud_sync_outlined,
        color: isCloudSyncAvailable ? Theme.of(context).colorScheme.primary : Colors.grey,
      ),
      title: Row(
        children: [
          const Text('Cloud Sync'),
          if (!isCloudSyncAvailable) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                'PRO',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.onPrimaryContainer,
                ),
              ),
            ),
          ],
        ],
      ),
      subtitle: Text(
        subtitle,
        style: TextStyle(
          color: syncState.errorMessage != null ? Colors.red : null,
        ),
      ),
      trailing: syncState.isSyncing
          ? const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : Icon(
              isCloudSyncAvailable ? Icons.sync : Icons.lock_outline,
              color: isCloudSyncAvailable ? null : Colors.grey,
            ),
      onTap: isCloudSyncAvailable && !syncState.isSyncing
          ? () => _performSync(context, ref)
          : isCloudSyncAvailable
              ? null
              : () => showRevenueCatPaywall(context),
    );
  }

  Future<void> _performSync(BuildContext context, WidgetRef ref) async {
    final result = await ref.read(syncStateProvider.notifier).sync();

    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            result.success
                ? 'Sync complete! Uploaded: ${result.uploaded}, Downloaded: ${result.downloaded}'
                : result.message,
          ),
          backgroundColor: result.success ? Colors.green : Colors.red,
        ),
      );
    }
  }

  Widget _buildSubscriptionTile(BuildContext context, WidgetRef ref, bool isSubscribed) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        gradient: isSubscribed
            ? LinearGradient(
                colors: [
                  Theme.of(context).colorScheme.primary,
                  Theme.of(context).colorScheme.secondary,
                ],
              )
            : null,
        color: isSubscribed ? null : Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        leading: Icon(
          isSubscribed ? Icons.workspace_premium : Icons.star_border,
          color: isSubscribed ? Colors.white : Theme.of(context).colorScheme.primary,
        ),
        title: Text(
          isSubscribed ? 'WordBook Pro' : 'Free Plan',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: isSubscribed ? Colors.white : null,
          ),
        ),
        subtitle: Text(
          isSubscribed ? 'You have premium access' : 'Upgrade for more features',
          style: TextStyle(
            color: isSubscribed ? Colors.white70 : Colors.grey,
          ),
        ),
        trailing: isSubscribed
            ? IconButton(
                icon: const Icon(Icons.settings, color: Colors.white70),
                onPressed: () => _showCustomerCenter(context, ref),
              )
            : ElevatedButton(
                onPressed: () => showRevenueCatPaywall(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  foregroundColor: Theme.of(context).colorScheme.onPrimary,
                ),
                child: const Text('Upgrade'),
              ),
        onTap: () {
          if (isSubscribed) {
            _showCustomerCenter(context, ref);
          } else {
            showRevenueCatPaywall(context);
          }
        },
      ),
    );
  }

  Future<void> _showCustomerCenter(BuildContext context, WidgetRef ref) async {
    try {
      await SubscriptionService.instance.showCustomerCenter();
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Unable to open subscription management: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _openLegalUrl(BuildContext context, String url) async {
    final uri = Uri.parse(url);
    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open the page.')),
      );
    }
  }

  Future<void> _restorePurchases(BuildContext context, WidgetRef ref) async {
    // Show loading indicator
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(),
      ),
    );

    try {
      final notifier = ref.read(subscriptionNotifierProvider.notifier);
      final success = await notifier.restorePurchases();

      if (context.mounted) {
        Navigator.pop(context); // Close loading dialog
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(success
                ? 'Purchases restored successfully!'
                : 'No purchases to restore'),
            backgroundColor: success ? Colors.green : Colors.orange,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        Navigator.pop(context); // Close loading dialog
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to restore purchases: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showLogoutDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);

              // Logout from RevenueCat first
              try {
                await SubscriptionService.instance.logout();
              } catch (e) {
                debugPrint('RevenueCat logout error: $e');
              }

              // Then logout from Firebase
              final authService = ref.read(authServiceProvider);
              await authService.signOut();
            },
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }
}
