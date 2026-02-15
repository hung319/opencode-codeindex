import path from 'node:path';
function formatSize(bytes) {
    if (bytes === undefined)
        return '';
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function formatLanguage(filename) {
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.md')
        return 'markdown';
    if (ext === '.json')
        return 'json';
    if (ext === '.ts')
        return 'typescript';
    if (ext === '.tsx')
        return 'tsx';
    if (ext === '.js')
        return 'javascript';
    if (ext === '.yml' || ext === '.yaml')
        return 'yaml';
    return 'text';
}
function renderTree(root) {
    const lines = [];
    const rootLabel = `${path.basename(root.path) || root.path}/`;
    lines.push(rootLabel);
    const children = root.children ?? [];
    const renderChildren = (nodes, prefix) => {
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
        if (a.type !== b.type)
            return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
    });
    renderChildren(ordered, '');
    return lines;
}
export function formatOutput(root, rootPath) {
    const lines = [];
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
//# sourceMappingURL=output-formatter.js.map