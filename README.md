# OpenCode CodeIndex Plugin

[![npm version](https://img.shields.io/npm/v/opencode-codeindex)](https://www.npmjs.com/package/opencode-codeindex)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> OpenCode plugin that indexes directories with root file contents.

## Features

- 📁 Generate directory tree structures with root file contents
- 🔍 Intelligently handle binary files and ignore patterns
- 📦 Configurable max file size for content inclusion
- 🛠️ Custom commands for AI-assisted workflows

## Installation

```bash
# Using bun
bun add opencode-codeindex

# Using npm
npm install opencode-codeindex

# Using yarn
yarn add opencode-codeindex
```

## Usage

### As an OpenCode Plugin

Add to your OpenCode configuration:

```typescript
import { CodeIndexPlugin } from 'opencode-codeindex';

export default {
  plugins: [CodeIndexPlugin],
};
```

### Programmatic API

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

## API

### `indexDirectory(args?: IndexArgs)`

Generates a formatted directory tree with root file contents.

**Parameters:**

- `args.path` (string, optional): Root path to index (defaults to current directory)
- `args.maxFileSize` (number, optional): Maximum file size in bytes to include content

**Returns:** Promise<string> - Formatted tree output

## Tool: `tree_indexer`

Available as a tool when using the plugin with OpenCode:

```typescript
// Available in OpenCode context
await ctx.tools.tree_indexer({
  path: './src',
  maxFileSize: 50000,
});
```

## Commands

The plugin provides custom commands defined in Markdown frontmatter:

```markdown
---
description: Analyze code structure
agent: architect
---

Analyze the following directory structure and provide insights...

{{ tree_indexer path="./src" }}
```

## Development

```bash
# Install dependencies
bun install

# Build
bun run build

# Run tests
bun test

# Lint
bun run lint

# Format
bun run format
```

## License

MIT © [OpenCode](https://github.com/hung319/opencode-codeindex)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Repository

- [GitHub](https://github.com/hung319/opencode-codeindex)
- [npm](https://www.npmjs.com/package/opencode-codeindex)
