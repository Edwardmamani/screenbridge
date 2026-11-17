import { Check, Laptop, Smartphone, X, Power } from 'lucide-react';
import type { ConnectedClient } from '@shared/types/session';

interface DeviceListProps {
  clients: ConnectedClient[];
  onApprove: (clientId: string) => void;
  onReject: (clientId: string) => void;
  onDisconnect: (clientId: string) => void;
}

export function DeviceList({ clients, onApprove, onReject, onDisconnect }: DeviceListProps) {
  const pendingClients = clients.filter((c) => c.status === 'pending');
  const activeClients = clients.filter((c) => c.status === 'approved' || c.status === 'streaming');

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Connected Devices</h2>
            <p className="text-xs text-slate-400">
              {activeClients.length} active · {pendingClients.length} awaiting approval
            </p>
          </div>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-800 px-4 py-6 text-center text-xs text-slate-400">
          No devices connected yet. Scan the QR code from a phone, tablet, or browser.
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {pendingClients.map((client) => (
            <div
              key={client.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-amber-200">{client.name}</p>
                <p className="text-[11px] text-amber-300/70">{client.ip} · Wants to view screen</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onApprove(client.id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                >
                  <Check className="h-3.5 w-3.5" />
                  Allow
                </button>
                <button
                  type="button"
                  onClick={() => onReject(client.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/15 px-2.5 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/25"
                >
                  <X className="h-3.5 w-3.5" />
                  Reject
                </button>
              </div>
            </div>
          ))}

          {activeClients.map((client) => (
            <div
              key={client.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Laptop className="h-4 w-4 shrink-0 text-emerald-400" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-200">{client.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {client.ip} · {client.status === 'streaming' ? 'Receiving stream' : 'Ready'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDisconnect(client.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-rose-500/50 hover:text-rose-300"
              >
                <Power className="h-3.5 w-3.5" />
                Disconnect
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
