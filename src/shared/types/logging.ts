export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntryInput {
  level: LogLevel;
  source: string;
  message: string;
  details?: unknown;
}
