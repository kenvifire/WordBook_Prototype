import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final sectionSizeProvider = StateProvider<int>((ref) => 75);
final recognitionThresholdProvider = StateProvider<double>((ref) => 0.8);

class WordsSettingsScreen extends ConsumerStatefulWidget {
  const WordsSettingsScreen({super.key});

  @override
  ConsumerState<WordsSettingsScreen> createState() => _WordsSettingsScreenState();
}

class _WordsSettingsScreenState extends ConsumerState<WordsSettingsScreen> {
  int _sectionSize = 75;
  double _recognitionThreshold = 0.8;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _sectionSize = prefs.getInt('sectionSize') ?? 75;
      _recognitionThreshold = prefs.getDouble('recognitionThreshold') ?? 0.8;
    });
    ref.read(sectionSizeProvider.notifier).state = _sectionSize;
    ref.read(recognitionThresholdProvider.notifier).state = _recognitionThreshold;
  }

  Future<void> _saveSectionSize(int value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('sectionSize', value);
    setState(() {
      _sectionSize = value;
    });
    ref.read(sectionSizeProvider.notifier).state = value;
  }

  Future<void> _saveRecognitionThreshold(double value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble('recognitionThreshold', value);
    setState(() {
      _recognitionThreshold = value;
    });
    ref.read(recognitionThresholdProvider.notifier).state = value;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Words Settings'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Practice Settings',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Section Size',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Target number of new words to practice before reading',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey,
                        ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: Slider(
                          value: _sectionSize.toDouble(),
                          min: 30.0,
                          max: 300.0,
                          divisions: 27,
                          label: _sectionSize.toString(),
                          onChanged: (value) {
                            _saveSectionSize(value.toInt());
                          },
                        ),
                      ),
                      SizedBox(
                        width: 60,
                        child: Text(
                          '$_sectionSize words',
                          style: Theme.of(context).textTheme.bodyMedium,
                          textAlign: TextAlign.right,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Recognition Threshold',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Minimum recognition rate to start reading a section',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey,
                        ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: Slider(
                          value: _recognitionThreshold,
                          min: 0.5,
                          max: 1.0,
                          divisions: 10,
                          label: '${(_recognitionThreshold * 100).toStringAsFixed(0)}%',
                          onChanged: (value) {
                            _saveRecognitionThreshold(value);
                          },
                        ),
                      ),
                      SizedBox(
                        width: 50,
                        child: Text(
                          '${(_recognitionThreshold * 100).toStringAsFixed(0)}%',
                          style: Theme.of(context).textTheme.bodyMedium,
                          textAlign: TextAlign.right,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'How it works',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 16),
          _InfoCard(
            icon: Icons.auto_stories,
            title: 'Section-based Learning',
            description:
                'Before reading each section, practice the vocabulary that appears in the upcoming pages.',
          ),
          const SizedBox(height: 12),
          _InfoCard(
            icon: Icons.refresh,
            title: 'Spaced Repetition',
            description:
                'Words are reviewed using a scientifically proven spaced repetition algorithm for long-term memory.',
          ),
          const SizedBox(height: 12),
          _InfoCard(
            icon: Icons.check_circle,
            title: 'Recognition Threshold',
            description:
                'Once you recognize the threshold percentage of words, you can proceed to read the section.',
          ),
        ],
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;

  const _InfoCard({
    required this.icon,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              icon,
              color: Theme.of(context).colorScheme.primary,
              size: 28,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey,
                        ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
