import 'language_config.dart';
import 'writing_system.dart';

class BuiltinLanguages {
  static List<LanguageConfig> all() => [
    _english,
    _spanish,
    _french,
    _german,
    _italian,
    _portuguese,
    _dutch,
    _russian,
    _japanese,
    _korean,
    _chinese,
  ];

  static const _commonInternalPunct = <String>{'\'', '-', '’'};

  static final _english = LanguageConfig(
    code: 'en',
    name: 'English',
    writingSystem: WritingSystem.latin,
    allowedInternalPunctuation: _commonInternalPunct,
    filterCapitalizedAsNames: true,
    stopWords: _enStopWords,
    commonNames: _enNames,
  );

  static final _spanish = LanguageConfig(
    code: 'es',
    name: 'Spanish',
    writingSystem: WritingSystem.latin,
    allowedInternalPunctuation: _commonInternalPunct,
    filterCapitalizedAsNames: true,
    stopWords: _esStopWords,
    commonNames: _esNames,
  );

  static final _french = LanguageConfig(
    code: 'fr',
    name: 'French',
    writingSystem: WritingSystem.latin,
    allowedInternalPunctuation: {'\'', '-', '’', '«', '»'},
    filterCapitalizedAsNames: true,
    stopWords: _frStopWords,
    commonNames: _frNames,
  );

  static final _german = LanguageConfig(
    code: 'de',
    name: 'German',
    writingSystem: WritingSystem.latin,
    allowedInternalPunctuation: _commonInternalPunct,
    filterCapitalizedAsNames: false, // All nouns capitalized in German
    stopWords: _deStopWords,
    commonNames: _deNames,
  );

  static final _italian = LanguageConfig(
    code: 'it',
    name: 'Italian',
    writingSystem: WritingSystem.latin,
    allowedInternalPunctuation: {'\'', '-'},
    filterCapitalizedAsNames: true,
    stopWords: _itStopWords,
    commonNames: _itNames,
  );

  static final _portuguese = LanguageConfig(
    code: 'pt',
    name: 'Portuguese',
    writingSystem: WritingSystem.latin,
    allowedInternalPunctuation: _commonInternalPunct,
    filterCapitalizedAsNames: true,
    stopWords: _ptStopWords,
    commonNames: _ptNames,
  );

  static final _dutch = LanguageConfig(
    code: 'nl',
    name: 'Dutch',
    writingSystem: WritingSystem.latin,
    allowedInternalPunctuation: _commonInternalPunct,
    filterCapitalizedAsNames: true,
    stopWords: _nlStopWords,
    commonNames: _nlNames,
  );

  static final _russian = LanguageConfig(
    code: 'ru',
    name: 'Russian',
    writingSystem: WritingSystem.cyrillic,
    allowedInternalPunctuation: {'-'},
    filterCapitalizedAsNames: true,
    stopWords: _ruStopWords,
    commonNames: _ruNames,
  );

  static final _japanese = LanguageConfig(
    code: 'ja',
    name: 'Japanese',
    writingSystem: WritingSystem.japanese,
    validationMode: ValidationMode.strict,
    filterCapitalizedAsNames: false,
    minLength: 1,
    maxLength: 10,
    stopWords: _jaStopWords,
    commonNames: _jaNames,
  );

  static final _korean = LanguageConfig(
    code: 'ko',
    name: 'Korean',
    writingSystem: WritingSystem.hangul,
    validationMode: ValidationMode.strict,
    filterCapitalizedAsNames: false,
    minLength: 1,
    maxLength: 15,
    stopWords: _koStopWords,
    commonNames: _koNames,
  );

  static final _chinese = LanguageConfig(
    code: 'zh',
    name: 'Chinese',
    writingSystem: WritingSystem.cjk,
    validationMode: ValidationMode.strict,
    filterCapitalizedAsNames: false,
    minLength: 1,
    maxLength: 10,
    stopWords: _zhStopWords,
    commonNames: _zhNames,
  );

