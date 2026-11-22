import 'package:flutter/material.dart';

/// WordBook "risograph" design tokens, ported from the Lovable
/// `level-up-storybook` project's `src/styles.css`.
///
/// Hex values are the oklch -> sRGB conversions of Lovable's CSS custom
/// properties (`--paper`, `--ink`, `--lemon`, `--lime`, `--aqua`,
/// `--mint`, `--success`).
class WbPalette {
  WbPalette._();

  // Surfaces (light) — warm paper + dark navy ink
  static const Color paper = Color(0xFFFAF1DF); // page background
  static const Color card = Color(0xFFFDF8ED); // raised surface
  static const Color ink = Color(0xFF131E37); // text, borders, hard shadow
  static const Color muted = Color(0xFFEAE0CB); // subtle fill
  static const Color mutedForeground = Color(0xFF424D63); // secondary text

  // Brand accents (shared by light and dark)
  static const Color lemon = Color(0xFFDF2414); // primary CTA (riso red-orange)
  static const Color lime = Color(0xFFFCC618); // secondary / highlight (yellow)
  static const Color aqua = Color(0xFF008889); // accent / progress (teal)
  static const Color mint = Color(0xFFFFB4B3); // success / "correct" (pink)
  static const Color success = Color(0xFF0A7E3A); // green
  static const Color successSoft = Color(0xFFB9EEC2);

  // Dark-mode surfaces — a navy variant keeping the same accents
  static const Color darkBackground = Color(0xFF0D1424);
  static const Color darkCard = Color(0xFF1A2440);
  static const Color darkMuted = Color(0xFF2A3552);
  static const Color darkMutedForeground = Color(0xFFA9B4CC);

  /// Hairline border (ink at ~18%), for inputs/dividers.
  static const Color hairline = Color(0x2E131E37);

  /// The signature "card-block" hard offset shadow (no blur).
  static const BoxShadow shadowBlock = BoxShadow(
    color: ink,
    offset: Offset(4, 4),
    blurRadius: 0,
  );

  /// Smaller hard shadow for secondary surfaces.
  static const BoxShadow shadowSoft = BoxShadow(
    color: ink,
    offset: Offset(2, 2),
    blurRadius: 0,
  );
}
