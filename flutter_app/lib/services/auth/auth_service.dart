import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_facebook_auth/flutter_facebook_auth.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import '../../models/user.dart' as app_models;

class AuthService {
  final firebase_auth.FirebaseAuth _firebaseAuth = firebase_auth.FirebaseAuth.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn();
  final FacebookAuth _facebookAuth = FacebookAuth.instance;

  Stream<firebase_auth.User?> get authStateChanges => _firebaseAuth.authStateChanges();

  firebase_auth.User? get currentUser => _firebaseAuth.currentUser;

  Future<firebase_auth.UserCredential> signInWithEmail({
    required String email,
    required String password,
  }) async {
    return await _firebaseAuth.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
  }

  Future<firebase_auth.UserCredential> registerWithEmail({
    required String email,
    required String password,
  }) async {
    return await _firebaseAuth.createUserWithEmailAndPassword(
      email: email,
      password: password,
    );
  }

  Future<void> sendPasswordResetEmail(String email) async {
    await _firebaseAuth.sendPasswordResetEmail(email: email);
  }

  Future<firebase_auth.UserCredential> signInWithGoogle() async {
    final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();

    if (googleUser == null) {
      throw Exception('Google sign in aborted');
    }

    final GoogleSignInAuthentication googleAuth = await googleUser.authentication;

    final credential = firebase_auth.GoogleAuthProvider.credential(
      accessToken: googleAuth.accessToken,
      idToken: googleAuth.idToken,
    );

    return await _firebaseAuth.signInWithCredential(credential);
  }

  Future<firebase_auth.UserCredential> signInWithFacebook() async {
    final LoginResult result = await _facebookAuth.login();

    if (result.status != LoginStatus.success) {
      throw Exception('Facebook sign in failed');
    }

    final firebase_auth.OAuthCredential credential =
        firebase_auth.FacebookAuthProvider.credential(result.accessToken!.tokenString);

    return await _firebaseAuth.signInWithCredential(credential);
  }

  Future<firebase_auth.UserCredential> signInWithApple() async {
    final appleCredential = await SignInWithApple.getAppleIDCredential(
      scopes: [
        AppleIDAuthorizationScopes.email,
        AppleIDAuthorizationScopes.fullName,
      ],
    );

    final oauthCredential = firebase_auth.OAuthProvider("apple.com").credential(
      idToken: appleCredential.identityToken,
      accessToken: appleCredential.authorizationCode,
    );

    return await _firebaseAuth.signInWithCredential(oauthCredential);
  }

  Future<void> signOut() async {
    if (kIsWeb) {
      // Google/Facebook sign-in aren't wired up on web (Phase 2), so there's
      // nothing to sign out of there, and calling into those SDKs on web
      // throws, which would otherwise make this whole sign-out appear to hang.
      await _firebaseAuth.signOut();
      return;
    }
    await Future.wait([
      _firebaseAuth.signOut(),
      _googleSignIn.signOut(),
      _facebookAuth.logOut(),
    ]);
  }

  app_models.AuthProvider getAuthProvider(firebase_auth.User user) {
    final providerId = user.providerData.first.providerId;

    switch (providerId) {
      case 'google.com':
        return app_models.AuthProvider.google;
      case 'facebook.com':
        return app_models.AuthProvider.facebook;
      case 'apple.com':
        return app_models.AuthProvider.apple;
      default:
        return app_models.AuthProvider.email;
    }
  }
}
