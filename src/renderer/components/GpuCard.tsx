import { Cpu, RotateCcw } from 'lucide-react';
import type { GpuPreferenceMode, GpuStatus } from '@shared/types/gpu';

interface GpuCardProps {
  status: GpuStatus;
  onChangeMode: (mode: GpuPreferenceMode) => Promise<void>;
  onRelaunch: () => Promise<void>;
}

export function GpuCard({ status, onChangeMode, onRelaunch }: GpuCardProps) {
  const primaryNvidia = status.nvidiaGpus[0];
  const needsRelaunch =
    status.nvidiaDetected &&
    status.preferenceMode === 'nvidia-offload' &&
    !status.primeOffloadActive;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">GPU Acceleration</h2>
            <p className="text-xs text-slate-400">
              {primaryNvidia
                ? `${primaryNvidia.name} · Driver ${primaryNvidia.driverVersion}`
                : 'No NVIDIA GPU detected'}
            </p>
          </div>
        </div>

        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
            status.primeOffloadActive
              ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
              : 'border border-slate-700 bg-slate-800 text-slate-300'
          }`}
        >
          {status.primeOffloadActive ? 'NVIDIA Offload' : 'Auto GPU'}
        </span>
      </div>

      <div className="mt-3 space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400">Active Chromium GPU:</span>
          <span className="truncate font-mono text-slate-200">{status.activeRenderer}</span>
        </div>

        {status.nvidiaDetected && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <label className="text-slate-400">Preferred GPU Mode:</label>
            <select
              value={status.preferenceMode}
              onChange={(e) => void onChangeMode(e.target.value as GpuPreferenceMode)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-emerald-500"
            >
              <option value="auto">Auto (System Default)</option>
              <option value="nvidia-offload">NVIDIA PRIME Offload</option>
            </select>
          </div>
        )}
      </div>

      {needsRelaunch && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <span>Restart ScreenBridge to apply NVIDIA PRIME offload.</span>
          <button
            type="button"
            onClick={() => void onRelaunch()}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 font-semibold text-slate-950 transition hover:bg-amber-400"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Relaunch
          </button>
        </div>
      )}
    </section>
  );
}
