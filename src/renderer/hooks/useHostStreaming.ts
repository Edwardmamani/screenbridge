import { useCallback, useEffect, useRef, useState } from 'react';
import { QUALITY_PRESETS, type QualityPresetId } from '@shared/types/display';
import type { ConnectedClient } from '@shared/types/session';
import type { RoutedClientSignal } from '@shared/types/signaling';

interface UseHostStreamingReturn {
  isStreaming: boolean;
  activeSourceLabel: string | null;
  errorMessage: string | null;
  startCaptureBySourceId: (sourceId: string, label: string, preset: QualityPresetId) => Promise<void>;
  startSystemPickerCapture: (preset: QualityPresetId) => Promise<void>;
  stopCapture: () => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

/**
 * Manages local screen/window MediaStream capture and one RTCPeerConnection
 * per approved receiver device.
 */
export function useHostStreaming(clients: ConnectedClient[]): UseHostStreamingReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeSourceLabel, setActiveSourceLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const closePeer = useCallback((clientId: string) => {
    const peer = peersRef.current.get(clientId);
    if (peer) {
      peer.close();
      peersRef.current.delete(clientId);
    }
  }, []);

  const stopCapture = useCallback(() => {
    for (const [clientId] of peersRef.current) {
      closePeer(clientId);
      void window.screenBridge.sendSignal({
        clientId,
        signal: { type: 'stream-stopped', reason: 'Host stopped screen sharing' },
      });
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    setIsStreaming(false);
    setActiveSourceLabel(null);
  }, [closePeer]);

  const createAndSendOffer = useCallback(
    async (clientId: string) => {
      const stream = streamRef.current;
      if (!stream) return;

      closePeer(clientId);

      const peer = new RTCPeerConnection(RTC_CONFIG);
      peersRef.current.set(clientId, peer);

      for (const track of stream.getTracks()) {
        peer.addTrack(track, stream);
      }

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          void window.screenBridge.sendSignal({
            clientId,
            signal: {
              type: 'webrtc-ice',
              candidate: event.candidate.toJSON(),
            },
          });
        }
      };

      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'failed' || peer.connectionState === 'closed') {
          closePeer(clientId);
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      void window.screenBridge.sendSignal({
        clientId,
        signal: {
          type: 'webrtc-offer',
          sdp: offer,
        },
      });
    },
    [closePeer],
  );

  const attachNewStream = useCallback(
    async (stream: MediaStream, label: string) => {
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
      }

      streamRef.current = stream;
      setIsStreaming(true);
      setActiveSourceLabel(label);
      setErrorMessage(null);

      const [videoTrack] = stream.getVideoTracks();
      if (videoTrack) {
        videoTrack.onended = () => {
          stopCapture();
        };
      }

      const activeClients = clients.filter(
        (c) => c.status === 'approved' || c.status === 'streaming',
      );
      await Promise.all(activeClients.map((client) => createAndSendOffer(client.id)));
    },
    [clients, createAndSendOffer, stopCapture],
  );

  const startSystemPickerCapture = useCallback(
    async (presetId: QualityPresetId) => {
      try {
        const preset = QUALITY_PRESETS[presetId];
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: preset.maxWidth },
            height: { ideal: preset.maxHeight },
            frameRate: { ideal: preset.frameRate },
          },
          audio: false,
        });
        await attachNewStream(stream, 'System Display Picker');
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Unable to capture screen via system picker.',
        );
      }
    },
    [attachNewStream],
  );

  const startCaptureBySourceId = useCallback(
    async (sourceId: string, label: string, presetId: QualityPresetId) => {
      try {
        const preset = QUALITY_PRESETS[presetId];
        const constraints = {
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId,
              maxWidth: preset.maxWidth,
              maxHeight: preset.maxHeight,
              maxFrameRate: preset.frameRate,
            },
          },
        } as unknown as MediaStreamConstraints;

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        await attachNewStream(stream, label);
      } catch {
        // On Wayland/PipeWire, direct desktopCapturer IDs can require the XDG Desktop Portal picker.
        await startSystemPickerCapture(presetId);
      }
    },
    [attachNewStream, startSystemPickerCapture],
  );

  // Clean up peers for disconnected/rejected clients and initiate offers for newly approved ones.
  useEffect(() => {
    const validIds = new Set(
      clients.filter((c) => c.status === 'approved' || c.status === 'streaming').map((c) => c.id),
    );

    for (const [clientId] of peersRef.current) {
      if (!validIds.has(clientId)) {
        closePeer(clientId);
      }
    }

    if (streamRef.current) {
      for (const client of clients) {
        if (client.status === 'approved' && !peersRef.current.has(client.id)) {
          void createAndSendOffer(client.id);
        }
      }
    }
  }, [clients, closePeer, createAndSendOffer]);

  // Handle inbound WebRTC signaling answers and ICE candidates from receiver browsers.
  useEffect(() => {
    const unsubscribe = window.screenBridge.onClientSignal((payload: RoutedClientSignal) => {
      const peer = peersRef.current.get(payload.clientId);

      if (payload.signal.type === 'webrtc-answer' && peer) {
        void peer.setRemoteDescription(new RTCSessionDescription(payload.signal.sdp));
      } else if (payload.signal.type === 'webrtc-ice' && peer) {
        void peer.addIceCandidate(new RTCIceCandidate(payload.signal.candidate));
      } else if (payload.signal.type === 'request-renegotiate' && streamRef.current) {
        void createAndSendOffer(payload.clientId);
      }
    });

    return unsubscribe;
  }, [createAndSendOffer]);

  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, [stopCapture]);

  return {
    isStreaming,
    activeSourceLabel,
    errorMessage,
    startCaptureBySourceId,
    startSystemPickerCapture,
    stopCapture,
  };
}
