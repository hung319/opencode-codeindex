# OpenCode CodeIndex Plugin Implementation Plan

**Goal:** Build the opencode-codeindex plugin that indexes a directory with root-level file contents and subdirectory structure only.

**Architecture:** Use the OpenCode plugin template structure with a command loader in `src/index.ts`, a TreeIndexer tool that orchestrates TreeBuilder/FileReader/OutputFormatter, and a markdown `/index` command in `src/commands/index.md`. Utilities live in `src/lib/` with isolated unit tests, and the tool returns a markdown report matching the design format.

**Design:** `thoughts/shared/designs/2026-02-14-codeindex-plugin-design.md`

---

## Dependency Graph

```
Batch 1 (parallel): 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8 [foundation - no deps]
Batch 2 (parallel): 2.1, 2.2, 2.3 [core utilities - depends on batch 1]
Batch 3 (parallel): 3.1, 3.2 [tool + command - depends on batch 2]
```

---

## Batch 1: Foundation (parallel - 8 implementers)

All tasks in this batch have NO dependencies and run simultaneously.

### Task 1.1: Package manifest
**File:** `package.json`
**Test:** none
**Depends:** none

```json
{
  "name": "opencode-codeindex",
  "version": "0.1.0",
  "description": "OpenCode plugin that indexes directories with root file contents.",
  "author": {
    "name": "OpenCode",
    "email": "dev@opencode.ai"
  },
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/opencode-codeindex"
  },
  "publishConfig": {
    "access": "public",
    "provenance": true
  },
  "files": [
    "dist",
    "src/version.ts",
    "src/commands"
  ],
  "scripts": {
    "build": "bunx tsc -p tsconfig.build.json",
    "test": "vitest run",
    "lint": "bunx eslint .",
    "lint:fix": "bunx eslint . --fix",
    "format": "bunx prettier -w .",
    "typecheck": "bunx tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@opencode-ai/plugin": "1.0.85",
    "ignore": "^5.3.2",
    "is-binary-path": "^2.1.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@types/node": "^20.11.5",
    "@typescript-eslint/eslint-plugin": "8.47.0",
    "@typescript-eslint/parser": "8.47.0",
    "bun-types": "latest",
    "eslint": "^9.39.1",
    "eslint-config-prettier": "10.1.8",
    "eslint-plugin-prettier": "^5.1.3",
    "prettier": "^3.2.4",
    "typescript-eslint": "^8.47.0",
    "vitest": "^3.2.4"
  }
}
```

**Verify:** `bun install`
**Commit:** `chore(plugin): add package manifest`

### Task 1.2: Base TypeScript config
**File:** `tsconfig.json`
**Test:** none
**Depends:** none

```json
{
  "compilerOptions": {
    "lib": ["ESNext", "DOM"],
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "types": ["bun-types"]
  }
}
```

**Verify:** `bun run typecheck`
**Commit:** `chore(ts): add base tsconfig`

### Task 1.3: Build TypeScript config
**File:** `tsconfig.build.json`
**Test:** none
**Depends:** none

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noEmit": false
  },
  "include": ["src/**/*.ts"]
}
```

**Verify:** `bun run build`
**Commit:** `chore(ts): add build tsconfig`

### Task 1.4: Mise toolchain file
**File:** `mise.toml`
**Test:** none
**Depends:** none

```toml
[tools]
bun = "1.3.2"
npm = "11.6.3"
pkl = "0.27.2"
semver = "3.4.0"
usage = "2.8.0"
hk = "1.26.0"

[env]
_.path = [
    "{{config_root}}/node_modules/.bin",
]
```

**Verify:** `mise trust && mise install`
**Commit:** `chore(tooling): add mise toolchain`

### Task 1.5: Vitest config
**File:** `vitest.config.ts`
**Test:** none
**Depends:** none

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    reporters: 'default',
  },
});
```

**Verify:** `bun run test`
**Commit:** `chore(test): add vitest config`

### Task 1.6: ESLint config
**File:** `eslint.config.js`
**Test:** none
**Depends:** none

