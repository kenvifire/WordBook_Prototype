import 'package:flutter/material.dart';
import '../../models/book.dart';
import 'cover_image.dart';

class BookCard extends StatelessWidget {
  final Book book;
  final VoidCallback onTap;
  final VoidCallback? onLongPress;
  final bool isExtracting;
  final double extractionProgress;

  const BookCard({
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
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        onLongPress: onLongPress,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Container(
                width: double.infinity,
                decoration: book.coverUrl == null
                    ? BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            _getBookColor(book.format),
                            _getBookColor(book.format).withValues(alpha: 0.7),
                          ],
                        ),
                      )
                    : null,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    if (book.coverUrl != null)
                      CoverImage(
                        reference: book.coverUrl!,
                        fit: BoxFit.cover,
                        placeholder: (context) {
                          return Container(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: [
                                  _getBookColor(book.format),
                                  _getBookColor(book.format).withValues(alpha: 0.7),
                                ],
                              ),
                            ),
                            child: Center(
                              child: Icon(
                                _getBookIcon(book.format),
                                size: 48,
                                color: Colors.white.withValues(alpha: 0.9),
                              ),
                            ),
                          );
                        },
                      )
                    else
                      Center(
                        child: Icon(
                          _getBookIcon(book.format),
                          size: 48,
                          color: Colors.white.withValues(alpha: 0.9),
                        ),
                      ),
                    if (book.status == BookStatus.reading)
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.green,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Text(
                            'Reading',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    if (book.status == BookStatus.completed)
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Container(
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
                      ),
                    if (isExtracting)
                      Positioned.fill(
                        child: Container(
                          color: Colors.black.withValues(alpha: 0.6),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const SizedBox(
                                width: 32,
                                height: 32,
                                child: CircularProgressIndicator(
                                  strokeWidth: 3,
                                  color: Colors.white,
                                ),
                              ),
                              const SizedBox(height: 8),
                              const Text(
                                'Extracting...',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 16),
                                child: LinearProgressIndicator(
                                  value: extractionProgress,
                                  backgroundColor: Colors.white.withValues(alpha: 0.3),
                                  color: Colors.white,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${(extractionProgress * 100).toStringAsFixed(0)}%',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    book.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  if (book.author != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      book.author!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                  const SizedBox(height: 8),
                  LinearProgressIndicator(
                    value: book.totalPages > 0
                        ? book.currentPage / book.totalPages
                        : 0,
                    backgroundColor: Colors.grey.withValues(alpha: 0.2),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${book.currentPage}/${book.totalPages} pages',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ],
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
