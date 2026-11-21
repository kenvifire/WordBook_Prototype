# Vocabulary Extraction System

## Overview

The WordBook app now includes a comprehensive vocabulary extraction system that automatically extracts, processes, and enriches words from uploaded books. This system supports TXT, EPUB, and PDF formats (with limitations).

## Architecture

### Core Components

1. **WordExtractionService** (`lib/services/vocabulary/word_extraction_service.dart`)
   - Extracts words from TXT, PDF, and EPUB files
   - Supports full-book and section-based extraction
   - Handles different file formats with format-specific parsers

2. **WordProcessor** (`lib/services/vocabulary/word_processor.dart`)
   - Cleans and filters extracted words
   - Removes stop words (common words like "the", "a", "is")
   - Filters by word length and validity
   - Calculates word frequency and statistics

3. **DictionaryService** (`lib/services/vocabulary/dictionary_service.dart`)
   - Fetches definitions from Free Dictionary API
   - Provides fallback translation using MyMemory Translation API
   - Extracts phonetics, examples, synonyms, and antonyms

4. **VocabularyService** (`lib/services/vocabulary/vocabulary_service.dart`)
   - Enriches words with definitions and translations
   - Integrates Google Translator with fallback options
   - Provides batch processing with progress callbacks

## Features

### Automatic Extraction on Upload

When a user uploads a book:
1. Book file is saved locally
2. Book metadata is saved to database
3. **Background extraction starts automatically**:
   - Extracts all unique words from the book
   - Filters out common words and invalid entries
   - Enriches top 100 words with definitions/translations
   - Updates progress in UI

### Manual Extraction

Users can manually trigger vocabulary extraction:
1. Go to Book Detail screen
2. Tap "Extract Vocabulary" button
3. View real-time extraction progress
4. See statistics on extracted and enriched words

### Word Processing Pipeline

```
Raw Text → Extract Words → Clean Words → Filter Stop Words →
Validate Words → Calculate Frequency → Create Word Objects →
Fetch Definitions → Add Translations → Save to Database
```

### Supported Operations

#### Full Book Extraction
```dart
final extractionService = WordExtractionService();
final words = await extractionService.extractWordsFromBook(book);
```

#### Section-Based Extraction
```dart
final words = await extractionService.extractWordsFromSection(
  book: book,
  startPage: 1,
  endPage: 10,
);
```

#### Word Enrichment
```dart
final vocabularyService = VocabularyService();
await vocabularyService.enrichWordsWithProgress(
  words,
  targetLanguage: 'es',
  onProgress: (current, total) {
    print('Progress: $current/$total');
  },
);
```

## Format Support

### TXT Files ✅
- **Fully Supported**
- Reads entire text content
- Fast and reliable extraction
- Section extraction by line ranges

### EPUB Files ✅
- **Fully Supported**
- Parses all chapters and sub-chapters
- Strips HTML tags
- Section extraction by chapter ranges

### PDF Files ⚠️
- **Limited Support**
- Current implementation uses placeholder
- `pdfx` package doesn't support text extraction
- **Recommendation**: Add `pdf_text` package for production

### MOBI Files ❌
- **Not Supported**
- Would require additional package

## APIs Used

### Free Dictionary API
- **Endpoint**: `https://api.dictionaryapi.dev/api/v2/entries/en/{word}`
- **Cost**: Free, no authentication required
- **Features**:
  - Word definitions
  - Phonetics and audio pronunciation
  - Part of speech
  - Examples
  - Synonyms and antonyms
- **Rate Limiting**: Reasonable limits for personal use

### MyMemory Translation API
- **Endpoint**: `https://api.mymemory.translated.net/get`
- **Cost**: Free with limits (1000 words/day)
- **Used as**: Fallback for translations
- **Upgrade**: Consider paid plan for production

### Google Translator (via translator package)
- **Primary translation service**
- **Free but unofficial**
- **Note**: For production, use official Google Cloud Translation API

## Word Filtering

### Stop Words
Common words filtered out:
- Articles: a, an, the
- Pronouns: I, you, he, she, it, we, they
- Prepositions: in, on, at, to, for, of
- Conjunctions: and, but, or, nor
- Common verbs: is, am, are, was, were, be
- And many more (see `WordProcessor._stopWords`)

### Validation Rules
Words must meet these criteria:
- Length: 3-30 characters
- Contains at least one letter
- Less than 50% special characters
- Not numbers-only

## UI Components

### 1. Extraction Banner (Bookshelf Screen)
- Shows during automatic extraction
- Displays progress percentage
- Real-time progress bar

### 2. Vocabulary Extraction Screen
- Dedicated screen for manual extraction
- Shows extraction statistics
- Real-time progress updates
- Info card explaining the process

### 3. Book Detail Integration
- "Extract Vocabulary" button
- Launches dedicated extraction screen

## Database Schema

