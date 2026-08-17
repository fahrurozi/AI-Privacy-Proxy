export interface StreamFieldState {
  pending: string;
  streamKey: string;
  createdAt: number;
}

export class StreamStateManager {
  private states = new Map<string, StreamFieldState>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Periodically clean up stale state older than 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, state] of this.states.entries()) {
        if (now - state.createdAt > 300_000) {
          this.states.delete(key);
        }
      }
    }, 60_000);

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  getOrCreate(streamKey: string): StreamFieldState {
    let state = this.states.get(streamKey);
    if (!state) {
      state = {
        pending: '',
        streamKey,
        createdAt: Date.now(),
      };
      this.states.set(streamKey, state);
    }
    return state;
  }

  cleanupRequest(requestId: string): void {
    const prefix = `${requestId}:`;
    for (const key of Array.from(this.states.keys())) {
      if (key.startsWith(prefix)) {
        this.states.delete(key);
      }
    }
  }

  getActiveStreamCount(): number {
    const uniqueRequests = new Set<string>();
    for (const key of this.states.keys()) {
      const reqId = key.split(':')[0];
      if (reqId) uniqueRequests.add(reqId);
    }
    return uniqueRequests.size;
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.states.clear();
  }
}

export const streamStateManager = new StreamStateManager();
