import { useEffect, useRef, useState } from 'react';
import { Cast, FlipHorizontal, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { useReceiverStream } from './hooks/useReceiverStream';

type FitMode = 'contain' | 'cover' | 'fill';

function detectDefaultDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPad/i.test(ua)) return 'iPad';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/Android/i.test(ua)) return 'Android Device';
  if (/Macintosh/i.test(ua)) return 'Mac Browser';
  if (/Windows/i.test(ua)) return 'Windows Browser';
  if (/Linux/i.test(ua)) return 'Linux Browser';
  return 'Browser Display';
}

export function App() {
  const { phase, requiresPin, statusMessage, remoteStream, submitJoin, reconnect } =
    useReceiverStream();

  const [deviceName, setDeviceName] = useState(detectDefaultDeviceName);
  const [pin, setPin] = useState('');
  const [fitMode, setFitMode] = useState<FitMode>('contain');
  const [mirrored, setMirrored] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resolution, setResolution] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = remoteStream;
    if (remoteStream) {
      void video.play().catch(() => {});
    }
  }, [remoteStream]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const cycleFitMode = () => {
    setFitMode((prev) => (prev === 'contain' ? 'cover' : prev === 'cover' ? 'fill' : 'contain'));
  };

  if (phase === 'streaming' && remoteStream) {
    const objectClass =
      fitMode === 'contain' ? 'object-contain' : fitMode === 'cover' ? 'object-cover' : 'object-fill';

    return (
      <div
        ref={containerRef}
        className="group relative flex h-screen w-screen items-center justify-center overflow-hidden bg-black"
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (v.videoWidth && v.videoHeight) {
              setResolution(`${v.videoWidth}×${v.videoHeight}`);
            }
          }}
          className={`h-full w-full ${objectClass} ${mirrored ? '-scale-x-100' : ''}`}
        />

        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/85 px-4 py-2 text-xs text-slate-200 opacity-90 shadow-xl backdrop-blur transition sm:opacity-0 sm:group-hover:opacity-100">
          {resolution && <span className="font-mono text-emerald-400">{resolution}</span>}

          <button
            type="button"
            onClick={cycleFitMode}
            className="rounded-md bg-slate-800 px-2.5 py-1 font-medium capitalize hover:bg-slate-700"
          >
            Fit: {fitMode}
          </button>

          <button
            type="button"
            onClick={() => setMirrored((m) => !m)}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium ${
              mirrored ? 'bg-indigo-600 text-white' : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            <FlipHorizontal className="h-3.5 w-3.5" />
            Mirror
          </button>

          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1 font-medium hover:bg-slate-700"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Cast className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">ScreenBridge Receiver</h1>
            <p className="text-xs text-slate-400">Turn this browser into a wireless display</p>
          </div>
        </div>

        {phase === 'ready-to-join' ? (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submitJoin(deviceName, pin);
            }}
          >
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Device Name
              </label>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-500"
              />
            </div>

            {requiresPin && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  4-Digit Pairing PIN
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter PIN shown on host"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 font-mono text-sm tracking-widest text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Connect to Host
            </button>
          </form>
        ) : (
          <div className="mt-6 space-y-4 text-center">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
              {statusMessage ??
                (phase === 'connecting'
                  ? 'Connecting to host...'
                  : 'Disconnected from host.')}
            </div>

            {(phase === 'disconnected' || phase === 'rejected') && (
              <button
                type="button"
                onClick={reconnect}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reconnect
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