### Word Model
```dart
class Word {
  String wordId;           // Unique identifier
  String word;             // The actual word
  String? definition;      // Dictionary definition
  String? translation;     // Translation to target language
  String? example;         // Example sentence
  String bookId;           // Associated book
  String? userId;          // Owner
  int repetitions;         // SRS: number of reviews
  double easeFactor;       // SRS: difficulty factor
  int interval;            // SRS: days until next review
  DateTime? nextReviewDate;// SRS: when to review next
  WordStatus status;       // newWord, learning, reviewing, mastered
  ExtractionMethod;        // automatic or manual
  DateTime createdAt;
  DateTime updatedAt;
}
```

## Performance Considerations

### Optimization Strategies

1. **Batch Processing**
   - Enriches top 100 words initially
   - Rest can be enriched on-demand

2. **Rate Limiting**
   - 300ms delay between API calls
   - Prevents API throttling
   - User-friendly progress updates

3. **Background Processing**
   - Extraction runs in background
   - Doesn't block UI
   - User can continue browsing

4. **Caching**
   - Words saved to local Isar database
   - No re-extraction needed
   - Fast vocabulary practice

### Estimated Times

| Book Size | Extraction Time | Enrichment Time (100 words) |
|-----------|-----------------|----------------------------|
| Small (50 pages) | 5-10 seconds | 30-45 seconds |
| Medium (200 pages) | 20-30 seconds | 30-45 seconds |
| Large (500+ pages) | 1-2 minutes | 30-45 seconds |

*Note: Times vary based on device speed and internet connection*

## Future Improvements

### Short Term
1. **Add PDF Text Extraction**
   - Integrate `pdf_text` package
   - Enable full PDF support

2. **Batch Enrichment Options**
   - Allow user to choose how many words to enrich
   - Background enrichment queue

3. **Offline Dictionary**
   - Pre-downloaded word database
   - Faster lookups, no API needed

### Long Term
1. **Word Difficulty Analysis**
   - CEFR level classification
   - Frequency analysis from corpus

2. **Context-Aware Extraction**
   - Identify phrases and collocations
   - Extract word forms (lemmatization)

3. **Multi-language Support**
   - Auto-detect book language
   - Support for non-English books

4. **Custom Word Lists**
   - User-defined stop words
   - Import/export vocabulary lists

## Testing

### Manual Testing Checklist

- [ ] Upload TXT file and verify extraction
- [ ] Upload EPUB file and verify extraction
- [ ] Upload PDF file (verify placeholder message)
- [ ] Check extraction progress banner
- [ ] Verify words saved to database
- [ ] Test manual extraction screen
- [ ] Verify definitions fetched correctly
- [ ] Verify translations added
- [ ] Check word statistics
- [ ] Test with large book (500+ pages)
- [ ] Test with small book (< 50 pages)
- [ ] Verify error handling for network issues
- [ ] Test with invalid file formats

### Test Books

Good test books (freely available):
1. **The Great Gatsby** (TXT) - Classic, manageable size
2. **Alice in Wonderland** (EPUB) - Good vocabulary variety
3. **Pride and Prejudice** (TXT) - Larger book, more words

Download from: Project Gutenberg (gutenberg.org)

## Troubleshooting

### Common Issues

**Problem**: Extraction takes too long
- **Solution**: Limit enrichment to top 100 words, enable background processing

**Problem**: API rate limiting
- **Solution**: Increase delay between requests, use batch processing

**Problem**: PDF text not extracted
- **Solution**: Add `pdf_text` package or use EPUB/TXT format

**Problem**: Incorrect definitions
- **Solution**: Check word cleaning logic, verify API response

**Problem**: Memory issues with large books
- **Solution**: Process in chunks, use streaming for very large files

## Code Examples

### Basic Usage
```dart
// Extract vocabulary from a book
final extractionService = WordExtractionService();
final words = await extractionService.extractWordsFromBook(book);

// Enrich with definitions
final vocabularyService = VocabularyService();
await vocabularyService.enrichWords(words, targetLanguage: 'es');
```

### With Progress Tracking
```dart
await vocabularyService.enrichWordsWithProgress(
  words,
  targetLanguage: 'es',
  onProgress: (current, total) {
    setState(() {
      progress = current / total;
    });
  },
);
```

### Get Word Statistics
```dart
final processor = WordProcessor();
final wordMap = processor.processWords(rawWords);
final stats = processor.calculateStats(wordMap);

print('Total words: ${stats.totalWords}');
print('Unique words: ${stats.uniqueWords}');
print('Rare words: ${stats.rareWords}');
```

## API Rate Limits

### Free Dictionary API
- No official rate limit documented
- Recommended: 1 request per 200ms
- Consider implementing caching

### MyMemory Translation API
- Free tier: 1000 words/day
- 10000 chars/day
- Upgrade to pro for unlimited

### Google Translator (unofficial)
- Varies, use with caution
- Consider official Google Cloud Translation API for production

## License & Attribution

### APIs Used
- Free Dictionary API - No attribution required
- MyMemory Translation API - Consider attribution for free tier
- Google Translator - Unofficial, use at own risk

### Packages
- `epub_parser` - MIT License
- `pdfx` - MIT License
- `translator` - MIT License
- `http` - BSD License

## Support

For issues or questions:
1. Check this documentation
2. Review the source code comments
3. Test with sample books from Project Gutenberg
4. Check API status if network issues occur

---

**Last Updated**: January 2026
**Version**: 1.0.0