  // ── English stop words ──
  static const _enStopWords = <String>{
    'a', 'an', 'the', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its',
    'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs',
    'this', 'that', 'these', 'those', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'between', 'under',
    'over', 'and', 'but', 'or', 'nor', 'so', 'yet', 'as', 'if',
    'when', 'than', 'because', 'while', 'where', 'although', 'though',
    'since', 'unless', 'whether', 'is', 'am', 'are', 'was', 'were',
    'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do',
    'does', 'did', 'doing', 'will', 'would', 'shall', 'should', 'may',
    'might', 'must', 'can', 'could', 'get', 'got', 'getting', 'go',
    'going', 'went', 'gone', 'not', 'no', 'yes', 'very', 'too',
    'also', 'just', 'only', 'even', 'now', 'then', 'there', 'here',
    'well', 'out', 'down', 'still', 'back', 'again', 'off', 'all',
    'some', 'any', 'each', 'every', 'other', 'another', 'such', 'own',
    'what', 'which', 'who', 'whom', 'whose', 'why', 'how', 'more',
    'most', 'few', 'less', 'both', 'many', 'much', 'say', 'said',
    'make', 'made', 'know', 'knew', 'think', 'see', 'saw', 'come',
    'came', 'want', 'look', 'take', 'took', 'let', 'give', 'gave',
    'find', 'found', 'tell', 'told', 'ask', 'asked', 'work', 'seem',
    'seemed', 'feel', 'felt', 'try', 'tried', 'leave', 'left', 'call',
    'called', 'keep', 'kept', 'mean', 'meant', 'really',
  };

  static const _enNames = <String>{
    'james', 'john', 'robert', 'michael', 'william', 'david', 'richard',
    'joseph', 'thomas', 'charles', 'mary', 'patricia', 'jennifer',
    'linda', 'elizabeth', 'susan', 'jessica', 'sarah', 'karen',
    'daniel', 'matthew', 'anthony', 'mark', 'donald', 'steven',
    'paul', 'andrew', 'joshua', 'kenneth', 'peter', 'george',
    'edward', 'brian', 'ronald', 'timothy', 'jason', 'jeffrey',
    'ryan', 'jacob', 'anna', 'emma', 'olivia', 'sophia', 'isabella',
    'mia', 'charlotte', 'amelia', 'harper', 'evelyn', 'alice', 'grace',
    'chloe', 'victoria', 'madison', 'eleanor', 'hannah', 'lily',
  };

  // ── Spanish stop words ──
  static const _esStopWords = <String>{
    'el', 'la', 'de', 'que', 'y', 'en', 'los', 'del', 'se', 'las',
    'por', 'un', 'para', 'con', 'no', 'una', 'su', 'al', 'es', 'lo',
    'como', 'más', 'pero', 'sus', 'le', 'ya', 'o', 'este', 'sí',
    'porque', 'entre', 'cuando', 'muy', 'sin', 'sobre', 'también',
    'me', 'hasta', 'hay', 'donde', 'quien', 'todo', 'nos', 'bien',
    'nada', 'poco', 'tanto', 'menos', 'cada', 'vez', 'otro', 'esa',
    'ese', 'han', 'había', 'era', 'dijo', 'hacer', 'puede',
    'ser', 'tiene', 'son', 'está', 'estaba', 'fue', 'están',
    'estaban', 'eran', 'hacía', 'hizo', 'digo', 'dijeron',
    'tan', 'solo', 'sino', 'pues', 'ni', 'sea', 'tener', 'haber',
    'decir', 'ver', 'saber', 'quedar', 'llegar', 'pasar', 'deber',
    'poner', 'parecer', 'quedó', 'creo', 'cree', 'sé', 'día',
  };

  static const _esNames = <String>{
    'juan', 'josé', 'luis', 'carlos', 'miguel', 'antonio', 'francisco',
    'pedro', 'manuel', 'rafael', 'maría', 'carmen', 'rosa', 'ana',
    'lucía', 'elena', 'isabel', 'pilar', 'teresa', 'dolores',
    'pablo', 'diego', 'javier', 'fernando', 'alejandro', 'sergio',
    'alberto', 'raúl', 'jorge', 'marta', 'laura', 'paula', 'sara',
    'clara', 'andrea', 'inés', 'cristina', 'beatriz',
  };

  // ── French stop words ──
  static const _frStopWords = <String>{
    'le', 'la', 'de', 'et', 'les', 'des', 'en', 'un', 'du', 'une',
    'que', 'est', 'pour', 'qui', 'dans', 'ce', 'il', 'pas', 'plus',
    'par', 'sur', 'se', 'son', 'avec', 'au', 'sont', 'tout', 'mais',
    'nous', 'comme', 'elle', 'lui', 'aux', 'ou', 'leur', 'si',
    'sa', 'donc', 'dont', 'encore', 'ces', 'cette', 'mon', 'mes',
    'ses', 'nos', 'vos', 'moi', 'toi', 'ça', 'très', 'être',
    'avoir', 'faire', 'dire', 'aller', 'voir', 'savoir', 'pouvoir',
    'falloir', 'venir', 'devoir', 'vouloir', 'prendre', 'donner',
    'parler', 'mettre', 'rester', 'arriver', 'croire', 'trouver',
    'chercher', 'passer', 'regarder', 'aimer', 'penser', 'attendre',
  };

