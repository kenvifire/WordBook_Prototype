# Bookshelf Feature Documentation

## Overview

The bookshelf feature is now fully implemented with book upload, management, and display capabilities. Users can upload books in various formats, view them in grid or list layouts, and manage their reading library.

## Features Implemented

### 1. Book Upload
- **File picker integration**: Users can select files from their device
- **Supported formats**: TXT, PDF, EPUB, MOBI
- **Automatic parsing**: Books are automatically parsed when uploaded
- **Local storage**: Books are stored in the app's documents directory
- **Progress indication**: Loading indicators during upload

### 2. Book Display
- **Grid View**: 2-column grid layout with book cards
- **List View**: Detailed list layout with book tiles
- **Toggle view modes**: Users can switch between grid and list views
- **Pull to refresh**: Refresh the book list by pulling down

### 3. Book Cards (Grid View)
- **Color-coded covers**: Different colors based on format
  - PDF: Red
  - EPUB: Blue
  - TXT: Green
  - MOBI: Orange
- **Status badges**: Visual indicators for reading status
  - "Reading" badge for in-progress books
  - Checkmark for completed books
- **Progress bar**: Visual reading progress indicator
- **Page count display**: Shows current page and total pages

### 4. Book List Tiles (List View)
- **Detailed information**: Title, author, format, progress
- **Horizontal progress bar**: Easy-to-read progress indicator
- **Status indicators**: Same as grid view
- **Format badge**: Shows file format

### 5. Book Detail Screen
- **Full book information**: All metadata displayed
- **Large cover display**: Color-coded gradient cover
- **Detailed metrics**:
  - Format
  - Total pages
  - Current page
  - Status
  - Last read date
- **Action buttons**:
  - Start/Continue reading
  - Delete book
- **Reading progress**: Percentage and visual indicator

### 6. Book Management
- **Long press options**: Quick actions via bottom sheet
  - View details
  - Start reading
  - Delete
- **Delete confirmation**: Dialog to prevent accidental deletion
- **File cleanup**: Removes both database entry and local file

### 7. Empty State
- **Welcoming message**: Clear instructions for new users
- **Upload button**: Prominent call-to-action
- **Format information**: Lists supported formats

### 8. App Bar Actions
- **Add book**: Quick access to upload
- **View toggle**: Switch between grid and list
- **Menu**: Settings and sign out options

## File Structure

```
lib/
├── models/
│   └── book.dart                    # Book model with Isar
├── providers/
│   ├── book_provider.dart           # Basic book providers
│   └── books_state_provider.dart    # Bookshelf state management
├── repositories/
│   └── book_repository.dart         # Book data operations
├── services/
│   └── book/
│       └── book_service.dart        # Book parsing logic
├── screens/
│   └── bookshelf/
│       ├── bookshelf_screen.dart    # Main bookshelf UI
│       └── book_detail_screen.dart  # Book details view
└── widgets/
    └── common/
        ├── book_card.dart           # Grid view card
        └── book_list_tile.dart      # List view tile
```

## State Management

### BooksState
```dart
class BooksState {
  final List<Book> books;
  final bool isLoading;
  final bool isUploading;
  final String? error;
  final ViewMode viewMode;
}
```

### Available Actions
- `loadBooks()`: Fetch all books from database
- `uploadBook()`: Pick and upload a new book
- `deleteBook(bookId)`: Remove a book
- `toggleViewMode()`: Switch between grid and list
- `clearError()`: Dismiss error messages

## Book Parsing

### TXT Files
- Split into pages (30 lines per page)
- Simple line-based parsing
- Fast and reliable

### PDF Files
- Page count detection
- Placeholder text (text extraction requires additional setup)
- Note: Full PDF text extraction needs native libraries

### EPUB Files
- Chapter-based parsing
- HTML content extraction
- Metadata extraction (title, author)

### MOBI Files
- Not yet implemented
- Shows error message
- Recommendation: Convert to EPUB

## User Flow

### Adding a Book
1. User taps the "+" button or "Upload Book"
2. System shows file picker with format filter
3. User selects a book file
4. App shows loading indicator
5. Book is parsed and saved
6. Bookshelf refreshes automatically
7. New book appears in the list

### Viewing Book Details
1. User taps on a book card/tile
2. Detail screen opens with full information
3. User can:
   - Start/continue reading
   - Delete the book
   - View reading statistics

### Deleting a Book
1. User long-presses a book OR taps delete in details
2. Options menu/dialog appears
3. User confirms deletion
4. Book file and database entry are removed
5. Bookshelf refreshes

## Error Handling

### Upload Errors
- File access denied
- Unsupported format
- Parse failures
- Storage issues

All errors are displayed via SnackBar with dismiss action.

### Offline Support
- All books stored locally
- No internet required for reading
- Database syncs automatically

## Testing

### To Test Bookshelf
1. Configure Firebase (see SETUP.md)
2. Run the app: `flutter run`
3. Sign in with any method
4. Upload test books in different formats
5. Test both view modes
6. Test book deletion
7. Test empty state
8. Test error handling (try uploading non-book files)

### Test Files Needed
- Sample TXT file
- Sample PDF file
- Sample EPUB file
- (MOBI optional - not supported yet)

## Known Limitations

1. **PDF Text Extraction**: Currently shows placeholder text. Requires additional configuration for full text extraction.

2. **MOBI Support**: Not implemented. Conversion to EPUB required.

3. **Cover Images**: Auto-generated color-coded covers. Custom cover extraction not yet implemented.

4. **Cloud Sync**: Books stored locally only. Firebase sync can be added later.

## Future Enhancements

- [ ] PDF text extraction with native libraries
- [ ] MOBI format support
- [ ] Cover image extraction from EPUB
- [ ] Custom cover image upload
- [ ] Cloud storage and sync
- [ ] Book sharing
- [ ] Search and filter
- [ ] Categories and tags
- [ ] Sort options (title, author, date added, etc.)
- [ ] Book metadata editing
- [ ] Import from URL
- [ ] Bulk operations
