import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/auth_provider.dart';
import '../../providers/books_state_provider.dart';
import '../../providers/language_provider.dart';
import '../../repositories/user_repository.dart';

const List<String> _cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

class GenerateBookScreen extends ConsumerStatefulWidget {
  const GenerateBookScreen({super.key});

  @override
  ConsumerState<GenerateBookScreen> createState() => _GenerateBookScreenState();
}

class _GenerateBookScreenState extends ConsumerState<GenerateBookScreen> {
  final _formKey = GlobalKey<FormState>();
  final _topicController = TextEditingController();
  final _wordCountController = TextEditingController(text: '500');

  String _language = SupportedLanguage.all.first.code;
  String _level = 'B1';
  int _newWordPercentage = 20;

  @override
  void initState() {
    super.initState();
    final uid = ref.read(currentUserProvider)?.uid;
    if (uid == null) return;
    ref.read(userRepositoryProvider).getUserById(uid).then((user) {
      final learningLanguage = user?.learningLanguage;
      if (mounted && SupportedLanguage.all.any((l) => l.code == learningLanguage)) {
        setState(() => _language = learningLanguage!);
      }
    });
  }

  @override
  void dispose() {
    _topicController.dispose();
    _wordCountController.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final wordCount = int.parse(_wordCountController.text).clamp(1, 5000);

    ref.read(booksStateProvider.notifier).generateBook(
          language: _language,
          level: _level,
          topic: _topicController.text.trim(),
          wordCount: wordCount,
          newWordPercentage: _newWordPercentage,
        );

    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Generate Book')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            DropdownButtonFormField<String>(
              initialValue: _language,
              decoration: const InputDecoration(labelText: 'Language'),
              items: SupportedLanguage.all
                  .map((l) => DropdownMenuItem(value: l.code, child: Text(l.name)))
                  .toList(),
              onChanged: (value) => setState(() => _language = value!),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: _level,
              decoration: const InputDecoration(labelText: 'Level'),
              items: _cefrLevels
                  .map((level) => DropdownMenuItem(value: level, child: Text(level)))
                  .toList(),
              onChanged: (value) => setState(() => _level = value!),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _topicController,
              decoration: const InputDecoration(labelText: 'Topic'),
              validator: (value) =>
                  (value == null || value.trim().isEmpty) ? 'Topic is required' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _wordCountController,
              decoration: const InputDecoration(labelText: 'Word count'),
              keyboardType: TextInputType.number,
              validator: (value) {
                final parsed = int.tryParse(value ?? '');
                if (parsed == null || parsed < 1 || parsed > 5000) {
                  return 'Enter a number between 1 and 5000';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            Text('New word percentage: $_newWordPercentage%'),
            Slider(
              value: _newWordPercentage.toDouble(),
              min: 0,
              max: 100,
              divisions: 100,
              label: '$_newWordPercentage%',
              onChanged: (value) => setState(() => _newWordPercentage = value.round()),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _submit,
              child: const Text('Generate'),
            ),
          ],
        ),
      ),
    );
  }
}
