export function buildWordId(userId: string, language: string, word: string): string {
  return `${userId}_${language}_${word}`;
}
