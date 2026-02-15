export interface FileReadResult {
    content: string;
    size: number;
    error?: string;
}
export declare function readFileContent(filePath: string, maxFileSize?: number): Promise<FileReadResult>;
//# sourceMappingURL=file-reader.d.ts.map