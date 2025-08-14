// Test setup for React application
import { vi } from 'vitest';
import '@testing-library/react';
import '@testing-library/jest-dom';

// Mock window.matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver for components that use it
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

// Mock IntersectionObserver for components that use it
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock HTMLCanvasElement for Go game board
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 10 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
});

// Mock WebSocket for multiplayer functionality
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

Object.defineProperty(window, 'WebSocket', {
  writable: true,
  value: MockWebSocket,
});

// Mock fetch for API calls
Object.defineProperty(global, 'fetch', {
  writable: true,
  value: vi.fn(),
});

// Mock Konva for React-Konva components
vi.mock('konva', () => ({
  default: {
    Stage: vi.fn().mockImplementation(() => ({
      container: vi.fn(),
      add: vi.fn(),
      draw: vi.fn(),
      destroy: vi.fn(),
    })),
    Layer: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      draw: vi.fn(),
      destroy: vi.fn(),
    })),
    Circle: vi.fn().mockImplementation(() => ({
      x: vi.fn(),
      y: vi.fn(),
      radius: vi.fn(),
      fill: vi.fn(),
      destroy: vi.fn(),
    })),
    Line: vi.fn().mockImplementation(() => ({
      points: vi.fn(),
      stroke: vi.fn(),
      strokeWidth: vi.fn(),
      destroy: vi.fn(),
    })),
  },
}));

vi.mock('react-konva', () => ({
  Stage: vi.fn(({ children }) => children),
  Layer: vi.fn(({ children }) => children),
  Group: vi.fn(({ children }) => children),
  Circle: vi.fn(() => null),
  Line: vi.fn(() => null),
  Rect: vi.fn(() => null),
  Text: vi.fn(() => null),
}));