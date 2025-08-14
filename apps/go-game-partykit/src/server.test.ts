import { describe, it, expect } from 'vitest';
import { MockParty, MockConnection } from './test-setup';

// Example test for PartyKit server
describe('PartyKit Server', () => {
  it('should create a party instance', () => {
    const party = new MockParty('test-room');
    expect(party.id).toBe('test-room');
  });

  it('should handle WebSocket connections', () => {
    const connection = new MockConnection('test-connection');
    expect(connection.id).toBe('test-connection');
  });
});