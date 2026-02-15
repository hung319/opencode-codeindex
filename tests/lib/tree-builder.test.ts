import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildTree, DEFAULT_SKIP_NAMES } from '../../src/lib/tree-builder';

async function withTempDir(fn: (_dir: string) => Promise<void>): Promise<void> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeindex-tree-'));
  try {
    await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

describe('buildTree', () => {
  it('walks directories, tracks depth, and skips defaults', async () => {
    await withTempDir(async (dir) => {
      await fs.writeFile(path.join(dir, 'root.txt'), 'root');
      await fs.mkdir(path.join(dir, 'subdir'));
      await fs.writeFile(path.join(dir, 'subdir', 'child.txt'), 'child');
      await fs.mkdir(path.join(dir, 'node_modules'));
      await fs.writeFile(path.join(dir, 'node_modules', 'skip.txt'), 'skip');

      const tree = await buildTree(dir);
      const names = (tree.children ?? []).map((node) => node.name);

      expect(names).toContain('root.txt');
      expect(names).toContain('subdir');
      for (const skipName of DEFAULT_SKIP_NAMES) {
        expect(names).not.toContain(skipName);
      }

      const rootFile = tree.children?.find((node) => node.name === 'root.txt');
      expect(rootFile?.depth).toBe(0);

      const subdir = tree.children?.find((node) => node.name === 'subdir');
      expect(subdir?.depth).toBe(0);
      expect(subdir?.children?.[0]?.depth).toBe(1);
    });
  });

  it('respects .gitignore patterns', async () => {
    await withTempDir(async (dir) => {
      await fs.writeFile(path.join(dir, '.gitignore'), 'ignored.txt\n');
      await fs.writeFile(path.join(dir, 'ignored.txt'), 'skip me');
      await fs.writeFile(path.join(dir, 'visible.txt'), 'keep me');

      const tree = await buildTree(dir);
      const names = (tree.children ?? []).map((node) => node.name);

      expect(names).toContain('visible.txt');
      expect(names).not.toContain('ignored.txt');
    });
  });
});
