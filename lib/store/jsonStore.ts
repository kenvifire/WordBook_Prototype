import fs from 'node:fs';
import path from 'node:path';

export function dataPath(...segments: string[]): string {
  const baseDir = process.env.WORDBOOK_DATA_DIR ?? 'data/runtime';
  return path.join(baseDir, ...segments);
}

export function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

export function writeJson<T>(filePath: string, data: T): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
