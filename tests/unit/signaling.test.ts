import { describe, expect, it } from 'vitest';
import { parseClientSignal } from '../../src/shared/types/signaling';

describe('parseClientSignal', () => {
  it('parses valid join messages and trims deviceName', () => {
    const signal = parseClientSignal(
      JSON.stringify({ type: 'join', deviceName: '  Living Room TV  ', pin: '1234' }),
    );
    expect(signal).toEqual({
      type: 'join',
      deviceName: 'Living Room TV',
      pin: '1234',
    });
  });

  it('rejects malformed JSON or unknown message types', () => {
    expect(parseClientSignal('not-json')).toBeNull();
    expect(parseClientSignal(JSON.stringify({ type: 'unknown-type' }))).toBeNull();
    expect(parseClientSignal(JSON.stringify({ type: 'join', deviceName: '   ' }))).toBeNull();
  });

  it('parses valid webrtc-answer and webrtc-ice payloads', () => {
    const answer = parseClientSignal(
      JSON.stringify({ type: 'webrtc-answer', sdp: { type: 'answer', sdp: 'v=0...' } }),
    );
    expect(answer?.type).toBe('webrtc-answer');

    const ice = parseClientSignal(
      JSON.stringify({ type: 'webrtc-ice', candidate: { candidate: 'candidate:1' } }),
    );
    expect(ice?.type).toBe('webrtc-ice');
  });
});
