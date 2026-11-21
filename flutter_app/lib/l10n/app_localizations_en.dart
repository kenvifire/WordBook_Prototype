// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'WordBook';

  @override
  String get settings => 'Settings';

  @override
  String get preferences => 'Preferences';

  @override
  String get profile => 'Profile';

  @override
  String get about => 'About';

  @override
  String get signOut => 'Sign Out';

  @override
  String get signOutConfirm => 'Are you sure you want to sign out?';

  @override
  String get cancel => 'Cancel';

  @override
  String get language => 'Language';

  @override
  String get appLanguage => 'App Language';

  @override
  String get appLanguageDescription =>
      'Change the language of the app interface';

  @override
  String get nativeLanguage => 'Native Language';

  @override
  String get nativeLanguageDescription =>
      'Word definitions will be shown in your native language';

  @override
  String get selectLanguage => 'Select Language';

  @override
  String get appearance => 'Appearance';

  @override
  String get lightMode => 'Light Mode';

  @override
  String get lightModeDescription => 'Always use light theme';

  @override
  String get darkMode => 'Dark Mode';

  @override
  String get darkModeDescription => 'Always use dark theme';

  @override
  String get systemDefault => 'System Default';

  @override
  String get systemDefaultDescription => 'Follow system theme settings';

  @override
  String get reading => 'Reading';

  @override
  String get fontSize => 'Font Size';

  @override
  String get sampleText => 'Sample text with current font size';

  @override
  String get bookshelf => 'Bookshelf';

  @override
  String get addBook => 'Add Book';

  @override
  String get noBooks => 'No books yet';

  @override
  String get noBooksDescription => 'Tap the + button to add your first book';

  @override
  String get deleteBook => 'Delete Book';

  @override
  String get deleteBookConfirm => 'Are you sure you want to delete this book?';

  @override
  String get delete => 'Delete';

  @override
  String get vocabulary => 'Vocabulary';

  @override
  String get words => 'Words';

  @override
  String get wordsLearned => 'Words Learned';

  @override
  String get wordsToLearn => 'Words to Learn';

  @override
  String get practice => 'Practice';

  @override
  String get startPractice => 'Start Practice';

  @override
  String get extractVocabulary => 'Extract Vocabulary';

  @override
  String get extracting => 'Extracting...';

  @override
  String wordsExtracted(int count) {
    return '$count words extracted';
  }

  @override
  String get statistics => 'Statistics';

  @override
  String get today => 'Today';

  @override
  String get thisWeek => 'This Week';

  @override
  String get thisMonth => 'This Month';

  @override
  String get allTime => 'All Time';

  @override
  String get totalWords => 'Total Words';

  @override
  String get totalBooks => 'Total Books';

  @override
  String get studyTime => 'Study Time';

  @override
  String get streak => 'Streak';

  @override
  String days(int count) {
    return '$count days';
  }

  @override
  String get subscription => 'Subscription';

  @override
  String get upgradeToPro => 'Upgrade to Pro';

  @override
  String get wordBookPro => 'WordBook Pro';

  @override
  String get freePlan => 'Free Plan';

  @override
  String get premiumAccess => 'You have premium access';

  @override
  String get upgradeForMore => 'Upgrade for more features';

  @override
  String get manageSubscription => 'Manage Subscription';

  @override
  String get restorePurchases => 'Restore Purchases';

  @override
  String get restoreSuccess => 'Purchases restored successfully!';

  @override
  String get noRestorePurchases => 'No purchases to restore';

  @override
  String get subscribeNow => 'Subscribe Now';

  @override
  String get subscriptionNotAvailable =>
      'Subscriptions are not available yet. Please try again later.';

  @override
  String get unlimitedBooks => 'Unlimited books';

  @override
  String get unlimitedWordExtraction => 'Unlimited word extraction';

  @override
  String get advancedPractice => 'Advanced vocabulary practice';

  @override
  String get detailedStatistics => 'Detailed statistics';

  @override
  String get cloudSync => 'Cloud sync';

  @override
  String get prioritySupport => 'Priority support';

  @override
  String get error => 'Error';

  @override
  String get tryAgain => 'Try Again';

  @override
  String get loading => 'Loading...';

  @override
  String get save => 'Save';

  @override
  String get done => 'Done';

  @override
  String get next => 'Next';

  @override
  String get previous => 'Previous';

  @override
  String get skip => 'Skip';

  @override
  String get continue_ => 'Continue';

  @override
  String get confirm => 'Confirm';

  @override
  String get selected => 'Selected';

  @override
  String get wordsSettings => 'Words Settings';

  @override
  String get practiceSettings => 'Practice settings and section size';

  @override
  String get manageAccount => 'Manage your account information';

  @override
  String get fontThemeDisplay => 'Font size, themes, and display';

  @override
  String version(String version) {
    return 'Version $version';
  }
}
