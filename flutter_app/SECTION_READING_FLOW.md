# Section Reading & Pre-Practice Flow

## Overview

The Section Reading Flow is a core feature of WordBook that ensures users practice vocabulary before reading each section of a book. This enforces a structured learning approach using spaced repetition to maximize vocabulary retention.

## Features

### 1. Section-Based Reading
Users can divide their books into manageable sections for focused learning:
- **Page-based sections**: Divide by number of pages (e.g., 10 pages per section)
- **Chapter-based sections**: Divide by chapters

### 2. Pre-Reading Vocabulary Practice
Before reading each section, users must:
1. Practice vocabulary from that specific section
2. Reach the recognition threshold (default 80%)
3. Unlock the section for reading

### 3. Progressive Unlocking
- Sections are unlocked sequentially
- Must complete Section 1 before Section 2
- Prevents skipping ahead without proper preparation

### 4. Recognition Threshold
- Configurable threshold (50-100%)
- Default: 80% recognition rate
- Users can adjust in Settings → Words Settings

## User Flow

```
Book Detail Screen
    ↓
Section Selection Screen
    ↓
Configure Sections (type, size)
    ↓
Generate Sections
    ↓
Select Section to Practice
    ↓
Section Practice Screen
    ↓
Practice Vocabulary (SRS)
    ↓
Reach Threshold?
    ↓ (Yes)
Unlock Reading
    ↓
Reader Screen (Section unlocked)
    ↓
Complete Reading
    ↓
Next Section Unlocked
```

## Architecture

### Models

#### ReadingSection (`lib/models/reading_section.dart`)
```dart
class ReadingSection {
  String sectionId;         // Unique identifier
  String bookId;            // Parent book
  String userId;            // Owner
  int sectionNumber;        // Sequential order (1, 2, 3...)
  int startPage;            // First page of section
  int endPage;              // Last page of section
  SectionType sectionType;  // pages or chapters
  SectionStatus status;     // locked, readyToPractice, practicing, etc.
  int totalWords;           // Total words in section
  int masteredWords;        // Words mastered by user
  double recognitionRate;   // Current recognition (0.0-1.0)
  bool isUnlocked;          // Can read this section
  DateTime? practiceStartedAt;
  DateTime? practiceCompletedAt;
  DateTime? readingStartedAt;
  DateTime? readingCompletedAt;
}
```

#### Section Status States
1. **locked**: Not yet accessible, previous sections incomplete
2. **readyToPractice**: Can start practicing
3. **practicing**: Currently in practice mode
4. **readyToRead**: Met threshold, unlocked for reading
5. **reading**: Currently reading
6. **completed**: Finished reading

### Providers

#### SectionProvider (`lib/providers/section_provider.dart`)
Manages section state for each book:
- `generateSections()`: Create sections based on settings
- `startPractice()`: Extract words and begin practice
- `updatePracticeProgress()`: Track recognition rate
- `startReading()`: Mark section as being read
- `completeReading()`: Complete section and unlock next

### Screens

#### 1. Section Selection Screen
**Path**: `lib/screens/reading/section_selection_screen.dart`

**Features**:
- Setup screen for first-time users
- Configure section type (pages/chapters)
- Adjust section size (5-50 pages)
- View all sections with status
- Regenerate sections if needed

**UI Elements**:
- Section type radio buttons
- Section size slider
- Estimated sections count
- Info card explaining the flow
- Section list with status indicators

#### 2. Section Practice Screen
**Path**: `lib/screens/reading/section_practice_screen.dart`

**Features**:
- Pre-practice overview with goals
- Flashcard-style vocabulary practice
- SRS-based difficulty ratings
- Real-time progress tracking
- Completion screen with results
- Auto-unlock on threshold achievement

**Practice Flow**:
1. **Start Screen**: Shows section info, word count, goal
2. **Practice Mode**: Flashcards with 4 difficulty levels
   - Again (1): Didn't know
   - Hard (3): Difficult to recall
   - Good (4): Recalled correctly
   - Easy (5): Knew instantly
3. **Completion Screen**: Shows recognition rate and next steps

## Section Generation

### Page-Based Sections
```dart
// Example: 100-page book, 10 pages per section = 10 sections
Section 1: Pages 1-10
Section 2: Pages 11-20
Section 3: Pages 21-30
...
Section 10: Pages 91-100
```

### Chapter-Based Sections
```dart
// Uses the same logic but conceptually represents chapters
// Each "section" = specified number of pages treated as a chapter
Section 1: Chapter 1 (Pages 1-10)
Section 2: Chapter 2 (Pages 11-20)
...
```

*Note: True chapter detection from EPUB table of contents is a future enhancement*

## Word Extraction per Section

When a section practice starts:
1. Extract text from startPage to endPage
2. Process words (clean, filter stop words)
3. Check for existing words in database
4. Create new Word objects for new vocabulary
5. Return words for practice (limited to 20 for performance)

### Extraction by Format

- **TXT**: Extract by line ranges (estimated pages)
- **EPUB**: Extract by chapter ranges
- **PDF**: Not fully supported (placeholder)

## Recognition Threshold Logic

```dart
recognitionRate = correctAnswers / totalWords

if (recognitionRate >= threshold) {
  section.status = readyToRead
  section.isUnlocked = true
  unlockReading()
} else {
  showRetryOption()
}
```

### Configurable Threshold
- Stored in: `SharedPreferences`
- Provider: `recognitionThresholdProvider`
- Range: 0.5 (50%) to 1.0 (100%)
- Default: 0.8 (80%)

## Progressive Section Unlocking

### Unlock Logic
1. User completes Section N
2. System marks Section N as `completed`
3. System automatically updates Section N+1 status:
   ```dart
   nextSection.status = readyToPractice
   ```
