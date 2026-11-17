import { useCallback, useEffect, useState } from 'react';
import { Cast } from 'lucide-react';
import type {
  CaptureSource,
  DisplayLayoutStatus,
  PhysicalDisplay,
  QualityPresetId,
  VirtualDisplayState,
  VirtualDisplaySupport,
} from '@shared/types/display';
import type { GpuStatus } from '@shared/types/gpu';
import type { BridgeState } from '@shared/types/session';
import { ConnectionCard } from './components/ConnectionCard';
import { DeviceList } from './components/DeviceList';
import { DisplayGuide } from './components/DisplayGuide';
import { GpuCard } from './components/GpuCard';
import { SourcePicker } from './components/SourcePicker';
import { useHostStreaming } from './hooks/useHostStreaming';

export function App() {
  const [bridgeState, setBridgeState] = useState<BridgeState | null>(null);
  const [sources, setSources] = useState<CaptureSource[]>([]);
  const [displays, setDisplays] = useState<PhysicalDisplay[]>([]);
  const [virtualSupport, setVirtualSupport] = useState<VirtualDisplaySupport | null>(null);
  const [virtualDisplayState, setVirtualDisplayState] = useState<VirtualDisplayState | null>(null);
  const [layoutStatus, setLayoutStatus] = useState<DisplayLayoutStatus | null>(null);
  const [gpuStatus, setGpuStatus] = useState<GpuStatus | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<QualityPresetId>('balanced');

  const refreshSources = useCallback(async () => {
    const nextSources = await window.screenBridge.listCaptureSources();
    setSources(nextSources);
  }, []);

  useEffect(() => {
    void (async () => {
      const [state, initialSources, initialDisplays, support, vState, layout, gpu] =
        await Promise.all([
          window.screenBridge.getBridgeState(),
          window.screenBridge.listCaptureSources(),
          window.screenBridge.listDisplays(),
          window.screenBridge.getVirtualDisplayStatus(),
          window.screenBridge.getVirtualDisplayState(),
          window.screenBridge.getDisplayLayoutStatus(),
          window.screenBridge.getGpuStatus(),
        ]);
      setBridgeState(state);
      setSources(initialSources);
      setDisplays(initialDisplays);
      setVirtualSupport(support);
      setVirtualDisplayState(vState);
      setLayoutStatus(layout);
      setGpuStatus(gpu);
    })();

    const unsubState = window.screenBridge.onStateUpdated((nextState) => {
      setBridgeState(nextState);
    });
    const unsubDisplays = window.screenBridge.onDisplaysUpdated((nextDisplays) => {
      setDisplays(nextDisplays);
      void refreshSources();
    });
    const unsubVirtual = window.screenBridge.onVirtualDisplayUpdated((nextVirtual) => {
      setVirtualDisplayState(nextVirtual);
    });

    return () => {
      unsubState();
      unsubDisplays();
      unsubVirtual();
    };
  }, [refreshSources]);

  const streaming = useHostStreaming(bridgeState?.clients ?? []);
  const waitingClientsCount = (bridgeState?.clients ?? []).filter(
    (c) => c.status === 'approved',
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
              <Cast className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">ScreenBridge</h1>
              <p className="text-xs text-slate-400">
                Extend or mirror your desktop to any browser over LAN
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                streaming.isStreaming ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            />
            <span className="text-slate-300">
              {streaming.isStreaming ? 'Live' : 'Idle'}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-6 py-6 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-5">
          {bridgeState && (
            <ConnectionCard
              state={bridgeState}
              onSelectInterface={(address) => void window.screenBridge.setSelectedInterface(address)}
              onTogglePin={(enabled) => void window.screenBridge.setPinEnabled(enabled)}
              onRegeneratePin={() => void window.screenBridge.regeneratePin()}
            />
          )}

          <DeviceList
            clients={bridgeState?.clients ?? []}
            onApprove={(id) => void window.screenBridge.approveClient(id)}
            onReject={(id) => void window.screenBridge.rejectClient(id)}
            onDisconnect={(id) => void window.screenBridge.disconnectClient(id)}
          />

          <DisplayGuide
            displays={displays}
            virtualSupport={virtualSupport}
            virtualDisplayState={virtualDisplayState}
            layoutStatus={layoutStatus}
            onCreateVirtualDisplay={async (resolution) => {
              const next = await window.screenBridge.createVirtualDisplay(resolution);
              setVirtualDisplayState(next);
              await refreshSources();
            }}
            onDestroyVirtualDisplay={async () => {
              const next = await window.screenBridge.destroyVirtualDisplay();
              setVirtualDisplayState(next);
              await refreshSources();
            }}
            onSaveLayout={async () => {
              setLayoutStatus(await window.screenBridge.saveDisplayLayout());
            }}
            onApplyLayout={async () => {
              setLayoutStatus(await window.screenBridge.applyDisplayLayout());
            }}
            onClearLayout={async () => {
              setLayoutStatus(await window.screenBridge.clearDisplayLayout());
            }}
            onToggleAutoRestore={async (enabled) => {
              setLayoutStatus(await window.screenBridge.setAutoRestoreLayout(enabled));
            }}
          />

          {gpuStatus && (
            <GpuCard
              status={gpuStatus}
              onChangeMode={async (mode) => {
                const next = await window.screenBridge.setGpuPreference(mode);
                setGpuStatus(next);
              }}
              onRelaunch={() => window.screenBridge.relaunchApp()}
            />
          )}
        </div>

        <div className="lg:col-span-7">
          <SourcePicker
            sources={sources}
            selectedPreset={selectedPreset}
            isStreaming={streaming.isStreaming}
            waitingClientsCount={waitingClientsCount}
            activeSourceLabel={streaming.activeSourceLabel}
            errorMessage={streaming.errorMessage}
            onChangePreset={setSelectedPreset}
            onRefreshSources={() => void refreshSources()}
            onStartSource={(source) =>
              void streaming.startCaptureBySourceId(source.id, source.name, selectedPreset)
            }
            onStartSystemPicker={() => void streaming.startSystemPickerCapture(selectedPreset)}
            onStopStreaming={streaming.stopCapture}
          />
        </div>
      </main>
    </div>
  );
}