```javascript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier/flat';
import eslintPluginPrettier from 'eslint-plugin-prettier';

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', '*.config.js'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        Bun: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      prettier: eslintPluginPrettier,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...prettier.rules,
      'prettier/prettier': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'error',
    },
  }
);
```

**Verify:** `bun run lint`
**Commit:** `chore(lint): add eslint config`

### Task 1.7: Prettier config
**File:** `.prettierrc`
**Test:** none
**Depends:** none

```json
{
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "arrowParens": "always"
}
```

**Verify:** `bun run format -- --check`
**Commit:** `chore(format): add prettier config`

### Task 1.8: Version module
**File:** `src/version.ts`
**Test:** `tests/version.test.ts`
**Depends:** none

```typescript
import { describe, expect, it } from 'vitest';
import { VERSION } from '../src/version';

describe('VERSION', () => {
  it('exports a semantic version string', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
```

```typescript
export const VERSION = '0.1.0';
```

**Verify:** `bun run test tests/version.test.ts`
**Commit:** `chore(version): add version export`

---

## Batch 2: Core Utilities (parallel - 3 implementers)

All tasks in this batch depend on Batch 1 completing.

### Task 2.1: TreeBuilder utility
**File:** `src/lib/tree-builder.ts`
**Test:** `tests/lib/tree-builder.test.ts`
**Depends:** 1.1, 1.2

```typescript
import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildTree, DEFAULT_SKIP_NAMES } from '../../src/lib/tree-builder';

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
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
```

```typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import ignore, { type Ignore } from 'ignore';

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  depth: number;
  children?: TreeNode[];
  content?: string;
  size?: number;
  error?: string;
}

export interface TreeBuilderOptions {
  skipNames?: string[];
  skipExtensions?: string[];
  respectGitignore?: boolean;
}

export const DEFAULT_SKIP_NAMES = new Set([
  '.git',
  'node_modules',
  '.opencode',
  'dist',
  'build',
]);

const DEFAULT_SKIP_EXTENSIONS = new Set(['.log']);

function normalizeGitignorePath(relativePath: string): string {
  return relativePath.split(path.sep).join('/');
}

function formatError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code?: string }).code ?? '');
    if (code === 'EACCES' || code === 'EPERM') return 'Permission denied';
    if (code === 'ENOENT') return 'Path not found';
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

async function loadGitignore(rootPath: string, enabled: boolean): Promise<Ignore | null> {
  if (!enabled) return null;
  const gitignorePath = path.join(rootPath, '.gitignore');
  try {
    const content = await fs.readFile(gitignorePath, 'utf8');
    return ignore().add(content);
  } catch {
    return null;
  }
}

function shouldSkip(
  name: string,
  skipNames: Set<string>,
  skipExtensions: Set<string>
): boolean {
  if (skipNames.has(name)) return true;
  for (const ext of skipExtensions) {
    if (name.endsWith(ext)) return true;
  }
  return false;
}

async function walkDirectory(
  absolutePath: string,
  relativePath: string,
  depth: number,
  ignoreRules: Ignore | null,
  skipNames: Set<string>,
  skipExtensions: Set<string>,
  visited: Set<string>
): Promise<TreeNode[]> {
  let entries: fs.Dirent[] = [];
  try {
    entries = await fs.readdir(absolutePath, { withFileTypes: true });
  } catch (err) {
    return [
      {
        name: path.basename(absolutePath),
        path: absolutePath,
        type: 'directory',
        depth,
        error: formatError(err, 'Read error'),
      },
    ];
  }

  const nodes: TreeNode[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (shouldSkip(entry.name, skipNames, skipExtensions)) continue;

    const entryPath = path.join(absolutePath, entry.name);
    const entryRelative = normalizeGitignorePath(path.join(relativePath, entry.name));
    if (ignoreRules?.ignores(entryRelative)) continue;

    try {
      const stat = await fs.lstat(entryPath);

      if (stat.isSymbolicLink()) {
        const resolved = await fs.realpath(entryPath);
        const resolvedStat = await fs.stat(entryPath);
        if (resolvedStat.isDirectory()) {
          if (visited.has(resolved)) {
            nodes.push({
              name: entry.name,
              path: entryPath,
              type: 'directory',
              depth,
              error: 'Circular reference',
            });
            continue;
          }
          visited.add(resolved);
        }
      }

      if (stat.isDirectory()) {
        const children = await walkDirectory(
          entryPath,
          entryRelative,
          depth + 1,
          ignoreRules,
          skipNames,
          skipExtensions,
          visited
        );
        nodes.push({
          name: entry.name,
          path: entryPath,
          type: 'directory',
          depth,
          children,
        });
      } else {
        nodes.push({
          name: entry.name,
          path: entryPath,
          type: 'file',
          depth,
          size: stat.size,
        });
      }
    } catch (err) {
      nodes.push({
        name: entry.name,
        path: entryPath,
        type: entry.isDirectory() ? 'directory' : 'file',
        depth,
        error: formatError(err, 'Read error'),
      });
    }
  }

  return nodes;
}

export async function buildTree(
  rootPath: string,
  options: TreeBuilderOptions = {}
): Promise<TreeNode> {
  const resolvedRoot = path.resolve(rootPath);
  const stat = await fs.stat(resolvedRoot);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${resolvedRoot}`);
  }

  const ignoreRules = await loadGitignore(resolvedRoot, options.respectGitignore !== false);
  const skipNames = new Set(options.skipNames ?? Array.from(DEFAULT_SKIP_NAMES));
  const skipExtensions = new Set(options.skipExtensions ?? Array.from(DEFAULT_SKIP_EXTENSIONS));
  const visited = new Set<string>([resolvedRoot]);

  const children = await walkDirectory(
    resolvedRoot,
    '',
    0,
    ignoreRules,
    skipNames,
    skipExtensions,
    visited
  );

  return {
    name: path.basename(resolvedRoot) || resolvedRoot,
    path: resolvedRoot,
    type: 'directory',
    depth: -1,
    children,
  };
}
```

**Verify:** `bun run test tests/lib/tree-builder.test.ts`
**Commit:** `feat(tree): add TreeBuilder utility`

### Task 2.2: FileReader utility
**File:** `src/lib/file-reader.ts`
**Test:** `tests/lib/file-reader.test.ts`
**Depends:** 1.1, 1.2

```typescript
import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readFileContent } from '../../src/lib/file-reader';

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
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
```

```typescript
import fs from 'node:fs/promises';
import isBinaryPath from 'is-binary-path';

