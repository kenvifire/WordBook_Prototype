import 'dart:typed_data';

import 'package:flutter/material.dart';
import '../../services/vocabulary/pdf_text_position_service.dart';

class ReaderSearchDialog extends StatefulWidget {
  final Uint8List bytes;
  final int totalPages;
  final void Function(int page) onNavigateToPage;

  const ReaderSearchDialog({
    super.key,
    required this.bytes,
    required this.totalPages,
    required this.onNavigateToPage,
  });

  @override
  State<ReaderSearchDialog> createState() => _ReaderSearchDialogState();
}

class _ReaderSearchDialogState extends State<ReaderSearchDialog> {
  final _controller = TextEditingController();
  final _service = PdfTextPositionService();
  List<MapEntry<int, String>> _results = [];
  bool _isSearching = false;
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _search(String query) async {
    if (query.trim().isEmpty) {
      setState(() => _results = []);
      return;
    }

    setState(() => _isSearching = true);

    final pageTexts = _service.extractPageTexts(
      widget.bytes,
      startPage: 0,
      endPage: widget.totalPages - 1,
    );

    final results = <MapEntry<int, String>>[];
    final lowerQuery = query.toLowerCase();

    for (final entry in pageTexts.entries) {
      final lowerText = entry.value.toLowerCase();
      if (lowerText.contains(lowerQuery)) {
        int idx = lowerText.indexOf(lowerQuery);
        final start = idx - 30 > 0 ? idx - 30 : 0;
        final end = idx + query.length + 50 < entry.value.length
            ? idx + query.length + 50
            : entry.value.length;
        final snippet = '...${entry.value.substring(start, end)}...';
        results.add(MapEntry(entry.key, snippet));
      }
    }

    if (mounted) {
      setState(() {
        _results = results;
        _isSearching = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: TextField(
        controller: _controller,
        autofocus: true,
        decoration: InputDecoration(
          hintText: 'Search in book...',
          prefixIcon: const Icon(Icons.search),
          suffixIcon: _controller.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    _controller.clear();
                    setState(() => _results = []);
                  },
                )
              : null,
        ),
        onSubmitted: (value) {
          _query = value;
          _search(value);
        },
      ),
      content: SizedBox(
        width: double.maxFinite,
        height: 400,
        child: _isSearching
            ? const Center(child: CircularProgressIndicator())
            : _query.isEmpty
                ? Center(
                    child: Text(
                      'Type to search',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  )
                : _results.isEmpty
                    ? Center(
                        child: Text(
                          'No results for "$_query"',
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                      )
                    : ListView.builder(
                        itemCount: _results.length,
                        itemBuilder: (context, index) {
                          final result = _results[index];
                          return ListTile(
                            title: Text(
                              result.value,
                              style: const TextStyle(fontSize: 13),
                            ),
                            subtitle: Text('Page ${result.key}'),
                            leading: CircleAvatar(
                              radius: 14,
                              child: Text(
                                '${result.key}',
                                style: const TextStyle(fontSize: 11),
                              ),
                            ),
                            onTap: () {
                              Navigator.pop(context);
                              widget.onNavigateToPage(result.key);
                            },
                          );
                        },
                      ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Close'),
        ),
      ],
    );
  }
}
