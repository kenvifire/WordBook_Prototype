import 'package:flutter/material.dart';

/// Wraps [child] with swipe-to-turn-page gestures. Triggers only on a quick
/// flick (checked by velocity, not just direction) so it doesn't fight with
/// the slower drag used to extend a text selection for word lookup on the
/// same content. Swipe left (negative velocity) turns the page forward,
/// matching the on-screen "next" chevron; swipe right goes back.
class SwipePageTurner extends StatelessWidget {
  final Widget child;
  final VoidCallback? onSwipeNext;
  final VoidCallback? onSwipePrevious;

  static const double _velocityThreshold = 300;

  const SwipePageTurner({
    super.key,
    required this.child,
    this.onSwipeNext,
    this.onSwipePrevious,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onHorizontalDragEnd: (details) {
        final velocity = details.primaryVelocity ?? 0;
        if (velocity.abs() < _velocityThreshold) return;
        if (velocity < 0) {
          onSwipeNext?.call();
        } else {
          onSwipePrevious?.call();
        }
      },
      child: child,
    );
  }
}
