import 'package:flutter/material.dart';
import '../../services/vocabulary/pdf_text_position_service.dart';

class WordTapOverlay extends StatelessWidget {
  final List<PdfWordPosition> words;
  final Size pageSize;    // PDF page dimensions in points (from PdfPage.width/height)
  final Rect pageRect;     // Layout rect in document coordinates (from controller.getPageRect)
  final double zoomRatio;  // Current zoom (from controller.zoomRatio)
  final Rect viewRect;     // Current viewport in document coords (from controller.viewRect)
  final void Function(String word, PdfWordPosition position)? onWordTapped;

  const WordTapOverlay({
    super.key,
    required this.words,
    required this.pageSize,
    required this.pageRect,
    required this.zoomRatio,
    required this.viewRect,
    this.onWordTapped,
  });

  @override
  Widget build(BuildContext context) {
    if (words.isEmpty || pageSize.width <= 0 || pageSize.height <= 0) return const SizedBox();

    return Stack(
        children: words.map((word) {
          // 1. PDF point → page fraction
          final fx = word.x / pageSize.width;
          final fy = word.y / pageSize.height;
          final fw = word.width / pageSize.width;
          final fh = word.height / pageSize.height;

          // 2. Page fraction → layout position (page's rect in document)
          final layoutX = pageRect.left + fx * pageRect.width;
          final layoutY = pageRect.top + fy * pageRect.height;
          final layoutW = fw * pageRect.width;
          final layoutH = fh * pageRect.height;

          // 3. Layout → screen (apply zoom, subtract view offset)
          final screenX = (layoutX * zoomRatio) - viewRect.left;
          final screenY = (layoutY * zoomRatio) - viewRect.top;
          final screenW = layoutW * zoomRatio;
          final screenH = layoutH * zoomRatio;

          // Expand tap target for small words
          final tapPadding = 4.0;
          final tapRect = Rect.fromLTWH(screenX, screenY, screenW, screenH)
              .inflate(tapPadding);

          return Positioned(
            left: tapRect.left,
            top: tapRect.top,
            width: tapRect.width,
            height: tapRect.height,
            child: GestureDetector(
              behavior: HitTestBehavior.translucent,
              onTap: () => onWordTapped?.call(word.text, word),
            ),
          );
        }).toList(),
    );
  }
}
