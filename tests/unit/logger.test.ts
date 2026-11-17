import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { FileLogger, formatLogLine } from '../../src/main/logging/logger';

describe('FileLogger', () => {
  it('formats log lines with ISO timestamp, level, source, and serialized details', () => {
    const fixedDate = new Date('2026-11-17T15:00:00.000Z');
    const line = formatLogLine(
      {
        level: 'ERROR',
        source: 'webrtc-host',
        message: 'Capture failed',
        details: { code: 'NotAllowedError' },
      },
      fixedDate,
    );

    expect(line).toBe(
      '[2026-11-17T15:00:00.000Z] [ERROR] [webrtc-host] Capture failed | {"code":"NotAllowedError"}',
    );
  });

  it('appends log entries to log.txt on disk', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'screenbridge-log-'));
    const logPath = path.join(tmpDir, 'log.txt');
    const logger = new FileLogger(logPath);

    logger.info('main', 'Application booted');
    logger.error('server', 'Socket failure', new Error('ECONNRESET'));

    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('[INFO] [main] Application booted');
    expect(lines[1]).toContain('[ERROR] [server] Socket failure');
    expect(lines[1]).toContain('ECONNRESET');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
