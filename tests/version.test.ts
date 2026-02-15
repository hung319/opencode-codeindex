import { describe, expect, it } from 'vitest';
import { VERSION } from '../src/version';

describe('VERSION', () => {
  it('exports a semantic version string', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
