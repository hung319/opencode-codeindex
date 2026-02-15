import type { Plugin } from '@opencode-ai/plugin';
interface IndexArgs {
    path: string;
    maxFileSize?: number;
}
export declare function indexDirectory(args?: IndexArgs): Promise<string>;
export declare const CodeIndexPlugin: Plugin;
export {};
//# sourceMappingURL=index.d.ts.map