// Test setup for PartyKit server testing
import { beforeAll, beforeEach, afterAll, afterEach, vi } from 'vitest';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';

// Mock canvas for Konva
vi.mock('canvas', () => ({
  createCanvas: vi.fn(() => ({
    getContext: vi.fn(() => ({
      measureText: vi.fn(() => ({ width: 100 })),
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
    })),
    width: 800,
    height: 600,
    toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
  })),
  loadImage: vi.fn(() => Promise.resolve({})),
}));

// Mock Konva
vi.mock('konva', () => ({
  Stage: vi.fn(),
  Layer: vi.fn(),
  Circle: vi.fn(),
  Line: vi.fn(),
  Text: vi.fn(),
}));

// Mock react-konva
vi.mock('react-konva', () => ({
  Stage: vi.fn(({ children }) => children),
  Layer: vi.fn(({ children }) => children),
  Circle: vi.fn(() => null),
  Line: vi.fn(() => null),
  Text: vi.fn(() => null),
}));

// Mock PartyKit Party class and related utilities
class MockParty {
  id: string;
  env: Record<string, string>;
  
  constructor(id = 'test-party') {
    this.id = id;
    this.env = {};
  }

  broadcast(message: string | ArrayBuffer | Uint8Array, without?: string[]) {
    // Mock broadcast implementation
  }

  getConnection(id: string) {
    return new MockConnection(id);
  }

  getConnections() {
    return new Map<string, MockConnection>();
  }
}

class MockConnection {
  id: string;
  
  constructor(id: string) {
    this.id = id;
  }

  send(message: string | ArrayBuffer | Uint8Array) {
    // Mock send implementation
  }

  close(code?: number, reason?: string) {
    // Mock close implementation
  }
}

// Mock PartyKit modules
vi.mock('partykit/server', () => ({
  Party: MockParty,
  Connection: MockConnection,
}));

// Mock WebSocket for PartyKit server
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    // Mock send implementation
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }

  addEventListener(type: string, listener: EventListener) {
    // Mock event listener
  }

  removeEventListener(type: string, listener: EventListener) {
    // Mock event listener removal
  }
}

Object.defineProperty(global, 'WebSocket', {
  writable: true,
  value: MockWebSocket,
});

// Setup and teardown hooks
beforeAll(async () => {
  // Global test setup for PartyKit
});

afterAll(async () => {
  // Global test cleanup
});

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});

// Export mock classes for use in tests
export { MockParty, MockConnection, MockWebSocket };