import { useState } from 'react';
import { Info, Monitor, PlusCircle, Trash2 } from 'lucide-react';
import {
  VIRTUAL_DISPLAY_PRESETS,
  type PhysicalDisplay,
  type VirtualDisplayResolution,
  type VirtualDisplayState,
  type VirtualDisplaySupport,
} from '@shared/types/display';

interface DisplayGuideProps {
  displays: PhysicalDisplay[];
  virtualSupport: VirtualDisplaySupport | null;
  virtualDisplayState: VirtualDisplayState | null;
  onCreateVirtualDisplay: (resolution: VirtualDisplayResolution) => Promise<void>;
  onDestroyVirtualDisplay: () => Promise<void>;
}

export function DisplayGuide({
  displays,
  virtualSupport,
  virtualDisplayState,
  onCreateVirtualDisplay,
  onDestroyVirtualDisplay,
}: DisplayGuideProps) {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const selectedPreset = VIRTUAL_DISPLAY_PRESETS[selectedPresetIndex] ?? VIRTUAL_DISPLAY_PRESETS[0]!;
  const isActive = Boolean(virtualDisplayState?.active);
  const isNativeSupported = Boolean(virtualDisplayState?.supported);

  const handleToggleVirtualDisplay = async () => {
    setBusy(true);
    try {
      if (isActive) {
        await onDestroyVirtualDisplay();
      } else {
        await onCreateVirtualDisplay({
          width: selectedPreset.width,
          height: selectedPreset.height,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
            <Monitor className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Extended Display Setup</h2>
            <p className="text-xs text-slate-400">
              {displays.length} display{displays.length === 1 ? '' : 's'} detected by OS
            </p>
          </div>
        </div>

        {isActive && (
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
            Virtual Active
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {displays.map((d) => (
          <div
            key={d.id}
            className="rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-xs text-slate-300"
          >
            <span className="font-medium text-slate-100">{d.label}</span>{' '}
            <span className="text-slate-400">
              ({d.width}×{d.height}
              {d.isPrimary ? ' · Primary' : ''})
            </span>
          </div>
        ))}
      </div>

      {isNativeSupported && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-violet-500/25 bg-violet-500/10 p-3">
          <select
            value={selectedPresetIndex}
            disabled={isActive || busy}
            onChange={(e) => setSelectedPresetIndex(Number(e.target.value))}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 outline-none disabled:opacity-50"
          >
            {VIRTUAL_DISPLAY_PRESETS.map((preset, idx) => (
              <option key={preset.label} value={idx}>
                {preset.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={busy}
            onClick={() => void handleToggleVirtualDisplay()}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
              isActive
                ? 'bg-rose-600 text-white hover:bg-rose-500'
                : 'bg-violet-600 text-white hover:bg-violet-500'
            }`}
          >
            {isActive ? (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                {busy ? 'Removing...' : 'Remove Virtual Display'}
              </>
            ) : (
              <>
                <PlusCircle className="h-3.5 w-3.5" />
                {busy ? 'Creating...' : 'Create Virtual Display'}
              </>
            )}
          </button>
        </div>
      )}

      {virtualDisplayState?.error && (
        <div className="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {virtualDisplayState.error}
        </div>
      )}

      {virtualSupport && (
        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
            <div className="space-y-1.5">
              <p className="font-medium text-slate-200">{virtualSupport.summary}</p>
              <ul className="list-disc space-y-1 pl-4 text-slate-400">
                {virtualSupport.instructions.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
