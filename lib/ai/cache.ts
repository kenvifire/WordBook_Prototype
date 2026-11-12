import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { dataPath, readJson, writeJson } from '../store/jsonStore';

export interface WithCacheOptions {
  cacheDir?: string;
}

function cacheFilePath(key: string, cacheDir: string): string {
  const hash = createHash('sha1').update(key).digest('hex');
  return path.join(cacheDir, `${hash}.json`);
}

export async function withCache<T>(
  key: string,
  compute: () => Promise<T>,
  opts?: WithCacheOptions,
): Promise<T> {
  const cacheDir = opts?.cacheDir ?? dataPath('ai-cache');
  const filePath = cacheFilePath(key, cacheDir);

  if (fs.existsSync(filePath)) {
    return readJson<T>(filePath, undefined as unknown as T);
  }

  const result = await compute();
  writeJson(filePath, result);
  return result;
}
