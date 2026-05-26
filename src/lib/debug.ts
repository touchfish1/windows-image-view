export type LogLevel = 'info' | 'warn' | 'error' | 'debug';
export type LogSource = 'console' | 'invoke' | 'system';

export interface LogEntry {
  id: number;
  timestamp: string;
  level: LogLevel;
  source: LogSource;
  messages: any[];
}

type Listener = () => void;

class DebugStore {
  private entries: LogEntry[] = [];
  private listeners: Set<Listener> = new Set();
  private nextId = 0;
  private maxEntries = 2000;
  private _capturingConsole = false;
  private originals: Record<string, any> = {};

  get capturing() {
    return { console: this._capturingConsole };
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): LogEntry[] {
    return this.entries;
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  private add(level: LogLevel, source: LogSource, ...messages: any[]) {
    this.entries.push({
      id: this.nextId++,
      timestamp: new Date().toLocaleTimeString(),
      level,
      source,
      messages,
    });
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    this.notify();
  }

  log(...messages: any[]) {
    this.add('info', 'console', ...messages);
  }
  warn(...messages: any[]) {
    this.add('warn', 'console', ...messages);
  }
  error(...messages: any[]) {
    this.add('error', 'console', ...messages);
  }
  debug(...messages: any[]) {
    this.add('debug', 'console', ...messages);
  }

  system(...messages: any[]) {
    this.add('info', 'system', ...messages);
  }

  /** Called manually from api.ts to log IPC calls */
  logInvoke(cmd: string, args: any) {
    this.add('info', 'invoke', `→ ${cmd}`, args ?? {});
  }

  /** Called manually from api.ts to log IPC responses */
  logInvokeResult(cmd: string, res: any) {
    this.add('info', 'invoke', `← ${cmd}`, res ?? '(void)');
  }

  /** Called manually from api.ts to log IPC errors */
  logInvokeError(cmd: string, err: any) {
    this.add('error', 'invoke', `✕ ${cmd}`, String(err));
  }

  clear() {
    this.entries = [];
    this.notify();
  }

  startCapture() {
    if (!this._capturingConsole) {
      const s = this;
      this.originals.log = console.log;
      this.originals.warn = console.warn;
      this.originals.error = console.error;
      this.originals.debug = console.debug;

      console.log = function (...args: any[]) {
        s.originals.log.apply(console, args);
        s.add('info', 'console', ...args);
      };
      console.warn = function (...args: any[]) {
        s.originals.warn.apply(console, args);
        s.add('warn', 'console', ...args);
      };
      console.error = function (...args: any[]) {
        s.originals.error.apply(console, args);
        s.add('error', 'console', ...args);
      };
      console.debug = function (...args: any[]) {
        s.originals.debug.apply(console, args);
        s.add('debug', 'console', ...args);
      };
      this._capturingConsole = true;
    }
  }

  stopCapture() {
    if (this._capturingConsole) {
      console.log = this.originals.log;
      console.warn = this.originals.warn;
      console.error = this.originals.error;
      console.debug = this.originals.debug;
      this._capturingConsole = false;
    }
    this.system('Debug capture stopped');
  }
}

export const debugStore = new DebugStore();
