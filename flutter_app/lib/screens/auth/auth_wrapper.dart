import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_provider.dart';
import 'login_screen.dart';
import '../home/main_screen.dart';

class AuthWrapper extends ConsumerStatefulWidget {
  const AuthWrapper({super.key});

  @override
  ConsumerState<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends ConsumerState<AuthWrapper> {
  bool _showLogin = false;

  @override
  void initState() {
    super.initState();
    // If still loading after 3 seconds, show login screen
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted && !_showLogin) {
        final authState = ref.read(authStateProvider);
        if (authState.isLoading) {
          debugPrint('Auth state still loading after 3s, showing login');
          setState(() => _showLogin = true);
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);

    debugPrint('AuthWrapper build: isLoading=${authState.isLoading}, hasError=${authState.hasError}, hasValue=${authState.hasValue}');

    if (_showLogin) {
      return const LoginScreen();
    }

    return authState.when(
      data: (user) {
        debugPrint('AuthWrapper: user=${user?.email}');
        if (user != null) {
          return const MainScreen();
        }
        return const LoginScreen();
      },
      loading: () => const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      ),
      error: (error, stack) {
        debugPrint('AuthWrapper error: $error');
        return const LoginScreen();
      },
    );
  }
}
