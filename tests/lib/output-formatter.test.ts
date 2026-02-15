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
