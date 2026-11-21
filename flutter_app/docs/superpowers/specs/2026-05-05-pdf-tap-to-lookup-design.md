# PDF Reader — Tap-to-Lookup & Search

## Problem
The PDF reader renders pages as flat JPEG images via `pdfx`. There is no text interaction layer, so users cannot tap on words to see definitions. Search and bookmarks show "Coming soon!" snackbars.

## Solution
Build an invisible word-level tap overlay on top of the PDF image layer, using Syncfusion's `PdfTextExtractor.extractTextLines()` to get word positions.

### Architecture
- **Layer 1**: PdfView (pdfx) — renders PDF pages as 2x JPEG images via PhotoViewGallery
- **Layer 2**: WordTapOverlay (NEW) — invisible GestureDetector per word, position-mapped from Syncfusion text bounds
- **Layer 3**: WordLookupSheet (exists) — dictionary bottom sheet with definition, translation, save

### Coordinate Mapping
PDF text bounds (1/72 inch) → screen pixels, accounting for pdfx 2x rendering and PhotoView zoom/scroll:
```
screenX = (textBounds.x / pdfPageWidth) * renderedImageWidth * photoViewScale
screenY = (textBounds.y / pdfPageHeight) * renderedImageHeight * photoViewScale
```

### Data Flow
1. `PdfView.onPageChanged` fires → extract words for that page via `PdfTextPositionService`
2. `WordTapOverlay` rebuilds with positioned tappable rects for each word
3. User taps a word → `onWordTapped(word)` fires
4. `WordLookupSheet.show(context, word, book)` opens dictionary bottom sheet

### Components
| File | Action | Purpose |
|---|---|---|
| `lib/services/vocabulary/pdf_text_position_service.dart` | NEW | Extracts word positions via Syncfusion |
| `lib/widgets/reader/word_tap_overlay.dart` | NEW | Invisible tappable word overlay |
| `lib/widgets/reader/reader_search_dialog.dart` | NEW | Full-text search with results navigation |
| `lib/screens/reader/pdf_reader.dart` | MODIFY | Integrate overlay, wire up dictionary & search |
| `lib/widgets/common/word_lookup_sheet.dart` | REUSE | Existing dictionary sheet — connect |

### Fallback
If Syncfusion returns no/empty text positions (scanned PDFs), overlay silently degrades. Reader shows a hint: "Text selection via long-press" as Approach B fallback.

### Out of scope (this iteration)
- Bookmarks (separate feature)
- EPUB/TXT tap-to-lookup (separate feature, different text rendering)
- Multi-word selection
