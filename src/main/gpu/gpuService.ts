import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { app } from 'electron';
import type { GpuPreferenceMode, GpuStatus, NvidiaGpuInfo } from '../../shared/types/gpu';
import type { FileLogger } from '../logging/logger';

const execFileAsync = promisify(execFile);

/**
 * Parses `nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader` output.
 */
export function parseNvidiaSmiOutput(stdout: string): NvidiaGpuInfo[] {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, driverVersion, memoryTotal] = line.split(',').map((part) => part.trim());
      return {
        name: name || 'NVIDIA GPU',
        driverVersion: driverVersion || 'unknown',
        memoryTotal: memoryTotal || 'unknown',
      };
    });
}

export function loadGpuPreference(configPath: string): GpuPreferenceMode {
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as { preferenceMode?: string };
    return parsed.preferenceMode === 'nvidia-offload' ? 'nvidia-offload' : 'auto';
  } catch {
    return 'auto';
  }
}

export function saveGpuPreference(configPath: string, mode: GpuPreferenceMode): void {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify({ preferenceMode: mode }, null, 2), 'utf8');
}

/**
 * Applies Chromium GPU flags and NVIDIA PRIME Render Offload environment variables
 * before Electron's `app.whenReady()`.
 */
export function configureGpuStartup(configPath: string, logger: FileLogger): GpuPreferenceMode {
  const mode = loadGpuPreference(configPath);

  app.commandLine.appendSwitch('ignore-gpu-blocklist');
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');

  if (mode === 'nvidia-offload' && process.platform === 'linux') {
    process.env.__NV_PRIME_RENDER_OFFLOAD = '1';
    process.env.__GLX_VENDOR_LIBRARY_NAME = 'nvidia';
    process.env.__VK_LAYER_NV_optimus = 'NVIDIA_only';
    logger.info('gpu', 'Applied NVIDIA PRIME render offload environment variables');
  }

  logger.info('gpu', 'Configured Chromium GPU startup flags', { mode });
  return mode;
}

export async function detectNvidiaGpus(): Promise<NvidiaGpuInfo[]> {
  try {
    const { stdout } = await execFileAsync(
      'nvidia-smi',
      ['--query-gpu=name,driver_version,memory.total', '--format=csv,noheader'],
      { timeout: 3000 },
    );
    return parseNvidiaSmiOutput(stdout);
  } catch {
    return [];
  }
}

export async function getGpuStatus(configPath: string): Promise<GpuStatus> {
  const [nvidiaGpus, basicInfo] = await Promise.all([
    detectNvidiaGpus(),
    app.getGPUInfo('basic').catch(() => null),
  ]);

  const featureStatus = app.getGPUFeatureStatus();
  const hardwareAccelerationEnabled =
    featureStatus.gpu_compositing === 'enabled' || featureStatus.webgl === 'enabled';

  let activeRenderer = 'Unknown GPU';
  if (basicInfo && typeof basicInfo === 'object' && 'gpuDevice' in basicInfo) {
    const devices = (basicInfo as { gpuDevice?: Array<{ active?: boolean; vendorId?: number; deviceString?: string }> }).gpuDevice;
    const active = devices?.find((d) => d.active) ?? devices?.[0];
    if (active?.deviceString) {
      activeRenderer = active.deviceString;
    } else if (active?.vendorId !== undefined) {
      activeRenderer = `Vendor 0x${active.vendorId.toString(16)}`;
    }
  }

  return {
    preferenceMode: loadGpuPreference(configPath),
    nvidiaDetected: nvidiaGpus.length > 0,
    nvidiaGpus,
    activeRenderer,
    primeOffloadActive:
      process.env.__NV_PRIME_RENDER_OFFLOAD === '1' &&
      process.env.__GLX_VENDOR_LIBRARY_NAME === 'nvidia',
    hardwareAccelerationEnabled,
  };
}
