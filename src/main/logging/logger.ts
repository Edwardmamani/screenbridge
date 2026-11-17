import fs from 'node:fs';
import path from 'node:path';
import type { LogEntryInput, LogLevel } from '../../shared/types/logging';

function serializeDetails(details: unknown): string {
  if (details === undefined) return '';
  if (details instanceof Error) {
    return JSON.stringify({
      name: details.name,
      message: details.message,
      stack: details.stack,
    });
  }
  if (typeof details === 'string') {
    return details;
  }
  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

/**
 * Formats a single structured log line for `log.txt`.
 */
export function formatLogLine(entry: LogEntryInput, timestamp = new Date()): string {
  const iso = timestamp.toISOString();
  const base = `[${iso}] [${entry.level}] [${entry.source}] ${entry.message}`;
  const serialized = serializeDetails(entry.details);
  return serialized ? `${base} | ${serialized}` : base;
}

/**
 * File-backed logger that persists runtime diagnostics to `log.txt`
 * so developers and AI assistants have full context after app runs.
 */
export class FileLogger {
  private readonly logFilePath: string;

  constructor(logFilePath: string) {
    this.logFilePath = logFilePath;
    this.ensureDirectory();
  }

  getFilePath(): string {
    return this.logFilePath;
  }

  rotateIfExceeds(maxBytes = 5 * 1024 * 1024): void {
    try {
      const stat = fs.statSync(this.logFilePath);
      if (stat.size > maxBytes) {
        const backupPath = `${this.logFilePath}.prev`;
        fs.renameSync(this.logFilePath, backupPath);
      }
    } catch {
      // File may not exist yet; nothing to rotate.
    }
  }

  log(level: LogLevel, source: string, message: string, details?: unknown): void {
    const line = formatLogLine({ level, source, message, details });

    if (level === 'ERROR') {
      console.error(line);
    } else if (level === 'WARN') {
      console.warn(line);
    } else {
      console.log(line);
    }

    try {
      fs.appendFileSync(this.logFilePath, `${line}\n`, 'utf8');
    } catch (err) {
      console.error('[FileLogger] Failed to write log.txt:', err);
    }
  }

  info(source: string, message: string, details?: unknown): void {
    this.log('INFO', source, message, details);
  }

  warn(source: string, message: string, details?: unknown): void {
    this.log('WARN', source, message, details);
  }

  error(source: string, message: string, details?: unknown): void {
    this.log('ERROR', source, message, details);
  }

  debug(source: string, message: string, details?: unknown): void {
    this.log('DEBUG', source, message, details);
  }

  private ensureDirectory(): void {
    try {
      fs.mkdirSync(path.dirname(this.logFilePath), { recursive: true });
    } catch {
      // Ignore if directory already exists or cannot be created.
    }
  }
}