  static const _frNames = <String>{
    'pierre', 'jean', 'michel', 'jacques', 'philippe', 'henri',
    'louis', 'françois', 'andré', 'claude', 'marie', 'jeanne',
    'anne', 'marguerite', 'catherine', 'sophie', 'camille', 'julie',
    'claire', 'hélène', 'paul', 'pascal', 'laurent', 'bernard',
    'émilie', 'sylvie', 'nathalie', 'valérie', 'stéphanie',
  };

  // ── German stop words ──
  static const _deStopWords = <String>{
    'der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit',
    'sich', 'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein',
    'eine', 'als', 'auch', 'es', 'an', 'werden', 'aus', 'er', 'hat',
    'dass', 'sie', 'nach', 'bei', 'war', 'wird', 'so', 'sind', 'oder',
    'noch', 'bis', 'wie', 'einen', 'einer', 'einem', 'keine', 'kein',
    'keinen', 'damit', 'dabei', 'schon', 'nur', 'mehr',
    'kann', 'soll', 'muss', 'möchte', 'aber', 'wenn', 'weil',
    'ob', 'doch', 'sondern', 'alle', 'mir', 'mich', 'dich',
    'dir', 'ihn', 'ihm', 'uns', 'haben', 'hatte', 'wurde',
  };

  static const _deNames = <String>{
    'hans', 'fritz', 'karl', 'heinrich', 'franz', 'otto', 'klaus',
    'kurt', 'walter', 'helmut', 'greta', 'helga', 'ingrid', 'ursula',
    'gerda', 'erich', 'ernst', 'dieter', 'wolfgang', 'jürgen',
  };

  // ── Italian stop words ──
  static const _itStopWords = <String>{
    'il', 'lo', 'la', 'i', 'gli', 'le', 'di', 'a', 'da', 'in', 'con',
    'su', 'per', 'tra', 'fra', 'e', 'che', 'è', 'sono', 'ho', 'ha',
    'hanno', 'era', 'un', 'una', 'uno', 'non', 'si', 'ci', 'ne',
    'più', 'come', 'ma', 'anche', 'solo', 'tutto', 'ogni', 'molto',
    'poco', 'quale', 'questo', 'quello', 'cosa', 'cui', 'dove',
    'quando', 'perché', 'essere', 'avere', 'fare', 'dire',
    'andare', 'vedere', 'sapere', 'dovere', 'potere', 'volere',
    'stare', 'dare', 'parlare', 'trovare', 'lasciare',
  };

  static const _itNames = <String>{
    'giuseppe', 'giovanni', 'antonio', 'mario', 'luigi', 'francesco',
    'angelo', 'vincenzo', 'pietro', 'salvatore', 'maria', 'anna',
    'giuseppina', 'rosa', 'angela', 'giovanna', 'teresa', 'lucia',
    'carmela', 'caterina', 'paolo', 'marco', 'roberto', 'andrea',
  };

  // ── Portuguese stop words ──
  static const _ptStopWords = <String>{
    'o', 'a', 'os', 'as', 'de', 'do', 'da', 'dos', 'das', 'que',
    'e', 'em', 'no', 'na', 'nos', 'nas', 'para', 'com', 'por',
    'se', 'não', 'uma', 'um', 'mais', 'mas', 'ou', 'também',
    'como', 'muito', 'seu', 'sua', 'me', 'te', 'lhe',
    'eles', 'elas', 'este', 'esta', 'esse', 'essa', 'aquele',
    'aquela', 'é', 'são', 'está', 'foi', 'ser', 'ter', 'fazer',
    'dizer', 'ir', 'vir', 'estar', 'dar', 'saber', 'querer',
    'poder', 'dever', 'falar', 'deixar', 'encontrar', 'ficar',
  };

  static const _ptNames = <String>{
    'joão', 'maria', 'josé', 'antônio', 'francisco', 'carlos',
    'paulo', 'pedro', 'lucas', 'luiz', 'ana', 'fernanda', 'juliana',
    'marcos', 'rafael', 'gabriel', 'miguel', 'bruno', 'patrícia',
    'adriana', 'luciana', 'mariana', 'carla', 'daniela',
  };

