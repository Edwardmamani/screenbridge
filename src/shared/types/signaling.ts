export interface RtcSessionDescriptionPayload {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
}

export interface RtcIceCandidatePayload {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

/**
 * Discriminated union for WebSocket signaling messages exchanged between
 * the Host desktop app (via main server) and Browser Receiver clients.
 */
export type ClientToServerSignal =
  | {
      type: 'join';
      deviceName: string;
      pin?: string;
    }
  | {
      type: 'webrtc-answer';
      sdp: RtcSessionDescriptionPayload;
    }
  | {
      type: 'webrtc-ice';
      candidate: RtcIceCandidatePayload;
    }
  | {
      type: 'request-renegotiate';
    }
  | {
      type: 'client-log';
      level: 'INFO' | 'WARN' | 'ERROR';
      message: string;
      details?: string;
    };

export type ServerToClientSignal =
  | {
      type: 'welcome';
      clientId: string;
      requiresPin: boolean;
    }
  | {
      type: 'auth-status';
      status: 'pending' | 'approved' | 'rejected';
      reason?: string;
    }
  | {
      type: 'webrtc-offer';
      sdp: RtcSessionDescriptionPayload;
    }
  | {
      type: 'webrtc-ice';
      candidate: RtcIceCandidatePayload;
    }
  | {
      type: 'stream-stopped';
      reason?: string;
    }
  | {
      type: 'error';
      message: string;
    };

export interface RoutedClientSignal {
  clientId: string;
  signal: ClientToServerSignal;
}

export interface OutboundHostSignal {
  clientId: string;
  signal: ServerToClientSignal;
}

const VALID_CLIENT_TYPES = new Set<ClientToServerSignal['type']>([
  'join',
  'webrtc-answer',
  'webrtc-ice',
  'request-renegotiate',
  'client-log',
]);

/**
 * Runtime type guard that validates raw JSON payloads arriving from receiver browsers.
 */
export function parseClientSignal(raw: string): ClientToServerSignal | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    if (typeof record.type !== 'string' || !VALID_CLIENT_TYPES.has(record.type as ClientToServerSignal['type'])) {
      return null;
    }

    switch (record.type) {
      case 'join': {
        if (typeof record.deviceName !== 'string' || record.deviceName.trim().length === 0) {
          return null;
        }
        if (record.pin !== undefined && typeof record.pin !== 'string') {
          return null;
        }
        return {
          type: 'join',
          deviceName: record.deviceName.trim().slice(0, 64),
          pin: record.pin,
        };
      }
      case 'webrtc-answer': {
        if (typeof record.sdp !== 'object' || record.sdp === null) {
          return null;
        }
        return {
          type: 'webrtc-answer',
          sdp: record.sdp as RtcSessionDescriptionPayload,
        };
      }
      case 'webrtc-ice': {
        if (typeof record.candidate !== 'object' || record.candidate === null) {
          return null;
        }
        return {
          type: 'webrtc-ice',
          candidate: record.candidate as RtcIceCandidatePayload,
        };
      }
      case 'request-renegotiate':
        return { type: 'request-renegotiate' };
      case 'client-log': {
        if (
          typeof record.message !== 'string' ||
          (record.level !== 'INFO' && record.level !== 'WARN' && record.level !== 'ERROR')
        ) {
          return null;
        }
        return {
          type: 'client-log',
          level: record.level,
          message: record.message.slice(0, 500),
          details: typeof record.details === 'string' ? record.details.slice(0, 1000) : undefined,
        };
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}
