# OpenCode CodeIndex Plugin Design

date: 2026-02-14
topic: "OpenCode CodeIndex Plugin"
status: validated

---

## Problem Statement

Users need a quick way to visualize their project structure with file contents for documentation and understanding purposes. Existing tools either show only the tree structure OR dump all file contents, but not a hybrid approach where root-level files show content while subdirectories only show structure.

**Goal**: Create an OpenCode plugin with an `/index` command that generates a hybrid directory tree where:
- Root folder files display their contents
- Subdirectories display only their structure (paths only)

## Constraints

1. **OpenCode Plugin API**: Must use `@opencode-ai/plugin` SDK
2. **TypeScript**: Follow template patterns with strict typing
3. **Command-based**: Use `.md` file in `src/commands/` for `/index` command
4. **Performance**: Handle large directories gracefully with size limits
5. **Security**: Respect file permissions, skip sensitive directories

## Chosen Approach

I'm choosing a **command-driven architecture** with modular utilities because:

1. **Fits OpenCode patterns**: Commands defined in `.md` files are the idiomatic way
2. **Separation of concerns**: Tree building, file reading, and formatting are independent
3. **Testability**: Each utility can be unit tested in isolation
4. **Extensibility**: Easy to add options later (depth limit, include patterns, etc.)

**Rejected alternatives:**
- Single monolithic function: Hard to test and maintain
- External CLI tool dependency: Adds complexity, requires installation
- Pure shell command: Not portable, hard to customize behavior

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenCode Agent                           │
│                      (User runs /index)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   IndexCommand (index.md)                   │
│              description: "Index current directory"         │
│              agent: executor                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Plugin Entry (index.ts)                   │
│              - Loads command configuration                  │
│              - Provides TreeIndexer tool                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   TreeIndexer Tool                          │
│              - scanDirectory(rootPath)                      │
│              - Returns: TreeNode structure                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
┌────────────────────┐    ┌────────────────────┐
│   TreeBuilder      │    │   FileReader       │
│   - walk(dir)      │    │   - read(path)     │
│   - skip patterns  │    │   - binary detect  │
│   - depth tracking │    │   - size limit     │
└────────┬───────────┘    └─────────┬──────────┘
         │                          │
         └──────────┬───────────────┘
                    │
                    ▼
         ┌────────────────────┐
         │  OutputFormatter   │
         │  - renderTree()    │
         │  - formatContent() │
         └─────────┬──────────┘
                   │
                   ▼
         ┌────────────────────┐
         │   Formatted Output │
         │   (Markdown tree)  │
         └────────────────────┘
```

## Components

### 1. TreeIndexer Tool (Primary Tool)
**Responsibility**: Main entry point for the indexing functionality

**Interface**:
- Input: `{ path: string, maxFileSize?: number }`
- Output: Markdown-formatted tree string

**Logic**:
1. Validate path exists and is directory
2. Call TreeBuilder to get structure
3. For each file at depth 0, read content via FileReader
4. Format everything via OutputFormatter
5. Return formatted markdown

### 2. TreeBuilder Utility
**Responsibility**: Recursively walk directory and build tree structure

**Key behaviors**:
- Skip patterns: `.git`, `node_modules`, `.opencode`, `dist`, `build`, `*.log`
- Track depth level (0 = root, 1+ = subdirectories)
- Handle symlinks (avoid cycles with visited set)
- Respect `.gitignore` if present

**Output structure**:
```typescript
interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  depth: number;
  children?: TreeNode[];
  content?: string; // Only for depth 0 files
  size?: number;
  error?: string; // If permission denied or read error
}
```

### 3. FileReader Utility
**Responsibility**: Read file contents safely

**Key behaviors**:
- Detect binary files (check for null bytes or use `is-binary-path`)
- Apply size limit (default: 100KB, configurable)
- Handle encoding issues gracefully
- Return error message for unreadable files

### 4. OutputFormatter Utility
**Responsibility**: Format tree structure as readable markdown

**Format example**:
```markdown
# Directory Index: /path/to/project

## File Structure

```
project-root/
├── README.md (1.2KB)
├── package.json (0.8KB)
└── src/
    ├── index.ts
    └── utils/
        └── helper.ts
```

## Root Level Files

### README.md
```markdown
# Project Name
This is the README content...
```

### package.json
```json
{
  "name": "my-project"
}
```
```

## Error Handling Strategy

| Error Type | Behavior |
|------------|----------|
| Path not found | Return clear error message |
| Permission denied | Mark node with `[Permission Denied]` |
| Binary file detected | Show `[Binary file]` placeholder |
| File too large | Show `[File too large: X KB]` |
| Circular symlink | Skip with `[Circular reference]` |
| Encoding error | Show `[Encoding error]` |

All errors are **non-fatal** - the tree continues building even if some files fail.

## Testing Strategy

### Unit Tests
1. **TreeBuilder tests**:
   - Basic directory walking
   - Skip pattern matching
   - Depth tracking accuracy
   - Symlink cycle detection

2. **FileReader tests**:
   - Text file reading
   - Binary file detection
   - Size limit enforcement
   - Permission error handling

3. **OutputFormatter tests**:
   - Tree rendering with various depths
   - Content formatting
   - Error message display

### Integration Tests
1. Create test directory structure:
   ```
   test-fixtures/
   ├── root-file.txt
   ├── binary-file.bin
   ├── subdir/
   │   └── nested-file.js
   └── empty-dir/
   ```
2. Run full index and verify output format

### Edge Cases to Test
- Empty directory
- Directory with only subdirectories (no root files)
- Very deep nesting (100+ levels)
- Special characters in filenames
- Unicode file content
- Large number of files (1000+)

## Configuration Options (Future)

For initial MVP, these are out of scope but designed for easy addition:

- `maxDepth`: Limit tree depth
- `includePatterns`: Glob patterns to include (default: all)
- `excludePatterns`: Additional exclude patterns
- `maxFileSize`: Maximum file size to read (default: 100KB)
- `showHidden`: Include dotfiles (default: false)
- `respectGitignore`: Use `.gitignore` patterns (default: true)

## Open Questions

None - requirements are clear enough to proceed.

## Next Steps

1. Create plugin structure following template
2. Implement TreeBuilder utility
3. Implement FileReader utility
4. Implement OutputFormatter utility
5. Create TreeIndexer tool
6. Create `/index` command
7. Write tests
8. Build and publish
