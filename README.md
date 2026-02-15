# OpenCode CodeIndex Plugin

[![npm version](https://img.shields.io/npm/v/opencode-codeindex)](https://www.npmjs.com/package/opencode-codeindex)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> OpenCode plugin that indexes directories with root file contents. Provides a tool to generate directory tree structures with root file contents for AI context.

## Features

- 📁 Generate directory tree structures with root file contents
- 🔍 Intelligently handle binary files and respect `.gitignore` patterns
- 📦 Configurable max file size for content inclusion
- 🛠️ Exposes `tree_indexer` tool for OpenCode

## Installation

### From npm

Add to your OpenCode configuration file (`opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-codeindex"]
}
```

OpenCode will automatically install the plugin using Bun at startup.

### From local files

Place the plugin file in your OpenCode plugins directory:

- `.opencode/plugins/` - Project-level plugins
- `~/.config/opencode/plugins/` - Global plugins

## Usage

Once installed, the plugin exposes a `tree_indexer` tool that can be used in your OpenCode sessions:

```typescript
// The tree_indexer tool is automatically available
await ctx.tools.tree_indexer({
  path: './src',
  maxFileSize: 50000,
});
```

### Available Commands

The plugin also provides custom commands defined in Markdown frontmatter. Create `.md` files in `src/commands/`:

```markdown
---
description: Analyze code structure
agent: architect
---

Analyze the following directory structure and provide insights...

{{ tree_indexer path="./src" }}
```

## Programmatic API

You can also use this package programmatically in your own projects:

```typescript
import { indexDirectory } from 'opencode-codeindex';

// Index current directory
const output = await indexDirectory();

// Index specific path with max file size
const output = await indexDirectory({
  path: './my-project',
  maxFileSize: 102400, // 100KB
});

console.log(output);
```

### API Reference

#### `indexDirectory(args?: IndexArgs)`

Generates a formatted directory tree with root file contents.

**Parameters:**
- `args.path` (string, optional): Root path to index (defaults to current directory)
- `args.maxFileSize` (number, optional): Maximum file size in bytes to include content

**Returns:** Promise<string> - Formatted tree output

## Plugin Structure

This plugin follows the [OpenCode plugin specification](https://opencode.ai/docs/plugins/):

```typescript
import type { Plugin } from '@opencode-ai/plugin';

export const CodeIndexPlugin: Plugin = async (ctx) => {
  return {
    tool: {
      tree_indexer: treeIndexerTool,
    },
    async config(config) {
      // Add custom commands
    },
  };
};
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint

# Format
npm run format

# Type check
npm run typecheck
```

## License

MIT © [OpenCode](https://github.com/hung319/opencode-codeindex)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Links

- [GitHub Repository](https://github.com/hung319/opencode-codeindex)
- [npm Package](https://www.npmjs.com/package/opencode-codeindex)
- [OpenCode Documentation](https://opencode.ai/docs/plugins/)