export interface FileReadResult {
  content: string;
  size: number;
  error?: string;
}

const DEFAULT_MAX_FILE_SIZE = 100 * 1024;
const PROBE_LENGTH = 8000;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function readProbe(filePath: string): Promise<Buffer> {
  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(PROBE_LENGTH);
    const { bytesRead } = await handle.read(buffer, 0, PROBE_LENGTH, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

function isBinaryBuffer(buffer: Buffer): boolean {
  return buffer.includes(0);
}

function formatError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code?: string }).code ?? '');
    if (code === 'EACCES' || code === 'EPERM') return 'Permission denied';
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export async function readFileContent(
  filePath: string,
  maxFileSize: number = DEFAULT_MAX_FILE_SIZE
): Promise<FileReadResult> {
  try {
    const stat = await fs.stat(filePath);
    const size = stat.size;

    if (size > maxFileSize) {
      return {
        size,
        content: `[File too large: ${formatSize(size)}]`,
        error: 'File too large',
      };
    }

    const probe = await readProbe(filePath);
    if (isBinaryPath(filePath) || isBinaryBuffer(probe)) {
      return { size, content: '[Binary file]', error: 'Binary file' };
    }

    const content = await fs.readFile(filePath, 'utf8');
    return { size, content };
  } catch (err) {
    return {
      size: 0,
      content: `[${formatError(err, 'Read error')}]`,
      error: formatError(err, 'Read error'),
    };
  }
}
```

**Verify:** `bun run test tests/lib/file-reader.test.ts`
**Commit:** `feat(file): add FileReader utility`

### Task 2.3: OutputFormatter utility
**File:** `src/lib/output-formatter.ts`
**Test:** `tests/lib/output-formatter.test.ts`
**Depends:** 2.1

```typescript
import { describe, expect, it } from 'vitest';
import type { TreeNode } from '../../src/lib/tree-builder';
import { formatOutput } from '../../src/lib/output-formatter';

