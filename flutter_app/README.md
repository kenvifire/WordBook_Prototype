# WordBook - Language Learning Ebook Reader

A cross-platform mobile and desktop application that helps users acquire their secondary language by reading books of their choice. WordBook combines an ebook reader with an intelligent vocabulary learning system powered by spaced repetition.

## Features

### Authentication
- Email/Password authentication
- Google Sign-In
- Facebook Login
- Apple Sign-In
- Password reset functionality

### Ebook Reader
- Support for multiple formats: TXT, PDF, EPUB, and MOBI
- Customizable reading experience:
  - Adjustable font size
  - Multiple font families
  - Dark mode / Light mode
- Book management:
  - Upload from local files
  - Organized bookshelf sorted by recent reads
  - Add and remove books easily

### Vocabulary Learning
- **Section-based learning**: Set reading sections by pages or chapters
- **Pre-reading practice**: Practice words before reading each section
- **Spaced Repetition System (SRS)**: SuperMemo-2 algorithm for long-term memory
- **Recognition threshold**: Customizable (default 80%) to proceed to reading
- **Dual extraction methods**:
  - Automatic word extraction from book sections
  - Manual word selection while reading
- **Definitions & Translations**: Automatic word definitions and translations to native language

### Settings
- **Profile**: Manage name and email
- **Preferences**: Configure fonts and themes
- **Word Settings**: Adjust section size and recognition threshold

### Statistics
- Track reading progress per book
- Monitor words learned and mastered
- View vocabulary progress across all books
- Practice by book selection

## Tech Stack

### Frontend
- **Flutter 3.7+**: Cross-platform framework
- **flutter_riverpod**: State management
- **Material 3**: Modern UI design

### Backend & Services
- **Firebase Authentication**: User authentication
- **Cloud Firestore**: Cloud data storage
- **Firebase Storage**: File storage

### Local Storage
- **Isar Database**: Fast local database for offline support
- **Shared Preferences**: User preferences

### Libraries
- **pdfx**: PDF file parsing
- **epub_parser**: EPUB file parsing
- **translator**: Translation services
- **google_fonts**: Font customization
- **file_picker**: File selection

## Architecture

### Project Structure

```
lib/
├── core/
│   ├── constants/       # App constants and configuration
│   ├── theme/           # Theme configuration
│   └── utils/           # Utility functions
├── models/              # Data models (Isar)
│   ├── book.dart
│   ├── word.dart
│   ├── user.dart
│   ├── reading_progress.dart
│   └── statistics.dart
├── providers/           # Riverpod providers
│   ├── auth_provider.dart
│   ├── book_provider.dart
│   └── theme_provider.dart
├── repositories/        # Data layer abstraction
│   ├── book_repository.dart
│   ├── word_repository.dart
│   └── user_repository.dart
├── services/            # Business logic
│   ├── auth/
│   ├── book/
│   ├── vocabulary/
│   └── srs/
├── screens/             # UI screens
│   ├── auth/
│   ├── bookshelf/
│   ├── reader/
│   ├── vocabulary/
│   ├── settings/
│   └── statistics/
├── widgets/             # Reusable widgets
└── main.dart            # Entry point
```

### Key Components

#### Spaced Repetition System (SRS)
Implements the SuperMemo-2 algorithm for optimal vocabulary retention:
- Calculates next review dates based on performance
- Adjusts difficulty factor dynamically
- Tracks word status: new, learning, reviewing, mastered

#### Book Service
Handles multiple ebook formats:
- TXT: Simple text parsing with pagination
- PDF: Uses pdfx for text extraction
- EPUB: HTML content extraction and parsing
- MOBI: Requires conversion to EPUB

#### Vocabulary Service
- Automatic word extraction using regex
- Integration with translation APIs
- Batch processing for efficiency
- Caching for offline use

## Platform Support

- ✅ iOS
- ✅ Android
- ✅ Web
- ✅ macOS
- ✅ Windows
- ✅ Linux

## Setup

See [SETUP.md](SETUP.md) for detailed setup instructions.

Quick start:

```bash
# Install dependencies
cd wordbook
flutter pub get

# Generate Isar code
dart run build_runner build

# Configure Firebase
flutterfire configure

# Run the app
flutter run
```

## Development

### Running Tests

```bash
flutter test
```

### Code Generation

```bash
dart run build_runner build --delete-conflicting-outputs
```

### Linting

```bash
flutter analyze
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- SuperMemo-2 algorithm for spaced repetition
- Flutter and Dart teams
- Firebase
- All open-source package contributors