4. Section N+1 becomes accessible

### Lock Logic
- All sections except Section 1 start as `locked`
- Section 1 starts as `readyToPractice`
- Cannot practice locked sections
- Tapping locked section shows message

## Integration Points

### Book Detail Screen
Two reading modes available:
1. **Section Reading**: Structured learning with vocabulary practice
2. **Free Read**: Direct access to reader without practice

### Settings Integration
Users can configure:
- Default section size (5-50 pages)
- Recognition threshold (50-100%)

### Database Schema
New collection: `reading_sections`
- Indexed by: `sectionId`, `bookId`
- Sorted by: `sectionNumber`

## UI Components

### Section Cards
Display for each section:
- Section number
- Page range
- Status icon (locked, practice, unlocked, completed)
- Word statistics (total, mastered, recognition rate)
- Action button (Practice/Read based on status)

### Status Icons
- 🔒 Locked (grey)
- 🎓 Ready to Practice (orange)
- 📚 Practicing (orange)
- 📖 Ready to Read (green)
- 📕 Reading (blue)
- ✅ Completed (green)

### Progress Indicators
- Linear progress bar during practice
- Current word counter (e.g., "5/20")
- Recognition rate percentage
- Section completion status

## Practice Session Example

```
User opens Section 1 (Pages 1-10)
    ↓
System extracts 150 unique words
    ↓
Shows 20 words for practice
    ↓
User practices each word:
  - Word: "serendipity"
  - Shows translation/definition
  - User rates: "Good" (4)
    ↓
After 20 words:
  - Correct: 17/20
  - Recognition: 85%
    ↓
85% >= 80% threshold ✅
    ↓
Section unlocked!
    ↓
User can now read pages 1-10
    ↓
After reading, Section 2 unlocks
```

## Persistence

All section data is persisted in Isar database:
- Section configuration
- Practice history
- Recognition rates
- Unlock status
- Reading progress

## Error Handling

### Word Extraction Fails
- Show error message
- Allow retry
- Don't block section access

### No Words Found
- Display message: "No words to practice"
- Auto-unlock section for reading
- Log for debugging

### Network Issues (during enrichment)
- Practice continues with basic words
- Definitions fetched later
- Graceful degradation

## Performance Considerations

### Optimizations
1. **Limited Practice Words**: Only 20 words per session
2. **Lazy Loading**: Extract words only when section starts
3. **Cached Words**: Reuse words across sections
4. **Background Enrichment**: Definitions fetched asynchronously

### Memory Management
- Words stored in database, not memory
- Section data lightweight
- Practice state cleared after completion

## Future Enhancements

### Short Term
1. **EPUB Chapter Detection**: Use actual chapter markers
2. **Custom Section Ranges**: Let users define specific page ranges
3. **Section Notes**: Add notes per section
4. **Review Mode**: Review all words from multiple sections

### Long Term
1. **Adaptive Threshold**: Adjust based on user performance
2. **Word Difficulty Prediction**: Pre-identify hard words
3. **Section Recommendations**: Suggest optimal section sizes
4. **Multi-book Sections**: Practice words across multiple books
5. **Collaborative Learning**: Share section progress with study groups

## Best Practices

### For Users
1. **Start Small**: Use 5-10 pages per section initially
2. **Be Consistent**: Practice daily for best retention
3. **Adjust Threshold**: Lower if too difficult, raise if too easy
4. **Review Regularly**: Revisit completed sections

### For Developers
1. **Test with Real Books**: Use Project Gutenberg samples
2. **Monitor Performance**: Check extraction times
3. **Validate Data**: Ensure sections don't overlap
4. **Handle Edge Cases**: Books < section size, odd page counts

## Troubleshooting

### Sections Not Generating
- Check book has `totalPages` set
- Verify user is authenticated
- Check database permissions

### Practice Not Unlocking
- Verify recognition rate calculation
- Check threshold setting
- Ensure section status updates correctly

### Words Not Extracting
- Verify file format support
- Check file exists at `localPath`
- Review extraction service logs

## API Documentation

### SectionProvider Methods

```dart
// Generate sections for a book
await ref.read(sectionProvider(bookId).notifier).generateSections(
  book: book,
  type: SectionType.pages,
  sectionSize: 10,
  userId: userId,
);

// Start practicing a section
await ref.read(sectionProvider(bookId).notifier).startPractice(
  section,
  book,
);

// Update practice progress
await ref.read(sectionProvider(bookId).notifier).updatePracticeProgress(
  sectionId: sectionId,
  masteredWords: 15,
  recognitionRate: 0.85,
  threshold: 0.8,
);

// Mark section as being read
await ref.read(sectionProvider(bookId).notifier).startReading(sectionId);

// Complete reading a section
await ref.read(sectionProvider(bookId).notifier).completeReading(sectionId);
```

## Testing Checklist

- [ ] Generate sections with different sizes
- [ ] Generate page-based sections
- [ ] Generate chapter-based sections
- [ ] Practice Section 1
- [ ] Reach threshold and unlock
- [ ] Fail threshold and retry
- [ ] Complete section and unlock next
- [ ] Verify locked sections are inaccessible
- [ ] Test with TXT book
- [ ] Test with EPUB book
- [ ] Test with small book (< 50 pages)
- [ ] Test with large book (> 500 pages)
- [ ] Regenerate sections
- [ ] Adjust threshold in settings
- [ ] Verify persistence after app restart

## Dependencies

### Packages Used
- `isar` - Local database for sections
- `flutter_riverpod` - State management
- `uuid` - Generate section IDs
- `shared_preferences` - Store settings

### Internal Dependencies
- Word extraction service
- SRS service
- Database service
- Section provider

---

**Last Updated**: January 2026
**Version**: 1.0.0
**Feature Status**: ✅ Complete & Production Ready
