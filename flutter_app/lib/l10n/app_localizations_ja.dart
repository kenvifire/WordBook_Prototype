// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Japanese (`ja`).
class AppLocalizationsJa extends AppLocalizations {
  AppLocalizationsJa([String locale = 'ja']) : super(locale);

  @override
  String get appName => 'ワードブック';

  @override
  String get settings => '設定';

  @override
  String get preferences => '環境設定';

  @override
  String get profile => 'プロフィール';

  @override
  String get about => 'アプリについて';

  @override
  String get signOut => 'ログアウト';

  @override
  String get signOutConfirm => 'ログアウトしますか？';

  @override
  String get cancel => 'キャンセル';

  @override
  String get language => '言語';

  @override
  String get appLanguage => 'アプリの言語';

  @override
  String get appLanguageDescription => 'アプリのインターフェース言語を変更';

  @override
  String get nativeLanguage => '母国語';

  @override
  String get nativeLanguageDescription => '単語の定義は母国語で表示されます';

  @override
  String get selectLanguage => '言語を選択';

  @override
  String get appearance => '外観';

  @override
  String get lightMode => 'ライトモード';

  @override
  String get lightModeDescription => '常にライトテーマを使用';

  @override
  String get darkMode => 'ダークモード';

  @override
  String get darkModeDescription => '常にダークテーマを使用';

  @override
  String get systemDefault => 'システム設定に従う';

  @override
  String get systemDefaultDescription => 'システムのテーマ設定に従う';

  @override
  String get reading => '読書';

  @override
  String get fontSize => 'フォントサイズ';

  @override
  String get sampleText => '現在のフォントサイズのサンプルテキスト';

  @override
  String get bookshelf => '本棚';

  @override
  String get addBook => '本を追加';

  @override
  String get noBooks => '本がありません';

  @override
  String get noBooksDescription => '+ ボタンをタップして最初の本を追加';

  @override
  String get deleteBook => '本を削除';

  @override
  String get deleteBookConfirm => 'この本を削除しますか？';

  @override
  String get delete => '削除';

  @override
  String get vocabulary => '語彙';

  @override
  String get words => '単語';

  @override
  String get wordsLearned => '学習済み';

  @override
  String get wordsToLearn => '未学習';

  @override
  String get practice => '練習';

  @override
  String get startPractice => '練習を開始';

  @override
  String get extractVocabulary => '語彙を抽出';

  @override
  String get extracting => '抽出中...';

  @override
  String wordsExtracted(int count) {
    return '$count 単語を抽出しました';
  }

  @override
  String get statistics => '統計';

  @override
  String get today => '今日';

  @override
  String get thisWeek => '今週';

  @override
  String get thisMonth => '今月';

  @override
  String get allTime => '全期間';

  @override
  String get totalWords => '総単語数';

  @override
  String get totalBooks => '総書籍数';

  @override
  String get studyTime => '学習時間';

  @override
  String get streak => '連続日数';

  @override
  String days(int count) {
    return '$count 日';
  }

  @override
  String get subscription => 'サブスクリプション';

  @override
  String get upgradeToPro => 'Proにアップグレード';

  @override
  String get wordBookPro => 'ワードブック Pro';

  @override
  String get freePlan => '無料プラン';

  @override
  String get premiumAccess => 'プレミアムアクセス中';

  @override
  String get upgradeForMore => 'アップグレードで機能を追加';

  @override
  String get manageSubscription => 'サブスクリプション管理';

  @override
  String get restorePurchases => '購入を復元';

  @override
  String get restoreSuccess => '購入が正常に復元されました！';

  @override
  String get noRestorePurchases => '復元できる購入がありません';

  @override
  String get subscribeNow => '今すぐ登録';

  @override
  String get subscriptionNotAvailable => 'サブスクリプションは現在利用できません。後でもう一度お試しください。';

  @override
  String get unlimitedBooks => '無制限の書籍';

  @override
  String get unlimitedWordExtraction => '無制限の単語抽出';

  @override
  String get advancedPractice => '高度な語彙練習';

  @override
  String get detailedStatistics => '詳細な統計';

  @override
  String get cloudSync => 'クラウド同期';

  @override
  String get prioritySupport => '優先サポート';

  @override
  String get error => 'エラー';

  @override
  String get tryAgain => '再試行';

  @override
  String get loading => '読み込み中...';

  @override
  String get save => '保存';

  @override
  String get done => '完了';

  @override
  String get next => '次へ';

  @override
  String get previous => '前へ';

  @override
  String get skip => 'スキップ';

  @override
  String get continue_ => '続ける';

  @override
  String get confirm => '確認';

  @override
  String get selected => '選択済み';

  @override
  String get wordsSettings => '単語設定';

  @override
  String get practiceSettings => '練習設定とセクションサイズ';

  @override
  String get manageAccount => 'アカウント情報を管理';

  @override
  String get fontThemeDisplay => 'フォントサイズ、テーマ、表示';

  @override
  String version(String version) {
    return 'バージョン $version';
  }
}
