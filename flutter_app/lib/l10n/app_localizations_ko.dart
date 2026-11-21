// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Korean (`ko`).
class AppLocalizationsKo extends AppLocalizations {
  AppLocalizationsKo([String locale = 'ko']) : super(locale);

  @override
  String get appName => '워드북';

  @override
  String get settings => '설정';

  @override
  String get preferences => '환경설정';

  @override
  String get profile => '프로필';

  @override
  String get about => '정보';

  @override
  String get signOut => '로그아웃';

  @override
  String get signOutConfirm => '로그아웃하시겠습니까?';

  @override
  String get cancel => '취소';

  @override
  String get language => '언어';

  @override
  String get appLanguage => '앱 언어';

  @override
  String get appLanguageDescription => '앱 인터페이스 언어 변경';

  @override
  String get nativeLanguage => '모국어';

  @override
  String get nativeLanguageDescription => '단어 정의가 모국어로 표시됩니다';

  @override
  String get selectLanguage => '언어 선택';

  @override
  String get appearance => '외관';

  @override
  String get lightMode => '라이트 모드';

  @override
  String get lightModeDescription => '항상 밝은 테마 사용';

  @override
  String get darkMode => '다크 모드';

  @override
  String get darkModeDescription => '항상 어두운 테마 사용';

  @override
  String get systemDefault => '시스템 기본값';

  @override
  String get systemDefaultDescription => '시스템 테마 설정 따르기';

  @override
  String get reading => '읽기';

  @override
  String get fontSize => '글꼴 크기';

  @override
  String get sampleText => '현재 글꼴 크기의 샘플 텍스트';

  @override
  String get bookshelf => '책장';

  @override
  String get addBook => '책 추가';

  @override
  String get noBooks => '책이 없습니다';

  @override
  String get noBooksDescription => '+ 버튼을 눌러 첫 번째 책을 추가하세요';

  @override
  String get deleteBook => '책 삭제';

  @override
  String get deleteBookConfirm => '이 책을 삭제하시겠습니까?';

  @override
  String get delete => '삭제';

  @override
  String get vocabulary => '어휘';

  @override
  String get words => '단어';

  @override
  String get wordsLearned => '학습한 단어';

  @override
  String get wordsToLearn => '학습할 단어';

  @override
  String get practice => '연습';

  @override
  String get startPractice => '연습 시작';

  @override
  String get extractVocabulary => '어휘 추출';

  @override
  String get extracting => '추출 중...';

  @override
  String wordsExtracted(int count) {
    return '$count개 단어 추출됨';
  }

  @override
  String get statistics => '통계';

  @override
  String get today => '오늘';

  @override
  String get thisWeek => '이번 주';

  @override
  String get thisMonth => '이번 달';

  @override
  String get allTime => '전체 기간';

  @override
  String get totalWords => '총 단어 수';

  @override
  String get totalBooks => '총 책 수';

  @override
  String get studyTime => '학습 시간';

  @override
  String get streak => '연속 일수';

  @override
  String days(int count) {
    return '$count일';
  }

  @override
  String get subscription => '구독';

  @override
  String get upgradeToPro => 'Pro로 업그레이드';

  @override
  String get wordBookPro => '워드북 Pro';

  @override
  String get freePlan => '무료 플랜';

  @override
  String get premiumAccess => '프리미엄 이용 중';

  @override
  String get upgradeForMore => '더 많은 기능을 위해 업그레이드';

  @override
  String get manageSubscription => '구독 관리';

  @override
  String get restorePurchases => '구매 복원';

  @override
  String get restoreSuccess => '구매가 성공적으로 복원되었습니다!';

  @override
  String get noRestorePurchases => '복원할 구매가 없습니다';

  @override
  String get subscribeNow => '지금 구독';

  @override
  String get subscriptionNotAvailable => '구독을 현재 이용할 수 없습니다. 나중에 다시 시도해 주세요.';

  @override
  String get unlimitedBooks => '무제한 책';

  @override
  String get unlimitedWordExtraction => '무제한 단어 추출';

  @override
  String get advancedPractice => '고급 어휘 연습';

  @override
  String get detailedStatistics => '상세 통계';

  @override
  String get cloudSync => '클라우드 동기화';

  @override
  String get prioritySupport => '우선 지원';

  @override
  String get error => '오류';

  @override
  String get tryAgain => '다시 시도';

  @override
  String get loading => '로딩 중...';

  @override
  String get save => '저장';

  @override
  String get done => '완료';

  @override
  String get next => '다음';

  @override
  String get previous => '이전';

  @override
  String get skip => '건너뛰기';

  @override
  String get continue_ => '계속';

  @override
  String get confirm => '확인';

  @override
  String get selected => '선택됨';

  @override
  String get wordsSettings => '단어 설정';

  @override
  String get practiceSettings => '연습 설정 및 섹션 크기';

  @override
  String get manageAccount => '계정 정보 관리';

  @override
  String get fontThemeDisplay => '글꼴 크기, 테마 및 표시';

  @override
  String version(String version) {
    return '버전 $version';
  }
}
