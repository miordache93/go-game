#!/bin/bash

# Test WebSocket connection to PartyKit server
echo "Testing PartyKit WebSocket connection..."

# Using websocat (install with: brew install websocat)
# Connect to room "test-room"
echo '{"type":"join","timestamp":'$(date +%s000)',"playerInfo":{"id":"test-1","name":"Test Player"}}' | \
websocat ws://localhost:1999/parties/go-game-server/test-room

# Alternative using wscat (install with: npm install -g wscat)
# wscat -c ws://localhost:1999/parties/go-game-server/test-room
# Then type: {"type":"join","timestamp":1234567890,"playerInfo":{"id":"test-1","name":"Test Player"}}