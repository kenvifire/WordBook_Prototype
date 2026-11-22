import 'package:flutter/material.dart';
import '../../core/theme/wb_palette.dart';

/// "card-block": the signature 2px ink border + hard offset shadow surface.
class WbCard extends StatelessWidget {
  const WbCard({
    super.key,
    required this.child,
    this.color,
    this.padding = const EdgeInsets.all(20),
  });

  final Widget child;
  final Color? color;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color ?? (dark ? WbPalette.darkCard : WbPalette.card),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: WbPalette.ink, width: 2),
        boxShadow: const [WbPalette.shadowBlock],
      ),
      child: child,
    );
  }
}
