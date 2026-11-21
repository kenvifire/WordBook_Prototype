import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../../data/file_io/book_file_io.dart';

/// Renders a book's cover image from an opaque [BookFileIO] reference
/// (a real file path on native, an in-memory key on web). Shows
/// [placeholder] while loading or if the reference can't be read, instead
/// of synthesizing a fake reference or throwing — matching the original
/// `Image.file(File(book.coverUrl!))`'s `errorBuilder` behavior.
///
/// Memoizes the `readBytes` future across rebuilds (only recreating it when
/// [reference] actually changes) so `Image.memory`/`MemoryImage`'s
/// byte-buffer-identity cache can hit instead of re-decoding the cover on
/// every unrelated rebuild (e.g. the ~21 `copyWith` call sites on
/// `booksStateProvider`).
class CoverImage extends StatefulWidget {
  final String reference;
  final BoxFit fit;
  final Widget Function(BuildContext context) placeholder;

  const CoverImage({
    super.key,
    required this.reference,
    required this.placeholder,
    this.fit = BoxFit.cover,
  });

  @override
  State<CoverImage> createState() => _CoverImageState();
}

class _CoverImageState extends State<CoverImage> {
  late Future<Uint8List> _bytesFuture;

  @override
  void initState() {
    super.initState();
    _bytesFuture = createBookFileIO().readBytes(widget.reference);
  }

  @override
  void didUpdateWidget(CoverImage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.reference != widget.reference) {
      _bytesFuture = createBookFileIO().readBytes(widget.reference);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Uint8List>(
      future: _bytesFuture,
      builder: (context, snapshot) {
        if (snapshot.hasData) {
          return Image.memory(
            snapshot.data!,
            fit: widget.fit,
            gaplessPlayback: true,
            errorBuilder: (context, error, stackTrace) =>
                widget.placeholder(context),
          );
        }
        if (snapshot.hasError) {
          return widget.placeholder(context);
        }
        return widget.placeholder(context);
      },
    );
  }
}
