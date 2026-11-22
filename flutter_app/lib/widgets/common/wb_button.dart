import 'package:flutter/material.dart';
import '../../core/theme/wb_palette.dart';

enum WbButtonVariant { primary, secondary, ghost }

/// Pill button with the signature hard offset shadow + 2px ink border.
/// Pressing it translates down and shrinks the shadow (the "btn-ink" feel).
class WbButton extends StatefulWidget {
  const WbButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = WbButtonVariant.primary,
    this.icon,
  });

  final String label;
  final VoidCallback? onPressed;
  final WbButtonVariant variant;
  final Widget? icon;

  @override
  State<WbButton> createState() => _WbButtonState();
}

class _WbButtonState extends State<WbButton> {
  bool _pressed = false;

  Color get _bg => widget.variant == WbButtonVariant.primary
      ? WbPalette.lemon
      : widget.variant == WbButtonVariant.secondary
      ? WbPalette.lime
      : Colors.transparent;

  Color get _fg => widget.variant == WbButtonVariant.primary
      ? WbPalette.paper
      : WbPalette.ink;

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onPressed != null;
    return Semantics(
      button: true,
      enabled: enabled,
      child: GestureDetector(
        onTapDown: enabled ? (_) => setState(() => _pressed = true) : null,
        onTapUp: enabled ? (_) => setState(() => _pressed = false) : null,
        onTapCancel: enabled ? () => setState(() => _pressed = false) : null,
        onTap: enabled ? widget.onPressed : null,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 90),
          transform: Matrix4.translationValues(0.0, _pressed ? 3.0 : 0.0, 0.0),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          decoration: BoxDecoration(
            color: _bg,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: WbPalette.ink, width: 2),
            boxShadow: _pressed
                ? const [
                    BoxShadow(
                      color: WbPalette.ink,
                      offset: Offset(1, 1),
                      blurRadius: 0,
                    ),
                  ]
                : const [WbPalette.shadowBlock],
          ),
          child: Opacity(
            opacity: enabled ? 1 : 0.5,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (widget.icon != null) ...[
                  widget.icon!,
                  const SizedBox(width: 8),
                ],
                Text(
                  widget.label,
                  style: TextStyle(
                    color: _fg,
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
