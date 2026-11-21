import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/sync/cloud_sync_service.dart';
import 'auth_provider.dart';
import 'subscription_provider.dart';

/// Set to true to enable sync for testing without Pro subscription
const bool kDebugEnableSync = true;

/// Provider for the cloud sync service
final cloudSyncServiceProvider = Provider<CloudSyncService>((ref) {
  return CloudSyncService.instance;
});

/// Provider to check if cloud sync is available (Pro feature)
final isCloudSyncAvailableProvider = Provider<bool>((ref) {
  if (kDebugEnableSync) return true; // Debug mode - always available
  final entitlements = ref.watch(subscriptionEntitlementsProvider);
  return entitlements.cloudSync;
});

/// Provider for sync state
final syncStateProvider = StateNotifierProvider<SyncStateNotifier, SyncState>((ref) {
  return SyncStateNotifier(ref);
});

/// Sync state
class SyncState {
  final bool isSyncing;
  final DateTime? lastSyncTime;
  final String? errorMessage;
  final SyncResult? lastResult;

  const SyncState({
    this.isSyncing = false,
    this.lastSyncTime,
    this.errorMessage,
    this.lastResult,
  });

  SyncState copyWith({
    bool? isSyncing,
    DateTime? lastSyncTime,
    String? errorMessage,
    SyncResult? lastResult,
  }) {
    return SyncState(
      isSyncing: isSyncing ?? this.isSyncing,
      lastSyncTime: lastSyncTime ?? this.lastSyncTime,
      errorMessage: errorMessage,
      lastResult: lastResult ?? this.lastResult,
    );
  }
}

/// Sync state notifier
class SyncStateNotifier extends StateNotifier<SyncState> {
  final Ref _ref;

  SyncStateNotifier(this._ref) : super(const SyncState());

  /// Perform a full sync
  Future<SyncResult> sync() async {
    debugPrint('CloudSync: Starting sync...');

    // Check if sync is available (skip check in debug mode)
    final isAvailable = _ref.read(isCloudSyncAvailableProvider);
    debugPrint('CloudSync: isAvailable=$isAvailable, kDebugEnableSync=$kDebugEnableSync');

    if (!isAvailable && !kDebugEnableSync) {
      debugPrint('CloudSync: Sync not available - not a Pro user');
      return SyncResult(
        success: false,
        message: 'Cloud sync is a Pro feature. Upgrade to enable sync.',
      );
    }

    // Get current user
    final user = _ref.read(currentUserProvider);
    debugPrint('CloudSync: user=${user?.uid}');

    if (user == null) {
      debugPrint('CloudSync: No user logged in');
      return SyncResult(
        success: false,
        message: 'Please sign in to sync your data.',
      );
    }

    // Start sync
    state = state.copyWith(isSyncing: true, errorMessage: null);
    debugPrint('CloudSync: Calling syncAll...');

    try {
      final syncService = _ref.read(cloudSyncServiceProvider);
      final result = await syncService.syncAll(user.uid);

      debugPrint('CloudSync: Sync completed - success=${result.success}, uploaded=${result.uploaded}, downloaded=${result.downloaded}');

      state = state.copyWith(
        isSyncing: false,
        lastSyncTime: result.success ? DateTime.now() : state.lastSyncTime,
        lastResult: result,
        errorMessage: result.success ? null : result.message,
      );

      return result;
    } catch (e, stackTrace) {
      final errorMessage = 'Sync failed: $e';
      debugPrint('CloudSync: ERROR - $e');
      debugPrint('CloudSync: Stack trace - $stackTrace');

      state = state.copyWith(
        isSyncing: false,
        errorMessage: errorMessage,
      );

      return SyncResult(success: false, message: errorMessage);
    }
  }

  /// Clear sync error
  void clearError() {
    state = state.copyWith(errorMessage: null);
  }
}

/// Provider for easy sync trigger
final syncTriggerProvider = Provider<Future<SyncResult> Function()>((ref) {
  return () => ref.read(syncStateProvider.notifier).sync();
});
