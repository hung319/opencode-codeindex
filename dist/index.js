import { tool } from '@opencode-ai/plugin';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildTree } from './lib/tree-builder';
import { readFileContent } from './lib/file-reader';
import { formatOutput } from './lib/output-formatter';
function parseFrontmatter(content) {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    if (!match) {
        return { frontmatter: {}, body: content.trim() };
    }
    const [, yamlContent, body] = match;
    const frontmatter = {};
    for (const line of yamlContent.split('\n')) {
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1)
            continue;
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        if (key === 'description')
            frontmatter.description = value;
        if (key === 'agent')
            frontmatter.agent = value;
        if (key === 'model')
            frontmatter.model = value;
        if (key === 'subtask')
            frontmatter.subtask = value === 'true';
    }
    return { frontmatter, body: body.trim() };
}
async function loadCommands() {
    const commands = [];
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
export async function indexDirectory(args) {
    const targetPath = path.resolve(args?.path ?? process.cwd());
    const stat = await fs.stat(targetPath);
    if (!stat.isDirectory()) {
        throw new Error(`Path is not a directory: ${targetPath}`);
    }
    const tree = await buildTree(targetPath);
    const rootFiles = (tree.children ?? []).filter((node) => node.type === 'file');
    for (const file of rootFiles) {
        const result = await readFileContent(file.path, args?.maxFileSize);
        file.content = result.content;
        if (result.error)
            file.error = result.error;
        file.size = result.size;
    }
    return formatOutput(tree, targetPath);
}
export const CodeIndexPlugin = async (ctx) => {
    const commands = await loadCommands();
    const currentDir = ctx.directory ?? process.cwd();
    const treeIndexerTool = tool({
        description: 'Generate a directory tree with root file contents',
        args: {
            path: tool.schema
                .string()
                .optional()
                .describe('Root path to index (defaults to current directory)'),
            maxFileSize: tool.schema.number().optional().describe('Max file size in bytes'),
        },
        async execute(args) {
            return indexDirectory({
                path: args.path ?? currentDir,
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
//# sourceMappingURL=index.js.map