const tree: TreeNode = {
  name: 'root',
  path: '/tmp/root',
  type: 'directory',
  depth: -1,
  children: [
    {
      name: 'README.md',
      path: '/tmp/root/README.md',
      type: 'file',
      depth: 0,
      size: 12,
      content: '# Hello',
    },
    {
      name: 'src',
      path: '/tmp/root/src',
      type: 'directory',
      depth: 0,
      children: [
        {
          name: 'index.ts',
          path: '/tmp/root/src/index.ts',
          type: 'file',
          depth: 1,
          size: 5,
        },
      ],
    },
  ],
};

describe('formatOutput', () => {
  it('renders tree and root file contents', () => {
    const output = formatOutput(tree, tree.path);

    expect(output).toContain('# Directory Index: /tmp/root');
    expect(output).toContain('## File Structure');
    expect(output).toContain('README.md');
    expect(output).toContain('## Root Level Files');
    expect(output).toContain('### README.md');
    expect(output).toContain('# Hello');
  });
});
```

```typescript
import path from 'node:path';
import type { TreeNode } from './tree-builder';

function formatSize(bytes?: number): string {
  if (bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatLanguage(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.md') return 'markdown';
  if (ext === '.json') return 'json';
  if (ext === '.ts') return 'typescript';
  if (ext === '.tsx') return 'tsx';
  if (ext === '.js') return 'javascript';
  if (ext === '.yml' || ext === '.yaml') return 'yaml';
  return 'text';
}

function renderTree(root: TreeNode): string[] {
  const lines: string[] = [];
  const rootLabel = `${path.basename(root.path) || root.path}/`;
  lines.push(rootLabel);

  const children = root.children ?? [];
  const renderChildren = (nodes: TreeNode[], prefix: string) => {
    nodes.forEach((node, index) => {
      const isLast = index === nodes.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const name = node.type === 'directory' ? `${node.name}/` : node.name;
      const size = node.type === 'file' ? ` (${formatSize(node.size)})` : '';
      const error = node.error ? ` [${node.error}]` : '';
      lines.push(`${prefix}${connector}${name}${size}${error}`);

      if (node.type === 'directory' && node.children && node.children.length > 0) {
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');
        renderChildren(node.children, nextPrefix);
      }
    });
  };

  const ordered = [...children].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  renderChildren(ordered, '');

  return lines;
}

export function formatOutput(root: TreeNode, rootPath: string): string {
  const lines: string[] = [];
  lines.push(`# Directory Index: ${rootPath}`);
  lines.push('');
  lines.push('## File Structure');
  lines.push('');
  lines.push('```');
  lines.push(...renderTree(root));
  lines.push('```');
  lines.push('');
  lines.push('## Root Level Files');
  lines.push('');

  const rootFiles = (root.children ?? []).filter((node) => node.type === 'file');
  if (rootFiles.length === 0) {
    lines.push('_No root-level files found._');
    return lines.join('\n');
  }

  for (const file of rootFiles) {
    const content = file.content ?? (file.error ? `[${file.error}]` : '[No content]');
    const language = formatLanguage(file.name);
    lines.push(`### ${file.name}`);
    lines.push('```' + language);
    lines.push(content);
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n');
}
```

**Verify:** `bun run test tests/lib/output-formatter.test.ts`
**Commit:** `feat(format): add OutputFormatter utility`

---

## Batch 3: Tool + Command (parallel - 2 implementers)

All tasks in this batch depend on Batch 2 completing.

### Task 3.1: TreeIndexer tool and plugin entry
**File:** `src/index.ts`
**Test:** `tests/index.test.ts`
**Depends:** 2.1, 2.2, 2.3

```typescript
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
```

```typescript
import type { Plugin } from '@opencode-ai/plugin';
import { tool } from '@opencode-ai/plugin';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildTree } from './lib/tree-builder';
import { readFileContent } from './lib/file-reader';
import { formatOutput } from './lib/output-formatter';

interface CommandFrontmatter {
  description?: string;
  agent?: string;
  model?: string;
  subtask?: boolean;
}

interface ParsedCommand {
  name: string;
  frontmatter: CommandFrontmatter;
  template: string;
}

interface IndexArgs {
  path: string;
  maxFileSize?: number;
}

function parseFrontmatter(content: string): { frontmatter: CommandFrontmatter; body: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content.trim() };
  }

  const [, yamlContent, body] = match;
  const frontmatter: CommandFrontmatter = {};

  for (const line of yamlContent.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    if (key === 'description') frontmatter.description = value;
    if (key === 'agent') frontmatter.agent = value;
    if (key === 'model') frontmatter.model = value;
    if (key === 'subtask') frontmatter.subtask = value === 'true';
  }

  return { frontmatter, body: body.trim() };
}