  // ── Dutch stop words ──
  static const _nlStopWords = <String>{
    'de', 'het', 'een', 'van', 'in', 'op', 'met', 'voor', 'dat',
    'niet', 'aan', 'is', 'te', 'zijn', 'was', 'die', 'wat', 'dan',
    'ook', 'nog', 'maar', 'al', 'er', 'om', 'als', 'zo', 'uit',
    'over', 'bij', 'tot', 'door', 'onder', 'tussen', 'naar',
    'deze', 'dit', 'wie', 'wel', 'geen', 'heeft', 'had', 'kan',
    'moet', 'zou', 'heb', 'ben', 'bent', 'worden', 'werd',
    'kwam', 'doen', 'gaan', 'komen', 'zien', 'weten', 'maken',
  };

  static const _nlNames = <String>{
    'jan', 'peter', 'an', 'marie', 'maria', 'henk', 'klaas', 'willem',
    'els', 'petra', 'inge', 'sanne', 'dirk', 'bert', 'frank', 'mark',
    'thomas', 'linda', 'monique', 'bram', 'johan', 'gerard',
  };

  // ── Russian stop words ──
  static const _ruStopWords = <String>{
    'и', 'в', 'не', 'на', 'я', 'что', 'с', 'как', 'а', 'то',
    'все', 'она', 'так', 'но', 'это', 'по', 'из', 'у', 'от',
    'за', 'же', 'бы', 'для', 'тоже', 'меня', 'было', 'еще',
    'уже', 'ему', 'мне', 'нас', 'них', 'него', 'нему', 'быть',
    'был', 'была', 'были', 'вот', 'да', 'они', 'мы', 'вы',
    'если', 'когда', 'кто', 'где', 'какой', 'может', 'можно',
    'надо', 'очень', 'будет', 'есть', 'нет', 'там', 'тут',
    'даже', 'только', 'больше', 'меньше', 'чем', 'или',
  };

  static const _ruNames = <String>{
    'александр', 'сергей', 'андрей', 'дмитрий', 'алексей',
    'иван', 'михаил', 'николай', 'владимир', 'павел',
    'елена', 'татьяна', 'ольга', 'наталья', 'ирина',
    'светлана', 'анна', 'екатерина', 'марина', 'юлия',
  };

  // ── Japanese stop words ──
  static const _jaStopWords = <String>{
    'は', 'が', 'の', 'を', 'に', 'へ', 'と', 'も', 'で', 'から',
    'まで', 'より', '私', 'あなた', 'これ', 'それ', 'あれ',
    'この', 'その', 'あの', 'ここ', 'そこ', 'あそこ',
    'です', 'ます', 'だ', 'いる', 'ある', 'なる',
    'する', 'できる', 'こと', 'もの', 'ため', 'いう',
    'お', 'ご', 'さん', 'たち', 'ら', 'や', 'か', 'ね',
  };

  static const _jaNames = <String>{
    '太郎', '花子', '一郎', '次郎', '三郎', '恵', '愛',
    '健太', '大輔', '直美', '裕子', '智子', '和也', '洋子',
  };

  // ── Korean stop words ──
  static const _koStopWords = <String>{
    '은', '는', '이', '가', '을', '를', '에', '에서', '의',
    '도', '만', '밖에', '부터', '까지', '하다', '되다',
    '있다', '없다', '이다', '아니다', '것', '수', '그',
    '저', '우리', '너', '나', '뭐', '무엇',
    '이런', '그런', '저런', '어떤', '어디', '언제',
    '왜', '어떻게', '네', '아니', '예',
  };

  static const _koNames = <String>{
    '민수', '지민', '현우', '지훈', '은지', '수진', '미영',
    '영희', '철수', '영수', '지영', '은정', '현주', '소희',
  };

  // ── Chinese stop words ──
  static const _zhStopWords = <String>{
    '的', '了', '在', '是', '我', '有', '和', '就', '不', '人',
    '都', '一', '一个', '上', '也', '很', '到', '说', '要',
    '去', '你', '会', '着', '没有', '看', '好', '自己', '这',
    '他', '她', '它', '们', '那', '哪', '什么', '怎么', '哪里',
    '吗', '吧', '啊', '呢', '可以', '能', '过', '让',
    '把', '被', '对', '从', '以', '之', '而', '且', '或',
  };

  static const _zhNames = <String>{
    '伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊',
    '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超',
  };
}
