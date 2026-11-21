// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for French (`fr`).
class AppLocalizationsFr extends AppLocalizations {
  AppLocalizationsFr([String locale = 'fr']) : super(locale);

  @override
  String get appName => 'WordBook';

  @override
  String get settings => 'Paramètres';

  @override
  String get preferences => 'Préférences';

  @override
  String get profile => 'Profil';

  @override
  String get about => 'À propos';

  @override
  String get signOut => 'Déconnexion';

  @override
  String get signOutConfirm => 'Êtes-vous sûr de vouloir vous déconnecter ?';

  @override
  String get cancel => 'Annuler';

  @override
  String get language => 'Langue';

  @override
  String get appLanguage => 'Langue de l\'application';

  @override
  String get appLanguageDescription => 'Changer la langue de l\'interface';

  @override
  String get nativeLanguage => 'Langue maternelle';

  @override
  String get nativeLanguageDescription =>
      'Les définitions seront affichées dans votre langue maternelle';

  @override
  String get selectLanguage => 'Sélectionner la langue';

  @override
  String get appearance => 'Apparence';

  @override
  String get lightMode => 'Mode clair';

  @override
  String get lightModeDescription => 'Toujours utiliser le thème clair';

  @override
  String get darkMode => 'Mode sombre';

  @override
  String get darkModeDescription => 'Toujours utiliser le thème sombre';

  @override
  String get systemDefault => 'Par défaut du système';

  @override
  String get systemDefaultDescription => 'Suivre les paramètres du système';

  @override
  String get reading => 'Lecture';

  @override
  String get fontSize => 'Taille de police';

  @override
  String get sampleText => 'Exemple de texte avec la taille actuelle';

  @override
  String get bookshelf => 'Bibliothèque';

  @override
  String get addBook => 'Ajouter un livre';

  @override
  String get noBooks => 'Aucun livre';

  @override
  String get noBooksDescription =>
      'Appuyez sur + pour ajouter votre premier livre';

  @override
  String get deleteBook => 'Supprimer le livre';

  @override
  String get deleteBookConfirm =>
      'Êtes-vous sûr de vouloir supprimer ce livre ?';

  @override
  String get delete => 'Supprimer';

  @override
  String get vocabulary => 'Vocabulaire';

  @override
  String get words => 'Mots';

  @override
  String get wordsLearned => 'Mots appris';

  @override
  String get wordsToLearn => 'Mots à apprendre';

  @override
  String get practice => 'Pratique';

  @override
  String get startPractice => 'Commencer la pratique';

  @override
  String get extractVocabulary => 'Extraire le vocabulaire';

  @override
  String get extracting => 'Extraction en cours...';

  @override
  String wordsExtracted(int count) {
    return '$count mots extraits';
  }

  @override
  String get statistics => 'Statistiques';

  @override
  String get today => 'Aujourd\'hui';

  @override
  String get thisWeek => 'Cette semaine';

  @override
  String get thisMonth => 'Ce mois';

  @override
  String get allTime => 'Tout le temps';

  @override
  String get totalWords => 'Total des mots';

  @override
  String get totalBooks => 'Total des livres';

  @override
  String get studyTime => 'Temps d\'étude';

  @override
  String get streak => 'Série';

  @override
  String days(int count) {
    return '$count jours';
  }

  @override
  String get subscription => 'Abonnement';

  @override
  String get upgradeToPro => 'Passer à Pro';

  @override
  String get wordBookPro => 'WordBook Pro';

  @override
  String get freePlan => 'Plan gratuit';

  @override
  String get premiumAccess => 'Vous avez l\'accès premium';

  @override
  String get upgradeForMore =>
      'Passez à la version supérieure pour plus de fonctionnalités';

  @override
  String get manageSubscription => 'Gérer l\'abonnement';

  @override
  String get restorePurchases => 'Restaurer les achats';

  @override
  String get restoreSuccess => 'Achats restaurés avec succès !';

  @override
  String get noRestorePurchases => 'Aucun achat à restaurer';

  @override
  String get subscribeNow => 'S\'abonner maintenant';

  @override
  String get subscriptionNotAvailable =>
      'Les abonnements ne sont pas disponibles. Veuillez réessayer plus tard.';

  @override
  String get unlimitedBooks => 'Livres illimités';

  @override
  String get unlimitedWordExtraction => 'Extraction illimitée';

  @override
  String get advancedPractice => 'Pratique avancée';

  @override
  String get detailedStatistics => 'Statistiques détaillées';

  @override
  String get cloudSync => 'Synchronisation cloud';

  @override
  String get prioritySupport => 'Support prioritaire';

  @override
  String get error => 'Erreur';

  @override
  String get tryAgain => 'Réessayer';

  @override
  String get loading => 'Chargement...';

  @override
  String get save => 'Enregistrer';

  @override
  String get done => 'Terminé';

  @override
  String get next => 'Suivant';

  @override
  String get previous => 'Précédent';

  @override
  String get skip => 'Ignorer';

  @override
  String get continue_ => 'Continuer';

  @override
  String get confirm => 'Confirmer';

  @override
  String get selected => 'Sélectionné';

  @override
  String get wordsSettings => 'Paramètres des mots';

  @override
  String get practiceSettings => 'Paramètres de pratique et taille de section';

  @override
  String get manageAccount => 'Gérer les informations de votre compte';

  @override
  String get fontThemeDisplay => 'Taille de police, thèmes et affichage';

  @override
  String version(String version) {
    return 'Version $version';
  }
}
