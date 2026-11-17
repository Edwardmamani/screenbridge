import { AppWindow, Monitor, RefreshCw, SlidersHorizontal, Square, Tv } from 'lucide-react';
import {
  QUALITY_PRESETS,
  type CaptureSource,
  type QualityPresetId,
} from '@shared/types/display';

interface SourcePickerProps {
  sources: CaptureSource[];
  selectedPreset: QualityPresetId;
  isStreaming: boolean;
  activeSourceLabel: string | null;
  errorMessage: string | null;
  onChangePreset: (preset: QualityPresetId) => void;
  onRefreshSources: () => void;
  onStartSource: (source: CaptureSource) => void;
  onStartSystemPicker: () => void;
  onStopStreaming: () => void;
}

export function SourcePicker({
  sources,
  selectedPreset,
  isStreaming,
  activeSourceLabel,
  errorMessage,
  onChangePreset,
  onRefreshSources,
  onStartSource,
  onStartSystemPicker,
  onStopStreaming,
}: SourcePickerProps) {
  const screens = sources.filter((s) => s.kind === 'screen');
  const windows = sources.filter((s) => s.kind === 'window');

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <Tv className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Share Screen or Window</h2>
            <p className="text-xs text-slate-400">
              {isStreaming
                ? `Streaming: ${activeSourceLabel ?? 'Active source'}`
                : 'Choose a display or window to stream to connected devices'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedPreset}
              onChange={(e) => onChangePreset(e.target.value as QualityPresetId)}
              className="bg-transparent text-xs text-slate-200 outline-none"
            >
              {Object.values(QUALITY_PRESETS).map((preset) => (
                <option key={preset.id} value={preset.id} className="bg-slate-900">
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onStartSystemPicker}
            className="rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-3 py-1.5 text-xs font-medium text-indigo-300 transition hover:bg-indigo-500/25"
          >
            System Picker
          </button>

          <button
            type="button"
            onClick={onRefreshSources}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>

          {isStreaming && (
            <button
              type="button"
              onClick={onStopStreaming}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-500"
            >
              <Square className="h-3 w-3 fill-current" />
              Stop Sharing
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {errorMessage}
        </div>
      )}

      <div className="mt-4 space-y-4">
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Monitor className="h-3.5 w-3.5" />
            Screens ({screens.length})
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {screens.map((source) => (
              <SourceTile key={source.id} source={source} onSelect={onStartSource} />
            ))}
          </div>
        </div>

        {windows.length > 0 && (
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <AppWindow className="h-3.5 w-3.5" />
              Application Windows ({windows.length})
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {windows.slice(0, 9).map((source) => (
                <SourceTile key={source.id} source={source} onSelect={onStartSource} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function SourceTile({
  source,
  onSelect,
}: {
  source: CaptureSource;
  onSelect: (source: CaptureSource) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(source)}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80 text-left transition hover:border-indigo-500/60 hover:bg-slate-900"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
        {source.thumbnailDataUrl ? (
          <img
            src={source.thumbnailDataUrl}
            alt={source.name}
            className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
            Preview via System Picker
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="truncate text-xs font-medium text-slate-200">{source.name}</span>
        <span className="shrink-0 rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300 opacity-0 transition group-hover:opacity-100">
          Share
        </span>
      </div>
    </button>
  );
}