async function loadCommands(): Promise<ParsedCommand[]> {
  const commands: ParsedCommand[] = [];
  const commandDir = path.join(import.meta.dir, 'commands');
  const glob = new Bun.Glob('**/*.md');

  for await (const file of glob.scan({ cwd: commandDir, absolute: true })) {
    const content = await Bun.file(file).text();
    const { frontmatter, body } = parseFrontmatter(content);

    const relativePath = path.relative(commandDir, file);
    const name = relativePath.replace(/\.md$/, '').replace(/\//g, '-');

    commands.push({
      name,
      frontmatter,
      template: body,
    });
  }

  return commands;
}

export async function indexDirectory(args: IndexArgs): Promise<string> {
  const targetPath = path.resolve(args.path);
  const stat = await fs.stat(targetPath);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${targetPath}`);
  }

  const tree = await buildTree(targetPath);
  const rootFiles = (tree.children ?? []).filter((node) => node.type === 'file');

  for (const file of rootFiles) {
    const result = await readFileContent(file.path, args.maxFileSize);
    file.content = result.content;
    if (result.error) file.error = result.error;
    file.size = result.size;
  }

  return formatOutput(tree, targetPath);
}

export const CodeIndexPlugin: Plugin = async () => {
  const commands = await loadCommands();

  const treeIndexerTool = tool({
    description: 'Generate a directory tree with root file contents',
    args: {
      path: tool.schema.string().describe('Root path to index'),
      maxFileSize: tool.schema.number().optional().describe('Max file size in bytes'),
    },
    async execute(args) {
      return indexDirectory({
        path: args.path,
        maxFileSize: args.maxFileSize,
      });
    },
  });

  return {
    tool: {
      tree_indexer: treeIndexerTool,
    },
    async config(config) {
      config.command = config.command ?? {};
      for (const cmd of commands) {
        config.command[cmd.name] = {
          template: cmd.template,
          description: cmd.frontmatter.description,
          agent: cmd.frontmatter.agent,
          model: cmd.frontmatter.model,
          subtask: cmd.frontmatter.subtask,
        };
      }
    },
  };
};
```

**Verify:** `bun run test tests/index.test.ts`
**Commit:** `feat(plugin): add TreeIndexer tool and entry`

### Task 3.2: /index command
**File:** `src/commands/index.md`
**Test:** none
**Depends:** 3.1

```markdown
---
description: Index current directory with root file contents
agent: executor
---

Use the `tree_indexer` tool to index the current working directory.
- path: `.`
- maxFileSize: `102400`

Return the markdown output directly.
```

**Verify:** `bun run test`
**Commit:** `feat(command): add /index command`

---

## Build and Link Steps

1. Install toolchain and deps: `mise install && bun install`
2. Run tests: `bun run test`
3. Build plugin artifacts: `bun run build`
4. Link plugin locally for OpenCode:
   - `opencode plugin link .`
   - Update `~/.config/opencode/config.json` to include `opencode-codeindex`
5. Validate `/index` command in OpenCode with a sample directory
