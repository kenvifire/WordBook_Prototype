import 'package:flutter/material.dart';
import '../../models/book.dart';
import 'cover_image.dart';

class BookListTile extends StatelessWidget {
  final Book book;
  final VoidCallback onTap;
  final VoidCallback? onLongPress;
  final bool isExtracting;
  final double extractionProgress;

  const BookListTile({
    super.key,
    required this.book,
    required this.onTap,
    this.onLongPress,
    this.isExtracting = false,
    this.extractionProgress = 0.0,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: InkWell(
        onTap: onTap,
        onLongPress: onLongPress,
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Row(
            children: [
              Container(
                width: 60,
                height: 80,
                clipBehavior: Clip.antiAlias,
                decoration: BoxDecoration(
                  gradient: book.coverUrl == null
                      ? LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            _getBookColor(book.format),
                            _getBookColor(book.format).withValues(alpha: 0.7),
                          ],
                        )
                      : null,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: isExtracting
                    ? Stack(
                        children: [
                          if (book.coverUrl != null)
                            Positioned.fill(
                              child: CoverImage(
                                reference: book.coverUrl!,
                                fit: BoxFit.cover,
                                placeholder: (context) => Center(
                                  child: Icon(
                                    _getBookIcon(book.format),
                                    color: Colors.white.withValues(alpha: 0.9),
                                    size: 32,
                                  ),
                                ),
                              ),
                            ),
                          Container(
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.6),
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${(extractionProgress * 100).toStringAsFixed(0)}%',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      )
                    : book.coverUrl != null
                        ? CoverImage(
                            reference: book.coverUrl!,
                            fit: BoxFit.cover,
                            placeholder: (context) {
                              return Center(
                                child: Icon(
                                  _getBookIcon(book.format),
                                  color: Colors.white.withValues(alpha: 0.9),
                                  size: 32,
                                ),
                              );
                            },
                          )
                        : Center(
                            child: Icon(
                              _getBookIcon(book.format),
                              color: Colors.white.withValues(alpha: 0.9),
                              size: 32,
                            ),
                          ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            book.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                        ),
                        if (book.status == BookStatus.completed)
                          Container(
                            margin: const EdgeInsets.only(left: 8),
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: Colors.green,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.check,
                              color: Colors.white,
                              size: 16,
                            ),
                          ),
                      ],
                    ),
                    if (book.author != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        book.author!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: LinearProgressIndicator(
                            value: book.totalPages > 0
                                ? book.currentPage / book.totalPages
                                : 0,
                            backgroundColor: Colors.grey.withValues(alpha:0.2),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          '${book.currentPage}/${book.totalPages}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        if (book.status == BookStatus.reading)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.green.withValues(alpha:0.2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              'Reading',
                              style: TextStyle(
                                color: Colors.green.shade700,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        const Spacer(),
                        Text(
                          book.format.toUpperCase(),
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: _getBookColor(book.format),
                                    fontWeight: FontWeight.bold,
                                  ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getBookColor(String format) {
    switch (format.toLowerCase()) {
      case 'pdf':
        return Colors.red;
      case 'epub':
        return Colors.blue;
      case 'txt':
        return Colors.green;
      case 'mobi':
        return Colors.orange;
      default:
        return Colors.purple;
    }
  }

  IconData _getBookIcon(String format) {
    switch (format.toLowerCase()) {
      case 'pdf':
        return Icons.picture_as_pdf;
      case 'epub':
      case 'mobi':
        return Icons.menu_book;
      case 'txt':
        return Icons.text_snippet;
      default:
        return Icons.book;
    }
  }
}
