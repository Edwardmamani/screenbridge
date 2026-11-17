export type GpuPreferenceMode = 'auto' | 'nvidia-offload';

export interface NvidiaGpuInfo {
  name: string;
  driverVersion: string;
  memoryTotal: string;
}

export interface GpuStatus {
  preferenceMode: GpuPreferenceMode;
  nvidiaDetected: boolean;
  nvidiaGpus: NvidiaGpuInfo[];
  activeRenderer: string;
  primeOffloadActive: boolean;
  hardwareAccelerationEnabled: boolean;
}
