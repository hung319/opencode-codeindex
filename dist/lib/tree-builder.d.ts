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
export declare const DEFAULT_SKIP_NAMES: Set<string>;
export declare function buildTree(rootPath: string, options?: TreeBuilderOptions): Promise<TreeNode>;
//# sourceMappingURL=tree-builder.d.ts.map