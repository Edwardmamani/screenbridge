import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  loadGpuPreference,
  parseNvidiaSmiOutput,
  saveGpuPreference,
} from '../../src/main/gpu/gpuService';

describe('gpuService', () => {
  it('parses nvidia-smi CSV output cleanly', () => {
    const gpus = parseNvidiaSmiOutput('NVIDIA GeForce 940MX, 470.256.02, 2004 MiB\n');
    expect(gpus).toEqual([
      {
        name: 'NVIDIA GeForce 940MX',
        driverVersion: '470.256.02',
        memoryTotal: '2004 MiB',
      },
    ]);
  });

  it('persists and loads GPU preference mode safely', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'screenbridge-gpu-'));
    const configPath = path.join(tmpDir, 'gpu-config.json');

    expect(loadGpuPreference(configPath)).toBe('auto');

    saveGpuPreference(configPath, 'nvidia-offload');
    expect(loadGpuPreference(configPath)).toBe('nvidia-offload');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
