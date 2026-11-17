import { useState } from 'react';
import { Check, Copy, Lock, RefreshCw, Unlock, Wifi } from 'lucide-react';
import type { BridgeState } from '@shared/types/session';

interface ConnectionCardProps {
  state: BridgeState;
  onSelectInterface: (address: string) => void;
  onTogglePin: (enabled: boolean) => void;
  onRegeneratePin: () => void;
}

export function ConnectionCard({
  state,
  onSelectInterface,
  onTogglePin,
  onRegeneratePin,
}: ConnectionCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(state.connectionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
            <Wifi className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Pair a Device</h2>
            <p className="text-xs text-slate-400">Scan QR or open URL on the same Wi-Fi</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onTogglePin(!state.pinEnabled)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
            state.pinEnabled
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
              : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-600'
          }`}
          title="Require a 4-digit PIN before devices can request access"
        >
          {state.pinEnabled ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
          {state.pinEnabled ? 'PIN On' : 'PIN Off'}
        </button>
      </div>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="shrink-0 overflow-hidden rounded-xl border border-slate-700/70 bg-white p-2">
          {state.qrDataUrl ? (
            <img src={state.qrDataUrl} alt="Connection QR code" className="h-36 w-36" />
          ) : (
            <div className="flex h-36 w-36 items-center justify-center text-xs text-slate-500">
              Generating QR...
            </div>
          )}
        </div>

        <div className="flex w-full min-w-0 flex-1 flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Connection URL
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-indigo-300">
                {state.connectionUrl}
              </code>
              <button
                type="button"
                onClick={() => void handleCopyUrl()}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {state.interfaces.length > 1 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Network Adapter
              </label>
              <select
                value={state.selectedAddress}
                onChange={(e) => onSelectInterface(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
              >
                {state.interfaces.map((iface) => (
                  <option key={`${iface.name}-${iface.address}`} value={iface.address}>
                    {iface.name} — {iface.address}
                  </option>
                ))}
              </select>
            </div>
          )}

          {state.pinEnabled && (
            <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <div>
                <span className="text-xs text-amber-200/80">Pairing PIN: </span>
                <span className="font-mono text-sm font-bold tracking-widest text-amber-300">
                  {state.pinCode}
                </span>
              </div>
              <button
                type="button"
                onClick={onRegeneratePin}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-amber-200 transition hover:bg-amber-500/20"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                New PIN
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
