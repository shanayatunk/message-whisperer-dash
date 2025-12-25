// In-memory request logger for debugging
export interface RequestLogEntry {
  id: number;
  timestamp: string;
  url: string;
  method: string;
  isInsecure: boolean;
  status?: number;
  error?: string;
  redirected?: boolean;
}

const MAX_ENTRIES = 50;
let entries: RequestLogEntry[] = [];
let nextId = 1;

export function logRequest(entry: Omit<RequestLogEntry, "id" | "timestamp">) {
  const logEntry: RequestLogEntry = {
    id: nextId++,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  
  entries.unshift(logEntry);
  if (entries.length > MAX_ENTRIES) {
    entries = entries.slice(0, MAX_ENTRIES);
  }
  
  // Notify listeners
  listeners.forEach(fn => fn([...entries]));
  
  return logEntry;
}

export function getRequestLog(): RequestLogEntry[] {
  return [...entries];
}

export function clearRequestLog() {
  entries = [];
  nextId = 1;
  listeners.forEach(fn => fn([]));
}

// Simple pub/sub for React components
type Listener = (entries: RequestLogEntry[]) => void;
const listeners = new Set<Listener>();

export function subscribeToRequestLog(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
