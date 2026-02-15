import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { indexDirectory } from '../src/index';

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeindex-tool-'));
  try {
    await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

describe('indexDirectory', () => {
  it('includes root file content and renders subdirectories as structure only', async () => {
    await withTempDir(async (dir) => {
      await fs.writeFile(path.join(dir, 'root.txt'), 'root content');
      await fs.mkdir(path.join(dir, 'sub'));
      await fs.writeFile(path.join(dir, 'sub', 'nested.txt'), 'nested content');

      const output = await indexDirectory({ path: dir, maxFileSize: 100_000 });

      expect(output).toContain('root.txt');
      expect(output).toContain('root content');
      expect(output).toContain('sub/');
      expect(output).not.toContain('### nested.txt');
    });
  });
});
