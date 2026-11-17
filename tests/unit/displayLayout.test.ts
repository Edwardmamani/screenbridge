import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadSavedLayout, writeSavedLayout } from '../../src/main/display/displayLayoutManager';

describe('displayLayoutManager persistence', () => {
  it('returns null when layout file does not exist', () => {
    const missing = path.join(os.tmpdir(), 'non-existent-layout-12345.json');
    expect(loadSavedLayout(missing)).toBeNull();
  });

  it('persists and restores monitor coordinates and autoRestore flag', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'screenbridge-layout-'));
    const layoutPath = path.join(tmpDir, 'display-layout.json');

    writeSavedLayout(layoutPath, {
      savedAt: 1700000000000,
      autoRestore: true,
      monitors: [
        { connector: 'eDP-1', x: 0, y: 0, scale: 1, transform: 0, primary: true },
        { connector: 'HDMI-2', x: 1920, y: 0, scale: 1, transform: 0, primary: false },
        { connector: 'Meta-0', x: 3840, y: 0, scale: 1, transform: 0, primary: false },
      ],
    });

    const loaded = loadSavedLayout(layoutPath);
    expect(loaded).not.toBeNull();
    expect(loaded?.autoRestore).toBe(true);
    expect(loaded?.monitors).toHaveLength(3);
    expect(loaded?.monitors[2]).toEqual({
      connector: 'Meta-0',
      x: 3840,
      y: 0,
      scale: 1,
      transform: 0,
      primary: false,
    });

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
