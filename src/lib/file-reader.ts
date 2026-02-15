import fs from 'node:fs/promises';
import isBinaryPath from 'is-binary-path';

export interface FileReadResult {
  content: string;
  size: number;
  error?: string;
}

const DEFAULT_MAX_FILE_SIZE = 100 * 1024;
const PROBE_LENGTH = 8000;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function readProbe(filePath: string): Promise<Buffer> {
  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(PROBE_LENGTH);
    const { bytesRead } = await handle.read(buffer, 0, PROBE_LENGTH, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

function isBinaryBuffer(buffer: Buffer): boolean {
  return buffer.includes(0);
}

function formatError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code?: string }).code ?? '');
    if (code === 'EACCES' || code === 'EPERM') return 'Permission denied';
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export async function readFileContent(
  filePath: string,
  maxFileSize: number = DEFAULT_MAX_FILE_SIZE
): Promise<FileReadResult> {
  try {
    const stat = await fs.stat(filePath);
    const size = stat.size;

    if (size > maxFileSize) {
      return {
        size,
        content: `[File too large: ${formatSize(size)}]`,
        error: 'File too large',
      };
    }

    const probe = await readProbe(filePath);
    if (isBinaryPath(filePath) || isBinaryBuffer(probe)) {
      return { size, content: '[Binary file]', error: 'Binary file' };
    }

    const content = await fs.readFile(filePath, 'utf8');
    return { size, content };
  } catch (err) {
    return {
      size: 0,
      content: `[${formatError(err, 'Read error')}]`,
      error: formatError(err, 'Read error'),
    };
  }
}
