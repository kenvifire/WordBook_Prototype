// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Chinese (`zh`).
class AppLocalizationsZh extends AppLocalizations {
  AppLocalizationsZh([String locale = 'zh']) : super(locale);

  @override
  String get appName => '词书';

  @override
  String get settings => '设置';

  @override
  String get preferences => '偏好设置';

  @override
  String get profile => '个人资料';

  @override
  String get about => '关于';

  @override
  String get signOut => '退出登录';

  @override
  String get signOutConfirm => '确定要退出登录吗？';

  @override
  String get cancel => '取消';

  @override
  String get language => '语言';

  @override
  String get appLanguage => '应用语言';

  @override
  String get appLanguageDescription => '更改应用界面语言';

  @override
  String get nativeLanguage => '母语';

  @override
  String get nativeLanguageDescription => '词汇释义将以您的母语显示';

  @override
  String get selectLanguage => '选择语言';

  @override
  String get appearance => '外观';

  @override
  String get lightMode => '浅色模式';

  @override
  String get lightModeDescription => '始终使用浅色主题';

  @override
  String get darkMode => '深色模式';

  @override
  String get darkModeDescription => '始终使用深色主题';

  @override
  String get systemDefault => '跟随系统';

  @override
  String get systemDefaultDescription => '跟随系统主题设置';

  @override
  String get reading => '阅读';

  @override
  String get fontSize => '字体大小';

  @override
  String get sampleText => '当前字体大小的示例文本';

  @override
  String get bookshelf => '书架';

  @override
  String get addBook => '添加书籍';

  @override
  String get noBooks => '暂无书籍';

  @override
  String get noBooksDescription => '点击 + 按钮添加您的第一本书';

  @override
  String get deleteBook => '删除书籍';

  @override
  String get deleteBookConfirm => '确定要删除这本书吗？';

  @override
  String get delete => '删除';

  @override
  String get vocabulary => '词汇';

  @override
  String get words => '单词';

  @override
  String get wordsLearned => '已学单词';

  @override
  String get wordsToLearn => '待学单词';

  @override
  String get practice => '练习';

  @override
  String get startPractice => '开始练习';

  @override
  String get extractVocabulary => '提取词汇';

  @override
  String get extracting => '提取中...';

  @override
  String wordsExtracted(int count) {
    return '已提取 $count 个单词';
  }

  @override
  String get statistics => '统计';

  @override
  String get today => '今天';

  @override
  String get thisWeek => '本周';

  @override
  String get thisMonth => '本月';

  @override
  String get allTime => '全部时间';

  @override
  String get totalWords => '总单词数';

  @override
  String get totalBooks => '总书籍数';

  @override
  String get studyTime => '学习时间';

  @override
  String get streak => '连续天数';

  @override
  String days(int count) {
    return '$count 天';
  }

  @override
  String get subscription => '订阅';

  @override
  String get upgradeToPro => '升级到专业版';

  @override
  String get wordBookPro => '词书专业版';

  @override
  String get freePlan => '免费版';

  @override
  String get premiumAccess => '您已拥有高级权限';

  @override
  String get upgradeForMore => '升级以获取更多功能';

  @override
  String get manageSubscription => '管理订阅';

  @override
  String get restorePurchases => '恢复购买';

  @override
  String get restoreSuccess => '购买已成功恢复！';

  @override
  String get noRestorePurchases => '没有可恢复的购买';

  @override
  String get subscribeNow => '立即订阅';

  @override
  String get subscriptionNotAvailable => '订阅服务暂不可用，请稍后再试。';

  @override
  String get unlimitedBooks => '无限书籍';

  @override
  String get unlimitedWordExtraction => '无限词汇提取';

  @override
  String get advancedPractice => '高级词汇练习';

  @override
  String get detailedStatistics => '详细统计';

  @override
  String get cloudSync => '云同步';

  @override
  String get prioritySupport => '优先支持';

  @override
  String get error => '错误';

  @override
  String get tryAgain => '重试';

  @override
  String get loading => '加载中...';

  @override
  String get save => '保存';

  @override
  String get done => '完成';

  @override
  String get next => '下一步';

  @override
  String get previous => '上一步';

  @override
  String get skip => '跳过';

  @override
  String get continue_ => '继续';

  @override
  String get confirm => '确认';

  @override
  String get selected => '已选择';

  @override
  String get wordsSettings => '单词设置';

  @override
  String get practiceSettings => '练习设置和章节大小';

  @override
  String get manageAccount => '管理您的账户信息';

  @override
  String get fontThemeDisplay => '字体大小、主题和显示';

  @override
  String version(String version) {
    return '版本 $version';
  }
}

