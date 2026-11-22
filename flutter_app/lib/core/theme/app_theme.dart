import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'wb_palette.dart';

/// WordBook theme — the "risograph" look ported from the Lovable
/// `level-up-storybook` design system.
///
/// Light = warm paper + ink with hard offset shadows; dark = a navy variant
/// that keeps the same accents. The signature 2px-ink-border + hard-shadow
/// surfaces are provided by `WbCard` / `WbButton`; this file sets the
/// Material color scheme, typography and the standard component themes.
class AppTheme {
  AppTheme._();

  static ThemeData lightTheme() => _theme(Brightness.light);
  static ThemeData darkTheme() => _theme(Brightness.dark);

  static ThemeData _theme(Brightness brightness) {
    final dark = brightness == Brightness.dark;
    final scheme = (dark ? ColorScheme.dark() : ColorScheme.light()).copyWith(
      primary: WbPalette.lemon,
      onPrimary: WbPalette.paper,
      secondary: WbPalette.lime,
      onSecondary: WbPalette.ink,
      error: WbPalette.lemon,
      onError: WbPalette.paper,
      surface: dark ? WbPalette.darkBackground : WbPalette.paper,
      onSurface: dark ? WbPalette.paper : WbPalette.ink,
      surfaceContainerHighest: dark ? WbPalette.darkMuted : WbPalette.muted,
      onSurfaceVariant: dark
          ? WbPalette.darkMutedForeground
          : WbPalette.mutedForeground,
      outline: WbPalette.ink,
      outlineVariant: dark ? WbPalette.darkMuted : WbPalette.hairline,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: scheme.surface,
      textTheme: _textTheme(brightness),
      appBarTheme: AppBarTheme(
        centerTitle: false,
        elevation: 0,
        backgroundColor: scheme.surface,
        foregroundColor: scheme.onSurface,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: dark ? WbPalette.darkCard : WbPalette.card,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: const BorderSide(color: WbPalette.ink, width: 2),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: dark ? WbPalette.darkCard : WbPalette.card,
        border: _inputBorder(),
        enabledBorder: _inputBorder(),
        focusedBorder: _inputBorder(color: WbPalette.aqua, width: 3),
      ),
      navigationBarTheme: NavigationBarThemeData(
        indicatorColor: WbPalette.lime,
        backgroundColor: dark ? WbPalette.darkCard : WbPalette.card,
      ),
    );
  }

  static OutlineInputBorder _inputBorder({
    Color color = WbPalette.ink,
    double width = 2,
  }) {
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: BorderSide(color: color, width: width),
    );
  }

  static TextTheme _textTheme(Brightness brightness) {
    // Body in Bricolage Grotesque; headings/display in Fraunces (serif).
    final base = GoogleFonts.bricolageGrotesqueTextTheme(
      ThemeData(brightness: brightness).textTheme,
    );
    return base.copyWith(
      displayLarge: GoogleFonts.fraunces(
        fontSize: 57,
        fontWeight: FontWeight.w800,
        letterSpacing: -1,
      ),
      displayMedium: GoogleFonts.fraunces(
        fontSize: 45,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.5,
      ),
      displaySmall: GoogleFonts.fraunces(
        fontSize: 36,
        fontWeight: FontWeight.w800,
      ),
      headlineLarge: GoogleFonts.fraunces(
        fontSize: 32,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.5,
      ),
      headlineMedium: GoogleFonts.fraunces(
        fontSize: 28,
        fontWeight: FontWeight.w700,
      ),
      headlineSmall: GoogleFonts.fraunces(
        fontSize: 24,
        fontWeight: FontWeight.w700,
      ),
      titleLarge: GoogleFonts.fraunces(
        fontSize: 20,
        fontWeight: FontWeight.w700,
      ),
    );
  }
}
