/// Subscription tier levels (kept for backwards compatibility)
enum SubscriptionTier {
  free,
  plus,
  pro,
}

/// Feature entitlements based on subscription status
class SubscriptionEntitlements {
  final int maxBooks;
  final int maxWordsPerExtraction;
  final bool unlimitedVocabularyPractice;
  final bool advancedStatistics;
  final bool offlineMode;
  final bool cloudSync;
  final bool aiFeatures;
  final bool prioritySupport;

  const SubscriptionEntitlements({
    required this.maxBooks,
    required this.maxWordsPerExtraction,
    required this.unlimitedVocabularyPractice,
    required this.advancedStatistics,
    required this.offlineMode,
    required this.cloudSync,
    required this.aiFeatures,
    required this.prioritySupport,
  });

  /// Free tier entitlements
  static const free = SubscriptionEntitlements(
    maxBooks: 3,
    maxWordsPerExtraction: 50,
    unlimitedVocabularyPractice: false,
    advancedStatistics: false,
    offlineMode: false,
    cloudSync: false,
    aiFeatures: false,
    prioritySupport: false,
  );

  /// WordBook Pro entitlements (all features unlocked)
  static const pro = SubscriptionEntitlements(
    maxBooks: -1, // Unlimited
    maxWordsPerExtraction: -1, // Unlimited
    unlimitedVocabularyPractice: true,
    advancedStatistics: true,
    offlineMode: true,
    cloudSync: true,
    aiFeatures: true,
    prioritySupport: true,
  );

  // Alias for backwards compatibility
  static const plus = pro;

  static SubscriptionEntitlements forTier(SubscriptionTier tier) {
    switch (tier) {
      case SubscriptionTier.free:
        return free;
      case SubscriptionTier.plus:
      case SubscriptionTier.pro:
        return pro;
    }
  }

  /// Get entitlements based on subscription status
  static SubscriptionEntitlements forSubscriptionStatus(bool isSubscribed) {
    return isSubscribed ? pro : free;
  }
}

/// Subscription product information for display
class SubscriptionProduct {
  final String id;
  final String name;
  final String description;
  final double monthlyPrice;
  final double? yearlyPrice;
  final List<String> features;

  const SubscriptionProduct({
    required this.id,
    required this.name,
    required this.description,
    required this.monthlyPrice,
    this.yearlyPrice,
    required this.features,
  });

  static const monthly = SubscriptionProduct(
    id: 'monthly',
    name: 'WordBook Pro Monthly',
    description: 'Full access to all features',
    monthlyPrice: 4.99,
    features: [
      'Unlimited books',
      'Unlimited word extraction',
      'Unlimited vocabulary practice',
      'Advanced statistics',
      'Cloud sync',
      'Priority support',
    ],
  );

  static const yearly = SubscriptionProduct(
    id: 'yearly',
    name: 'WordBook Pro Yearly',
    description: 'Best value - Save 40%',
    monthlyPrice: 2.99, // Per month when billed yearly
    yearlyPrice: 35.99,
    features: [
      'Everything in Monthly',
      '40% savings',
      'Unlimited books',
      'Unlimited word extraction',
      'Unlimited vocabulary practice',
      'Advanced statistics',
      'Cloud sync',
      'Priority support',
    ],
  );

  static const allProducts = [monthly, yearly];
}
