/// Unicode character ranges and tokenization strategy for each script family.
enum WritingSystem {
  latin,
  cyrillic,
  cjk,
  japanese,
  hangul,
  arabic,
}

extension WritingSystemScriptRanges on WritingSystem {
  /// Unicode code point ranges for valid characters in this writing system.
  /// Each entry is [start, end] inclusive.
  List<List<int>> get scriptRanges {
    switch (this) {
      case WritingSystem.latin:
        return [
          [0x0041, 0x005A], // A-Z
          [0x0061, 0x007A], // a-z
          [0x00C0, 0x00FF], // Latin-1 Supplement: À-ÿ (all Western European accented chars)
          [0x0100, 0x017F], // Latin Extended-A: Ā-ſ (Polish, Czech, Romanian, Turkish, etc.)
          [0x0180, 0x024F], // Latin Extended-B: ƀ-ɏ
          [0x1E00, 0x1EFF], // Latin Extended Additional: Ḁ-ỿ (Vietnamese)
          [0x2C60, 0x2C7F], // Latin Extended-C
        ];
      case WritingSystem.cyrillic:
        return [
          [0x0400, 0x04FF], // Cyrillic
          [0x0500, 0x052F], // Cyrillic Supplement
        ];
      case WritingSystem.cjk:
        return [
          [0x4E00, 0x9FFF], // CJK Unified Ideographs
          [0x3400, 0x4DBF], // CJK Extension A
          [0xF900, 0xFAFF], // CJK Compatibility Ideographs
        ];
      case WritingSystem.japanese:
        return [
          [0x3040, 0x309F], // Hiragana
          [0x30A0, 0x30FF], // Katakana
          [0x4E00, 0x9FFF], // Kanji (CJK Unified)
          [0x3400, 0x4DBF], // CJK Extension A
          [0x3000, 0x303F], // CJK Symbols and Punctuation (々, 〆, etc.)
        ];
      case WritingSystem.hangul:
        return [
          [0xAC00, 0xD7AF], // Hangul Syllables
          [0x1100, 0x11FF], // Hangul Jamo
          [0x3130, 0x318F], // Hangul Compatibility Jamo
        ];
      case WritingSystem.arabic:
        return [
          [0x0600, 0x06FF], // Arabic
          [0x0750, 0x077F], // Arabic Supplement
          [0x08A0, 0x08FF], // Arabic Extended-A
          [0xFB50, 0xFDFF], // Arabic Presentation Forms-A
          [0xFE70, 0xFEFF], // Arabic Presentation Forms-B
        ];
    }
  }

  /// How raw text is split into candidate word tokens.
  TokenizationStrategy get tokenizationStrategy {
    switch (this) {
      case WritingSystem.latin:
      case WritingSystem.cyrillic:
      case WritingSystem.arabic:
      case WritingSystem.hangul:
        return TokenizationStrategy.whitespace;
      case WritingSystem.cjk:
        return TokenizationStrategy.character;
      case WritingSystem.japanese:
        return TokenizationStrategy.scriptBlockGrouping;
    }
  }

  /// Default minimum word length for this writing system.
  int get defaultMinLength {
    switch (this) {
      case WritingSystem.latin:
      case WritingSystem.cyrillic:
        return 3;
      case WritingSystem.japanese:
      case WritingSystem.cjk:
        return 1;
      case WritingSystem.hangul:
      case WritingSystem.arabic:
        return 2;
    }
  }
}

enum TokenizationStrategy {
  /// Split on whitespace runs. Used by Latin, Cyrillic, Arabic, Hangul.
  whitespace,

  /// Each Unicode character is a candidate word. Used by Chinese (zh).
  character,

  /// Group consecutive same-script characters into one token.
  /// Used by Japanese. e.g., "私は学生" → ["私", "は", "学生"]
  scriptBlockGrouping,
}

extension WritingSystemScriptCheck on WritingSystem {
  /// Returns true if [char] is in any of this writing system's script ranges.
  bool isInScript(String char) {
    if (char.isEmpty) return false;
    final cp = char.codeUnitAt(0);
    for (final range in scriptRanges) {
      if (cp >= range[0] && cp <= range[1]) return true;
    }
    return false;
  }
}
