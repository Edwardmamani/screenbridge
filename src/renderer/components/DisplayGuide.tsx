import { Info, Monitor } from 'lucide-react';
import type { PhysicalDisplay, VirtualDisplaySupport } from '@shared/types/display';

interface DisplayGuideProps {
  displays: PhysicalDisplay[];
  virtualSupport: VirtualDisplaySupport | null;
}

export function DisplayGuide({ displays, virtualSupport }: DisplayGuideProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
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