/// The translations for Chinese, as used in Taiwan (`zh_TW`).
class AppLocalizationsZhTw extends AppLocalizationsZh {
  AppLocalizationsZhTw() : super('zh_TW');

  @override
  String get appName => '詞書';

  @override
  String get settings => '設定';

  @override
  String get preferences => '偏好設定';

  @override
  String get profile => '個人資料';

  @override
  String get about => '關於';

  @override
  String get signOut => '登出';

  @override
  String get signOutConfirm => '確定要登出嗎？';

  @override
  String get cancel => '取消';

  @override
  String get language => '語言';

  @override
  String get appLanguage => '應用程式語言';

  @override
  String get appLanguageDescription => '變更應用程式介面語言';

  @override
  String get nativeLanguage => '母語';

  @override
  String get nativeLanguageDescription => '詞彙釋義將以您的母語顯示';

  @override
  String get selectLanguage => '選擇語言';

  @override
  String get appearance => '外觀';

  @override
  String get lightMode => '淺色模式';

  @override
  String get lightModeDescription => '始終使用淺色主題';

  @override
  String get darkMode => '深色模式';

  @override
  String get darkModeDescription => '始終使用深色主題';

  @override
  String get systemDefault => '跟隨系統';

  @override
  String get systemDefaultDescription => '跟隨系統主題設定';

  @override
  String get reading => '閱讀';

  @override
  String get fontSize => '字型大小';

  @override
  String get sampleText => '目前字型大小的範例文字';

  @override
  String get bookshelf => '書架';

  @override
  String get addBook => '新增書籍';

  @override
  String get noBooks => '暫無書籍';

  @override
  String get noBooksDescription => '點擊 + 按鈕新增您的第一本書';

  @override
  String get deleteBook => '刪除書籍';

  @override
  String get deleteBookConfirm => '確定要刪除這本書嗎？';

  @override
  String get delete => '刪除';

  @override
  String get vocabulary => '詞彙';

  @override
  String get words => '單字';

  @override
  String get wordsLearned => '已學單字';

  @override
  String get wordsToLearn => '待學單字';

  @override
  String get practice => '練習';

  @override
  String get startPractice => '開始練習';

  @override
  String get extractVocabulary => '提取詞彙';

  @override
  String get extracting => '提取中...';

  @override
  String wordsExtracted(int count) {
    return '已提取 $count 個單字';
  }

  @override
  String get statistics => '統計';

  @override
  String get today => '今天';

  @override
  String get thisWeek => '本週';

  @override
  String get thisMonth => '本月';

  @override
  String get allTime => '全部時間';

  @override
  String get totalWords => '總單字數';

  @override
  String get totalBooks => '總書籍數';

  @override
  String get studyTime => '學習時間';

  @override
  String get streak => '連續天數';

  @override
  String days(int count) {
    return '$count 天';
  }

  @override
  String get subscription => '訂閱';

  @override
  String get upgradeToPro => '升級到專業版';

  @override
  String get wordBookPro => '詞書專業版';

  @override
  String get freePlan => '免費版';

  @override
  String get premiumAccess => '您已擁有進階權限';

  @override
  String get upgradeForMore => '升級以獲取更多功能';

  @override
  String get manageSubscription => '管理訂閱';

  @override
  String get restorePurchases => '恢復購買';

  @override
  String get restoreSuccess => '購買已成功恢復！';

  @override
  String get noRestorePurchases => '沒有可恢復的購買';

  @override
  String get subscribeNow => '立即訂閱';

  @override
  String get subscriptionNotAvailable => '訂閱服務暫不可用，請稍後再試。';

  @override
  String get unlimitedBooks => '無限書籍';

  @override
  String get unlimitedWordExtraction => '無限詞彙提取';

  @override
  String get advancedPractice => '進階詞彙練習';

  @override
  String get detailedStatistics => '詳細統計';

  @override
  String get cloudSync => '雲端同步';

  @override
  String get prioritySupport => '優先支援';

  @override
  String get error => '錯誤';

  @override
  String get tryAgain => '重試';

  @override
  String get loading => '載入中...';

  @override
  String get save => '儲存';

  @override
  String get done => '完成';

  @override
  String get next => '下一步';

  @override
  String get previous => '上一步';

  @override
  String get skip => '略過';

  @override
  String get continue_ => '繼續';

  @override
  String get confirm => '確認';

  @override
  String get selected => '已選擇';

  @override
  String get wordsSettings => '單字設定';

  @override
  String get practiceSettings => '練習設定和章節大小';

  @override
  String get manageAccount => '管理您的帳戶資訊';

  @override
  String get fontThemeDisplay => '字型大小、主題和顯示';

  @override
  String version(String version) {
    return '版本 $version';
  }
}
