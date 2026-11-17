import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientToServerSignal, ServerToClientSignal } from '@shared/types/signaling';

export type ReceiverPhase =
  | 'connecting'
  | 'ready-to-join'
  | 'awaiting-approval'
  | 'approved-waiting-stream'
  | 'streaming'
  | 'rejected'
  | 'disconnected';

interface UseReceiverStreamReturn {
  phase: ReceiverPhase;
  requiresPin: boolean;
  statusMessage: string | null;
  remoteStream: MediaStream | null;
  submitJoin: (deviceName: string, pin?: string) => void;
  reconnect: () => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

/**
 * Manages the WebSocket signaling session and WebRTC peer connection
 * from the receiver browser's perspective.
 */
export function useReceiverStream(): UseReceiverStreamReturn {
  const [phase, setPhase] = useState<ReceiverPhase>('connecting');
  const [requiresPin, setRequiresPin] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectNonce, setConnectNonce] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);

  const sendSignal = useCallback((signal: ClientToServerSignal) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(signal));
    }
  }, []);

  const closePeer = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    setRemoteStream(null);
  }, []);

  useEffect(() => {
    setPhase('connecting');
    setStatusMessage(null);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    const ensurePeer = (): RTCPeerConnection => {
      if (peerRef.current) {
        return peerRef.current;
      }

      const peer = new RTCPeerConnection(RTC_CONFIG);
      peerRef.current = peer;

      peer.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) {
          setRemoteStream(stream);
          setPhase('streaming');
        }
      };

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({
            type: 'webrtc-ice',
            candidate: event.candidate.toJSON(),
          });
        }
      };

      peer.onconnectionstatechange = () => {
        sendSignal({
          type: 'client-log',
          level: peer.connectionState === 'failed' ? 'ERROR' : 'INFO',
          message: `Receiver WebRTC state: ${peer.connectionState}`,
        });
        if (peer.connectionState === 'failed') {
          sendSignal({ type: 'request-renegotiate' });
        }
      };

      return peer;
    };

    ws.onmessage = async (event) => {
      let msg: ServerToClientSignal;
      try {
        msg = JSON.parse(String(event.data)) as ServerToClientSignal;
      } catch {
        return;
      }

      switch (msg.type) {
        case 'welcome':
          setRequiresPin(msg.requiresPin);
          setPhase('ready-to-join');
          break;

        case 'auth-status':
          if (msg.status === 'pending') {
            setPhase('awaiting-approval');
            setStatusMessage('Waiting for the host to approve your device...');
          } else if (msg.status === 'approved') {
            setPhase('approved-waiting-stream');
            setStatusMessage('Approved! Waiting for the host to share a screen...');
          } else {
            setPhase('rejected');
            setStatusMessage(msg.reason ?? 'Connection rejected by host');
            closePeer();
          }
          break;

        case 'webrtc-offer': {
          const peer = ensurePeer();
          await peer.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          sendSignal({ type: 'webrtc-answer', sdp: answer });
          break;
        }

        case 'webrtc-ice':
          if (peerRef.current) {
            await peerRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
          }
          break;

        case 'stream-stopped':
          closePeer();
          setPhase('approved-waiting-stream');
          setStatusMessage(msg.reason ?? 'Stream stopped by host');
          break;

        case 'error':
          setStatusMessage(msg.message);
          break;
      }
    };

    ws.onclose = () => {
      closePeer();
      setPhase((current) => (current === 'rejected' ? 'rejected' : 'disconnected'));
    };

    return () => {
      closePeer();
      ws.close();
    };
  }, [closePeer, connectNonce, sendSignal]);

  const submitJoin = useCallback(
    (deviceName: string, pin?: string) => {
      sendSignal({
        type: 'join',
        deviceName: deviceName.trim() || 'Browser Device',
        pin: pin?.trim() || undefined,
      });
    },
    [sendSignal],
  );

  const reconnect = useCallback(() => {
    setConnectNonce((n) => n + 1);
  }, []);

  return {
    phase,
    requiresPin,
    statusMessage,
    remoteStream,
    submitJoin,
    reconnect,
  };
}
