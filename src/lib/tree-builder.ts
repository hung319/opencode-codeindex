import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
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

export const DEFAULT_SKIP_NAMES = new Set(['.git', 'node_modules', '.opencode', 'dist', 'build']);

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

function shouldSkip(name: string, skipNames: Set<string>, skipExtensions: Set<string>): boolean {
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
  let entries: Dirent[] = [];
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
