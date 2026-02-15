import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readFileContent } from '../../src/lib/file-reader';

async function withTempDir(fn: (_dir: string) => Promise<void>): Promise<void> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeindex-file-'));
  try {
    await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

describe('readFileContent', () => {
  it('reads text files', async () => {
    await withTempDir(async (dir) => {
      const filePath = path.join(dir, 'note.txt');
      await fs.writeFile(filePath, 'hello');

      const result = await readFileContent(filePath, 100_000);
      expect(result.content).toBe('hello');
      expect(result.error).toBeUndefined();
    });
  });

  it('detects binary files', async () => {
    await withTempDir(async (dir) => {
      const filePath = path.join(dir, 'bin.dat');
      await fs.writeFile(filePath, Buffer.from([0, 1, 2, 3]));

      const result = await readFileContent(filePath, 100_000);
      expect(result.content).toContain('Binary file');
      expect(result.error).toBe('Binary file');
    });
  });

  it('enforces size limits', async () => {
    await withTempDir(async (dir) => {
      const filePath = path.join(dir, 'big.txt');
      await fs.writeFile(filePath, 'a'.repeat(1024));

      const result = await readFileContent(filePath, 10);
      expect(result.content).toContain('File too large');
      expect(result.error).toBe('File too large');
    });
  });
});
