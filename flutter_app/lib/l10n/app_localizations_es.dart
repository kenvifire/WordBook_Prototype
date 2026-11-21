// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Spanish Castilian (`es`).
class AppLocalizationsEs extends AppLocalizations {
  AppLocalizationsEs([String locale = 'es']) : super(locale);

  @override
  String get appName => 'WordBook';

  @override
  String get settings => 'Ajustes';

  @override
  String get preferences => 'Preferencias';

  @override
  String get profile => 'Perfil';

  @override
  String get about => 'Acerca de';

  @override
  String get signOut => 'Cerrar sesión';

  @override
  String get signOutConfirm => '¿Estás seguro de que quieres cerrar sesión?';

  @override
  String get cancel => 'Cancelar';

  @override
  String get language => 'Idioma';

  @override
  String get appLanguage => 'Idioma de la aplicación';

  @override
  String get appLanguageDescription => 'Cambiar el idioma de la interfaz';

  @override
  String get nativeLanguage => 'Idioma nativo';

  @override
  String get nativeLanguageDescription =>
      'Las definiciones se mostrarán en tu idioma nativo';

  @override
  String get selectLanguage => 'Seleccionar idioma';

  @override
  String get appearance => 'Apariencia';

  @override
  String get lightMode => 'Modo claro';

  @override
  String get lightModeDescription => 'Usar siempre tema claro';

  @override
  String get darkMode => 'Modo oscuro';

  @override
  String get darkModeDescription => 'Usar siempre tema oscuro';

  @override
  String get systemDefault => 'Predeterminado del sistema';

  @override
  String get systemDefaultDescription => 'Seguir la configuración del sistema';

  @override
  String get reading => 'Lectura';

  @override
  String get fontSize => 'Tamaño de fuente';

  @override
  String get sampleText => 'Texto de ejemplo con el tamaño actual';

  @override
  String get bookshelf => 'Estantería';

  @override
  String get addBook => 'Añadir libro';

  @override
  String get noBooks => 'Sin libros';

  @override
  String get noBooksDescription =>
      'Toca el botón + para añadir tu primer libro';

  @override
  String get deleteBook => 'Eliminar libro';

  @override
  String get deleteBookConfirm =>
      '¿Estás seguro de que quieres eliminar este libro?';

  @override
  String get delete => 'Eliminar';

  @override
  String get vocabulary => 'Vocabulario';

  @override
  String get words => 'Palabras';

  @override
  String get wordsLearned => 'Palabras aprendidas';

  @override
  String get wordsToLearn => 'Palabras por aprender';

  @override
  String get practice => 'Práctica';

  @override
  String get startPractice => 'Comenzar práctica';

  @override
  String get extractVocabulary => 'Extraer vocabulario';

  @override
  String get extracting => 'Extrayendo...';

  @override
  String wordsExtracted(int count) {
    return '$count palabras extraídas';
  }

  @override
  String get statistics => 'Estadísticas';

  @override
  String get today => 'Hoy';

  @override
  String get thisWeek => 'Esta semana';

  @override
  String get thisMonth => 'Este mes';

  @override
  String get allTime => 'Todo el tiempo';

  @override
  String get totalWords => 'Total de palabras';

  @override
  String get totalBooks => 'Total de libros';

  @override
  String get studyTime => 'Tiempo de estudio';

  @override
  String get streak => 'Racha';

  @override
  String days(int count) {
    return '$count días';
  }

  @override
  String get subscription => 'Suscripción';

  @override
  String get upgradeToPro => 'Actualizar a Pro';

  @override
  String get wordBookPro => 'WordBook Pro';

  @override
  String get freePlan => 'Plan gratuito';

  @override
  String get premiumAccess => 'Tienes acceso premium';

  @override
  String get upgradeForMore => 'Actualiza para más funciones';

  @override
  String get manageSubscription => 'Gestionar suscripción';

  @override
  String get restorePurchases => 'Restaurar compras';

  @override
  String get restoreSuccess => '¡Compras restauradas con éxito!';

  @override
  String get noRestorePurchases => 'No hay compras para restaurar';

  @override
  String get subscribeNow => 'Suscríbete ahora';

  @override
  String get subscriptionNotAvailable =>
      'Las suscripciones no están disponibles. Inténtalo más tarde.';

  @override
  String get unlimitedBooks => 'Libros ilimitados';

  @override
  String get unlimitedWordExtraction => 'Extracción ilimitada';

  @override
  String get advancedPractice => 'Práctica avanzada';

  @override
  String get detailedStatistics => 'Estadísticas detalladas';

  @override
  String get cloudSync => 'Sincronización en la nube';

  @override
  String get prioritySupport => 'Soporte prioritario';

  @override
  String get error => 'Error';

  @override
  String get tryAgain => 'Reintentar';

  @override
  String get loading => 'Cargando...';

  @override
  String get save => 'Guardar';

  @override
  String get done => 'Listo';

  @override
  String get next => 'Siguiente';

  @override
  String get previous => 'Anterior';

  @override
  String get skip => 'Omitir';

  @override
  String get continue_ => 'Continuar';

  @override
  String get confirm => 'Confirmar';

  @override
  String get selected => 'Seleccionado';

  @override
  String get wordsSettings => 'Ajustes de palabras';

  @override
  String get practiceSettings => 'Ajustes de práctica y tamaño de sección';

  @override
  String get manageAccount => 'Gestiona tu información de cuenta';

  @override
  String get fontThemeDisplay => 'Tamaño de fuente, temas y visualización';

  @override
  String version(String version) {
    return 'Versión $version';
  }
}
